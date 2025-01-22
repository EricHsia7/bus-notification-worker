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

export const OTPAuth = await import('otpauth');

// import * as OTPAuth from "otpauth";
