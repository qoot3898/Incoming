const BACKEND = 'https://qoottemporarylabor.runasp.net';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, BACKEND);
    const proxied = new Request(target, request);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) proxied.headers.set('X-Forwarded-For', ip);
    return fetch(proxied);
  },
};
