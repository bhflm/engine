/* globals describe it */
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { before } from 'mocha';
import { keysUtils } from '../../src/utils';
import { nToHex } from '../../src/utils/bytes';

chai.use(chaiAsPromised);
const { expect } = chai;

let privateKey: bigint;
let pubkey: [bigint, bigint];

describe('Test keys-utils', () => {
  before(() => {
    privateKey = keysUtils.getPrivateSpendingKey('deadbeef');
    pubkey = keysUtils.getPublicSpendingKey(privateKey);
  });

  it('Should return a random scalar', () => {
    const randomScalar = keysUtils.getRandomScalar();
    expect(randomScalar).to.be.a('bigint');
    expect(nToHex(randomScalar).length).to.equal(64);
  });

  it('Should create and verify signatures', () => {
    const message = keysUtils.poseidon([1n, 2n]);
    const signature = keysUtils.signEDDSA(privateKey, message);
    expect(signature.length).to.equal(3);
    assert.isTrue(keysUtils.verifyEDDSA(message, signature, pubkey));
    const fakeMessage = keysUtils.poseidon([2n, 3n]);
    assert.isFalse(keysUtils.verifyEDDSA(fakeMessage, signature, pubkey));
    assert.isFalse(keysUtils.verifyEDDSA(message, signature, [0n, 1n]));
  });
});
