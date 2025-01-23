import { cancel } from './cancel';
import { register } from './register';
import { schedule } from './schedule';
import { send } from './send';
import { update } from './update_telegram';

interface Env {
  bus_notification_kv: KVNamespace;
}

export type methodType = 'cancel' | 'register' | 'schedule' | 'update';
export type responseCode = 200 | 400 | 401 | 404 | 500;

export interface ResponseObjectCancel {
  result: string;
  code: responseCode;
  method: 'cancel';
}

export interface ResponseObjectRegister {
  result: string;
  code: responseCode;
  method: 'register';
  client_id: string | 'null';
  secret: string | 'null';
}

export interface ResponseObjectSchedule {
  result: string;
  code: responseCode;
  method: 'schedule';
  schedule_id: string | 'null';
}

export interface ResponseObjectUpdate {
  result: string;
  code: responseCode;
  method: 'update';
}

export type ResponseObject = ResponseObjectCancel | ResponseObjectRegister | ResponseObjectSchedule | ResponseObjectUpdate;

export const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request and should return a Response (optionally wrapped in a Promise)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const url_params = url.searchParams;
    const param_method = url_params.get('method');

    switch (param_method) {
      case 'register':
        const registration = await register(request, env, ctx);
        return registration;
        break;
      case 'schedule':
        const scheduling = await schedule(request, env, ctx);
        return scheduling;
        break;
      case 'cancel':
        const cancellation = await cancel(request, env, ctx);
        return cancellation;
        break;
      case 'update':
        const updating = await update(request, env, ctx);
        return updating;
        break;
      default:
        return new Response(
          JSON.stringify({
            result: `The method '${param_method}' is unsupported.`,
            code: 400,
            method: param_method
          }),
          {
            status: 200,
            headers: headers
          }
        );
        break;
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(send(event, env, ctx));
  }
};
