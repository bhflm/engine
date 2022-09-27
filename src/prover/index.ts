import EngineDebug from '../debugger';
import { ByteLength, nToHex } from '../utils/bytes';
import {
  ArtifactsGetter,
  FormattedCircuitInputs,
  PrivateInputs,
  Proof,
  PublicInputs,
  SnarkProof,
} from './types';

export type Groth16 = {
  verify: Optional<(vkey: object, publicSignals: bigint[], proof: Proof) => Promise<boolean>>;
  fullProve: (
    formattedInputs: FormattedCircuitInputs,
    wasm: Optional<ArrayLike<number>>,
    zkey: ArrayLike<number>,
    logger: { debug: (log: string) => void },
    dat: Optional<ArrayLike<number>>,
    progressCallback: ProverProgressCallback,
  ) => Promise<{ proof: Proof }>;
};

export type ProverProgressCallback = (progress: number) => void;

export { ArtifactsGetter, FormattedCircuitInputs, PrivateInputs, Proof, PublicInputs, SnarkProof };

export class Prover {
  private artifactsGetter: ArtifactsGetter;

  private groth16: Optional<Groth16>;

  constructor(artifactsGetter: ArtifactsGetter) {
    this.artifactsGetter = artifactsGetter;
  }

  /**
   * Used to set implementation from snarkjs.min.js, snarkjs or Native Prover.
   */
  setGroth16(groth16Implementation: Groth16) {
    this.groth16 = groth16Implementation;
  }

  private async maybeVerify(publicInputs: PublicInputs, proof: Proof): Promise<boolean> {
    if (!this.groth16) {
      throw new Error('Requires groth16 verification implementation');
    }
    if (!this.groth16.verify) {
      // Wallet-side verification is a fail-safe.
      // Snark verification will occur during gas estimate (and on-chain) regardless.
      return true;
    }

    // Fetch artifacts
    const artifacts = await this.artifactsGetter(publicInputs);

    // Return output of groth16 verify
    const publicSignals: bigint[] = [
      publicInputs.merkleRoot,
      publicInputs.boundParamsHash,
      ...publicInputs.nullifiers,
      ...publicInputs.commitmentsOut,
    ];

    return this.groth16.verify(artifacts.vkey, publicSignals, proof);
  }

  private static get zeroProof(): Proof {
    const zero = nToHex(BigInt(0), ByteLength.UINT_8);
    // prettier-ignore
    return {
      pi_a: [zero, zero],
      pi_b: [[zero, zero], [zero, zero]],
      pi_c: [zero, zero],
    };
  }

  async dummyProve(publicInputs: PublicInputs): Promise<Proof> {
    // Pull artifacts to make sure we have valid artifacts for this number of inputs.
    // Note that the artifacts are not used in the dummy proof.
    await this.artifactsGetter(publicInputs);
    return Prover.zeroProof;
  }

  async prove(
    publicInputs: PublicInputs,
    privateInputs: PrivateInputs,
    progressCallback: ProverProgressCallback,
  ): Promise<{ proof: Proof; publicInputs: PublicInputs }> {
    if (!this.groth16) {
      throw new Error('Requires groth16 full prover implementation');
    }

    // 1-2  1-3  2-2  2-3  8-2 [nullifiers, commitments]
    // Fetch artifacts
    progressCallback(5);
    const artifacts = await this.artifactsGetter(publicInputs);
    if (!artifacts.wasm && !artifacts.dat) {
      throw new Error('Requires WASM or DAT prover artifact');
    }

    // Get formatted inputs
    const formattedInputs = Prover.formatInputs(publicInputs, privateInputs);

    // Generate proof: Progress from 20 - 99%
    const initialProgressProof = 20;
    const finalProgressProof = 99;
    progressCallback(initialProgressProof);
    const { proof } = await this.groth16.fullProve(
      formattedInputs,
      artifacts.wasm,
      artifacts.zkey,
      { debug: EngineDebug.log },
      artifacts.dat,
      (progress: number) => {
        progressCallback(
          (progress * (finalProgressProof - initialProgressProof)) / 100 + initialProgressProof,
        );
      },
    );
    progressCallback(finalProgressProof);

    // Throw if proof is invalid
    if (!(await this.maybeVerify(publicInputs, proof))) {
      throw new Error('Proof generation failed');
    }
    progressCallback(100);

    // Return proof with inputs
    return {
      proof,
      publicInputs,
    };
  }

  static formatProof(proof: Proof): SnarkProof {
    return {
      a: {
        x: BigInt(proof.pi_a[0]),
        y: BigInt(proof.pi_a[1]),
      },
      b: {
        x: [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        y: [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
      },
      c: {
        x: BigInt(proof.pi_c[0]),
        y: BigInt(proof.pi_c[1]),
      },
    };
  }

  static formatInputs(
    publicInputs: PublicInputs,
    privateInputs: PrivateInputs,
  ): FormattedCircuitInputs {
    return {
      merkleRoot: publicInputs.merkleRoot,
      boundParamsHash: publicInputs.boundParamsHash,
      nullifiers: publicInputs.nullifiers,
      commitmentsOut: publicInputs.commitmentsOut,
      token: privateInputs.tokenAddress,
      publicKey: privateInputs.publicKey,
      signature: privateInputs.signature,
      randomIn: privateInputs.randomIn,
      valueIn: privateInputs.valueIn,
      pathElements: privateInputs.pathElements.flat(2),
      leavesIndices: privateInputs.leavesIndices,
      nullifyingKey: privateInputs.nullifyingKey,
      npkOut: privateInputs.npkOut,
      valueOut: privateInputs.valueOut,
    };
  }
}
