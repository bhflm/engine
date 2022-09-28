declare type Optional<T> = T | undefined;

declare module 'circomlibjs' {
  export type Signature = {
    R8: [bigint, bigint];
    S: bigint;
  };
  export namespace eddsa {
    export function verifyPoseidon(msg: bigint, sig: Signature, A: bigint[]): boolean;
    export function signPoseidon(prv: Uint8Array, msg: bigint): Signature;
    export function prv2pub(prv: Buffer): [bigint, bigint];
  }
  export namespace babyjub {
    export function packPoint(point: [bigint, bigint]): Buffer;
    export function unpackPoint(buffer: Buffer): [bigint, bigint];
  }
  export function poseidon(inputs: bigint[]): bigint;
}

declare module 'snarkjs';
declare module '@railgun-community/test-artifacts';
