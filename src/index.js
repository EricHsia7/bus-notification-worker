// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request
  // and should return a Response (optionally wrapped in a Promise)
  async fetch(request, env, ctx) {
    // You'll find it helpful to parse the request.url string into a URL object. Learn more at https://developer.mozilla.org/en-US/docs/Web/API/URL
    const url = new URL(request.url);


    // You can get pretty far with simple logic like if/switch-statements
    switch (url.pathname) {
      case '/redirect':
        return "1"


      case '/proxy':
        return "2"
    }


    if (url.pathname.startsWith('/api/')) {
      // You can also use more robust routing
      return apiRouter.handle(request);
    }


		
		return new Response(
			`test`,
			{ headers: { "Content-Type": "text/html" } }
		);
  },
};
