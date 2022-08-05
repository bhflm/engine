/* eslint-disable no-await-in-loop */
import { HDNode } from '@ethersproject/hdnode';
import type { AbstractBatch, PutBatch } from 'abstract-leveldown';
import BN from 'bn.js';
import EventEmitter from 'events';
import msgpack from 'msgpack-lite';
import { Database } from '../database';
import LeptonDebug from '../debugger';
import { bech32, Node } from '../keyderivation';
import { SpendingKeyPair, ViewingKeyPair } from '../keyderivation/bip32';
import { mnemonicToSeed } from '../keyderivation/bip39';
import { MerkleTree } from '../merkletree';
import { LeptonEvent, ScannedEventData } from '../models/event-types';
import {
  BytesData,
  Commitment,
  EncryptedCommitment,
  NoteSerialized,
  OutputType,
  StoredReceiveCommitment,
  StoredSpendCommitment,
} from '../models/formatted-types';
import { SpentCommitment, TXO } from '../models/txo-types';
import { Note } from '../note';
import { Memo } from '../note/memo';
import { hash } from '../utils';
import {
  arrayify,
  ByteLength,
  combine,
  formatToByteLength,
  fromUTF8String,
  hexlify,
  hexStringToBytes,
  nToHex,
  numberify,
  padToLength,
} from '../utils/bytes';
import { poseidon } from '../utils/hash';
import { getSharedSymmetricKey, signED25519 } from '../utils/keys-utils';
import {
  AddressKeys,
  Balances,
  BalancesByTree,
  TransactionHistoryEntry,
  TransactionHistoryEntryPreprocessSpent,
  TransactionHistoryEntryReceived,
  TransactionHistoryEntrySpent,
  TransactionHistoryItemVersion,
  TransactionHistoryTokenAmount,
  TreeBalance,
  WalletData,
  WalletDetails,
} from './types';

type WalletNodes = { spending: Node; viewing: Node };

type ScannedDBCommitment = PutBatch<string, Buffer>;

/**
 * constant defining the derivation path prefixes for spending and viewing keys
 * must be appended with index' to form a complete path
 */
const DERIVATION_PATH_PREFIXES = {
  SPENDING: "m/44'/1984'/0'/0'/",
  VIEWING: "m/420'/1984'/0'/0'/",
};

/**
 * Helper to append DERIVATION_PATH_PREFIXES with index'
 */
export function derivePathsForIndex(index: number = 0) {
  return {
    spending: `${DERIVATION_PATH_PREFIXES.SPENDING}${index}'`,
    viewing: `${DERIVATION_PATH_PREFIXES.VIEWING}${index}'`,
  };
}

export function deriveNodes(mnemonic: string, index: number = 0): WalletNodes {
  const paths = derivePathsForIndex(index);
  return {
    // eslint-disable-next-line no-use-before-define
    spending: Node.fromMnemonic(mnemonic).derive(paths.spending),
    // eslint-disable-next-line no-use-before-define
    viewing: Node.fromMnemonic(mnemonic).derive(paths.viewing),
  };
}

class Wallet extends EventEmitter {
  private db: Database;

  readonly id: string;

  #viewingKeyPair!: ViewingKeyPair;

  masterPublicKey!: bigint;

  nullifyingKey!: bigint;

  readonly merkletree: MerkleTree[] = [];

  public spendingPublicKey!: [bigint, bigint];

  /**
   * Create Wallet controller
   * @param id - wallet ID
   * @param db - database
   */
  constructor(id: string, db: Database) {
    super();
    this.id = hexlify(id);
    this.db = db;
  }

  async initialize(nodes: WalletNodes): Promise<Wallet> {
    const { spending, viewing } = nodes;
    this.#viewingKeyPair = await viewing.getViewingKeyPair();
    const spendingKeyPair = spending.getSpendingKeyPair();
    this.nullifyingKey = poseidon([BigInt(hexlify(this.#viewingKeyPair.privateKey, true))]);
    this.masterPublicKey = Node.getMasterPublicKey(spendingKeyPair.pubkey, this.getNullifyingKey());
    this.spendingPublicKey = spendingKeyPair.pubkey;

    return this;
  }

  /**
   * Loads merkle tree into wallet
   * @param merkletree - merkletree to load
   */
  loadTree(merkletree: MerkleTree) {
    this.merkletree[merkletree.chainID] = merkletree;
  }

  /**
   * Unload merkle tree by chainID
   * @param chainID - chainID of tree to unload
   */
  unloadTree(chainID: number) {
    delete this.merkletree[chainID];
  }

  /**
   * Construct DB TXO path from chainID
   * Prefix consists of ['wallet', id, chainID]
   * May be appended with tree and position
   * @param chainID - chainID
   * @optional tree - without this param, all trees
   * @optional position - without this param, all positions
   * @returns wallet DB prefix
   */
  getWalletDBPrefix(chainID: number, tree?: number, position?: number): string[] {
    const path = [fromUTF8String('wallet'), hexlify(this.id), hexlify(new BN(chainID))].map(
      (element) => element.padStart(64, '0'),
    );
    if (tree != null) path.push(hexlify(padToLength(new BN(tree), 32)));
    if (position != null) path.push(hexlify(padToLength(new BN(position), 32)));
    return path;
  }

  /**
   * Construct DB spent commitment path from chainID
   * Prefix consists of ['wallet', id + "-spent", chainID]
   * May be appended with tree and position
   * @param chainID - chainID
   * @optional tree - without this param, all trees
   * @optional position - without this param, all positions
   * @returns wallet DB prefix
   */
  getWalletSpentCommitmentDBPrefix(chainID: number, tree?: number, position?: number): string[] {
    const path = [
      fromUTF8String('wallet'),
      `${hexlify(this.id)}-spent`,
      hexlify(new BN(chainID)),
    ].map((element) => element.padStart(64, '0'));
    if (tree != null) path.push(hexlify(padToLength(new BN(tree), 32)));
    if (position != null) path.push(hexlify(padToLength(new BN(position), 32)));
    return path;
  }

  /**
   * Construct DB path from chainID
   * @returns wallet DB path
   */
  getWalletDetailsPath(chainID: number): string[] {
    return this.getWalletDBPrefix(chainID);
  }

  /**
   * Load encrypted spending key Node from database
   * Spending key should be kept private and only accessed on demand
   * @returns {Promise<SpendingKeyPair>}
   */
  async getSpendingKeyPair(encryptionKey: BytesData): Promise<SpendingKeyPair> {
    const node = await this.loadSpendingKey(encryptionKey);
    return node.getSpendingKeyPair();
  }

  /**
   * Return object of Viewing privateKey and pubkey
   * @returns {ViewingKeyPair}
   */
  getViewingKeyPair(): ViewingKeyPair {
    return this.#viewingKeyPair;
  }

  /**
   * Used only to sign Relayer fee messages.
   * Verified using Relayer's viewingPublicKey, which is encoded in its rail address.
   * @param {Uint8Array} message - message to sign as Uint8Array
   */
  async signWithViewingKey(message: Uint8Array): Promise<Uint8Array> {
    const viewingPrivateKey = this.getViewingKeyPair().privateKey;
    return signED25519(message, viewingPrivateKey);
  }

  /**
   * Nullifying Key (ie poseidon hash of Viewing Private Key) aka vpk derived on ed25519 curve
   * Used to decrypt and nullify notes
   * @returns {bigint}
   */
  getNullifyingKey(): bigint {
    return this.nullifyingKey;
  }

  /**
   * Get Viewing Public Key (VK)
   * @returns {Uint8Array}
   */
  get viewingPublicKey(): Uint8Array {
    return this.#viewingKeyPair.pubkey;
  }

  /**
   * Return masterPublicKey and viewingPublicKey used to encode RAILGUN addresses
   * @returns {AddressKeys}
   */
  get addressKeys(): AddressKeys {
    return {
      masterPublicKey: this.masterPublicKey,
      viewingPublicKey: this.viewingPublicKey,
    };
  }

  /**
   * Encode address from (MPK, VK) + chainID
   * @returns {string} bech32 encoded RAILGUN address
   */
  getAddress(chainID: number | undefined): string {
    return bech32.encode({ ...this.addressKeys, chainID });
  }

  /**
   * Get encrypted wallet details for this wallet
   * @param {number} chainID
   * @returns {WalletDetails} including treeScannedHeight
   */
  async getWalletDetails(chainID: number): Promise<WalletDetails> {
    let walletDetails: WalletDetails;

    try {
      // Try fetching from database
      walletDetails = msgpack.decode(
        arrayify(await this.db.get(this.getWalletDetailsPath(chainID))),
      );
    } catch {
      // If details don't exist yet, return defaults
      walletDetails = {
        treeScannedHeights: [],
      };
    }

    return walletDetails;
  }

  private static decryptLeaf(leaf: EncryptedCommitment, sharedKey: Uint8Array) {
    try {
      return Note.decrypt(leaf.ciphertext.ciphertext, sharedKey, leaf.ciphertext.memo || []);
    } catch (e: any) {
      // Expect error if leaf not addressed to us.
      return undefined;
    }
  }

  private async createScannedDBCommitments(
    leaf: Commitment,
    viewingPrivateKey: Uint8Array,
    tree: number,
    chainID: number,
    position: number,
    totalLeaves: number,
  ): Promise<ScannedDBCommitment[]> {
    let noteReceive: Note | undefined;
    let noteSpend: Note | undefined;

    LeptonDebug.log(`Trying to decrypt commitment. Current position ${position}/${totalLeaves}.`);

    if ('ciphertext' in leaf) {
      // Try to decrypt note as receiver.
      const ephemeralKeySender = leaf.ciphertext.ephemeralKeys[0];
      const sharedKeyReceiver = await getSharedSymmetricKey(
        viewingPrivateKey,
        hexStringToBytes(ephemeralKeySender),
      );
      if (sharedKeyReceiver) {
        noteReceive = Wallet.decryptLeaf(leaf, sharedKeyReceiver);
      }

      // Try to decrypt note as sender.
      const ephemeralKeyReceiver = leaf.ciphertext.ephemeralKeys[1];
      const sharedKeySpender = await getSharedSymmetricKey(
        viewingPrivateKey,
        hexStringToBytes(ephemeralKeyReceiver),
      );
      if (sharedKeySpender) {
        noteSpend = Wallet.decryptLeaf(leaf, sharedKeySpender);
      }
    } else {
      // preImage
      // Deserialize
      const serialized: NoteSerialized = {
        npk: leaf.preImage.npk,
        encryptedRandom: leaf.encryptedRandom,
        token: leaf.preImage.token.tokenAddress,
        value: leaf.preImage.value,
        memoField: [], // Empty for non-private txs.
      };
      try {
        noteReceive = Note.deserialize(serialized, viewingPrivateKey, this.addressKeys);
      } catch (e: any) {
        // Expect error if leaf not addressed to us.
      }
    }

    const scannedCommitments: ScannedDBCommitment[] = [];

    if (noteReceive) {
      const nullifier = Note.getNullifier(this.nullifyingKey, position);
      const storedCommitment: StoredReceiveCommitment = {
        spendtxid: false,
        txid: hexlify(leaf.txid),
        nullifier: nToHex(nullifier, ByteLength.UINT_256),
        decrypted: noteReceive.serialize(viewingPrivateKey),
      };
      LeptonDebug.log(`Adding RECEIVE commitment at ${position}.`);
      scannedCommitments.push({
        type: 'put',
        key: this.getWalletDBPrefix(chainID, tree, position).join(':'),
        value: msgpack.encode(storedCommitment),
      });
    }

    if (noteSpend) {
      const storedCommitment: StoredSpendCommitment = {
        txid: hexlify(leaf.txid),
        decrypted: noteSpend.serialize(viewingPrivateKey),
        noteExtraData: Memo.decryptNoteExtraData(noteSpend.memoField, viewingPrivateKey),
      };
      LeptonDebug.log(`Adding SPEND commitment at ${position}.`);
      scannedCommitments.push({
        type: 'put',
        key: this.getWalletSpentCommitmentDBPrefix(chainID, tree, position).join(':'),
        value: msgpack.encode(storedCommitment),
      });
    }

    return scannedCommitments;
  }

  /**
   * Scans wallet at index for new balances
   * Commitment index in array should be same as commitment index in tree
   * @param {Commitment[]} leaves - commitments from events to attempt parsing
   * @param {number} tree - tree number we're scanning
   * @param {number} chainID - chainID we're scanning
   * @param {number} scannedHeight - starting position
   */
  async scanLeaves(
    leaves: (Commitment | undefined)[],
    tree: number,
    chainID: number,
    scannedHeight: number,
    treeHeight: number,
  ): Promise<void> {
    LeptonDebug.log(
      `wallet:scanLeaves tree:${tree} chain:${chainID} leaves:${leaves.length}, scannedHeight:${scannedHeight}`,
    );
    const vpk = this.getViewingKeyPair().privateKey;

    const leafSyncPromises: Promise<ScannedDBCommitment[]>[] = [];

    for (let position = scannedHeight; position < treeHeight; position += 1) {
      const leaf = leaves[position];
      if (leaf == null) {
        continue;
      }
      leafSyncPromises.push(
        this.createScannedDBCommitments(leaf, vpk, tree, chainID, position, leaves.length),
      );
    }

    const writeBatch: ScannedDBCommitment[] = (await Promise.all(leafSyncPromises)).flat();

    // Write to DB
    await this.db.batch(writeBatch);
  }

  private async streamKeys(namespace: string[]): Promise<string[]> {
    return new Promise((resolve) => {
      const keyList: string[] = [];

      // Stream list of keys and resolve on end
      this.db
        .streamNamespace(namespace)
        .on('data', (key) => {
          keyList.push(key);
        })
        .on('end', () => {
          resolve(keyList);
        });
    });
  }

  /**
   * Get TXOs list of a chain
   * @param chainID - chainID to get UTXOs for
   * @returns UTXOs list
   */
  async TXOs(chainID: number): Promise<TXO[]> {
    const address = this.addressKeys;
    const vpk = this.getViewingKeyPair().privateKey;

    const namespace = this.getWalletDBPrefix(chainID);
    const keys: string[] = await this.streamKeys(namespace);
    const keySplits = keys.map((key) => key.split(':')).filter((keySplit) => keySplit.length === 5);

    // Calculate UTXOs
    return Promise.all(
      keySplits.map(async (keySplit) => {
        // Decode UTXO
        const txo: StoredReceiveCommitment = msgpack.decode(arrayify(await this.db.get(keySplit)));

        // If this UTXO hasn't already been marked as spent, check if it has
        if (!txo.spendtxid) {
          // Get nullifier
          const storedNullifier = await this.merkletree[chainID].getStoredNullifier(txo.nullifier);

          // If it's nullified write spend txid to wallet storage
          if (storedNullifier) {
            txo.spendtxid = storedNullifier;

            // Write nullifier spend txid to db
            await this.db.put(keySplit, msgpack.encode(txo));
          }
        }

        const tree = numberify(keySplit[3]).toNumber();
        const position = numberify(keySplit[4]).toNumber();

        const note = Note.deserialize(txo.decrypted, vpk, address);

        return {
          tree,
          position,
          txid: txo.txid,
          spendtxid: txo.spendtxid,
          note,
        };
      }),
    );
  }

  /**
   * Get spent commitments of a chain
   * @param chainID - chainID to get spent commitments for
   * @returns SpentCommitment list
   */
  async getSpentCommitments(chainID: number): Promise<SpentCommitment[]> {
    const address = this.addressKeys;
    const vpk = this.getViewingKeyPair().privateKey;

    const namespace = this.getWalletSpentCommitmentDBPrefix(chainID);
    const keys: string[] = await this.streamKeys(namespace);
    const keySplits = keys.map((key) => key.split(':')).filter((keySplit) => keySplit.length === 5);

    // Calculate spent commitments
    return Promise.all(
      keySplits.map(async (keySplit) => {
        const spentCommitment: StoredSpendCommitment = msgpack.decode(
          arrayify(await this.db.get(keySplit)),
        );

        const tree = numberify(keySplit[3]).toNumber();
        const position = numberify(keySplit[4]).toNumber();

        const note = Note.deserialize(spentCommitment.decrypted, vpk, address);

        return {
          tree,
          position,
          txid: spentCommitment.txid,
          note,
          noteExtraData: spentCommitment.noteExtraData,
        };
      }),
    );
  }

  /**
   * Gets transactions history
   * @param chainID - chainID to get transaction history for
   * @returns history
   */
  async getTransactionHistory(chainID: number): Promise<TransactionHistoryEntry[]> {
    const receiveHistory = await this.getTransactionReceiveHistory(chainID);
    const sendHistory = await this.getTransactionSpendHistory(chainID);

    const history: TransactionHistoryEntry[] = sendHistory.map((sendItem) => ({
      ...sendItem,
      receiveTokenAmounts: [],
    }));

    // Merge "sent" history with "receive" history items.
    // We have to remove all "receive" items that are change outputs.
    receiveHistory.forEach((receiveItem) => {
      let alreadyExistsInHistory = false;

      history.forEach((existingHistoryItem) => {
        if (receiveItem.txid === existingHistoryItem.txid) {
          alreadyExistsInHistory = true;
          const { changeTokenAmounts } = existingHistoryItem;
          receiveItem.receiveTokenAmounts.forEach((receiveTokenAmount) => {
            const matchingChangeOutput = changeTokenAmounts.find(
              (ta) =>
                ta.token === receiveTokenAmount.token && ta.amount === receiveTokenAmount.amount,
            );
            if (!matchingChangeOutput) {
              // Receive token amount is not a "change" output.
              // Add it to the history item.
              existingHistoryItem.receiveTokenAmounts.push(receiveTokenAmount);
            }
          });
        }
      });
      if (!alreadyExistsInHistory) {
        history.unshift({
          ...receiveItem,
          transferTokenAmounts: [],
          changeTokenAmounts: [],
          version: TransactionHistoryItemVersion.Unknown,
        });
      }
    });

    return history;
  }

  /**
   * Gets transactions history for "received" transactions
   * @param chainID - chainID to get balances for
   * @returns history
   */
  async getTransactionReceiveHistory(chainID: number): Promise<TransactionHistoryEntryReceived[]> {
    const TXOs = await this.TXOs(chainID);
    const txidTransactionMap: { [txid: string]: TransactionHistoryEntryReceived } = {};

    TXOs.forEach(({ txid, note }) => {
      if (note.value === 0n) {
        return;
      }
      if (!txidTransactionMap[txid]) {
        txidTransactionMap[txid] = {
          txid,
          receiveTokenAmounts: [],
        };
      }
      const token = formatToByteLength(note.token, 32, false);
      txidTransactionMap[txid].receiveTokenAmounts.push({
        token,
        amount: note.value,
      });
    });

    const history: TransactionHistoryEntryReceived[] = Object.values(txidTransactionMap);
    return history;
  }

  async getTransactionSpendHistory(chainID: number): Promise<TransactionHistoryEntrySpent[]> {
    const spentCommitments = await this.getSpentCommitments(chainID);
    const txidTransactionMap: { [txid: string]: TransactionHistoryEntryPreprocessSpent } = {};

    spentCommitments.forEach(({ txid, note, noteExtraData }) => {
      if (note.value === 0n) {
        return;
      }
      if (!txidTransactionMap[txid]) {
        txidTransactionMap[txid] = {
          txid,
          tokenAmounts: [],
          version:
            noteExtraData == null
              ? TransactionHistoryItemVersion.Legacy
              : TransactionHistoryItemVersion.UpdatedAug2022,
        };
      }
      const token = formatToByteLength(note.token, 32, false);
      txidTransactionMap[txid].tokenAmounts.push({
        token,
        amount: note.value,
        noteExtraData,
      });
    });

    const preProcessHistory: TransactionHistoryEntryPreprocessSpent[] =
      Object.values(txidTransactionMap);

    const history: TransactionHistoryEntrySpent[] = preProcessHistory.map(
      ({ txid, tokenAmounts, version }) => {
        const transferTokenAmounts: TransactionHistoryTokenAmount[] = [];
        let relayerFeeTokenAmount: TransactionHistoryTokenAmount | undefined;
        const changeTokenAmounts: TransactionHistoryTokenAmount[] = [];

        tokenAmounts.forEach((tokenAmount) => {
          if (!tokenAmount.noteExtraData) {
            // Legacy notes without extra data, consider as a simple "transfer".
            transferTokenAmounts.push(tokenAmount);
            return;
          }
          switch (tokenAmount.noteExtraData.outputType) {
            case OutputType.Transfer:
              transferTokenAmounts.push(tokenAmount);
              break;
            case OutputType.RelayerFee:
              relayerFeeTokenAmount = tokenAmount;
              break;
            case OutputType.Change:
              changeTokenAmounts.push(tokenAmount);
              break;
          }
        });

        const historyEntry: TransactionHistoryEntrySpent = {
          txid,
          transferTokenAmounts,
          relayerFeeTokenAmount,
          changeTokenAmounts,
          version,
        };
        return historyEntry;
      },
    );

    return history;
  }

  /**
   * Gets wallet balances
   * @param chainID - chainID to get balances for
   * @returns balances
   */
  async balances(chainID: number): Promise<Balances> {
    const TXOs = await this.TXOs(chainID);
    const balances: Balances = {};

    // Loop through each TXO and add to balances if unspent
    TXOs.forEach((txOutput) => {
      const token = formatToByteLength(txOutput.note.token, 32, false);
      // If we don't have an entry for this token yet, create one
      if (!balances[token]) {
        balances[token] = {
          balance: BigInt(0),
          utxos: [],
        };
      }

      // If txOutput is unspent process it
      if (!txOutput.spendtxid) {
        // Store utxo
        balances[token].utxos.push(txOutput);

        // Increment balance
        balances[token].balance += txOutput.note.value;
      }
    });

    return balances;
  }

  async getBalance(chainID: number, tokenAddress: string): Promise<bigint | undefined> {
    const balances = await this.balances(chainID);
    const balanceForToken = balances[formatToByteLength(tokenAddress, 32, false)];
    return balanceForToken ? balanceForToken.balance : undefined;
  }

  /**
   * Sort token balances by tree
   * @param chainID - chainID of token
   * @returns balances by tree
   */
  async balancesByTree(chainID: number): Promise<BalancesByTree> {
    // Fetch balances
    const balances = await this.balances(chainID);

    // Sort token balances by tree
    const balancesByTree: BalancesByTree = {};

    // Loop through each token
    Object.keys(balances).forEach((token) => {
      // Create balances tree array
      balancesByTree[token] = [];

      // Loop through each UTXO and sort by tree
      balances[token].utxos.forEach((utxo) => {
        if (!balancesByTree[token][utxo.tree]) {
          balancesByTree[token][utxo.tree] = {
            balance: utxo.note.value,
            utxos: [utxo],
          };
        } else {
          balancesByTree[token][utxo.tree].balance += utxo.note.value;
          balancesByTree[token][utxo.tree].utxos.push(utxo);
        }
      });
    });

    return balancesByTree;
  }

  /**
   * Scans for new balances
   * @param chainID - chainID to scan
   */
  async scanBalances(chainID: number) {
    LeptonDebug.log(`scan wallet balances: chainID ${chainID}`);

    try {
      // Fetch wallet details and latest tree.
      const [walletDetails, latestTree] = await Promise.all([
        this.getWalletDetails(chainID),
        this.merkletree[chainID].latestTree(),
      ]);

      // Fill list of tree heights with 0s up to # of trees
      while (walletDetails.treeScannedHeights.length <= latestTree) {
        walletDetails.treeScannedHeights.push(0);
      }

      // Loop through each tree and scan
      for (let tree = 0; tree <= latestTree; tree += 1) {
        // Get scanned height
        const scannedHeight = walletDetails.treeScannedHeights[tree];

        // Create sparse array of tree
        const treeHeight = await this.merkletree[chainID].getTreeLength(tree);
        const fetcher: Promise<Commitment | undefined>[] = new Array(treeHeight);

        // Fetch each leaf we need to scan
        for (let index = scannedHeight; index < treeHeight; index += 1) {
          fetcher[index] = this.merkletree[chainID].getCommitment(tree, index);
        }

        // Wait until all leaves are fetched
        const leaves = await Promise.all(fetcher);

        // Start scanning primary and change
        await this.scanLeaves(leaves, tree, chainID, scannedHeight, treeHeight);

        // Commit new scanned height
        walletDetails.treeScannedHeights[tree] = leaves.length;

        if (leaves.length % 100 === 0) {
          // Save treeScannedHeight every 100 leaves scanned.
          await this.db.put(this.getWalletDetailsPath(chainID), msgpack.encode(walletDetails));
        }
      }

      // Write wallet details to db
      await this.db.put(this.getWalletDetailsPath(chainID), msgpack.encode(walletDetails));

      // Emit scanned event for this chain
      LeptonDebug.log(`wallet: scanned ${chainID}`);
      this.emit(LeptonEvent.WalletScanComplete, { chainID } as ScannedEventData);
    } catch (err: any) {
      LeptonDebug.log(`wallet.scan error: ${err.message}`);
      LeptonDebug.error(err);
    }
  }

  /**
   * Clears balances scanned from merkletrees and stored to database.
   * @param chainID - chainID to clear
   */
  async clearScannedBalances(chainID: number) {
    const namespace = this.getWalletDetailsPath(chainID);
    await this.db.clearNamespace(namespace);
  }

  /**
   * Clears stored balances and re-scans fully.
   * @param chainID - chainID to rescan
   */
  async fullRescanBalances(chainID: number) {
    await this.clearScannedBalances(chainID);
    return this.scanBalances(chainID);
  }

  static dbPath(id: string): BytesData[] {
    return [fromUTF8String('wallet'), id];
  }

  static async read(db: Database, id: string, encryptionKey: BytesData): Promise<WalletData> {
    return msgpack.decode(arrayify(await db.getEncrypted(Wallet.dbPath(id), encryptionKey)));
  }

  static async write(
    db: Database,
    id: string,
    encryptionKey: BytesData,
    data: WalletData,
  ): Promise<void> {
    await db.putEncrypted(Wallet.dbPath(id), encryptionKey, msgpack.encode(data));
  }

  /**
   * Calculate Wallet ID from mnemonic and derivation path index
   * @param {string} mnemonic
   * @param {index} number
   * @returns {string} - hash of mnemonic and index
   */
  static generateID(mnemonic: string, index: number) {
    return hash.sha256(combine([mnemonicToSeed(mnemonic), index.toString(16)]));
  }

  /**
   * Create a wallet from mnemonic
   * @param {Database} db - database
   * @param {BytesData} encryptionKey - encryption key to use with database
   * @param {string} mnemonic - mnemonic to load wallet from
   * @param {number} index - index of derivation path to derive if not 0
   * @returns {Wallet} Wallet
   */
  static async fromMnemonic(
    db: Database,
    encryptionKey: BytesData,
    mnemonic: string,
    index: number = 0,
  ): Promise<Wallet> {
    const id = Wallet.generateID(mnemonic, index);

    // Write encrypted mnemonic to DB
    await Wallet.write(db, id, encryptionKey, { mnemonic, index });

    const nodes = deriveNodes(mnemonic, index);

    // Create wallet object and return
    return await new Wallet(id, db).initialize(nodes);
  }

  /**
   * Loads wallet data from database and creates wallet object
   * @param {Database} db - database
   * @param {BytesData} encryptionKey - encryption key to use with database
   * @param {string} id - wallet id
   * @returns {Wallet} Wallet
   */
  static async loadExisting(db: Database, encryptionKey: BytesData, id: string): Promise<Wallet> {
    // Get encrypted mnemonic and derivation path from DB
    const { mnemonic, index } = await Wallet.read(db, id, encryptionKey);
    const nodes = deriveNodes(mnemonic, index);

    // Create wallet object and return
    return await new Wallet(id, db).initialize(nodes);
  }

  /**
   * Load encrypted node from database with encryption key
   * @param {BytesData} encryptionKey
   * @returns {Node} BabyJubJub node
   */
  async loadSpendingKey(encryptionKey: BytesData): Promise<Node> {
    const { mnemonic, index } = await Wallet.read(this.db, this.id, encryptionKey);

    return deriveNodes(mnemonic, index).spending;
  }

  /**
   * Helper to get the ethereum/whatever address is associated with this wallet
   */
  async getChainAddress(encryptionKey: BytesData): Promise<string> {
    const { mnemonic, index } = await Wallet.read(this.db, this.id, encryptionKey);
    const path = `m/44'/60'/0'/0/${index}`;
    const hdnode = HDNode.fromMnemonic(mnemonic).derivePath(path);
    return hdnode.address;
  }

  /**
   * Loads encrypted wallet data from database.
   * @param db - database
   * @param encryptionKey - encryption key to use with database
   * @param id - wallet id
   * @returns Data (JSON any)
   */
  static async getEncryptedData(db: Database, encryptionKey: BytesData, id: string) {
    return msgpack.decode(
      arrayify(await db.getEncrypted([fromUTF8String('wallet'), id], encryptionKey)),
    );
  }
}

export {
  Wallet,
  WalletDetails,
  AddressKeys,
  Balances,
  BalancesByTree,
  ScannedEventData,
  TXO,
  WalletData,
  TreeBalance,
  WalletNodes,
};
