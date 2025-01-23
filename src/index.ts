import { register } from './register';
import { send } from './send';
import { subscribe } from './subscribe';
import { unsubscribe } from './unsubscribe';

interface Env {
  bus_notification_kv: KVNamespace;
}

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request
  // and should return a Response (optionally wrapped in a Promise)
  async fetch(request, env, ctx) {
    // You'll find it helpful to parse the request.url string into a URL object. Learn more at https://developer.mozilla.org/en-US/docs/Web/API/URL
    const url = new URL(request.url);
    const url_params = url.searchParams;
    const param_method = url_params.get('method');

    switch (param_method) {
      case 'register':
        const registration = await register(request, env, ctx);
        return registration;
        break;
      case 'subscribe':
        const subscription = await subscribe(request, env, ctx);
        return subscription;
        break;
      case 'unsubscribe':
        const unsubscription = await unsubscribe(request, env, ctx);
        return unsubscription;
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
