export async function unsubscribe(request, env, ctx) {
  return new Response(
    JSON.stringify({
      status: 'successful',
      message: 'test'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
