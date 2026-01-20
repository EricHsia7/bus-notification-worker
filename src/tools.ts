import { NTokenBackend } from './database';

export const sha256 = require('sha256');

export function generateSecret(size: number): string {
  const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const BASE = 62n;

  let num = 0n;
  let result = '';
  for (let i = size - 1; i >= 0; i--) {
    // Shift the current result left by 8 bits and add the new byte
    const byte = Math.floor(Math.random() * 255);
    num = (num << 8n) + BigInt(byte);
  }
  while (num > 0n) {
    const remainder = num % BASE;
    result = CHARSET[Number(remainder)] + result;
    num = num / BASE;
  }
  return result;
}

export function validateToken(client_id: NTokenBackend['ClientID'], token: NTokenBackend['Token'], payload: object): boolean {
  const window = 10 * 1000;
  const now = new Date().getTime();
  const i = (now - (now % window)) / window;
  const previousToken = sha256(`${client_id} ${secret} ${i - 1} ${JSON.stringify(payload)}`);
  const currentToken = sha256(`${client_id} ${secret} ${i} ${JSON.stringify(payload)}`);
  const nextToken = sha256(`${client_id} ${secret} ${i + 1} ${JSON.stringify(payload)}`);
  if (currentToken === token || previousToken === token || nextToken === token) {
    return true;
  } else {
    return false;
  }
}

export function generateIdentifier(prefix = 'bus') {
  const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = `${prefix}_`;
  const length = 32;
  for (let i = 0; i < length; i++) {
    const randomNumber = Math.floor(Math.random() * characterSet.length);
    result += characterSet.substring(randomNumber, randomNumber + 1);
  }
  return result;
}

export function formatTime(time: number, mode: number): string {
  time = Math.round(time);
  switch (mode) {
    case 0:
      return `${time}秒`;
      break;
    case 1:
      var minutes = String((time - (time % 60)) / 60);
      var seconds = String(time % 60);
      return [minutes, seconds].map((u) => u.padStart(2, '0')).join(':');
      break;
    case 2:
      var minutes = String(Math.floor(time / 60));
      return `${minutes}分`;
      break;
    case 3:
      if (time >= 60 * 60) {
        var hours = String(parseFloat((time / (60 * 60)).toFixed(1)));
        return `${hours}時`;
      }
      if (60 <= time && time < 60 * 60) {
        var minutes = String(Math.floor(time / 60));
        return `${minutes}分`;
      }
      if (time < 60) {
        return `${time}秒`;
      }
      break;
    default:
      return '--';
      break;
  }
}
