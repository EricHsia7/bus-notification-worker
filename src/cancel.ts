import { headers, NResponseCancel } from '.';
import { NScheduleBackend } from './database';
import { generateIdentifier, OTPAuthValidate } from './tools';
import { NClientBackend } from './database';

export async function cancel(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as NClientBackend['client_id'];
  const paramTOTPToken = urlParams.get('totp_token') as string;
  const paramScheduleID = urlParams.get('scheduled_id') as string;

  const now = new Date();
  const scheduleID = generateIdentifier('schedule');

  let responseObject: NResponseCancel = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'cancel'
  };

  const clientIDTest = /^(client_)([A-Za-z0-9_-]{32,32})$/gm.test(paramClientID);
  const clientJSON = await env.bus_notification_kv.get(paramClientID);
  if (clientIDTest && clientJSON) {
    const client = JSON.parse(clientJSON) as NClientBackend;
    const validation = OTPAuthValidate(paramClientID, client.secret, paramTOTPToken);
    if (validation) {
      const scheduleJSON = await env.bus_notification_kv.get(paramScheduleID);
      if (scheduleJSON) {
        const scheduleObject = JSON.parse(scheduleJSON) as NScheduleBackend;
        const scheduledTime = new Date(scheduleObject.scheduled_time);
        if (scheduledTime.getTime() < now.getTime()) {
          await env.bus_notification_kv.delete(scheduleID);
          responseObject = {
            result: 'The schedule was canceled successfully.',
            code: 200,
            method: 'cancel'
          };
        } else {
          responseObject = {
            result: 'The schedule can only be canceled before it was due.',
            code: 400,
            method: 'cancel'
          };
        }
      } else {
        responseObject = {
          result: 'The schedule was not found.',
          code: 404,
          method: 'cancel'
        };
      }
    } else {
      responseObject = {
        result: `The request was unauthorized.`,
        code: 401,
        method: 'cancel'
      };
    }
  } else {
    responseObject = {
      result: 'The client was not found.',
      code: 404,
      method: 'cancel'
    };
  }
  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
