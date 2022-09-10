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
} from '../../common';

export interface GovernorRewardsInterface extends utils.Interface {
  functions: {
    'BASIS_POINTS()': FunctionFragment;
    'DISTRIBUTION_INTERVAL()': FunctionFragment;
    'STAKING_DEPLOY_TIME()': FunctionFragment;
    'STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER()': FunctionFragment;
    'addTokens(address[])': FunctionFragment;
    'calculateRewards(address[],address,uint256,uint256,uint256[],bool)': FunctionFragment;
    'claim(address[],address,uint256,uint256,uint256[])': FunctionFragment;
    'currentInterval()': FunctionFragment;
    'distributionIntervalToStakingInterval(uint256)': FunctionFragment;
    'earmark(address)': FunctionFragment;
    'earmarked(address,uint256)': FunctionFragment;
    'fetchAccountSnapshots(uint256,uint256,address,uint256[])': FunctionFragment;
    'fetchGlobalSnapshots(uint256,uint256,uint256[])': FunctionFragment;
    'getClaimed(address,address,uint256)': FunctionFragment;
    'initializeGovernorRewards(address,address,address,uint256,address[])': FunctionFragment;
    'intervalAtTime(uint256)': FunctionFragment;
    'intervalBP()': FunctionFragment;
    'nextEarmarkInterval(address)': FunctionFragment;
    'nextSnapshotPreCalcInterval()': FunctionFragment;
    'owner()': FunctionFragment;
    'precalculatedGlobalSnapshots(uint256)': FunctionFragment;
    'prefetchGlobalSnapshots(uint256,uint256,uint256[],address[])': FunctionFragment;
    'removeTokens(address[])': FunctionFragment;
    'renounceOwnership()': FunctionFragment;
    'setIntervalBP(uint256)': FunctionFragment;
    'staking()': FunctionFragment;
    'tokens(address)': FunctionFragment;
    'transferOwnership(address)': FunctionFragment;
    'treasury()': FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | 'BASIS_POINTS'
      | 'DISTRIBUTION_INTERVAL'
      | 'STAKING_DEPLOY_TIME'
      | 'STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER'
      | 'addTokens'
      | 'calculateRewards'
      | 'claim'
      | 'currentInterval'
      | 'distributionIntervalToStakingInterval'
      | 'earmark'
      | 'earmarked'
      | 'fetchAccountSnapshots'
      | 'fetchGlobalSnapshots'
      | 'getClaimed'
      | 'initializeGovernorRewards'
      | 'intervalAtTime'
      | 'intervalBP'
      | 'nextEarmarkInterval'
      | 'nextSnapshotPreCalcInterval'
      | 'owner'
      | 'precalculatedGlobalSnapshots'
      | 'prefetchGlobalSnapshots'
      | 'removeTokens'
      | 'renounceOwnership'
      | 'setIntervalBP'
      | 'staking'
      | 'tokens'
      | 'transferOwnership'
      | 'treasury',
  ): FunctionFragment;

  encodeFunctionData(functionFragment: 'BASIS_POINTS', values?: undefined): string;
  encodeFunctionData(functionFragment: 'DISTRIBUTION_INTERVAL', values?: undefined): string;
  encodeFunctionData(functionFragment: 'STAKING_DEPLOY_TIME', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER',
    values?: undefined,
  ): string;
  encodeFunctionData(functionFragment: 'addTokens', values: [PromiseOrValue<string>[]]): string;
  encodeFunctionData(
    functionFragment: 'calculateRewards',
    values: [
      PromiseOrValue<string>[],
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>[],
      PromiseOrValue<boolean>,
    ],
  ): string;
  encodeFunctionData(
    functionFragment: 'claim',
    values: [
      PromiseOrValue<string>[],
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>[],
    ],
  ): string;
  encodeFunctionData(functionFragment: 'currentInterval', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'distributionIntervalToStakingInterval',
    values: [PromiseOrValue<BigNumberish>],
  ): string;
  encodeFunctionData(functionFragment: 'earmark', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(
    functionFragment: 'earmarked',
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>],
  ): string;
  encodeFunctionData(
    functionFragment: 'fetchAccountSnapshots',
    values: [
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>[],
    ],
  ): string;
  encodeFunctionData(
    functionFragment: 'fetchGlobalSnapshots',
    values: [
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>[],
    ],
  ): string;
  encodeFunctionData(
    functionFragment: 'getClaimed',
    values: [PromiseOrValue<string>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>],
  ): string;
  encodeFunctionData(
    functionFragment: 'initializeGovernorRewards',
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<string>[],
    ],
  ): string;
  encodeFunctionData(
    functionFragment: 'intervalAtTime',
    values: [PromiseOrValue<BigNumberish>],
  ): string;
  encodeFunctionData(functionFragment: 'intervalBP', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'nextEarmarkInterval',
    values: [PromiseOrValue<string>],
  ): string;
  encodeFunctionData(functionFragment: 'nextSnapshotPreCalcInterval', values?: undefined): string;
  encodeFunctionData(functionFragment: 'owner', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'precalculatedGlobalSnapshots',
    values: [PromiseOrValue<BigNumberish>],
  ): string;
  encodeFunctionData(
    functionFragment: 'prefetchGlobalSnapshots',
    values: [
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>[],
      PromiseOrValue<string>[],
    ],
  ): string;
  encodeFunctionData(functionFragment: 'removeTokens', values: [PromiseOrValue<string>[]]): string;
  encodeFunctionData(functionFragment: 'renounceOwnership', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'setIntervalBP',
    values: [PromiseOrValue<BigNumberish>],
  ): string;
  encodeFunctionData(functionFragment: 'staking', values?: undefined): string;
  encodeFunctionData(functionFragment: 'tokens', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(
    functionFragment: 'transferOwnership',
    values: [PromiseOrValue<string>],
  ): string;
  encodeFunctionData(functionFragment: 'treasury', values?: undefined): string;

  decodeFunctionResult(functionFragment: 'BASIS_POINTS', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'DISTRIBUTION_INTERVAL', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'STAKING_DEPLOY_TIME', data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: 'STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER',
    data: BytesLike,
  ): Result;
  decodeFunctionResult(functionFragment: 'addTokens', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'calculateRewards', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'claim', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'currentInterval', data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: 'distributionIntervalToStakingInterval',
    data: BytesLike,
  ): Result;
  decodeFunctionResult(functionFragment: 'earmark', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'earmarked', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'fetchAccountSnapshots', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'fetchGlobalSnapshots', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getClaimed', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'initializeGovernorRewards', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'intervalAtTime', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'intervalBP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'nextEarmarkInterval', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'nextSnapshotPreCalcInterval', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'owner', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'precalculatedGlobalSnapshots', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'prefetchGlobalSnapshots', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'removeTokens', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'renounceOwnership', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'setIntervalBP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'staking', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'tokens', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'transferOwnership', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'treasury', data: BytesLike): Result;

  events: {
    'Claim(address,address,uint256,uint256,uint256)': EventFragment;
    'Initialized(uint8)': EventFragment;
    'OwnershipTransferred(address,address)': EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: 'Claim'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'Initialized'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'OwnershipTransferred'): EventFragment;
}

export interface ClaimEventObject {
  token: string;
  account: string;
  amount: BigNumber;
  startInterval: BigNumber;
  endInterval: BigNumber;
}
export type ClaimEvent = TypedEvent<
  [string, string, BigNumber, BigNumber, BigNumber],
  ClaimEventObject
>;

export type ClaimEventFilter = TypedEventFilter<ClaimEvent>;

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

export interface GovernorRewards extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: GovernorRewardsInterface;

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
    BASIS_POINTS(overrides?: CallOverrides): Promise<[BigNumber]>;

    DISTRIBUTION_INTERVAL(overrides?: CallOverrides): Promise<[BigNumber]>;

    STAKING_DEPLOY_TIME(overrides?: CallOverrides): Promise<[BigNumber]>;

    STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER(overrides?: CallOverrides): Promise<[BigNumber]>;

    addTokens(
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    calculateRewards(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _ignoreClaimed: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber[]]>;

    claim(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    currentInterval(overrides?: CallOverrides): Promise<[BigNumber]>;

    distributionIntervalToStakingInterval(
      _distributionInterval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    earmark(
      _token: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    earmarked(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    fetchAccountSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _account: PromiseOrValue<string>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<[BigNumber[]]>;

    fetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<[BigNumber[]]>;

    getClaimed(
      _account: PromiseOrValue<string>,
      _token: PromiseOrValue<string>,
      _interval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<[boolean]>;

    initializeGovernorRewards(
      _owner: PromiseOrValue<string>,
      _staking: PromiseOrValue<string>,
      _treasury: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    intervalAtTime(
      _time: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    intervalBP(overrides?: CallOverrides): Promise<[BigNumber]>;

    nextEarmarkInterval(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    nextSnapshotPreCalcInterval(overrides?: CallOverrides): Promise<[BigNumber]>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    precalculatedGlobalSnapshots(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    prefetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _postProcessTokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    removeTokens(
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    setIntervalBP(
      _newIntervalBP: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    staking(overrides?: CallOverrides): Promise<[string]>;

    tokens(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    treasury(overrides?: CallOverrides): Promise<[string]>;
  };

  BASIS_POINTS(overrides?: CallOverrides): Promise<BigNumber>;

  DISTRIBUTION_INTERVAL(overrides?: CallOverrides): Promise<BigNumber>;

  STAKING_DEPLOY_TIME(overrides?: CallOverrides): Promise<BigNumber>;

  STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER(overrides?: CallOverrides): Promise<BigNumber>;

  addTokens(
    _tokens: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  calculateRewards(
    _tokens: PromiseOrValue<string>[],
    _account: PromiseOrValue<string>,
    _startingInterval: PromiseOrValue<BigNumberish>,
    _endingInterval: PromiseOrValue<BigNumberish>,
    _hints: PromiseOrValue<BigNumberish>[],
    _ignoreClaimed: PromiseOrValue<boolean>,
    overrides?: CallOverrides,
  ): Promise<BigNumber[]>;

  claim(
    _tokens: PromiseOrValue<string>[],
    _account: PromiseOrValue<string>,
    _startingInterval: PromiseOrValue<BigNumberish>,
    _endingInterval: PromiseOrValue<BigNumberish>,
    _hints: PromiseOrValue<BigNumberish>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  currentInterval(overrides?: CallOverrides): Promise<BigNumber>;

  distributionIntervalToStakingInterval(
    _distributionInterval: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  earmark(
    _token: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  earmarked(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  fetchAccountSnapshots(
    _startingInterval: PromiseOrValue<BigNumberish>,
    _endingInterval: PromiseOrValue<BigNumberish>,
    _account: PromiseOrValue<string>,
    _hints: PromiseOrValue<BigNumberish>[],
    overrides?: CallOverrides,
  ): Promise<BigNumber[]>;

  fetchGlobalSnapshots(
    _startingInterval: PromiseOrValue<BigNumberish>,
    _endingInterval: PromiseOrValue<BigNumberish>,
    _hints: PromiseOrValue<BigNumberish>[],
    overrides?: CallOverrides,
  ): Promise<BigNumber[]>;

  getClaimed(
    _account: PromiseOrValue<string>,
    _token: PromiseOrValue<string>,
    _interval: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides,
  ): Promise<boolean>;

  initializeGovernorRewards(
    _owner: PromiseOrValue<string>,
    _staking: PromiseOrValue<string>,
    _treasury: PromiseOrValue<string>,
    _startingInterval: PromiseOrValue<BigNumberish>,
    _tokens: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  intervalAtTime(
    _time: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  intervalBP(overrides?: CallOverrides): Promise<BigNumber>;

  nextEarmarkInterval(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

  nextSnapshotPreCalcInterval(overrides?: CallOverrides): Promise<BigNumber>;

  owner(overrides?: CallOverrides): Promise<string>;

  precalculatedGlobalSnapshots(
    arg0: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  prefetchGlobalSnapshots(
    _startingInterval: PromiseOrValue<BigNumberish>,
    _endingInterval: PromiseOrValue<BigNumberish>,
    _hints: PromiseOrValue<BigNumberish>[],
    _postProcessTokens: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  removeTokens(
    _tokens: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  renounceOwnership(
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  setIntervalBP(
    _newIntervalBP: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  staking(overrides?: CallOverrides): Promise<string>;

  tokens(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

  transferOwnership(
    newOwner: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  treasury(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    BASIS_POINTS(overrides?: CallOverrides): Promise<BigNumber>;

    DISTRIBUTION_INTERVAL(overrides?: CallOverrides): Promise<BigNumber>;

    STAKING_DEPLOY_TIME(overrides?: CallOverrides): Promise<BigNumber>;

    STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER(overrides?: CallOverrides): Promise<BigNumber>;

    addTokens(_tokens: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<void>;

    calculateRewards(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _ignoreClaimed: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<BigNumber[]>;

    claim(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<void>;

    currentInterval(overrides?: CallOverrides): Promise<BigNumber>;

    distributionIntervalToStakingInterval(
      _distributionInterval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    earmark(_token: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;

    earmarked(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    fetchAccountSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _account: PromiseOrValue<string>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<BigNumber[]>;

    fetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<BigNumber[]>;

    getClaimed(
      _account: PromiseOrValue<string>,
      _token: PromiseOrValue<string>,
      _interval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<boolean>;

    initializeGovernorRewards(
      _owner: PromiseOrValue<string>,
      _staking: PromiseOrValue<string>,
      _treasury: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _tokens: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<void>;

    intervalAtTime(
      _time: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    intervalBP(overrides?: CallOverrides): Promise<BigNumber>;

    nextEarmarkInterval(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    nextSnapshotPreCalcInterval(overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<string>;

    precalculatedGlobalSnapshots(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    prefetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _postProcessTokens: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<void>;

    removeTokens(_tokens: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<void>;

    renounceOwnership(overrides?: CallOverrides): Promise<void>;

    setIntervalBP(
      _newIntervalBP: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<void>;

    staking(overrides?: CallOverrides): Promise<string>;

    tokens(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

    transferOwnership(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;

    treasury(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    'Claim(address,address,uint256,uint256,uint256)'(
      token?: null,
      account?: null,
      amount?: null,
      startInterval?: null,
      endInterval?: null,
    ): ClaimEventFilter;
    Claim(
      token?: null,
      account?: null,
      amount?: null,
      startInterval?: null,
      endInterval?: null,
    ): ClaimEventFilter;

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
  };

  estimateGas: {
    BASIS_POINTS(overrides?: CallOverrides): Promise<BigNumber>;

    DISTRIBUTION_INTERVAL(overrides?: CallOverrides): Promise<BigNumber>;

    STAKING_DEPLOY_TIME(overrides?: CallOverrides): Promise<BigNumber>;

    STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER(overrides?: CallOverrides): Promise<BigNumber>;

    addTokens(
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    calculateRewards(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _ignoreClaimed: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    claim(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    currentInterval(overrides?: CallOverrides): Promise<BigNumber>;

    distributionIntervalToStakingInterval(
      _distributionInterval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    earmark(
      _token: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    earmarked(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    fetchAccountSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _account: PromiseOrValue<string>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    fetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getClaimed(
      _account: PromiseOrValue<string>,
      _token: PromiseOrValue<string>,
      _interval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    initializeGovernorRewards(
      _owner: PromiseOrValue<string>,
      _staking: PromiseOrValue<string>,
      _treasury: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    intervalAtTime(
      _time: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    intervalBP(overrides?: CallOverrides): Promise<BigNumber>;

    nextEarmarkInterval(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    nextSnapshotPreCalcInterval(overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    precalculatedGlobalSnapshots(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    prefetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _postProcessTokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    removeTokens(
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    renounceOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    setIntervalBP(
      _newIntervalBP: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    staking(overrides?: CallOverrides): Promise<BigNumber>;

    tokens(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    treasury(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    BASIS_POINTS(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    DISTRIBUTION_INTERVAL(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    STAKING_DEPLOY_TIME(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER(
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    addTokens(
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    calculateRewards(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _ignoreClaimed: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    claim(
      _tokens: PromiseOrValue<string>[],
      _account: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    currentInterval(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    distributionIntervalToStakingInterval(
      _distributionInterval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    earmark(
      _token: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    earmarked(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    fetchAccountSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _account: PromiseOrValue<string>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    fetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getClaimed(
      _account: PromiseOrValue<string>,
      _token: PromiseOrValue<string>,
      _interval: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    initializeGovernorRewards(
      _owner: PromiseOrValue<string>,
      _staking: PromiseOrValue<string>,
      _treasury: PromiseOrValue<string>,
      _startingInterval: PromiseOrValue<BigNumberish>,
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    intervalAtTime(
      _time: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    intervalBP(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    nextEarmarkInterval(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    nextSnapshotPreCalcInterval(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    precalculatedGlobalSnapshots(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    prefetchGlobalSnapshots(
      _startingInterval: PromiseOrValue<BigNumberish>,
      _endingInterval: PromiseOrValue<BigNumberish>,
      _hints: PromiseOrValue<BigNumberish>[],
      _postProcessTokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    removeTokens(
      _tokens: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    setIntervalBP(
      _newIntervalBP: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    staking(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    tokens(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    treasury(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
