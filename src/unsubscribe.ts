export async function unsubscribe(request, env, ctx) {
  
  return new Response(
    JSON.stringify({
      status: 'successful',
      message: 'test'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
