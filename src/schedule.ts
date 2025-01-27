import { headers, NResponseSchedule } from './index';
import { generateIdentifier, OTPAuthValidate } from './tools';
import { addSchedule, checkTOTPToken, ClientIDRegularExpression, getClient, NClientBackend, NScheduleBackend, NTOTPTokenBackend, recordTOTPToken } from './database';

export async function schedule(request, requestBody, env, ctx): Promise<Response> {
  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqTOTPToken = requestBody.totp_token as NTOTPTokenBackend['Token'];
  const reqStopID = requestBody.stop_id as NScheduleBackend['StopID'];
  const reqLocationName = requestBody.location_name as NScheduleBackend['LocationName'];
  const reqRouteID = requestBody.route_id as NScheduleBackend['RouteID'];
  const reqRouteName = requestBody.route_name as NScheduleBackend['RouteName'];
  const reqDirection = requestBody.direction as NScheduleBackend['Direction'];
  const reqEstimateTime = requestBody.estimate_time as NScheduleBackend['EstimateTime'];
  const reqTimeFormattingMode = requestBody.time_formatting_mode as NScheduleBackend['TimeFormattingMode'];
  const reqTimeOffset = requestBody.time_offset as NScheduleBackend['TimeOffset'];
  const reqScheduledTime = new Date(requestBody.scheduled_time).getTime() as NScheduleBackend['ScheduledTime'];

  const now = new Date();
  const scheduleID = generateIdentifier('schedule') as NScheduleBackend['ScheduleID'];

  let responseObject: NResponseSchedule = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'schedule',
    schedule_id: 'null'
  };

  const clientIDTest = ClientIDRegularExpression.test(reqClientID);
  if (clientIDTest) {
    const thisClient = await getClient(reqClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'schedule',
        schedule_id: 'null'
      };
    } else {
      const validation = OTPAuthValidate(thisClient.Secret, reqTOTPToken);
      if (validation) {
        await recordTOTPToken(reqClientID, reqTOTPToken, env);
        const check = await checkTOTPToken(reqClientID, reqTOTPToken, env);
        if (check) {
          if (reqScheduledTime > now.getTime() + 60 * 1 * 1000) {
            await addSchedule(scheduleID, reqClientID, reqStopID, reqLocationName, reqRouteID, reqRouteName, reqDirection, reqEstimateTime, reqTimeFormattingMode, reqTimeOffset, reqScheduledTime, env);
            responseObject = {
              result: 'The notification was scheduled.',
              code: 200,
              method: 'schedule',
              schedule_id: scheduleID
            };
          } else {
            responseObject = {
              result: 'The scheduled time shall be at least 1 minute after.',
              code: 400,
              method: 'schedule',
              schedule_id: 'null'
            };
          }
        } else {
          responseObject = {
            result: 'The token was used too many times.',
            code: 403,
            method: 'schedule'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 403,
          method: 'schedule',
          schedule_id: 'null'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'schedule',
      schedule_id: 'null'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
