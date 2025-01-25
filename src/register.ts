import { headers, NResponseRegister, TOTPSecretSize } from '.';
import { generateIdentifier, OTPAuthSecret } from './tools';

export interface NClientBackend {
  client_id: string;
  secret: string;
  type: 'client';
}

export async function register(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramHash = urlParams.get('hash');

  const clientID = generateIdentifier('client');
  const TOTPSecret = OTPAuthSecret(TOTPSecretSize);

  const currentDate = new Date();
  currentDate.setMilliseconds(0);
  currentDate.setSeconds(0);

  const envHash_previous = sha256(`${env.REGISTRATION_KEY}${currentDate.getTime() - 60 * 1000}`);
  const envHash_current = sha256(`${env.REGISTRATION_KEY}${currentDate.getTime()}`);
  const envHash_next = sha256(`${env.REGISTRATION_KEY}${currentDate.getTime() + 60 * 1000}`);

  let responseObject: NResponseRegister = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'register',
    client_id: 'null',
    secret: 'null'
  };

  if (paramHash === envHash_previous || paramHash === envHash_current || paramHash === envHash_next) {
    const clientObject: NClientBackend = {
      secret: TOTPSecret,
      client_id: clientID,
      type: 'client'
    };
    
    responseObject = {
      result: 'Client was registered.',
      code: 200,
      method: 'register',
      client_id: clientID,
      secret: TOTPSecret
    };
  } else {
    responseObject = {
      result: 'The token is not valid.',
      code: 400,
      method: 'register',
      client_id: 'null',
      secret: 'null'
    };
  }
  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
