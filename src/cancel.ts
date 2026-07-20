import { checkToken, testClientID, discardSchedule, getClient, getSchedule, NClientBackend, NScheduleBackend, NTokenBackend, recordToken, testScheduleID } from './database';
import { getHeaders, NResponseCancel } from './index';
import { validateToken } from './tools';

export async function cancel(request, requestBody, env, ctx): Promise<Response> {
  const origin = request.headers.get('origin');

  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqToken = requestBody.token as NTokenBackend['Token'];
  const reqScheduleID = requestBody.schedule_id as NScheduleBackend['ScheduleID'];

  const now = new Date();

  const clientIDTest = testClientID(reqClientID);
  if (!clientIDTest) {
    return new Response(
      JSON.stringify({
        result: 'The client id is invalid.',
        code: 1,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const thisClient = await getClient(reqClientID, env);
  if (typeof thisClient === 'boolean' && thisClient === false) {
    return new Response(
      JSON.stringify({
        result: 'The client was not found.',
        code: 3,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  if (thisClient.Origin !== origin) {
    return new Response(
      JSON.stringify({
        result: 'The origin is invalid.',
        code: 5,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const validation = validateToken(thisClient.ClientID, thisClient.Secret, reqToken, { schedule_id: reqScheduleID }, now.getTime());
  if (!validation) {
    return new Response(
      JSON.stringify({
        result: 'The request was unauthorized.',
        code: 5,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const check = await checkToken(reqClientID, reqToken, env);
  if (!check) {
    return new Response(
      JSON.stringify({
        result: 'The token was used too many times.',
        code: 5,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }
  await recordToken(reqClientID, reqToken, env);

  const scheduleIDTest = testScheduleID(reqScheduleID);
  if (!scheduleIDTest) {
    return new Response(
      JSON.stringify({
        result: 'The schedule id is invalid.',
        code: 2,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const thisSchedule = await getSchedule(reqScheduleID, thisClient.ClientID, env);
  if (typeof thisSchedule === 'boolean' && thisSchedule === false) {
    return new Response(
      JSON.stringify({
        result: 'The schedule was not found.',
        code: 4,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  if (thisSchedule.ScheduledTime <= now.getTime()) {
    return new Response(
      JSON.stringify({
        result: 'A notification can only be canceled before it was due.',
        code: 6,
        method: 'cancel'
      } as NResponseCancel),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  await discardSchedule(thisSchedule.ScheduleID, env);
  return new Response(
    JSON.stringify({
      result: 'The notification was canceled.',
      code: 0,
      method: 'cancel'
    } as NResponseCancel),
    {
      status: 200,
      headers: getHeaders(origin)
    }
  );
}
