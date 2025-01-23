import * as OTPAuth from 'otpauth';
import { Client } from './register';

export function OTPAuthSecret(size: number): string {
  const secret = new OTPAuth.Secret({ size });
  const encodedSecret = secret.base32;
  return encodedSecret;
}

export function OTPAuthValidate(clientID: Client['client_id'], secret: string, token: string): boolean {
  let totp = new OTPAuth.TOTP({
    issuer: 'BusNotification',
    label: clientID,
    algorithm: 'SHA256',
    digits: 6,
    period: 30,
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
