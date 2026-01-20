import { D1Database } from '@cloudflare/workers-types';
import { cancel } from './cancel';
import { register } from './register';
import { rotate } from './rotate';
import { schedule } from './schedule';
import { send } from './send';
import { reschedule } from './reschedule';

export interface Env {
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

export interface NResponseReschedule {
  result: string;
  code: NResponseCode;
  method: 'reschedule';
}

export type NResponse = NResponseCancel | NResponseRegister | NResponseSchedule | NResponseRotate | NResponseReschedule;

export function getHeaders(origin: any): object {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': typeof origin === 'string' ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': false,
    'Access-Control-Allow-Headers': '*',
    'Vary': 'Origin'
  };
}

export const SecretSize = 64;
export const TokenPeriod = 10;
export const TokenUsageLimit = 5;

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request and should return a Response (optionally wrapped in a Promise)
  async fetch(request, env: Env, ctx) {
    const url = new URL(request.url);
    const url_params = url.searchParams;
    const param_method = url_params.get('method');

    const contentType = request.headers.get('Content-Type');
    const origin = request.headers.get('origin');
    if (String(contentType).includes('application/json')) {
      const requestBody = await request.json();
      switch (param_method) {
        case 'register':
          const registration = await register(request, requestBody, env, ctx);
          return registration;
          break;
        case 'schedule':
          const scheduling = await schedule(request, requestBody, env, ctx);
          return scheduling;
          break;
        case 'cancel':
          const cancellation = await cancel(request, requestBody, env, ctx);
          return cancellation;
          break;
        case 'rotate':
          const rotation = await rotate(request, requestBody, env, ctx);
          return rotation;
          break;
        case 'reschedule':
          const rescheduling = await reschedule(request, requestBody, env, ctx);
          return rescheduling;
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
              headers: getHeaders(origin)
            }
          );
          break;
      }
    } else {
      return new Response(
        JSON.stringify({
          result: `The Content-Type '${contentType}' is unsupported.`,
          code: 400,
          method: param_method
        }),
        {
          status: 200,
          headers: getHeaders(origin)
        }
      );
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(send(event, env, ctx));
  }
};
