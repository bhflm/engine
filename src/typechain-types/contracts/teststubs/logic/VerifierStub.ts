/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from 'ethers';
import type { FunctionFragment, Result, EventFragment } from '@ethersproject/abi';
import type { Listener, Provider } from '@ethersproject/providers';
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from '../../../common';

export type G1PointStruct = {
  x: PromiseOrValue<BigNumberish>;
  y: PromiseOrValue<BigNumberish>;
};

export type G1PointStructOutput = [BigNumber, BigNumber] & {
  x: BigNumber;
  y: BigNumber;
};

export type G2PointStruct = {
  x: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>];
  y: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>];
};

export type G2PointStructOutput = [[BigNumber, BigNumber], [BigNumber, BigNumber]] & {
  x: [BigNumber, BigNumber];
  y: [BigNumber, BigNumber];
};

export type VerifyingKeyStruct = {
  artifactsIPFSHash: PromiseOrValue<string>;
  alpha1: G1PointStruct;
  beta2: G2PointStruct;
  gamma2: G2PointStruct;
  delta2: G2PointStruct;
  ic: G1PointStruct[];
};

export type VerifyingKeyStructOutput = [
  string,
  G1PointStructOutput,
  G2PointStructOutput,
  G2PointStructOutput,
  G2PointStructOutput,
  G1PointStructOutput[],
] & {
  artifactsIPFSHash: string;
  alpha1: G1PointStructOutput;
  beta2: G2PointStructOutput;
  gamma2: G2PointStructOutput;
  delta2: G2PointStructOutput;
  ic: G1PointStructOutput[];
};

export type CommitmentCiphertextStruct = {
  ciphertext: [
    PromiseOrValue<BigNumberish>,
    PromiseOrValue<BigNumberish>,
    PromiseOrValue<BigNumberish>,
    PromiseOrValue<BigNumberish>,
  ];
  ephemeralKeys: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>];
  memo: PromiseOrValue<BigNumberish>[];
};

export type CommitmentCiphertextStructOutput = [
  [BigNumber, BigNumber, BigNumber, BigNumber],
  [BigNumber, BigNumber],
  BigNumber[],
] & {
  ciphertext: [BigNumber, BigNumber, BigNumber, BigNumber];
  ephemeralKeys: [BigNumber, BigNumber];
  memo: BigNumber[];
};

export type BoundParamsStruct = {
  treeNumber: PromiseOrValue<BigNumberish>;
  withdraw: PromiseOrValue<BigNumberish>;
  adaptContract: PromiseOrValue<string>;
  adaptParams: PromiseOrValue<BytesLike>;
  commitmentCiphertext: CommitmentCiphertextStruct[];
};

export type BoundParamsStructOutput = [
  number,
  number,
  string,
  string,
  CommitmentCiphertextStructOutput[],
] & {
  treeNumber: number;
  withdraw: number;
  adaptContract: string;
  adaptParams: string;
  commitmentCiphertext: CommitmentCiphertextStructOutput[];
};

export type SnarkProofStruct = {
  a: G1PointStruct;
  b: G2PointStruct;
  c: G1PointStruct;
};

export type SnarkProofStructOutput = [
  G1PointStructOutput,
  G2PointStructOutput,
  G1PointStructOutput,
] & { a: G1PointStructOutput; b: G2PointStructOutput; c: G1PointStructOutput };

export type TokenDataStruct = {
  tokenType: PromiseOrValue<BigNumberish>;
  tokenAddress: PromiseOrValue<string>;
  tokenSubID: PromiseOrValue<BigNumberish>;
};

export type TokenDataStructOutput = [number, string, BigNumber] & {
  tokenType: number;
  tokenAddress: string;
  tokenSubID: BigNumber;
};

export type CommitmentPreimageStruct = {
  npk: PromiseOrValue<BigNumberish>;
  token: TokenDataStruct;
  value: PromiseOrValue<BigNumberish>;
};

export type CommitmentPreimageStructOutput = [BigNumber, TokenDataStructOutput, BigNumber] & {
  npk: BigNumber;
  token: TokenDataStructOutput;
  value: BigNumber;
};

export type TransactionStruct = {
  proof: SnarkProofStruct;
  merkleRoot: PromiseOrValue<BigNumberish>;
  nullifiers: PromiseOrValue<BigNumberish>[];
  commitments: PromiseOrValue<BigNumberish>[];
  boundParams: BoundParamsStruct;
  withdrawPreimage: CommitmentPreimageStruct;
  overrideOutput: PromiseOrValue<string>;
};

export type TransactionStructOutput = [
  SnarkProofStructOutput,
  BigNumber,
  BigNumber[],
  BigNumber[],
  BoundParamsStructOutput,
  CommitmentPreimageStructOutput,
  string,
] & {
  proof: SnarkProofStructOutput;
  merkleRoot: BigNumber;
  nullifiers: BigNumber[];
  commitments: BigNumber[];
  boundParams: BoundParamsStructOutput;
  withdrawPreimage: CommitmentPreimageStructOutput;
  overrideOutput: string;
};

export interface VerifierStubInterface extends utils.Interface {
  functions: {
    'SNARK_BYPASS()': FunctionFragment;
    'getVerificationKey(uint256,uint256)': FunctionFragment;
    'hashBoundParams((uint16,uint8,address,bytes32,(uint256[4],uint256[2],uint256[])[]))': FunctionFragment;
    'owner()': FunctionFragment;
    'renounceOwnership()': FunctionFragment;
    'setVerificationKey(uint256,uint256,(string,(uint256,uint256),(uint256[2],uint256[2]),(uint256[2],uint256[2]),(uint256[2],uint256[2]),(uint256,uint256)[]))': FunctionFragment;
    'transferOwnership(address)': FunctionFragment;
    'verify((((uint256,uint256),(uint256[2],uint256[2]),(uint256,uint256)),uint256,uint256[],uint256[],(uint16,uint8,address,bytes32,(uint256[4],uint256[2],uint256[])[]),(uint256,(uint8,address,uint256),uint120),address))': FunctionFragment;
    'verifyProof((string,(uint256,uint256),(uint256[2],uint256[2]),(uint256[2],uint256[2]),(uint256[2],uint256[2]),(uint256,uint256)[]),((uint256,uint256),(uint256[2],uint256[2]),(uint256,uint256)),uint256[])': FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | 'SNARK_BYPASS'
      | 'getVerificationKey'
      | 'hashBoundParams'
      | 'owner'
      | 'renounceOwnership'
      | 'setVerificationKey'
      | 'transferOwnership'
      | 'verify'
      | 'verifyProof',
  ): FunctionFragment;

  encodeFunctionData(functionFragment: 'SNARK_BYPASS', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'getVerificationKey',
    values: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>],
  ): string;
  encodeFunctionData(functionFragment: 'hashBoundParams', values: [BoundParamsStruct]): string;
  encodeFunctionData(functionFragment: 'owner', values?: undefined): string;
  encodeFunctionData(functionFragment: 'renounceOwnership', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'setVerificationKey',
    values: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>, VerifyingKeyStruct],
  ): string;
  encodeFunctionData(
    functionFragment: 'transferOwnership',
    values: [PromiseOrValue<string>],
  ): string;
  encodeFunctionData(functionFragment: 'verify', values: [TransactionStruct]): string;
  encodeFunctionData(
    functionFragment: 'verifyProof',
    values: [VerifyingKeyStruct, SnarkProofStruct, PromiseOrValue<BigNumberish>[]],
  ): string;

  decodeFunctionResult(functionFragment: 'SNARK_BYPASS', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getVerificationKey', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'hashBoundParams', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'owner', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'renounceOwnership', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'setVerificationKey', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'transferOwnership', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'verify', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'verifyProof', data: BytesLike): Result;

  events: {
    'Initialized(uint8)': EventFragment;
    'OwnershipTransferred(address,address)': EventFragment;
    'VerifyingKeySet(uint256,uint256,tuple)': EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: 'Initialized'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'OwnershipTransferred'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'VerifyingKeySet'): EventFragment;
}

export interface InitializedEventObject {
  version: number;
}
export type InitializedEvent = TypedEvent<[number], InitializedEventObject>;

export type InitializedEventFilter = TypedEventFilter<InitializedEvent>;

export interface OwnershipTransferredEventObject {
  previousOwner: string;
  newOwner: string;
}
export type OwnershipTransferredEvent = TypedEvent<
  [string, string],
  OwnershipTransferredEventObject
>;

export type OwnershipTransferredEventFilter = TypedEventFilter<OwnershipTransferredEvent>;

export interface VerifyingKeySetEventObject {
  nullifiers: BigNumber;
  commitments: BigNumber;
  verifyingKey: VerifyingKeyStructOutput;
}
export type VerifyingKeySetEvent = TypedEvent<
  [BigNumber, BigNumber, VerifyingKeyStructOutput],
  VerifyingKeySetEventObject
>;

export type VerifyingKeySetEventFilter = TypedEventFilter<VerifyingKeySetEvent>;

export interface VerifierStub extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: VerifierStubInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | Optional<number>,
    toBlock?: string | Optional<number>,
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>,
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    SNARK_BYPASS(overrides?: CallOverrides): Promise<[string]>;

    getVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<[VerifyingKeyStructOutput]>;

    hashBoundParams(
      _boundParams: BoundParamsStruct,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    renounceOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    setVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      _verifyingKey: VerifyingKeyStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    verify(_transaction: TransactionStruct, overrides?: CallOverrides): Promise<[boolean]>;

    verifyProof(
      _verifyingKey: VerifyingKeyStruct,
      _proof: SnarkProofStruct,
      _inputs: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<[boolean]>;
  };

  SNARK_BYPASS(overrides?: CallOverrides): Promise<string>;

  getVerificationKey(
    _nullifiers: PromiseOrValue<BigNumberish>,
    _commitments: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides,
  ): Promise<VerifyingKeyStructOutput>;

  hashBoundParams(_boundParams: BoundParamsStruct, overrides?: CallOverrides): Promise<BigNumber>;

  owner(overrides?: CallOverrides): Promise<string>;

  renounceOwnership(
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  setVerificationKey(
    _nullifiers: PromiseOrValue<BigNumberish>,
    _commitments: PromiseOrValue<BigNumberish>,
    _verifyingKey: VerifyingKeyStruct,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  transferOwnership(
    newOwner: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  verify(_transaction: TransactionStruct, overrides?: CallOverrides): Promise<boolean>;

  verifyProof(
    _verifyingKey: VerifyingKeyStruct,
    _proof: SnarkProofStruct,
    _inputs: PromiseOrValue<BigNumberish>[],
    overrides?: CallOverrides,
  ): Promise<boolean>;

  callStatic: {
    SNARK_BYPASS(overrides?: CallOverrides): Promise<string>;

    getVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<VerifyingKeyStructOutput>;

    hashBoundParams(_boundParams: BoundParamsStruct, overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<string>;

    renounceOwnership(overrides?: CallOverrides): Promise<void>;

    setVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      _verifyingKey: VerifyingKeyStruct,
      overrides?: CallOverrides,
    ): Promise<void>;

    transferOwnership(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;

    verify(_transaction: TransactionStruct, overrides?: CallOverrides): Promise<boolean>;

    verifyProof(
      _verifyingKey: VerifyingKeyStruct,
      _proof: SnarkProofStruct,
      _inputs: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<boolean>;
  };

  filters: {
    'Initialized(uint8)'(version?: null): InitializedEventFilter;
    Initialized(version?: null): InitializedEventFilter;

    'OwnershipTransferred(address,address)'(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null,
    ): OwnershipTransferredEventFilter;
    OwnershipTransferred(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null,
    ): OwnershipTransferredEventFilter;

    'VerifyingKeySet(uint256,uint256,tuple)'(
      nullifiers?: null,
      commitments?: null,
      verifyingKey?: null,
    ): VerifyingKeySetEventFilter;
    VerifyingKeySet(
      nullifiers?: null,
      commitments?: null,
      verifyingKey?: null,
    ): VerifyingKeySetEventFilter;
  };

  estimateGas: {
    SNARK_BYPASS(overrides?: CallOverrides): Promise<BigNumber>;

    getVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    hashBoundParams(_boundParams: BoundParamsStruct, overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    renounceOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    setVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      _verifyingKey: VerifyingKeyStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    verify(_transaction: TransactionStruct, overrides?: CallOverrides): Promise<BigNumber>;

    verifyProof(
      _verifyingKey: VerifyingKeyStruct,
      _proof: SnarkProofStruct,
      _inputs: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    SNARK_BYPASS(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    hashBoundParams(
      _boundParams: BoundParamsStruct,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    setVerificationKey(
      _nullifiers: PromiseOrValue<BigNumberish>,
      _commitments: PromiseOrValue<BigNumberish>,
      _verifyingKey: VerifyingKeyStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    verify(
      _transaction: TransactionStruct,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    verifyProof(
      _verifyingKey: VerifyingKeyStruct,
      _proof: SnarkProofStruct,
      _inputs: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;
  };
}
