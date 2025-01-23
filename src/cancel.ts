import { Client } from './register';
import { Schedule } from './schedule';
import { generateIdentifier, OTPAuthValidate } from './tools';

export async function cancel(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as Client['client_id'];
  const paramTOTPToken = urlParams.get('totp_token') as string;
  const paramScheduleID = urlParams.get('scheduled_id') as string;

  const now = new Date();
  const scheduleID = generateIdentifier('schedule');

  let status = 500;
  let responseObject = { result: 'There was an unknown error.' };

  const clientIDTest = /^(client_)([A-Za-z0-9_-]{32,32})$/gm.test(paramClientID);
  const clientJSON = await env.bus_notification_kv.get(paramClientID);
  if (clientIDTest && clientJSON) {
    const client = JSON.parse(clientJSON) as Client;
    const validation = OTPAuthValidate(paramClientID, client.secret, paramTOTPToken);
    if (validation) {
      const scheduleJSON = await env.bus_notification_kv.get(paramScheduleID);
      if (scheduleJSON) {
        const scheduleObject = JSON.parse(scheduleJSON) as Schedule;
        const scheduledTime = new Date(scheduleObject.scheduled_time);
        if (scheduledTime.getTime() < now.getTime()) {
          await env.bus_notification_kv.delete(scheduleID);
          status = 200;
          responseObject = { result: 'The schedule was canceled successfully.' };
        } else {
          status = 400;
          responseObject = { result: 'The schedule can only be canceled before it was due.' };
        }
      } else {
        status = 404;
        responseObject = { result: 'The schedule was not found.' };
      }
    } else {
      status = 401;
      responseObject = { result: `The request was unauthorized.` };
    }
  } else {
    status = 404;
    responseObject = { result: 'The client was not found.' };
  }
  return new Response(JSON.stringify(responseObject), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
