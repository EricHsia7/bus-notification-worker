import { KVNamespace, D1Database } from '@cloudflare/workers-types';
import { cancel } from './cancel';
import { register } from './register';
import { rotate } from './rotate';
import { schedule } from './schedule';
import { send } from './send';
import { getClient } from './database';

export interface Env {
  bus_notification_kv: KVNamespace;
  DB: D1Database;
}

export type NResponseCode = 200 | 400 | 401 | 404 | 500;

export interface NResponseCancel {
  result: string;
  code: NResponseCode;
  method: 'cancel';
}

export interface NResponseRegister {
  result: string;
  code: NResponseCode;
  method: 'register';
  client_id: string | 'null';
  secret: string | 'null';
}

export interface NResponseSchedule {
  result: string;
  code: NResponseCode;
  method: 'schedule';
  schedule_id: string | 'null';
}

export interface NResponseRotate {
  result: string;
  code: NResponseCode;
  method: 'rotate';
  secret: string | 'null';
}

export type NResponse = NResponseCancel | NResponseRegister | NResponseSchedule | NResponseRotate;

export const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

export const TOTPSecretSize = 32;
export const TOTPDigits = 8;
export const TOTPPeriod = 10;

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request and should return a Response (optionally wrapped in a Promise)
  async fetch(request, env: Env, ctx) {
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
      case 'rotate':
        const rotation = await rotate(request, env, ctx);
        return rotation;
        break;
      case 'test':
        const test = await getClient('test', env);
        return new Response(JSON.stringify(test), { status: 200, headers: headers });
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
