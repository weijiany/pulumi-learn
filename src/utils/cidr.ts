import * as R from 'ramda';

const generateStr = (length: number, char: string): string => new Array(length).fill(char).join('');

const fullToLength = (length: number, pack: string) => (str: string): string =>
  str.length == length
    ? str
    : generateStr(length - str.length, pack) + str;

const ip2Bin = (ip: string): string => R.pipe(
  R.split('.'),
  R.map((block: string) => Number(block).toString(2)),
  R.map(fullToLength(8, '0')),
  R.join(''),
)(ip);

export const cidrGen = function*(cidr: string, digit: number) {
  let ip = R.split('/')(cidr)[0];
  let binary = ip2Bin(ip);
  let netPart = BigInt(`0b${binary.substring(0, digit)}`);

  while (true) {
    netPart = netPart + BigInt('1');
    let addOneCidr = fullToLength(digit, '0')(netPart.toString(2)) + generateStr(32 - digit, '0');
    yield addOneCidr.match(/.{1,8}/g)!
      .map(b => parseInt(b, 2))
      .join('.') + `/${digit}`;
  }
};
