import { OTPAuth } from './tools';

export async function unsubscribe(request, env, ctx) {
  const url = new URL(request.url);
  const url_params = url.searchParams;
  const param_subscription_id = url_params.get('subscription_id');
  const param_totp_token = url_params.get('totp_token');

  let status = 'unknown';
  let message = 'Unknown errors';

  const object = await env.bus_notification_kv.get(param_subscription_id);
  if (object) {
    let totp = new OTPAuth.TOTP({
      // Provider or service the account is associated with.
      issuer: 'BusNotification',
      // Account identifier.
      label: param_subscription_id,
      // Algorithm used for the HMAC function, possible values are:
      //   "SHA1", "SHA224", "SHA256", "SHA384", "SHA512",
      //   "SHA3-224", "SHA3-256", "SHA3-384" and "SHA3-512".
      algorithm: 'SHA1',
      // Length of the generated tokens.
      digits: 6,
      // Interval of time for which a token is valid, in seconds.
      period: 30,
      // Arbitrary key encoded in base32 or `OTPAuth.Secret` instance
      // (if omitted, a cryptographically secure random secret is generated).
      secret: object.secret
      //   or: `OTPAuth.Secret.fromBase32("US3WHSG7X5KAPV27VANWKQHF3SH3HULL")`
      //   or: `new OTPAuth.Secret()`
    });
    let delta = totp.validate({
      token: param_totp_token,
      window: 1
    });
    if (delta === null) {
      status = 'error';
      message = `Authorization error (${delta})`;
    } else {
      await env.bus_notification_kv.delete(subscription_id);
      status = 'successful';
      message = 'The notification has been unsubscribed.';
    }
  } else {
    status = 'error';
    message = 'The subscription was not found.';
  }

  return new Response(
    JSON.stringify({
      status: status,
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
