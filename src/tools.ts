import * as OTPAuth from 'otpauth';
import { NClientBackend } from './database';
import { TOTPDigits, TOTPPeriod } from './index';

export const sha256 = require('sha256');

export function OTPAuthSecret(size: number): string {
  const secret = new OTPAuth.Secret({ size });
  const encodedSecret = secret.base32;
  return encodedSecret;
}

export function OTPAuthValidate(clientID: NClientBackend['client_id'], secret: string, token: string): boolean {
  let totp = new OTPAuth.TOTP({
    issuer: 'BusNotification',
    label: clientID,
    algorithm: 'SHA256',
    digits: TOTPDigits,
    period: TOTPPeriod,
    secret: secret
  });
  let delta = totp.validate({
    token,
    window: 1
  });
  if (delta === null) {
    return false;
  } else {
    return true;
  }
}

export function generateIdentifier(prefix = 'bus') {
  const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = `${prefix}_`;
  const length = 32;
  for (let i = 0; i < length; i++) {
    const randomNumber = Math.round(Math.random() * characterSet.length);
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
