import type { AbstractLevelDOWN } from 'abstract-leveldown';
import EventEmitter from 'events';
import { FallbackProvider } from 'ethers';
import { RailgunSmartWalletContract } from './contracts/railgun-smart-wallet/V2/railgun-smart-wallet';
import { RelayAdaptV2Contract } from './contracts/relay-adapt/V2/relay-adapt-v2';
import { Database, DatabaseNamespace } from './database/database';
import { Prover } from './prover/prover';
import { encodeAddress, decodeAddress } from './key-derivation/bech32';
import { ByteLength, formatToByteLength, hexToBigInt, hexlify } from './utils/bytes';
import { RailgunWallet } from './wallet/railgun-wallet';
import EngineDebug from './debugger/debugger';
import { Chain, EngineDebugger } from './models/engine-types';
import {
  Commitment,
  CommitmentType,
  LegacyGeneratedCommitment,
  Nullifier,
  RailgunTransactionV2,
  RailgunTransactionV3,
  RailgunTransactionVersion,
  RailgunTransactionWithHash,
  ShieldCommitment,
} from './models/formatted-types';
import {
  CommitmentEvent,
  EngineEvent,
  GetLatestValidatedRailgunTxid,
  MerkletreeHistoryScanEventData,
  MerkletreeScanStatus,
  QuickSyncEvents,
  QuickSyncRailgunTransactionsV2,
  UnshieldStoredEvent,
} from './models/event-types';
import { ViewOnlyWallet } from './wallet/view-only-wallet';
import { AbstractWallet } from './wallet/abstract-wallet';
import WalletInfo from './wallet/wallet-info';
import {
  addChainSupportsV3,
  assertChainSupportsV3,
  getChainFullNetworkID,
  getChainSupportsV3,
} from './chain/chain';
import { ArtifactGetter } from './models/prover-types';
import { ContractStore } from './contracts/contract-store';
import {
  CURRENT_TXID_V2_MERKLETREE_HISTORY_VERSION,
  CURRENT_UTXO_MERKLETREE_HISTORY_VERSION,
} from './utils/constants';
import { PollingJsonRpcProvider } from './provider/polling-json-rpc-provider';
import { assertIsPollingProvider } from './provider/polling-util';
import { isDefined } from './utils/is-defined';
import { UTXOMerkletree } from './merkletree/utxo-merkletree';
import { TXIDMerkletree } from './merkletree/txid-merkletree';
import { MerklerootValidator } from './models/merkletree-types';
import { delay, isTransactCommitment, promiseTimeout } from './utils';
import {
  calculateRailgunTransactionVerificationHash,
  createRailgunTransactionWithHash,
} from './transaction/railgun-txid';
import {
  ACTIVE_TXID_VERSIONS,
  ACTIVE_UTXO_MERKLETREE_TXID_VERSIONS,
  TXIDVersion,
} from './models/poi-types';
import { getTokenDataHash, getUnshieldTokenHash } from './note/note-util';
import { UnshieldNote } from './note';
import { POI } from './poi';
import { PoseidonMerkleAccumulatorContract } from './contracts/railgun-smart-wallet/V3/poseidon-merkle-accumulator';
import { PoseidonMerkleVerifierContract } from './contracts/railgun-smart-wallet/V3/poseidon-merkle-verifier';
import { TokenVaultContract } from './contracts/railgun-smart-wallet/V3/token-vault-contract';

class RailgunEngine extends EventEmitter {
  readonly db: Database;

  private readonly utxoMerkletrees: { [txidVersion: string]: UTXOMerkletree[][] } = {};

  private readonly txidMerkletrees: { [txidVersion: string]: TXIDMerkletree[][] } = {};

  readonly prover: Prover;

  readonly wallets: { [key: string]: AbstractWallet } = {};

  readonly deploymentBlocks: { [txidVersion: string]: number[][] } = {};

  readonly quickSyncEvents: QuickSyncEvents;

  readonly quickSyncRailgunTransactionsV2: QuickSyncRailgunTransactionsV2;

  readonly validateRailgunTxidMerkleroot: MerklerootValidator;

  readonly getLatestValidatedRailgunTxid: GetLatestValidatedRailgunTxid;

  static walletSource: Optional<string>;

  private readonly skipMerkletreeScans: boolean;

  private readonly pollingRailgunTransactionsV2: boolean[][] = [];

  readonly isPOINode: boolean;

  private constructor(
    walletSource: string,
    leveldown: AbstractLevelDOWN,
    artifactGetter: ArtifactGetter,
    quickSyncEvents: QuickSyncEvents,
    quickSyncRailgunTransactionsV2: QuickSyncRailgunTransactionsV2,
    validateRailgunTxidMerkleroot: Optional<MerklerootValidator>,
    getLatestValidatedRailgunTxid: Optional<GetLatestValidatedRailgunTxid>,
    engineDebugger: Optional<EngineDebugger>,
    skipMerkletreeScans: boolean,
    isPOINode: boolean,
  ) {
    super();

    WalletInfo.setWalletSource(walletSource);
    this.db = new Database(leveldown);
    this.prover = new Prover(artifactGetter);

    this.quickSyncEvents = quickSyncEvents;
    this.quickSyncRailgunTransactionsV2 = quickSyncRailgunTransactionsV2;
    this.validateRailgunTxidMerkleroot = validateRailgunTxidMerkleroot ?? (async () => true);
    this.getLatestValidatedRailgunTxid =
      getLatestValidatedRailgunTxid ??
      (async () => ({ txidIndex: undefined, merkleroot: undefined }));

    if (engineDebugger) {
      EngineDebug.init(engineDebugger);
    }

    this.skipMerkletreeScans = skipMerkletreeScans;
    this.isPOINode = isPOINode;
  }

  /**
   * Create a RAILGUN Engine instance for a RAILGUN-compatible Wallet.
   * @param walletSource - string representing your wallet's name (16 char max, lowercase and numerals only)
   * @param leveldown - abstract-leveldown compatible store
   * @param artifactGetter - async function to retrieve artifacts
   * @param quickSync - quick sync function to speed up sync
   * @param engineDebugger - log and error callbacks for verbose logging
   * @param skipMerkletreeScans - whether to skip UTXO merkletree scans - useful for shield-only interfaces without Railgun wallets.
   * @param isPOINode - run as POI node with full Railgun Txid merkletrees. set to false for all wallet implementations.
   */
  static initForWallet(
    walletSource: string,
    leveldown: AbstractLevelDOWN,
    artifactGetter: ArtifactGetter,
    quickSyncEvents: QuickSyncEvents,
    quickSyncRailgunTransactionsV2: QuickSyncRailgunTransactionsV2,
    validateRailgunTxidMerkleroot: MerklerootValidator,
    getLatestValidatedRailgunTxid: GetLatestValidatedRailgunTxid,
    engineDebugger: Optional<EngineDebugger>,
    skipMerkletreeScans: boolean = false,
  ) {
    return new RailgunEngine(
      walletSource,
      leveldown,
      artifactGetter,
      quickSyncEvents,
      quickSyncRailgunTransactionsV2,
      validateRailgunTxidMerkleroot,
      getLatestValidatedRailgunTxid,
      engineDebugger,
      skipMerkletreeScans,
      false, // isPOINode
    );
  }

  static initForPOINode(
    leveldown: AbstractLevelDOWN,
    artifactGetter: ArtifactGetter,
    quickSyncEvents: QuickSyncEvents,
    quickSyncRailgunTransactionsV2: QuickSyncRailgunTransactionsV2,
    engineDebugger: Optional<EngineDebugger>,
  ) {
    return new RailgunEngine(
      'poinode',
      leveldown,
      artifactGetter,
      quickSyncEvents,
      quickSyncRailgunTransactionsV2,
      undefined, // validateRailgunTxidMerkleroot
      undefined, // getLatestValidatedRailgunTxid
      engineDebugger,
      false, // skipMerkletreeScans
      true, // isPOINode
    );
  }

  static setEngineDebugger = (engineDebugger: EngineDebugger): void => {
    EngineDebug.init(engineDebugger);
  };

  /**
   * Handle new commitment events and kick off balance scan on wallets
   * @param chain - chain type/id for commitments
   * @param treeNumber - tree of commitments
   * @param startingIndex - starting index of commitments
   * @param leaves - commitment data from events
   */
  async commitmentListener(
    txidVersion: TXIDVersion,
    chain: Chain,
    events: CommitmentEvent[],
    shouldUpdateTrees: boolean,
    shouldTriggerV2TxidSync: boolean,
  ): Promise<void> {
    if (this.db.isClosed()) {
      return;
    }
    if (!events.length) {
      return;
    }

    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);

    // eslint-disable-next-line no-restricted-syntax
    for (const event of events) {
      const { treeNumber, startPosition, commitments } = event;
      if (EngineDebug.verboseScanLogging()) {
        EngineDebug.log(
          `[commitmentListener: ${chain.type}:${chain.id}]: ${commitments.length} leaves at ${startPosition}`,
        );
      }
      commitments.forEach((commitment) => {
        // eslint-disable-next-line no-param-reassign
        commitment.txid = formatToByteLength(commitment.txid, ByteLength.UINT_256, false);
      });

      // Queue leaves to merkle tree
      // eslint-disable-next-line no-await-in-loop
      await utxoMerkletree.queueLeaves(treeNumber, startPosition, commitments);
    }

    if (shouldUpdateTrees) {
      await utxoMerkletree.updateTreesFromWriteQueue();
    }

    if (shouldTriggerV2TxidSync) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.triggerDelayedTXIDMerkletreeSyncV2(chain);
    }
  }

  async triggerDelayedTXIDMerkletreeSyncV2(chain: Chain, scanCount: number = 0): Promise<void> {
    // Delay and then trigger a Railgun Txid Merkletree sync.
    if (this.isPOINode) {
      // POI node should scan faster because POI node is the data source for wallets
      await delay(3000);
    } else if (scanCount === 0) {
      // Delay for 10 seconds on first scan for wallet
      await delay(10000);
    } else {
      // Delay for 5 seconds on for subsequent scans for wallet
      await delay(5000);
    }

    await this.syncRailgunTransactionsV2(chain, 'delayed sync after new utxo');

    // Scan for 3 times total
    if (scanCount < 2) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.triggerDelayedTXIDMerkletreeSyncV2(chain, scanCount - 1);
    }
  }

  /**
   * Handle new nullifiers
   * @param chain - chain type/id for nullifiers
   * @param nullifiers - transaction info to nullify commitment
   */
  async nullifierListener(
    txidVersion: TXIDVersion,
    chain: Chain,
    nullifiers: Nullifier[],
  ): Promise<void> {
    if (this.db.isClosed()) {
      return;
    }
    if (!nullifiers.length) {
      return;
    }
    EngineDebug.log(`engine.nullifierListener[${chain.type}:${chain.id}] ${nullifiers.length}`);

    nullifiers.forEach((nullifier) => {
      // eslint-disable-next-line no-param-reassign
      nullifier.txid = formatToByteLength(nullifier.txid, ByteLength.UINT_256, false);
      // eslint-disable-next-line no-param-reassign
      nullifier.nullifier = formatToByteLength(nullifier.nullifier, ByteLength.UINT_256, false);
    });
    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
    await utxoMerkletree.nullify(nullifiers);
  }

  /**
   * Handle new unshield events
   * @param chain - chain type/id
   * @param unshields - unshield events
   */
  async unshieldListener(
    txidVersion: TXIDVersion,
    chain: Chain,
    unshields: UnshieldStoredEvent[],
  ): Promise<void> {
    if (this.db.isClosed()) {
      return;
    }
    if (!unshields.length) {
      return;
    }
    EngineDebug.log(`engine.unshieldListener[${chain.type}:${chain.id}] ${unshields.length}`);
    unshields.forEach((unshield) => {
      // eslint-disable-next-line no-param-reassign
      unshield.txid = formatToByteLength(unshield.txid, ByteLength.UINT_256, false);
    });
    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
    await utxoMerkletree.addUnshieldEvents(unshields);
  }

  /**
   * Handle new railgun transaction events for V3
   * @param chain - chain type/id
   * @param railgunTransactions - railgun transaction events
   */
  async railgunTransactionsV3Listener(
    txidVersion: TXIDVersion,
    chain: Chain,
    railgunTransactions: RailgunTransactionV3[],
  ): Promise<void> {
    if (this.db.isClosed()) {
      return;
    }
    if (!railgunTransactions.length) {
      return;
    }
    if (txidVersion !== TXIDVersion.V3_PoseidonMerkle) {
      throw new Error('Railgun transactions listener only supported for V3 Poseidon Merkle');
    }
    EngineDebug.log(
      `engine.railgunTransactions[${chain.type}:${chain.id}] ${railgunTransactions.length}`,
    );

    await this.handleNewRailgunTransactionsV3(txidVersion, chain, railgunTransactions);
  }

  async getMostRecentValidCommitmentBlock(
    txidVersion: TXIDVersion,
    chain: Chain,
  ): Promise<Optional<number>> {
    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
    const railgunSmartWalletContract =
      ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id];
    const provider = railgunSmartWalletContract.contract.runner?.provider;
    if (!provider) {
      throw new Error('Requires provider for commitment block lookup');
    }

    // Get latest tree
    const firstInvalidMerklerootTree = utxoMerkletree.getFirstInvalidMerklerootTree();
    const searchTree = firstInvalidMerklerootTree ?? (await utxoMerkletree.latestTree());

    // Get latest synced event
    const treeLength = await utxoMerkletree.getTreeLength(searchTree);

    EngineDebug.log(`scanHistory: searchTree ${searchTree}, treeLength ${treeLength}`);

    let startScanningBlock: Optional<number>;

    let latestEventIndex = treeLength - 1;
    while (latestEventIndex >= 0 && !isDefined(startScanningBlock)) {
      // Get block number of last scanned event
      // eslint-disable-next-line no-await-in-loop
      const latestEvent = await utxoMerkletree.getCommitment(searchTree, latestEventIndex);
      if (isDefined(latestEvent)) {
        if (latestEvent.blockNumber) {
          startScanningBlock = latestEvent.blockNumber;
        } else {
          // eslint-disable-next-line no-await-in-loop
          const txReceipt = await provider.getTransactionReceipt(hexlify(latestEvent.txid, true));
          if (txReceipt) {
            startScanningBlock = txReceipt.blockNumber;
          }
        }
      } else {
        EngineDebug.log(
          `Could not find latest event for index ${latestEventIndex}. Trying prior index.`,
        );
      }
      latestEventIndex -= 1;
    }

    return startScanningBlock;
  }

  async getStartScanningBlock(txidVersion: TXIDVersion, chain: Chain): Promise<number> {
    let startScanningBlock = await this.getMostRecentValidCommitmentBlock(txidVersion, chain);
    EngineDebug.log(
      `[${txidVersion}] most recent valid commitment block: ${startScanningBlock ?? 'unknown'}`,
    );
    if (startScanningBlock == null) {
      // If we haven't scanned anything yet, start scanning at deployment block
      startScanningBlock = this.deploymentBlocks[txidVersion]?.[chain.type]?.[chain.id];
      if (!isDefined(startScanningBlock)) {
        throw new Error(
          `Deployment block not defined for ${txidVersion} and chain ${chain.type}:${chain.id}`,
        );
      }
    }
    return startScanningBlock;
  }

  private async performQuickSync(
    txidVersion: TXIDVersion,
    chain: Chain,
    endProgress: number,
    retryCount = 0,
  ) {
    try {
      EngineDebug.log(`[${txidVersion}] quickSync: chain ${chain.type}:${chain.id}`);
      const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);

      const startScanningBlockQuickSync = await this.getStartScanningBlock(txidVersion, chain);
      EngineDebug.log(
        `[${txidVersion}] Start scanning block for QuickSync: ${startScanningBlockQuickSync}`,
      );

      this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, endProgress * 0.1); // 5% / 50%

      // Fetch events
      const { commitmentEvents, unshieldEvents, nullifierEvents, railgunTransactionEvents } =
        await this.quickSyncEvents(txidVersion, chain, startScanningBlockQuickSync);

      if (railgunTransactionEvents) {
        EngineDebug.log(
          `[${txidVersion}] QuickSync railgunTransactionEvents: ${railgunTransactionEvents.length}`,
        );
        await this.handleNewRailgunTransactionsV3(txidVersion, chain, railgunTransactionEvents);
      }

      this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, endProgress * 0.2); // 10% / 50%

      await this.unshieldListener(txidVersion, chain, unshieldEvents);
      await this.nullifierListener(txidVersion, chain, nullifierEvents);

      this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, endProgress * 0.24); // 12% / 50%

      EngineDebug.log(`[${txidVersion}] QuickSync commitments: ${commitmentEvents.length}`);

      // Make sure commitments are scanned after Unshields and Nullifiers.
      await this.commitmentListener(
        txidVersion,
        chain,
        commitmentEvents,
        false, // shouldUpdateTrees - wait until after all commitments added
        false, // shouldTriggerV2TxidSync - not during quick sync
      );

      // Scan after all leaves added.
      if (commitmentEvents.length) {
        this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, endProgress * 0.3); // 15% / 50%
        await utxoMerkletree.updateTreesFromWriteQueue();
        const preScanProgressMultiplier = 0.4;
        this.emitUTXOMerkletreeScanUpdateEvent(
          txidVersion,
          chain,
          endProgress * preScanProgressMultiplier,
        ); // 20% / 50%
        await this.scanAllWallets(txidVersion, chain, (progress: number) => {
          const overallProgress =
            progress * (endProgress - preScanProgressMultiplier) + preScanProgressMultiplier;
          this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, overallProgress); // 20 - 50% / 50%
        });
      }
    } catch (err) {
      if (!(err instanceof Error)) {
        throw err;
      }
      if (retryCount < 1) {
        await this.performQuickSync(txidVersion, chain, endProgress, retryCount + 1);
        return;
      }
      EngineDebug.error(err);
    }
  }

  private emitUTXOMerkletreeScanUpdateEvent(
    txidVersion: TXIDVersion,
    chain: Chain,
    progress: number,
  ) {
    const updateData: MerkletreeHistoryScanEventData = {
      scanStatus: MerkletreeScanStatus.Updated,
      txidVersion,
      chain,
      progress,
    };
    this.emit(EngineEvent.UTXOMerkletreeHistoryScanUpdate, updateData);
  }

  private emitTXIDMerkletreeScanUpdateEvent(
    txidVersion: TXIDVersion,
    chain: Chain,
    progress: number,
  ) {
    const updateData: MerkletreeHistoryScanEventData = {
      scanStatus: MerkletreeScanStatus.Updated,
      txidVersion,
      chain,
      progress,
    };
    this.emit(EngineEvent.TXIDMerkletreeHistoryScanUpdate, updateData);
  }

  async getNextStartingBlockSlowScan(txidVersion: TXIDVersion, chain: Chain): Promise<number> {
    // Get updated start-scanning block from new valid utxoMerkletree.
    let startScanningBlockSlowScan = await this.getStartScanningBlock(txidVersion, chain);
    const lastSyncedBlock = await this.getLastSyncedBlock(txidVersion, chain);
    EngineDebug.log(`[${txidVersion}] lastSyncedBlock: ${lastSyncedBlock ?? 'unknown'}`);
    if (isDefined(lastSyncedBlock) && lastSyncedBlock > startScanningBlockSlowScan) {
      startScanningBlockSlowScan = lastSyncedBlock;
    }
    return startScanningBlockSlowScan;
  }

  /**
   * Scan contract history and sync
   * @param chain - chain type/id to scan
   */
  async scanHistory(chain: Chain) {
    // eslint-disable-next-line no-restricted-syntax
    for (const txidVersion of ACTIVE_TXID_VERSIONS) {
      if (!getChainSupportsV3(chain) && txidVersion === TXIDVersion.V3_PoseidonMerkle) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.scanEventHistory(txidVersion, chain);
    }

    if (this.pollingRailgunTransactionsV2[chain.type]?.[chain.id] !== true) {
      await this.startSyncRailgunTransactionsPollerV2(chain);
    }
  }

  async scanEventHistory(txidVersion: TXIDVersion, chain: Chain) {
    if (this.skipMerkletreeScans) {
      EngineDebug.log(`Skipping merkletree scan: skipMerkletreeScans set on RAILGUN Engine.`);
      return;
    }
    if (!this.hasUTXOMerkletree(txidVersion, chain)) {
      EngineDebug.log(
        `Cannot scan history. UTXO merkletree not yet loaded for ${txidVersion}, chain ${chain.type}:${chain.id}.`,
      );
      return;
    }
    if (!isDefined(ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id])) {
      EngineDebug.log(
        `Cannot scan history. Proxy contract not yet loaded for chain ${chain.type}:${chain.id}.`,
      );
      return;
    }

    const utxoMerkletreeHistoryVersion = await this.getUTXOMerkletreeHistoryVersion(chain);
    if (
      !isDefined(utxoMerkletreeHistoryVersion) ||
      utxoMerkletreeHistoryVersion < CURRENT_UTXO_MERKLETREE_HISTORY_VERSION
    ) {
      await this.clearUTXOMerkletreeAndLoadedWalletsAllTXIDVersions(chain);
      await this.setUTXOMerkletreeHistoryVersion(chain, CURRENT_UTXO_MERKLETREE_HISTORY_VERSION);
    }

    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);

    if (utxoMerkletree.isScanning) {
      // Do not allow multiple simultaneous scans.
      EngineDebug.log('Already scanning. Stopping additional re-scan.');
      return;
    }
    utxoMerkletree.isScanning = true;

    this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, 0.03); // 3%

    const postQuickSyncProgress = 0.5;

    await this.performQuickSync(txidVersion, chain, postQuickSyncProgress);

    this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, postQuickSyncProgress); // 50%

    // Get updated start-scanning block from new valid utxoMerkletree.
    const startScanningBlockSlowScan = await this.getNextStartingBlockSlowScan(txidVersion, chain);
    EngineDebug.log(
      `[${txidVersion}] startScanningBlockSlowScan: ${startScanningBlockSlowScan} (note: continously updated during scan)`,
    );

    const railgunSmartWalletContract =
      ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id];
    if (!railgunSmartWalletContract.contract.runner?.provider) {
      throw new Error('Requires provider for RailgunSmartWallet contract');
    }
    const latestBlock = await railgunSmartWalletContract.contract.runner.provider.getBlockNumber();

    try {
      switch (txidVersion) {
        case TXIDVersion.V2_PoseidonMerkle:
          await this.slowSyncV2(
            chain,
            utxoMerkletree,
            startScanningBlockSlowScan,
            latestBlock,
            postQuickSyncProgress,
          );
          break;
        case TXIDVersion.V3_PoseidonMerkle:
          await this.slowSyncV3(
            chain,
            utxoMerkletree,
            startScanningBlockSlowScan,
            latestBlock,
            postQuickSyncProgress,
          );
          break;
      }

      // Final scan after all leaves added.
      await this.scanAllWallets(txidVersion, chain, undefined);

      this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, 1.0); // 100%

      const scanCompleteData: MerkletreeHistoryScanEventData = {
        scanStatus: MerkletreeScanStatus.Complete,
        txidVersion,
        chain,
      };
      this.emit(EngineEvent.UTXOMerkletreeHistoryScanUpdate, scanCompleteData);
      utxoMerkletree.isScanning = false;
    } catch (err) {
      if (!(err instanceof Error)) {
        throw err;
      }
      EngineDebug.log(`Scan incomplete for chain ${chain.type}:${chain.id}`);
      EngineDebug.error(err);
      await this.scanAllWallets(txidVersion, chain, undefined);
      const scanIncompleteData: MerkletreeHistoryScanEventData = {
        scanStatus: MerkletreeScanStatus.Incomplete,
        txidVersion,
        chain,
      };
      this.emit(EngineEvent.UTXOMerkletreeHistoryScanUpdate, scanIncompleteData);
      utxoMerkletree.isScanning = false;
    }
  }

  async slowSyncV2(
    chain: Chain,
    utxoMerkletree: UTXOMerkletree,
    startScanningBlockSlowScan: number,
    latestBlock: number,
    postQuickSyncProgress: number,
  ) {
    const txidVersion = TXIDVersion.V2_PoseidonMerkle;

    const railgunSmartWalletContract =
      ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id];
    if (!isDefined(railgunSmartWalletContract)) {
      throw new Error('Requires RailgunSmartWallet contract');
    }

    const totalBlocksToScan = latestBlock - startScanningBlockSlowScan;
    EngineDebug.log(`[${txidVersion}] Total blocks to SlowScan: ${totalBlocksToScan}`);

    await railgunSmartWalletContract.getHistoricalEvents(
      startScanningBlockSlowScan,
      latestBlock,
      () => this.getNextStartingBlockSlowScan(txidVersion, chain),
      async (_txidVersion: TXIDVersion, commitmentEvents: CommitmentEvent[]) => {
        await this.commitmentListener(
          txidVersion,
          chain,
          commitmentEvents,
          true, // shouldUpdateTrees
          false, // shouldTriggerV2TxidSync - not during slow sync
        );
      },
      async (_txidVersion: TXIDVersion, nullifiers: Nullifier[]) => {
        await this.nullifierListener(txidVersion, chain, nullifiers);
      },
      async (_txidVersion: TXIDVersion, unshields: UnshieldStoredEvent[]) => {
        await this.unshieldListener(txidVersion, chain, unshields);
      },
      async (syncedBlock: number) => {
        const scannedBlocks = syncedBlock - startScanningBlockSlowScan;
        const progress =
          postQuickSyncProgress +
          ((1 - postQuickSyncProgress - 0.05) * scannedBlocks) / totalBlocksToScan;
        this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, progress);

        if (utxoMerkletree.getFirstInvalidMerklerootTree() != null) {
          // Do not save lastSyncedBlock in case of merkleroot error.
          // This will force a scan from the last valid commitment on next run.
          return;
        }
        await this.setLastSyncedBlock(txidVersion, chain, syncedBlock);
      },
    );
  }

  async slowSyncV3(
    chain: Chain,
    utxoMerkletree: UTXOMerkletree,
    startScanningBlockSlowScan: number,
    latestBlock: number,
    postQuickSyncProgress: number,
  ) {
    const txidVersion = TXIDVersion.V3_PoseidonMerkle;

    const poseidonMerkleAccumulatorV3Contract =
      ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type]?.[chain.id];
    if (!isDefined(poseidonMerkleAccumulatorV3Contract)) {
      throw new Error('Requires V3PoseidonMerkleAccumulator contract');
    }

    const totalBlocksToScan = latestBlock - startScanningBlockSlowScan;
    EngineDebug.log(`[${txidVersion}] Total blocks to SlowScan: ${totalBlocksToScan}`);

    await poseidonMerkleAccumulatorV3Contract.getHistoricalEvents(
      startScanningBlockSlowScan,
      latestBlock,
      () => this.getNextStartingBlockSlowScan(txidVersion, chain),
      async (_txidVersion: TXIDVersion, commitmentEvents: CommitmentEvent[]) => {
        await this.commitmentListener(
          txidVersion,
          chain,
          commitmentEvents,
          true, // shouldUpdateTrees
          false, // shouldTriggerV2TxidSync - not during slow sync (or V3)
        );
      },
      async (_txidVersion: TXIDVersion, nullifiers: Nullifier[]) => {
        await this.nullifierListener(txidVersion, chain, nullifiers);
      },
      async (_txidVersion: TXIDVersion, unshields: UnshieldStoredEvent[]) => {
        await this.unshieldListener(txidVersion, chain, unshields);
      },
      async (_txidVersion: TXIDVersion, railgunTransactions: RailgunTransactionV3[]) => {
        await this.railgunTransactionsV3Listener(txidVersion, chain, railgunTransactions);
      },
      async (syncedBlock: number) => {
        const scannedBlocks = syncedBlock - startScanningBlockSlowScan;
        const progress =
          postQuickSyncProgress +
          ((1 - postQuickSyncProgress - 0.05) * scannedBlocks) / totalBlocksToScan;
        this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, progress);

        if (utxoMerkletree.getFirstInvalidMerklerootTree() != null) {
          // Do not save lastSyncedBlock in case of merkleroot error.
          // This will force a scan from the last valid commitment on next run.
          return;
        }
        await this.setLastSyncedBlock(txidVersion, chain, syncedBlock);
      },
    );
  }

  async startSyncRailgunTransactionsPollerV2(chain: Chain) {
    const txidVersion = TXIDVersion.V2_PoseidonMerkle;

    if (!this.hasTXIDMerkletree(txidVersion, chain)) {
      EngineDebug.log(
        `Cannot sync txids. Txid merkletree not yet loaded for chain ${chain.type}:${chain.id}.`,
      );
      return;
    }
    // Every 1 min for POI nodes, 2 min for wallets
    const refreshDelayMsec = this.isPOINode ? 1 * 60 * 1000 : 2 * 60 * 1000;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.syncRailgunTransactionsPollerV2(chain, refreshDelayMsec);

    this.pollingRailgunTransactionsV2[chain.type] ??= [];
    this.pollingRailgunTransactionsV2[chain.type][chain.id] = true;
  }

  private async syncRailgunTransactionsPollerV2(chain: Chain, refreshDelayMsec: number) {
    const poll = async () => {
      await this.syncRailgunTransactionsV2(chain, 'poller');
      await delay(refreshDelayMsec);
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      await poll();
    }
  }

  /**
   * Sync Railgun txid merkletree.
   * @param chain - chain type/id to scan
   */
  async syncRailgunTransactionsV2(chain: Chain, trigger: string) {
    const txidVersion = TXIDVersion.V2_PoseidonMerkle;

    if (!this.hasTXIDMerkletree(txidVersion, chain)) {
      EngineDebug.log(
        `Cannot sync txids. Txid merkletree not yet loaded for chain ${chain.type}:${chain.id}.`,
      );
      return;
    }

    const txidV2MerkletreeHistoryVersion = await this.getTxidV2MerkletreeHistoryVersion(chain);
    if (
      !isDefined(txidV2MerkletreeHistoryVersion) ||
      txidV2MerkletreeHistoryVersion < CURRENT_TXID_V2_MERKLETREE_HISTORY_VERSION
    ) {
      await this.clearTXIDMerkletree(txidVersion, chain);
      await this.setTxidV2MerkletreeHistoryVersion(
        chain,
        CURRENT_TXID_V2_MERKLETREE_HISTORY_VERSION,
      );
    }

    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    if (txidMerkletree.isScanning) {
      // Do not allow multiple simultaneous scans.
      EngineDebug.log('[Txid] Already syncing. Stopping additional re-sync.');
      return;
    }
    txidMerkletree.isScanning = true;

    await this.performSyncRailgunTransactionsV2(chain, trigger);

    txidMerkletree.isScanning = false;
  }

  private async shouldAddNewRailgunTransactions(
    txidVersion: TXIDVersion,
    chain: Chain,
    latestValidatedTxidIndex: Optional<number>,
  ): Promise<boolean> {
    if (!isDefined(latestValidatedTxidIndex)) {
      return true;
    }

    const { txidIndex: latestTxidIndex } = await this.getLatestRailgunTxidData(txidVersion, chain);
    const isAheadOfValidatedTxids =
      !isDefined(latestValidatedTxidIndex) || latestTxidIndex >= latestValidatedTxidIndex;

    return !isAheadOfValidatedTxids;
  }

  private async getLatestValidatedTxidIndex(
    txidVersion: TXIDVersion,
    chain: Chain,
  ): Promise<Optional<number>> {
    if (this.isPOINode) {
      return undefined;
    }

    // TODO: Optimization - use this merkleroot from validated railgun txid to auto-validate merkletree.
    const { txidIndex: latestValidatedTxidIndex /* merkleroot */ } =
      await this.getLatestValidatedRailgunTxid(txidVersion, chain);

    return latestValidatedTxidIndex;
  }

  private async performSyncRailgunTransactionsV2(chain: Chain, trigger: string): Promise<void> {
    const txidVersion = TXIDVersion.V2_PoseidonMerkle;

    try {
      EngineDebug.log(
        `sync railgun txids: chain ${chain.type}:${chain.id}: triggered by ${trigger}`,
      );

      this.emitTXIDMerkletreeScanUpdateEvent(txidVersion, chain, 0.03); // 3%

      this.emitTXIDMerkletreeScanUpdateEvent(txidVersion, chain, 0.15); // 15%

      const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
      const latestRailgunTransaction: Optional<RailgunTransactionWithHash> =
        await txidMerkletree.getLatestRailgunTransaction();
      if (
        latestRailgunTransaction &&
        latestRailgunTransaction.version !== RailgunTransactionVersion.V2
      ) {
        // Should never happen
        return;
      }

      const railgunTransactions: RailgunTransactionV2[] = await this.quickSyncRailgunTransactionsV2(
        chain,
        latestRailgunTransaction?.graphID,
      );

      const txidMerkletreeStartScanPercentage = 0.4; // 40%
      const txidMerkletreeEndScanPercentage = 0.99; // 99%
      this.emitTXIDMerkletreeScanUpdateEvent(txidVersion, chain, txidMerkletreeStartScanPercentage);

      await this.handleNewRailgunTransactionsV2(
        txidVersion,
        chain,
        railgunTransactions,
        latestRailgunTransaction?.verificationHash,
        txidMerkletreeStartScanPercentage,
        txidMerkletreeEndScanPercentage,
      );

      const scanCompleteData: MerkletreeHistoryScanEventData = {
        scanStatus: MerkletreeScanStatus.Complete,
        txidVersion,
        chain,
      };

      if (railgunTransactions.length) {
        // Scan wallets - kicks off a POI refresh.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.scanAllWallets(txidVersion, chain, () => {});

        if (railgunTransactions.length === 5000) {
          // Max query amount is 5000 from Wallet. Kick off any query.
          await this.performSyncRailgunTransactionsV2(chain, 'retrigger after 5000 synced');
          return;
        }
      }

      // Finish
      this.emit(EngineEvent.TXIDMerkletreeHistoryScanUpdate, scanCompleteData);
    } catch (err) {
      if (!(err instanceof Error)) {
        throw err;
      }
      EngineDebug.error(err);

      const scanIncompleteData: MerkletreeHistoryScanEventData = {
        scanStatus: MerkletreeScanStatus.Incomplete,
        txidVersion,
        chain,
      };
      this.emit(EngineEvent.TXIDMerkletreeHistoryScanUpdate, scanIncompleteData);
    }
  }

  async handleNewRailgunTransactionsV2(
    txidVersion: TXIDVersion,
    chain: Chain,
    railgunTransactions: RailgunTransactionV2[],
    latestVerificationHash: Optional<string>,
    startScanPercentage: number,
    endScanPercentage: number,
  ) {
    const latestValidatedTxidIndex = await this.getLatestValidatedTxidIndex(txidVersion, chain);
    EngineDebug.log(
      `syncing railgun transactions to validated index: ${latestValidatedTxidIndex ?? 'NOT FOUND'}`,
    );

    const shouldAddNewRailgunTransactions = await this.shouldAddNewRailgunTransactions(
      txidVersion,
      chain,
      latestValidatedTxidIndex,
    );
    if (!shouldAddNewRailgunTransactions) {
      EngineDebug.log(
        `Skipping queue of Railgun TXIDs - already synced to validated index: ${
          latestValidatedTxidIndex ?? 0
        }`,
      );
      const scanCompleteData: MerkletreeHistoryScanEventData = {
        scanStatus: MerkletreeScanStatus.Complete,
        progress: 1,
        txidVersion,
        chain,
      };
      this.emit(EngineEvent.TXIDMerkletreeHistoryScanUpdate, scanCompleteData);
      return;
    }

    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);

    const v2BlockNumber = RailgunSmartWalletContract.getEngineV2StartBlockNumber(chain);

    const toQueue: RailgunTransactionWithHash[] = [];

    let previousVerificationHash = latestVerificationHash;

    const emitNewRailgunTransactionsProgress = (progress: number) => {
      const overallProgress =
        progress * (endScanPercentage - startScanPercentage) + startScanPercentage;
      this.emitTXIDMerkletreeScanUpdateEvent(txidVersion, chain, overallProgress);
    };

    const railgunTransactionsLength = railgunTransactions.length;

    // eslint-disable-next-line no-restricted-syntax
    for (const [index, railgunTransaction] of railgunTransactions.entries()) {
      const railgunTransactionWithTxid = createRailgunTransactionWithHash(railgunTransaction);
      if (railgunTransactionWithTxid.version !== RailgunTransactionVersion.V2) {
        return;
      }

      const {
        commitments,
        nullifiers,
        txid,
        unshield,
        railgunTxid,
        utxoTreeOut: tree,
        utxoBatchStartPositionOut,
        blockNumber,
        timestamp,
        verificationHash,
      } = railgunTransactionWithTxid;

      // Update existing commitments/unshield events.
      // If any commitments are missing, wait for UTXO tree to sync first.

      const unshieldCommitment: Optional<string> = unshield
        ? commitments[commitments.length - 1]
        : undefined;
      const standardCommitments: string[] = unshield ? commitments.slice(0, -1) : commitments;

      let missingAnyCommitments = false;

      // No Unshield events exist pre-V2.
      const isPreV2 = blockNumber < v2BlockNumber;

      if (isDefined(unshieldCommitment) && unshield) {
        const unshieldTokenHash = getTokenDataHash(unshield.tokenData);

        if (isPreV2) {
          // V2 does not have unshield events. Add a new stored Unshield event.

          // Pre-V2 always had a 25n basis points fee for unshields.
          const preV2FeeBasisPoints = 25n;
          const { fee, amount } = UnshieldNote.getAmountFeeFromValue(
            hexToBigInt(unshield.value),
            preV2FeeBasisPoints,
          );

          const unshieldEvent: UnshieldStoredEvent = {
            txid,
            tokenAddress: unshield.tokenData.tokenAddress,
            tokenType: unshield.tokenData.tokenType,
            tokenSubID: unshield.tokenData.tokenSubID,
            toAddress: unshield.toAddress,
            amount: amount.toString(),
            fee: fee.toString(),
            blockNumber,
            railgunTxid,
            timestamp,
            eventLogIndex: undefined, // Does not exist for txid subgraph, which is generated through calldata
            poisPerList: undefined,
          };

          // eslint-disable-next-line no-await-in-loop
          await utxoMerkletree.addUnshieldEvents([unshieldEvent]);
        } else {
          // V2 has unshield events. Map to existing event.

          // eslint-disable-next-line no-await-in-loop
          const unshieldEventsForTxid = await utxoMerkletree.getAllUnshieldEventsForTxid(txid);
          const matchingUnshieldEvent = unshieldEventsForTxid.find((unshieldEvent) => {
            const tokenHash = getUnshieldTokenHash(unshieldEvent);
            return tokenHash === unshieldTokenHash;
          });
          if (matchingUnshieldEvent) {
            if (matchingUnshieldEvent.railgunTxid !== railgunTxid) {
              matchingUnshieldEvent.railgunTxid = railgunTxid;
              // eslint-disable-next-line no-await-in-loop
              await utxoMerkletree.updateUnshieldEvent(matchingUnshieldEvent);
            }
          } else {
            EngineDebug.log(
              `Missing unshield from TXID scan: txid ${txid}, token ${
                unshieldTokenHash ?? 'UNKNOWN'
              }`,
            );
            missingAnyCommitments = true;
          }
        }
      }

      // eslint-disable-next-line no-restricted-syntax
      for (let i = 0; i < standardCommitments.length; i += 1) {
        const position = utxoBatchStartPositionOut + i;
        // eslint-disable-next-line no-await-in-loop
        const commitment = await utxoMerkletree.getCommitmentSafe(tree, position);
        if (isDefined(commitment)) {
          if (isTransactCommitment(commitment) && commitment.railgunTxid !== railgunTxid) {
            commitment.railgunTxid = railgunTxid;
            // eslint-disable-next-line no-await-in-loop
            await utxoMerkletree.updateData(tree, position, commitment);
          }
        } else {
          missingAnyCommitments = true;
          EngineDebug.log(`Missing commitment from TXID scan: UTXO ${tree}:${position}.`);
          break;
        }
      }

      if (missingAnyCommitments) {
        EngineDebug.log(
          `Stopping queue of Railgun TXIDs - missing a commitment or unshield. This will occur whenever the TXIDs are further than the UTXOs data source.`,
        );
        break;
      }

      const expectedVerificationHash = calculateRailgunTransactionVerificationHash(
        previousVerificationHash,
        nullifiers[0],
      );

      if (expectedVerificationHash !== verificationHash) {
        EngineDebug.error(
          new Error(
            `Stopping queue of Railgun TXIDs - Invalid verification hash. This occurs very rarely during a chain re-org and will resolve itself in minutes.`,
          ),
        );
        // Clear 10 leaves to allow for re-org to resolve.
        const numLeavesToClear = 10;
        // eslint-disable-next-line no-await-in-loop
        await txidMerkletree.clearLeavesForInvalidVerificationHash(numLeavesToClear);
        break;
      }

      previousVerificationHash = expectedVerificationHash;

      toQueue.push(railgunTransactionWithTxid);

      // Only emit progress every 30 TXIDs.
      if (index % 30 === 0) {
        const progress = index / railgunTransactionsLength;
        emitNewRailgunTransactionsProgress(progress);
      }
    }

    await txidMerkletree.queueRailgunTransactions(toQueue, latestValidatedTxidIndex);
    await txidMerkletree.updateTreesFromWriteQueue();
  }

  async handleNewRailgunTransactionsV3(
    txidVersion: TXIDVersion,
    chain: Chain,
    railgunTransactions: RailgunTransactionV3[],
  ) {
    const latestValidatedTxidIndex = await this.getLatestValidatedTxidIndex(txidVersion, chain);
    EngineDebug.log(
      `syncing railgun transactions to validated index: ${latestValidatedTxidIndex ?? 'NOT FOUND'}`,
    );

    const shouldAddNewRailgunTransactions = await this.shouldAddNewRailgunTransactions(
      txidVersion,
      chain,
      latestValidatedTxidIndex,
    );
    if (!shouldAddNewRailgunTransactions) {
      EngineDebug.log(
        `Skipping queue of Railgun TXIDs - already synced to validated index: ${
          latestValidatedTxidIndex ?? 0
        }`,
      );
      const scanCompleteData: MerkletreeHistoryScanEventData = {
        scanStatus: MerkletreeScanStatus.Complete,
        progress: 1,
        txidVersion,
        chain,
      };
      this.emit(EngineEvent.TXIDMerkletreeHistoryScanUpdate, scanCompleteData);
      return;
    }

    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);

    const toQueue: RailgunTransactionWithHash[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const railgunTransaction of railgunTransactions) {
      const railgunTransactionWithTxid = createRailgunTransactionWithHash(railgunTransaction);

      // TODO-V3: Calculate and verify verificationHash on RailgunTransactionV3.

      toQueue.push(railgunTransactionWithTxid);
    }

    await txidMerkletree.queueRailgunTransactions(toQueue, latestValidatedTxidIndex);
    await txidMerkletree.updateTreesFromWriteQueue();
  }

  async validateHistoricalRailgunTxidMerkleroot(
    txidVersion: TXIDVersion,
    chain: Chain,
    tree: number,
    index: number,
    merkleroot: string,
  ): Promise<boolean> {
    const historicalMerkleroot = await this.getHistoricalRailgunTxidMerkleroot(
      txidVersion,
      chain,
      tree,
      index,
    );
    return historicalMerkleroot === merkleroot;
  }

  async validateRailgunTxidOccurredBeforeBlockNumber(
    txidVersion: TXIDVersion,
    chain: Chain,
    tree: number,
    index: number,
    blockNumber: number,
  ): Promise<boolean> {
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    return txidMerkletree.railgunTxidOccurredBeforeBlockNumber(tree, index, blockNumber);
  }

  async getHistoricalRailgunTxidMerkleroot(
    txidVersion: TXIDVersion,
    chain: Chain,
    tree: number,
    index: number,
  ): Promise<Optional<string>> {
    if (!this.isPOINode) {
      throw new Error('Only POI nodes process historical merkleroots');
    }
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    const historicalMerkleroot = await txidMerkletree.getHistoricalMerkleroot(tree, index);
    return historicalMerkleroot;
  }

  async getGlobalUTXOTreePositionForRailgunTransactionCommitment(
    txidVersion: TXIDVersion,
    chain: Chain,
    tree: number,
    index: number,
    commitmentHash: string,
  ) {
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    return txidMerkletree.getGlobalUTXOTreePositionForRailgunTransactionCommitment(
      tree,
      index,
      commitmentHash,
    );
  }

  async getLatestRailgunTxidData(
    txidVersion: TXIDVersion,
    chain: Chain,
  ): Promise<{ txidIndex: number; merkleroot: string }> {
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    const { tree, index } = await txidMerkletree.getLatestTreeAndIndex();
    const merkleroot = await txidMerkletree.getRoot(tree);
    const txidIndex = TXIDMerkletree.getGlobalPosition(tree, index);
    return { txidIndex, merkleroot };
  }

  /**
   * Clears all merkletree leaves stored in database.
   * @param chain - chain type/id to clear
   */
  async clearSyncedUTXOMerkletreeLeavesAllTXIDVersions(chain: Chain) {
    // eslint-disable-next-line no-restricted-syntax
    for (const txidVersion of Object.values(TXIDVersion)) {
      if (!getChainSupportsV3(chain) && txidVersion === TXIDVersion.V3_PoseidonMerkle) {
        continue;
      }

      const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
      // eslint-disable-next-line no-await-in-loop
      await utxoMerkletree.clearDataForMerkletree();
      // eslint-disable-next-line no-await-in-loop
      await this.db.clearNamespace(RailgunEngine.getLastSyncedBlockDBPrefix(txidVersion, chain));
    }
  }

  private async clearUTXOMerkletreeAndLoadedWalletsAllTXIDVersions(chain: Chain) {
    await this.clearSyncedUTXOMerkletreeLeavesAllTXIDVersions(chain);
    await Promise.all(
      this.allWallets().map((wallet) => wallet.clearScannedBalancesAllTXIDVersions(chain)),
    );
  }

  private async clearSyncedUnshieldEvents(txidVersion: TXIDVersion, chain: Chain) {
    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
    await this.db.clearNamespace(
      // All Unshields
      utxoMerkletree.getUnshieldEventsDBPath(undefined, undefined, undefined),
    );
  }

  private async clearTXIDMerkletree(txidVersion: TXIDVersion, chain: Chain) {
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    await txidMerkletree.clearDataForMerkletree();
    txidMerkletree.savedPOILaunchSnapshot = false;
  }

  /**
   * Clears stored merkletree leaves and wallet balances, and re-scans fully.
   * @param chain - chain type/id to rescan
   * @param forceRescanDevOnly - can corrupt an existing scan, so only recommended in extreme cases (DEV only)
   */
  async fullRescanUTXOMerkletreesAndWallets(chain: Chain, forceRescanDevOnly = false) {
    // eslint-disable-next-line no-restricted-syntax
    for (const txidVersion of ACTIVE_TXID_VERSIONS) {
      if (!getChainSupportsV3(chain) && txidVersion === TXIDVersion.V3_PoseidonMerkle) {
        continue;
      }

      if (!this.hasUTXOMerkletree(txidVersion, chain)) {
        const err = new Error(
          `Cannot re-scan history. Merkletree not yet loaded for ${txidVersion}, chain ${chain.type}:${chain.id}.`,
        );
        EngineDebug.error(err);
        throw err;
      }
      const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
      if (utxoMerkletree.isScanning && !forceRescanDevOnly) {
        const err = new Error(`Full rescan already in progress.`);
        EngineDebug.error(err);
        throw err;
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const txidVersion of ACTIVE_TXID_VERSIONS) {
      if (!getChainSupportsV3(chain) && txidVersion === TXIDVersion.V3_PoseidonMerkle) {
        continue;
      }

      const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);

      this.emitUTXOMerkletreeScanUpdateEvent(txidVersion, chain, 0.01); // 1%
      utxoMerkletree.isScanning = true; // Don't allow scans while removing leaves.
      // eslint-disable-next-line no-await-in-loop
      await this.clearUTXOMerkletreeAndLoadedWalletsAllTXIDVersions(chain);
      // eslint-disable-next-line no-await-in-loop
      await this.clearSyncedUnshieldEvents(txidVersion, chain);
      utxoMerkletree.isScanning = false; // Clear before calling scanHistory.

      if (txidVersion !== TXIDVersion.V2_PoseidonMerkle) {
        // Clear TXID data before syncing fresh from Event History (V3).
        // eslint-disable-next-line no-await-in-loop
        await this.clearTXIDMerkletreeData(txidVersion, chain);
      }

      // eslint-disable-next-line no-await-in-loop
      await this.scanEventHistory(txidVersion, chain);

      if (txidVersion === TXIDVersion.V2_PoseidonMerkle) {
        // Must reset txid merkletree which is mapped to UTXO commitments in V2.
        // eslint-disable-next-line no-await-in-loop
        await this.fullResetTXIDMerkletreesV2(chain);
      }
    }
  }

  async fullResetTXIDMerkletreesV2(chain: Chain): Promise<void> {
    const txidVersion = TXIDVersion.V2_PoseidonMerkle;

    if (!this.hasTXIDMerkletree(txidVersion, chain)) {
      return;
    }
    if (this.pollingRailgunTransactionsV2[chain.type]?.[chain.id] !== true) {
      const err = new Error(
        `Cannot re-scan railgun txids. Must get UTXO history first. Please wait and try again.`,
      );
      EngineDebug.error(err);
      throw err;
    }

    await this.clearTXIDMerkletreeData(txidVersion, chain);
    await this.syncRailgunTransactionsV2(chain, 'full txid reset');
  }

  async clearTXIDMerkletreeData(txidVersion: TXIDVersion, chain: Chain) {
    // eslint-disable-next-line no-restricted-syntax
    if (!getChainSupportsV3(chain) && txidVersion === TXIDVersion.V3_PoseidonMerkle) {
      return;
    }

    const hasMerkletree = this.hasTXIDMerkletree(txidVersion, chain);
    if (!hasMerkletree) {
      const err = new Error(
        `Cannot re-scan railgun txids. Merkletree not yet loaded for chain ${chain.type}:${chain.id}.`,
      );
      EngineDebug.error(err);
      throw err;
    }
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    if (txidMerkletree.isScanning) {
      const err = new Error(`Full reset of txids already in progress.`);
      EngineDebug.error(err);
      throw err;
    }

    txidMerkletree.isScanning = true; // Don't allow scans while removing leaves.
    // eslint-disable-next-line no-await-in-loop
    await txidMerkletree.clearDataForMerkletree();
    txidMerkletree.savedPOILaunchSnapshot = false;
    txidMerkletree.isScanning = false; // Clear before calling syncRailgunTransactions.
    // eslint-disable-next-line no-await-in-loop

    if (txidVersion !== TXIDVersion.V2_PoseidonMerkle) {
      // For V3, clear the last-synced block to force a full quicksync scan.
      await this.db.clearNamespace(RailgunEngine.getLastSyncedBlockDBPrefix(txidVersion, chain));
    }
  }

  async resetRailgunTxidsAfterTxidIndex(
    txidVersion: TXIDVersion,
    chain: Chain,
    txidIndex: number,
  ): Promise<void> {
    const txidMerkletree = this.getTXIDMerkletree(txidVersion, chain);
    txidMerkletree.isScanning = true; // Don't allow scans while removing leaves.
    await txidMerkletree.clearLeavesAfterTxidIndex(txidIndex);
    txidMerkletree.isScanning = false; // Clear before calling syncRailgunTransactions.
    await this.syncRailgunTransactionsV2(chain, 'reset after txid index');
  }

  private static async validateMerkleroot(
    txidVersion: TXIDVersion,
    chain: Chain,
    tree: number,
    _index: number,
    merkleroot: string,
  ) {
    switch (txidVersion) {
      case TXIDVersion.V2_PoseidonMerkle:
        return ContractStore.railgunSmartWalletContracts[chain.type]?.[
          chain.id
        ]?.validateMerkleroot(tree, merkleroot);

      case TXIDVersion.V3_PoseidonMerkle:
        return ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type]?.[
          chain.id
        ]?.validateMerkleroot(tree, merkleroot);
    }
    return false;
  }

  /**
   * Load network
   * @param railgunSmartWalletContractAddress - address of railgun instance (proxy contract)
   * @param relayAdaptV2ContractAddress - address of railgun instance (proxy contract)
   * @param provider - ethers provider for network
   * @param deploymentBlock - block number to start scanning from
   */
  async loadNetwork(
    chain: Chain,
    railgunSmartWalletContractAddress: string,
    relayAdaptV2ContractAddress: string,
    poseidonMerkleAccumulatorV3Address: string,
    poseidonMerkleVerifierV3Address: string,
    tokenVaultV3Address: string,
    defaultProvider: PollingJsonRpcProvider | FallbackProvider,
    pollingProvider: PollingJsonRpcProvider,
    deploymentBlocks: Record<TXIDVersion, number>,
    poiLaunchBlock: Optional<number>,
    supportsV3: boolean,
  ) {
    EngineDebug.log(`loadNetwork: ${chain.type}:${chain.id}`);

    try {
      await promiseTimeout(
        defaultProvider.getBlockNumber(),
        10000,
        'Timed out waiting for default RPC provider to connect.',
      );
    } catch (err) {
      EngineDebug.error(err as Error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      throw new Error(err.message);
    }

    assertIsPollingProvider(pollingProvider);
    try {
      await promiseTimeout(
        pollingProvider.getBlockNumber(),
        10000,
        'Timed out waiting for polling RPC provider to connect.',
      );
    } catch (err) {
      EngineDebug.error(err as Error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      throw new Error(err.message);
    }

    if (supportsV3) {
      addChainSupportsV3(chain);
    }

    const hasAnyMerkletree = ACTIVE_TXID_VERSIONS.every(
      (txidVersion) =>
        !this.hasUTXOMerkletree(txidVersion, chain) && !this.hasTXIDMerkletree(txidVersion, chain),
    );
    const hasSmartWalletContract = isDefined(
      ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id],
    );
    const hasRelayAdaptV2Contract = isDefined(
      ContractStore.relayAdaptV2Contracts[chain.type]?.[chain.id],
    );
    const hasPoseidonMerkleAccumulatorV3Contract = isDefined(
      ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type]?.[chain.id],
    );
    const hasPoseidonMerkleVerifierV3Contract = isDefined(
      ContractStore.poseidonMerkleVerifierV3Contracts[chain.type]?.[chain.id],
    );
    const hasTokenVaultV3Contract = isDefined(
      ContractStore.tokenVaultV3Contracts[chain.type]?.[chain.id],
    );
    if (
      hasAnyMerkletree ||
      hasSmartWalletContract ||
      hasRelayAdaptV2Contract ||
      hasPoseidonMerkleAccumulatorV3Contract ||
      hasPoseidonMerkleVerifierV3Contract ||
      hasTokenVaultV3Contract
    ) {
      // If a network with this chainID exists, unload it and load the provider as a new network
      await this.unloadNetwork(chain);
    }

    // Create contract instances
    ContractStore.railgunSmartWalletContracts[chain.type] ??= [];
    ContractStore.railgunSmartWalletContracts[chain.type][chain.id] =
      new RailgunSmartWalletContract(
        railgunSmartWalletContractAddress,
        defaultProvider,
        pollingProvider,
        chain,
      );

    ContractStore.relayAdaptV2Contracts[chain.type] ??= [];
    ContractStore.relayAdaptV2Contracts[chain.type][chain.id] = new RelayAdaptV2Contract(
      relayAdaptV2ContractAddress,
      defaultProvider,
    );

    if (supportsV3) {
      ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type] ??= [];
      ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type][chain.id] =
        new PoseidonMerkleAccumulatorContract(
          poseidonMerkleAccumulatorV3Address,
          defaultProvider,
          pollingProvider,
          chain,
        );

      ContractStore.poseidonMerkleVerifierV3Contracts[chain.type] ??= [];
      ContractStore.poseidonMerkleVerifierV3Contracts[chain.type][chain.id] =
        new PoseidonMerkleVerifierContract(poseidonMerkleVerifierV3Address, defaultProvider);

      ContractStore.tokenVaultV3Contracts[chain.type] ??= [];
      ContractStore.tokenVaultV3Contracts[chain.type][chain.id] = new TokenVaultContract(
        tokenVaultV3Address,
        defaultProvider,
      );
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const txidVersion of ACTIVE_UTXO_MERKLETREE_TXID_VERSIONS) {
      // Create utxo merkletrees
      this.utxoMerkletrees[txidVersion] ??= [];
      this.utxoMerkletrees[txidVersion][chain.type] ??= [];

      // eslint-disable-next-line no-await-in-loop
      const utxoMerkletree = await UTXOMerkletree.create(
        this.db,
        chain,
        txidVersion,
        // eslint-disable-next-line @typescript-eslint/no-shadow
        (txidVersion, chain, tree, index, merkleroot) =>
          RailgunEngine.validateMerkleroot(txidVersion, chain, tree, index, merkleroot),
      );
      this.utxoMerkletrees[txidVersion][chain.type][chain.id] = utxoMerkletree;

      // Load utxo merkletree to all wallets
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        Object.values(this.wallets).map(async (wallet) => {
          await wallet.loadUTXOMerkletree(txidVersion, utxoMerkletree);
        }),
      );

      // Create railgun txid merkletrees
      this.txidMerkletrees[txidVersion] ??= [];
      this.txidMerkletrees[txidVersion][chain.type] ??= [];

      let txidMerkletree: Optional<TXIDMerkletree>;

      if (isDefined(poiLaunchBlock) || supportsV3) {
        if (isDefined(poiLaunchBlock)) {
          POI.setLaunchBlock(chain, poiLaunchBlock);
        }

        if (this.isPOINode) {
          // POI Node Txid merkletree
          // eslint-disable-next-line no-await-in-loop
          txidMerkletree = await TXIDMerkletree.createForPOINode(this.db, chain, txidVersion);
          this.txidMerkletrees[txidVersion][chain.type][chain.id] = txidMerkletree;
        } else {
          // Wallet Txid merkletree

          // TODO-V3: If the poiLaunchBlock is newly set, old TXID merkletrees may not set the correct snapshot.
          // Make sure to clear the TXID merkletree when poiLaunchBlock is first set for this chain.
          // (Store the poiLaunchBlock in the TXID Merkletree db).

          const autoValidate = async () => true;

          // eslint-disable-next-line no-await-in-loop
          txidMerkletree = await TXIDMerkletree.createForWallet(
            this.db,
            chain,
            txidVersion,
            // For V3, we receive events in realtime, and validation is done via on-chain verificationHash field.
            supportsV3 ? autoValidate : this.validateRailgunTxidMerkleroot,
          );
          this.txidMerkletrees[txidVersion][chain.type][chain.id] = txidMerkletree;
        }

        if (isDefined(txidMerkletree)) {
          // Load txid merkletree to all wallets
          Object.values(this.wallets).forEach((wallet) => {
            wallet.loadRailgunTXIDMerkletree(txidVersion, txidMerkletree as TXIDMerkletree);
          });
        }
      }

      // Set deployment block for txidVersion
      this.deploymentBlocks[txidVersion] ??= [];
      this.deploymentBlocks[txidVersion][chain.type] ??= [];
      this.deploymentBlocks[txidVersion][chain.type][chain.id] = deploymentBlocks[txidVersion];
    }

    if (this.skipMerkletreeScans) {
      return;
    }

    // Set up listeners
    const commitmentListener = async (
      txidVersion: TXIDVersion,
      commitmentEvents: CommitmentEvent[],
    ) => {
      await this.commitmentListener(
        txidVersion,
        chain,
        commitmentEvents,
        true, // shouldUpdateTrees
        txidVersion === TXIDVersion.V2_PoseidonMerkle, // shouldTriggerV2TxidSync - only for live listener events on V2
      );
      await this.scanAllWallets(txidVersion, chain, undefined);
    };
    const nullifierListener = async (txidVersion: TXIDVersion, nullifiers: Nullifier[]) => {
      await this.nullifierListener(txidVersion, chain, nullifiers);
      await this.scanAllWallets(txidVersion, chain, undefined);
    };
    const unshieldListener = async (txidVersion: TXIDVersion, unshields: UnshieldStoredEvent[]) => {
      await this.unshieldListener(txidVersion, chain, unshields);
    };
    await ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id].setTreeUpdateListeners(
      commitmentListener,
      nullifierListener,
      unshieldListener,
    );

    if (supportsV3) {
      const railgunTransactionsV3Listener = async (
        txidVersion: TXIDVersion,
        railgunTransactions: RailgunTransactionV3[],
      ) => {
        await this.railgunTransactionsV3Listener(txidVersion, chain, railgunTransactions);
      };
      const commitmentListenerV3 = async (
        txidVersion: TXIDVersion,
        commitmentEvents: CommitmentEvent[],
      ) => {
        await this.commitmentListener(
          txidVersion,
          chain,
          commitmentEvents,
          true, // shouldUpdateTrees
          txidVersion === TXIDVersion.V2_PoseidonMerkle, // shouldTriggerV2TxidSync - only for live listener events on V2
        );
      };
      const nullifierListenerV3 = async (txidVersion: TXIDVersion, nullifiers: Nullifier[]) => {
        await this.nullifierListener(txidVersion, chain, nullifiers);
      };
      const triggerWalletScans = async (txidVersion: TXIDVersion) => {
        await this.scanAllWallets(txidVersion, chain, undefined);
      };
      await ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type][
        chain.id
      ].setTreeUpdateListeners(
        commitmentListenerV3, // No wallet scans
        nullifierListenerV3, // No wallet scans
        unshieldListener,
        railgunTransactionsV3Listener,
        triggerWalletScans,
      );
    }
  }

  /**
   * Unload network
   * @param chain - chainID of network to unload
   */
  async unloadNetwork(chain: Chain): Promise<void> {
    if (!isDefined(ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id])) {
      return;
    }

    // Unload merkletrees from wallets
    Object.values(this.wallets).forEach((wallet) => {
      ACTIVE_TXID_VERSIONS.forEach((txidVersion) => {
        if (!getChainSupportsV3(chain) && txidVersion === TXIDVersion.V3_PoseidonMerkle) {
          return;
        }

        wallet.unloadUTXOMerkletree(txidVersion, chain);
        wallet.unloadRailgunTXIDMerkletree(txidVersion, chain);
      });
    });

    // Unload listeners
    await ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id].unload();
    await ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type]?.[chain.id]?.unload();

    // Delete contracts
    delete ContractStore.railgunSmartWalletContracts[chain.type]?.[chain.id];
    delete ContractStore.relayAdaptV2Contracts[chain.type]?.[chain.id];
    delete ContractStore.poseidonMerkleAccumulatorV3Contracts[chain.type]?.[chain.id];
    delete ContractStore.poseidonMerkleVerifierV3Contracts[chain.type]?.[chain.id];
    delete ContractStore.tokenVaultV3Contracts[chain.type]?.[chain.id];

    ACTIVE_TXID_VERSIONS.forEach((txidVersion) => {
      if (!getChainSupportsV3(chain) && txidVersion === TXIDVersion.V3_PoseidonMerkle) {
        return;
      }

      // Delete UTXO merkletree
      delete this.utxoMerkletrees[txidVersion]?.[chain.type]?.[chain.id];
      // Delete Txid merkletree
      delete this.txidMerkletrees[txidVersion]?.[chain.type]?.[chain.id];
    });
  }

  private static getLastSyncedBlockDBPrefix(txidVersion: TXIDVersion, chain: Chain): string[] {
    const path = [
      DatabaseNamespace.ChainSyncInfo,
      'last_synced_block',
      txidVersion,
      getChainFullNetworkID(chain),
    ];
    return path;
  }

  /**
   * Sets last synced block to resume syncing on next load.
   * @param chain - chain type/id to store value for
   * @param lastSyncedBlock - last synced block
   */
  setLastSyncedBlock(
    txidVersion: TXIDVersion,
    chain: Chain,
    lastSyncedBlock: number,
  ): Promise<void> {
    return this.db.put(
      RailgunEngine.getLastSyncedBlockDBPrefix(txidVersion, chain),
      lastSyncedBlock,
      'utf8',
    );
  }

  /**
   * Gets last synced block to resume syncing from.
   * @param chain - chain type/id to get value for
   * @returns lastSyncedBlock - last synced block
   */
  getLastSyncedBlock(txidVersion: TXIDVersion, chain: Chain): Promise<Optional<number>> {
    return this.db
      .get(RailgunEngine.getLastSyncedBlockDBPrefix(txidVersion, chain), 'utf8')
      .then((val: string) => parseInt(val, 10))
      .catch(() => Promise.resolve(undefined));
  }

  private static getUTXOMerkletreeHistoryVersionDBPrefix(chain?: Chain): string[] {
    const path = [DatabaseNamespace.ChainSyncInfo, 'merkleetree_history_version'];
    if (chain != null) {
      path.push(getChainFullNetworkID(chain));
    }
    return path;
  }

  private static getTxidV2MerkletreeHistoryVersionDBPrefix(chain?: Chain): string[] {
    const path = [DatabaseNamespace.ChainSyncInfo, 'txid_merkletree_history_version'];
    if (chain != null) {
      path.push(getChainFullNetworkID(chain));
    }
    return path;
  }

  setUTXOMerkletreeHistoryVersion(chain: Chain, merkletreeHistoryVersion: number): Promise<void> {
    return this.db.put(
      RailgunEngine.getUTXOMerkletreeHistoryVersionDBPrefix(chain),
      merkletreeHistoryVersion,
      'utf8',
    );
  }

  getUTXOMerkletreeHistoryVersion(chain: Chain): Promise<Optional<number>> {
    return this.db
      .get(RailgunEngine.getUTXOMerkletreeHistoryVersionDBPrefix(chain), 'utf8')
      .then((val: string) => parseInt(val, 10))
      .catch(() => Promise.resolve(undefined));
  }

  setTxidV2MerkletreeHistoryVersion(chain: Chain, merkletreeHistoryVersion: number): Promise<void> {
    return this.db.put(
      RailgunEngine.getTxidV2MerkletreeHistoryVersionDBPrefix(chain),
      merkletreeHistoryVersion,
      'utf8',
    );
  }

  getTxidV2MerkletreeHistoryVersion(chain: Chain): Promise<Optional<number>> {
    return this.db
      .get(RailgunEngine.getTxidV2MerkletreeHistoryVersionDBPrefix(chain), 'utf8')
      .then((val: string) => parseInt(val, 10))
      .catch(() => Promise.resolve(undefined));
  }

  getUTXOMerkletree(txidVersion: TXIDVersion, chain: Chain): UTXOMerkletree {
    if (txidVersion === TXIDVersion.V3_PoseidonMerkle) {
      assertChainSupportsV3(chain);
    }
    const merkletree = this.utxoMerkletrees[txidVersion]?.[chain.type]?.[chain.id];
    if (!isDefined(merkletree)) {
      throw new Error(
        `No utxo merkletree for txidVersion ${txidVersion}, chain ${chain.type}:${chain.id}`,
      );
    }
    return merkletree;
  }

  private hasUTXOMerkletree(txidVersion: TXIDVersion, chain: Chain): boolean {
    try {
      this.getUTXOMerkletree(txidVersion, chain);
      return true;
    } catch {
      return false;
    }
  }

  getTXIDMerkletree(txidVersion: TXIDVersion, chain: Chain): TXIDMerkletree {
    if (txidVersion === TXIDVersion.V3_PoseidonMerkle) {
      assertChainSupportsV3(chain);
    }
    const merkletree = this.txidMerkletrees[txidVersion]?.[chain.type]?.[chain.id];
    if (!isDefined(merkletree)) {
      throw new Error(
        `No railgun txid merkletree for txidVersion ${txidVersion}, chain ${chain.type}:${chain.id}`,
      );
    }
    return merkletree;
  }

  private hasTXIDMerkletree(txidVersion: TXIDVersion, chain: Chain): boolean {
    try {
      this.getTXIDMerkletree(txidVersion, chain);
      return true;
    } catch {
      return false;
    }
  }

  async getCompletedTxidFromNullifiers(
    txidVersion: TXIDVersion,
    chain: Chain,
    nullifiers: string[],
  ): Promise<Optional<string>> {
    if (!nullifiers.length) {
      return undefined;
    }

    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);

    const firstNullifier = nullifiers[0];
    const firstTxid = await utxoMerkletree.getNullifierTxid(firstNullifier);
    if (!isDefined(firstTxid)) {
      return undefined;
    }

    const otherTxids: Optional<string>[] = await Promise.all(
      nullifiers
        .slice(1)
        .map(async (nullifier) => await utxoMerkletree.getNullifierTxid(nullifier)),
    );

    const matchingTxids = otherTxids.filter((txid) => txid === firstTxid);
    const allMatch = matchingTxids.length === nullifiers.length - 1;
    return allMatch ? formatToByteLength(firstTxid, ByteLength.UINT_256, true) : undefined;
  }

  async scanAllWallets(
    txidVersion: TXIDVersion,
    chain: Chain,
    progressCallback: Optional<(progress: number) => void>,
  ) {
    const wallets = this.allWallets();
    // eslint-disable-next-line no-restricted-syntax
    for (let i = 0; i < wallets.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await wallets[i].scanBalances(txidVersion, chain, (walletProgress: number) => {
        if (progressCallback) {
          const finishedWalletsProgress = i / wallets.length;
          const newWalletProgress = walletProgress / wallets.length;
          progressCallback(finishedWalletsProgress + newWalletProgress);
        }
      });
    }
  }

  private allWallets(): AbstractWallet[] {
    return Object.values(this.wallets);
  }

  /**
   * Unload wallet
   * @param id - wallet id to unload
   */
  unloadWallet(id: string) {
    delete this.wallets[id];
  }

  /**
   * Unloads wallets, removes listeners and closes DB.
   */
  async unload() {
    // Unload chains
    await Promise.all(
      ContractStore.railgunSmartWalletContracts.map(async (contractsForChainType, chainType) => {
        await Promise.all(
          contractsForChainType.map(async (_railgunSmartWalletContract, chainID) => {
            EngineDebug.log(`unload network ${chainType}:${chainID}`);
            await this.unloadNetwork({ type: chainType, id: chainID });
          }),
        );
      }),
    );

    // Unload wallets
    Object.keys(this.wallets).forEach((walletID) => {
      this.unloadWallet(walletID);
    });

    await this.db.close();
  }

  private async loadWallet(wallet: AbstractWallet): Promise<void> {
    // Store wallet against ID
    this.wallets[wallet.id] = wallet;

    if (this.skipMerkletreeScans) {
      throw new Error(
        'Cannot load wallet: skipMerkletreeScans set to true. Wallets require merkle scans to load balances and history.',
      );
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const txidVersion of ACTIVE_TXID_VERSIONS) {
      // Load UTXO and TXID merkletrees for wallet
      const utxoMerkletrees = this.utxoMerkletrees[txidVersion] ?? [];

      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        utxoMerkletrees.map(async (merkletreesForChainType) => {
          await Promise.all(
            merkletreesForChainType.map(async (merkletree) => {
              await wallet.loadUTXOMerkletree(txidVersion, merkletree);
            }),
          );
        }),
      );
      this.txidMerkletrees[txidVersion]?.forEach((merkletreesForChainType) => {
        merkletreesForChainType.forEach((merkletree) => {
          wallet.loadRailgunTXIDMerkletree(txidVersion, merkletree);
        });
      });
    }
  }

  /**
   * Load existing wallet
   * @param {string} encryptionKey - encryption key of wallet
   * @param {string} id - wallet ID
   * @returns id
   */
  async loadExistingWallet(encryptionKey: string, id: string): Promise<RailgunWallet> {
    if (isDefined(this.wallets[id])) {
      return this.wallets[id] as RailgunWallet;
    }
    const wallet = await RailgunWallet.loadExisting(this.db, encryptionKey, id, this.prover);
    await this.loadWallet(wallet);
    return wallet;
  }

  /**
   * Load existing wallet
   * @param {string} encryptionKey - encryption key of wallet
   * @param {string} id - wallet ID
   * @returns id
   */
  async loadExistingViewOnlyWallet(encryptionKey: string, id: string): Promise<ViewOnlyWallet> {
    if (isDefined(this.wallets[id])) {
      return this.wallets[id] as ViewOnlyWallet;
    }
    const wallet = await ViewOnlyWallet.loadExisting(this.db, encryptionKey, id, this.prover);
    await this.loadWallet(wallet);
    return wallet;
  }

  async deleteWallet(id: string) {
    this.unloadWallet(id);
    return AbstractWallet.delete(this.db, id);
  }

  /**
   * Creates wallet from mnemonic
   * @param {string} encryptionKey - encryption key of wallet
   * @param {string} mnemonic - mnemonic to load
   * @param {number} index - derivation index to load
   * @returns id
   */
  async createWalletFromMnemonic(
    encryptionKey: string,
    mnemonic: string,
    index: number = 0,
    creationBlockNumbers: Optional<number[][]> = undefined,
  ): Promise<RailgunWallet> {
    const wallet = await RailgunWallet.fromMnemonic(
      this.db,
      encryptionKey,
      mnemonic,
      index,
      creationBlockNumbers,
      this.prover,
    );
    await this.loadWallet(wallet);
    return wallet;
  }

  async createViewOnlyWalletFromShareableViewingKey(
    encryptionKey: string,
    shareableViewingKey: string,
    creationBlockNumbers: Optional<number[][]>,
  ): Promise<ViewOnlyWallet> {
    const wallet = await ViewOnlyWallet.fromShareableViewingKey(
      this.db,
      encryptionKey,
      shareableViewingKey,
      creationBlockNumbers,
      this.prover,
    );
    await this.loadWallet(wallet);
    return wallet;
  }

  async getAllShieldCommitments(
    txidVersion: TXIDVersion,
    chain: Chain,
    startingBlock: number,
  ): Promise<(ShieldCommitment | LegacyGeneratedCommitment)[]> {
    const utxoMerkletree = this.getUTXOMerkletree(txidVersion, chain);
    const latestTree = await utxoMerkletree.latestTree();

    // TODO: use blockNumber to find exact starting position... But the logic is currently broken.

    // const treeInfo = await AbstractWallet.getTreeAndPositionBeforeBlock(
    //   merkletree,
    //   latestTree,
    //   startingBlock,
    // );

    const shieldCommitments: (ShieldCommitment | LegacyGeneratedCommitment)[] = [];

    const startScanTree = 0;

    for (let treeIndex = startScanTree; treeIndex <= latestTree; treeIndex += 1) {
      // eslint-disable-next-line no-await-in-loop
      const treeHeight = await utxoMerkletree.getTreeLength(treeIndex);
      const fetcher = new Array<Promise<Optional<Commitment>>>(treeHeight);

      // const isInitialTree = treeIndex === startScanTree;
      // const startScanHeight = isInitialTree && treeInfo ? treeInfo.position : 0;
      const startScanHeight = 0;

      for (let index = startScanHeight; index < treeHeight; index += 1) {
        fetcher[index] = utxoMerkletree.getCommitment(treeIndex, index);
      }

      // eslint-disable-next-line no-await-in-loop
      const leaves: Optional<Commitment>[] = await Promise.all(fetcher);
      leaves.forEach((leaf) => {
        if (!leaf) {
          return;
        }
        if (leaf.blockNumber < startingBlock) {
          return;
        }
        if (
          leaf.commitmentType === CommitmentType.LegacyGeneratedCommitment ||
          leaf.commitmentType === CommitmentType.ShieldCommitment
        ) {
          shieldCommitments.push(leaf);
        }
      });
    }

    return shieldCommitments;
  }

  // Top-level exports:

  static encodeAddress = encodeAddress;

  static decodeAddress = decodeAddress;

  railgunSmartWalletContracts = ContractStore.railgunSmartWalletContracts;

  relayAdaptV2Contracts = ContractStore.relayAdaptV2Contracts;
}

export { RailgunEngine };
