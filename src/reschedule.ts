import { checkToken, ClientIDRegularExpression, getClient, getSchedule, modifySchedule, NClientBackend, NScheduleBackend, NTokenBackend, recordToken, ScheduleIDRegularExpression } from './database';
import { getHeaders, NResponseReschedule } from './index';
import { validateToken } from './tools';

export async function reschedule(request, requestBody, env, ctx): Promise<Response> {
  const referer = request.headers.get('referer');

  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqToken = requestBody.token as NTokenBackend['Token'];
  const reqScheduleID = requestBody.schedule_id as NScheduleBackend['ScheduleID'];
  const reqEstimateTime = requestBody.estimate_time as NScheduleBackend['EstimateTime'];
  const reqScheduledTime = new Date(requestBody.scheduled_time).getTime() as NScheduleBackend['ScheduledTime'];

  const now = new Date();

  let responseObject: NResponseReschedule = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'reschedule'
  };

  const clientIDTest = ClientIDRegularExpression.test(reqClientID);
  if (clientIDTest) {
    const thisClient = await getClient(reqClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'reschedule'
      };
    } else {
      const validation = validateToken(
        thisClient.ClientID,
        thisClient.Secret,
        reqToken,
        {
          schedule_id: reqScheduleID,
          estimate_time: reqEstimateTime,
          scheduled_time: requestBody.scheduled_time
        },
        now.getTime()
      );
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
                method: 'reschedule'
              };
            } else {
              if (thisSchedule.ScheduledTime > now.getTime()) {
                await modifySchedule(thisSchedule.ScheduleID, reqEstimateTime, reqScheduledTime, env);
                responseObject = {
                  result: 'The notification was rescheduled.',
                  code: 200,
                  method: 'reschedule'
                };
              } else {
                responseObject = {
                  result: 'A notification can only be rescheduled before it was due.',
                  code: 400,
                  method: 'reschedule'
                };
              }
            }
          } else {
            responseObject = {
              result: 'The schedule id is invalid.',
              code: 400,
              method: 'reschedule'
            };
          }
        } else {
          responseObject = {
            result: 'The token was used too many times.',
            code: 403,
            method: 'reschedule'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 403,
          method: 'reschedule'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'reschedule'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: getHeaders(referer)
  });
}
