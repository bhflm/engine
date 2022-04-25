import { EncryptedRandom } from '../transaction/types';
import { formatToByteLength, hexToBigInt, nToHex } from '../utils/bytes';
import { ZERO_ADDRESS } from '../utils/constants';
import { poseidon } from '../utils/keys-utils';

export const emptyCommitmentPreimage = {
  npk: '00',
  token: {
    tokenType: '00',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    tokenSubID: '00',
  },
  value: '0',
  encryptedRandom: ['00', '00'] as EncryptedRandom,
};

export class WithdrawNote {
  /**
   * Create Note object
   *
   * @param {string} withdrawAddress - address to withdraw to
   * @param {bigint} value - note value
   * @param {string} token - note token
   */
  constructor(public withdrawAddress: string, public value: bigint, public tokenAddress: string) {}

  get token() {
    return {
      tokenAddress: formatToByteLength(this.tokenAddress, 20, true),
      tokenType: ZERO_ADDRESS,
      tokenSubID: ZERO_ADDRESS,
    };
  }

  get npk() {
    return this.withdrawAddress;
  }

  get notePublicKey() {
    return this.withdrawAddress;
  }

  get valueHex() {
    return formatToByteLength(nToHex(this.value), 16, false);
  }

  /**
   * Get note hash
   *
   * @returns {string} hash
   */
  get hash(): string {
    return nToHex(
      poseidon([
        hexToBigInt(this.withdrawAddress),
        hexToBigInt(this.token.tokenAddress),
        this.value,
      ]),
    );
  }

  serialize(prefix: boolean = false) {
    return {
      npk: formatToByteLength(this.withdrawAddress, 32, prefix),
      token: this.token,
      value: this.valueHex,
    };
  }

  get preImage() {
    const { npk, token, value } = this;
    return { npk, token, value };
  }

  static empty() {
    return new WithdrawNote(ZERO_ADDRESS, 0n, ZERO_ADDRESS);
  }
}
