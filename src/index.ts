import { cancel } from './cancel';
import { register } from './register';
import { schedule } from './schedule';
import { send } from './send';
import { updateTelegram } from './update_telegram';

interface Env {
  bus_notification_kv: KVNamespace;
}

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
        break;
      case 'update':
        const update = await updateTelegram(request, env, ctx);
        return update;
        break;
        break;
      default:
        return new Response(`The method '${param_method}' is unsupported.`, {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        break;
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(send(event, env, ctx));
  }
};
