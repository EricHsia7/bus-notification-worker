import * as OTPAuth from 'otpauth';

export async function unsubscribe(request, env, ctx) {
  const url = new URL(request.url);
  const url_params = url.searchParams;
  const param_subscription_id = url_params.get('subscription_id');
  const param_totp_token = url_params.get('totp_token');

  let result = 'unknown';
  let message = 'unknown';

  const json = await env.bus_notification_kv.get(param_subscription_id);
  if (json) {
    const object = JSON.parse(json);
    let totp = new OTPAuth.TOTP({
      issuer: 'BusNotification',
      label: param_subscription_id,
      algorithm: 'SHA256',
      digits: 6,
      period: 30,
      secret: object.secret
    });
    let delta = totp.validate({
      token: String(param_totp_token),
      window: 1
    });
    if (delta === null) {
      result = 'error';
      message = `An error occurs when authorizing.`;
    } else {
      await env.bus_notification_kv.delete(param_subscription_id);
      result = 'successful';
      message = 'The notification has been unsubscribed.';
    }
  } else {
    result = 'error';
    message = 'The subscription was not found.';
  }

  return new Response(
    JSON.stringify({
      result: result,
      message: message
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
