import { TXO } from '../models/txo-types';

export const calculateTotalSpend = (utxos: TXO[]): bigint =>
  utxos.reduce((left, right) => left + right.note.value, BigInt(0));

export const sortUTXOsBySize = (utxos: TXO[]): void => {
  utxos.sort((left, right) => {
    const leftNum = left.note.value;
    const rightNum = right.note.value;
    if (leftNum < rightNum) return 1;
    if (leftNum > rightNum) return -1;
    return 0;
  });
};
