import { headers, NResponseRotate, TOTPSecretSize } from './index';
import { OTPAuthSecret, OTPAuthValidate } from './tools';
import { checkTOTPToken, ClientIDRegularExpression, getClient, NClientBackend, NTOTPTokenBackend, recordTOTPToken, setClientSecret } from './database';

export async function rotate(request, requestBody, env, ctx): Promise<Response> {
  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqTOTPToken = requestBody.totp_token as NTOTPTokenBackend['Token'];

  const TOTPSecret = OTPAuthSecret(TOTPSecretSize);

  let responseObject: NResponseRotate = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'rotate',
    secret: 'null'
  };

  const clientIDTest = ClientIDRegularExpression.test(reqClientID);
  if (clientIDTest) {
    const thisClient = await getClient(reqClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'rotate',
        secret: 'null'
      };
    } else {
      const validation = OTPAuthValidate(thisClient.ClientID, thisClient.Secret, reqTOTPToken);
      if (validation) {
        await recordTOTPToken(reqClientID, reqTOTPToken, env);
        const check = await checkTOTPToken(reqClientID, reqTOTPToken, env);
        if (check) {
          await setClientSecret(thisClient.ClientID, TOTPSecret, env);
          responseObject = {
            result: 'The secret was rotated.',
            code: 200,
            method: 'rotate',
            secret: TOTPSecret
          };
        } else {
          responseObject = {
            result: 'The token was used too many times.',
            code: 403,
            method: 'rotate',
            secret: 'null'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 403,
          method: 'rotate',
          secret: 'null'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'rotate',
      secret: 'null'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
