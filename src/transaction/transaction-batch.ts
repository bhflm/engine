import { RailgunWallet } from '../wallet/railgun-wallet';
import { Prover, ProverProgressCallback } from '../prover/prover';
import { HashZero } from '../utils/bytes';
import { findExactSolutionsOverTargetValue } from '../solutions/simple-solutions';
import { Transaction } from './transaction';
import { SpendingSolutionGroup, TXO, UnshieldData } from '../models/txo-types';
import { AdaptID } from '../models/formatted-types';
import {
  consolidateBalanceError,
  createSpendingSolutionGroupsForOutput,
  createSpendingSolutionGroupsForUnshield,
} from '../solutions/complex-solutions';
import { calculateTotalSpend } from '../solutions/utxos';
import { isValidFor3Outputs } from '../solutions/nullifiers';
import EngineDebug from '../debugger/debugger';
import {
  extractSpendingSolutionGroupsData,
  serializeExtractedSpendingSolutionGroupsData,
} from '../solutions/spending-group-extractor';
import { stringifySafe } from '../utils/stringify';
import { averageNumber } from '../utils/average';
import { Chain } from '../models/engine-types';
import { TransactNote } from '../note/transact-note';
import { TreeBalance } from '../models';
import { TransactionStruct } from '../typechain-types/contracts/logic/RailgunSmartWallet';
import { getTokenDataHash } from '../note/note-util';

export class TransactionBatch {
  private adaptID: AdaptID = {
    contract: '0x0000000000000000000000000000000000000000',
    parameters: HashZero,
  };

  private chain: Chain;

  private outputs: TransactNote[] = [];

  private unshieldDataMap: { [tokenHash: string]: UnshieldData } = {};

  private overallBatchMinGasPrice: bigint;

  /**
   * Create TransactionBatch Object
   * @param chain - chain type/id of network
   */
  constructor(chain: Chain, overallBatchMinGasPrice: bigint = BigInt(0)) {
    this.chain = chain;
    this.overallBatchMinGasPrice = overallBatchMinGasPrice;
  }

  addOutput(output: TransactNote) {
    this.outputs.push(output);
  }

  resetOutputs() {
    this.outputs = [];
  }

  addUnshieldData(unshieldData: UnshieldData) {
    if (this.unshieldDataMap[unshieldData.tokenHash]) {
      throw new Error(
        'You may only call .addUnshieldData once per token for a given TransactionBatch.',
      );
    }
    if (unshieldData.value === 0n) {
      throw new Error('Unshield value must be greater than 0.');
    }
    if (getTokenDataHash(unshieldData.tokenData) !== unshieldData.tokenHash) {
      throw new Error('Invalid Unshield token data hash.');
    }
    this.unshieldDataMap[unshieldData.tokenHash] = unshieldData;
  }

  resetUnshieldData() {
    this.unshieldDataMap = {};
  }

  private unshieldTotal(tokenHash: string) {
    return this.unshieldDataMap[tokenHash] ? this.unshieldDataMap[tokenHash].value : BigInt(0);
  }

  setAdaptID(adaptID: AdaptID) {
    this.adaptID = adaptID;
  }

  private getOutputTokenHashes = (): string[] => {
    const tokenHashes: string[] = [];
    const outputTokenHashes: string[] = this.outputs.map((output) => output.tokenHash);
    const unshieldTokenHashes: string[] = Object.keys(this.unshieldDataMap);
    [...outputTokenHashes, ...unshieldTokenHashes].forEach((tokenHash) => {
      if (!tokenHashes.includes(tokenHash)) {
        tokenHashes.push(tokenHash);
      }
    });
    return tokenHashes;
  };

  async generateValidSpendingSolutionGroupsAllOutputs(
    wallet: RailgunWallet,
  ): Promise<SpendingSolutionGroup[]> {
    const tokenHashes: string[] = this.getOutputTokenHashes();
    const spendingSolutionGroupsPerToken = await Promise.all(
      tokenHashes.map((tokenHash) => this.generateValidSpendingSolutionGroups(wallet, tokenHash)),
    );
    return spendingSolutionGroupsPerToken.flat();
  }

  /**
   * Generates spending solution groups for outputs
   * @param wallet - wallet to spend from
   */
  private async generateValidSpendingSolutionGroups(
    wallet: RailgunWallet,
    tokenHash: string,
  ): Promise<SpendingSolutionGroup[]> {
    const tokenOutputs = this.outputs.filter((output) => output.tokenHash === tokenHash);

    const outputTotal = tokenOutputs.reduce((left, right) => left + right.value, BigInt(0));

    // Calculate total required to be supplied by UTXOs
    const totalRequired = outputTotal + this.unshieldTotal(tokenHash);

    // Get UTXOs sorted by tree
    const balances = await wallet.balancesByTree(this.chain);
    const treeSortedBalances = balances[tokenHash];
    if (treeSortedBalances == null) {
      throw new Error(`Can not find RAILGUN wallet balance for token ID: ${tokenHash}`);
    }

    // Sum balances
    const tokenBalance: bigint = treeSortedBalances.reduce(
      (left, right) => left + right.balance,
      BigInt(0),
    );

    // Check if wallet balance is enough to cover this transaction
    if (totalRequired > tokenBalance) {
      EngineDebug.log(`Token balance too low: ${tokenHash}`);
      throw new Error('RAILGUN private token balance too low.');
    }

    // If single group possible, return it.
    const singleSpendingSolutionGroup = this.createSimpleSpendingSolutionGroupsIfPossible(
      tokenHash,
      tokenOutputs,
      treeSortedBalances,
      totalRequired,
    );
    if (singleSpendingSolutionGroup) {
      return [singleSpendingSolutionGroup];
    }

    // Single group not possible - need a more complex model.
    return this.createComplexSatisfyingSpendingSolutionGroups(
      tokenHash,
      tokenOutputs,
      treeSortedBalances,
    );
  }

  private createSimpleSpendingSolutionGroupsIfPossible(
    tokenHash: string,
    tokenOutputs: TransactNote[],
    treeSortedBalances: TreeBalance[],
    totalRequired: bigint,
  ): Optional<SpendingSolutionGroup> {
    try {
      const { utxos, spendingTree, amount } = TransactionBatch.createSimpleSatisfyingUTXOGroup(
        treeSortedBalances,
        totalRequired,
      );
      if (amount < totalRequired) {
        throw new Error('Could not find UTXOs to satisfy required amount.');
      }
      if (
        !isValidFor3Outputs(utxos.length) &&
        this.outputs.length > 0 &&
        this.unshieldTotal(tokenHash) > 0
      ) {
        // Cannot have 3 outputs. Can't include unshield in note.
        throw new Error('Requires 3 outputs, given a unshield and at least one standard output.');
      }

      const unshieldValue = this.unshieldTotal(tokenHash);

      const spendingSolutionGroup: SpendingSolutionGroup = {
        utxos,
        spendingTree,
        unshieldValue,
        tokenOutputs,
        tokenHash,
      };

      return spendingSolutionGroup;
    } catch (err) {
      return undefined;
    }
  }

  /**
   * Finds exact group of UTXOs above required amount.
   */
  private static createSimpleSatisfyingUTXOGroup(
    treeSortedBalances: TreeBalance[],
    amountRequired: bigint,
  ): { utxos: TXO[]; spendingTree: number; amount: bigint } {
    let spendingTree: Optional<number>;
    let utxos: Optional<TXO[]>;

    // Find first tree with spending solutions.
    treeSortedBalances.forEach((treeBalance, tree) => {
      const solutions = findExactSolutionsOverTargetValue(treeBalance, amountRequired);
      if (!solutions) {
        return;
      }
      spendingTree = tree;
      utxos = solutions;
    });

    if (utxos == null || spendingTree == null) {
      throw new Error('No spending solutions found. Must use complex UTXO aggregator.');
    }

    return {
      utxos,
      spendingTree,
      amount: calculateTotalSpend(utxos),
    };
  }

  /**
   * Finds array of UTXOs groups that satisfies the required amount, excluding an already-used array of UTXO IDs.
   */
  createComplexSatisfyingSpendingSolutionGroups(
    tokenHash: string,
    tokenOutputs: TransactNote[],
    treeSortedBalances: TreeBalance[],
  ): SpendingSolutionGroup[] {
    const spendingSolutionGroups: SpendingSolutionGroup[] = [];

    const excludedUTXOIDs: string[] = [];
    const remainingTokenOutputs = [...tokenOutputs];

    while (remainingTokenOutputs.length > 0) {
      const tokenOutput = remainingTokenOutputs[0];
      const outputSpendingSolutionGroups = createSpendingSolutionGroupsForOutput(
        tokenHash,
        treeSortedBalances,
        tokenOutput,
        remainingTokenOutputs,
        excludedUTXOIDs,
      );
      if (!outputSpendingSolutionGroups.length) {
        break;
      }
      spendingSolutionGroups.push(...outputSpendingSolutionGroups);
    }

    if (remainingTokenOutputs.length > 0) {
      // Could not find enough solutions.
      throw consolidateBalanceError();
    }

    if (this.unshieldDataMap[tokenHash]) {
      const unshieldSpendingSolutionGroups = createSpendingSolutionGroupsForUnshield(
        tokenHash,
        treeSortedBalances,
        this.unshieldTotal(tokenHash),
        excludedUTXOIDs,
      );

      if (!unshieldSpendingSolutionGroups.length) {
        throw consolidateBalanceError();
      }

      spendingSolutionGroups.push(...unshieldSpendingSolutionGroups);
    }

    return spendingSolutionGroups;
  }

  /**
   * Generate proofs and return serialized transactions
   * @param prover - prover to use
   * @param wallet - wallet to spend from
   * @param encryptionKey - encryption key for wallet
   * @returns serialized transaction
   */
  async generateTransactions(
    prover: Prover,
    wallet: RailgunWallet,
    encryptionKey: string,
    progressCallback: ProverProgressCallback,
  ): Promise<TransactionStruct[]> {
    const spendingSolutionGroups = await this.generateValidSpendingSolutionGroupsAllOutputs(wallet);
    EngineDebug.log('Actual spending solution groups:');
    EngineDebug.log(
      stringifySafe(
        serializeExtractedSpendingSolutionGroupsData(
          extractSpendingSolutionGroupsData(spendingSolutionGroups),
        ),
      ),
    );

    const individualProgressAmounts: number[] = new Array<number>(
      spendingSolutionGroups.length,
    ).fill(0);
    const updateProgressCallback = () => {
      const averageProgress = averageNumber(individualProgressAmounts);
      progressCallback(averageProgress);
    };

    const proofPromises: Promise<TransactionStruct>[] = spendingSolutionGroups.map(
      (spendingSolutionGroup, index) => {
        const transaction = this.generateTransactionForSpendingSolutionGroup(spendingSolutionGroup);
        const individualProgressCallback = (progress: number) => {
          individualProgressAmounts[index] = progress;
          updateProgressCallback();
        };
        return transaction.prove(
          prover,
          wallet,
          encryptionKey,
          this.overallBatchMinGasPrice,
          individualProgressCallback,
        );
      },
    );
    return Promise.all(proofPromises);
  }

  /**
   * Generate dummy proofs and return serialized transactions
   * @param wallet - wallet to spend from
   * @param encryptionKey - encryption key for wallet
   * @returns serialized transaction
   */
  async generateDummyTransactions(
    prover: Prover,
    wallet: RailgunWallet,
    encryptionKey: string,
  ): Promise<TransactionStruct[]> {
    const spendingSolutionGroups = await this.generateValidSpendingSolutionGroupsAllOutputs(wallet);
    EngineDebug.log(`Dummy spending solution groups:`);
    EngineDebug.log(
      stringifySafe(
        serializeExtractedSpendingSolutionGroupsData(
          extractSpendingSolutionGroupsData(spendingSolutionGroups),
        ),
      ),
    );

    const proofPromises: Promise<TransactionStruct>[] = spendingSolutionGroups.map(
      (spendingSolutionGroup) => {
        const transaction = this.generateTransactionForSpendingSolutionGroup(spendingSolutionGroup);
        return transaction.dummyProve(prover, wallet, encryptionKey, this.overallBatchMinGasPrice);
      },
    );
    return Promise.all(proofPromises);
  }

  generateTransactionForSpendingSolutionGroup(
    spendingSolutionGroup: SpendingSolutionGroup,
  ): Transaction {
    const { spendingTree, utxos, tokenOutputs, unshieldValue, tokenHash } = spendingSolutionGroup;
    const transaction = new Transaction(
      this.chain,
      tokenHash,
      spendingTree,
      utxos,
      tokenOutputs,
      this.adaptID,
    );
    if (this.unshieldDataMap[tokenHash] && unshieldValue > 0) {
      transaction.addUnshieldData(this.unshieldDataMap[tokenHash], unshieldValue);
    }
    return transaction;
  }
}
