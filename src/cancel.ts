import { checkToken, ClientIDRegularExpression, discardSchedule, getClient, getSchedule, NClientBackend, NScheduleBackend, NTokenBackend, recordToken, ScheduleIDRegularExpression } from './database';
import { headers, NResponseCancel } from './index';
import { validateToken } from './tools';

export async function cancel(request, requestBody, env, ctx): Promise<Response> {
  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqToken = requestBody.token as NTokenBackend['Token'];
  const reqScheduleID = requestBody.schedule_id as NScheduleBackend['ScheduleID'];

  const now = new Date();

  let responseObject: NResponseCancel = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'cancel'
  };

  const clientIDTest = ClientIDRegularExpression.test(reqClientID);
  if (clientIDTest) {
    const thisClient = await getClient(reqClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'cancel'
      };
    } else {
      const validation = validateToken(thisClient.ClientID, thisClient.Secret, reqToken, { schedule_id: reqScheduleID }, now.getTime());
      if (validation) {
        await recordToken(reqClientID, reqToken, env);
        const check = await checkToken(reqClientID, reqToken, env);
        if (check) {
          const scheduleIDTest = ScheduleIDRegularExpression.test(reqScheduleID);
          if (scheduleIDTest) {
            const thisSchedule = await getSchedule(reqScheduleID, thisClient.ClientID, env);
            if (typeof thisSchedule === 'boolean' && thisSchedule === false) {
              responseObject = {
                result: 'The schedule was not found.',
                code: 404,
                method: 'cancel'
              };
            } else {
              if (thisSchedule.ScheduledTime > now.getTime()) {
                await discardSchedule(thisSchedule.ScheduleID, env);
                responseObject = {
                  result: 'The notification was canceled.',
                  code: 200,
                  method: 'cancel'
                };
              } else {
                responseObject = {
                  result: 'A notification can only be canceled before it was due.',
                  code: 400,
                  method: 'cancel'
                };
              }
            }
          } else {
            responseObject = {
              result: 'The schedule id is invalid.',
              code: 400,
              method: 'cancel'
            };
          }
        } else {
          responseObject = {
            result: 'The token was used too many times.',
            code: 403,
            method: 'cancel'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 403,
          method: 'cancel'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'cancel'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: getH
  });
}
