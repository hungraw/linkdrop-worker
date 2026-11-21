# linkdrop-worker

> This is a distilled version of a larger private project, rewritten with the help of LLM. I reviewed the code and tested the result.

Linkdrop is an internal tool I built for rapid-fire transferring links from desktop to an iPhone, in the original form of a QR image. The full package includes a Chrome extension, a PWA and a self-hosted API. This repo keeps only the core on Cloudflare Workers.

The extension run scans for QR codes on a page and posts the link here. The Worker then preprocess (strips tracking parameters, saves link in D1 and ignores the same link) before a Durable Object pushes new links to the corresponding phone connected to the event stream. The QR decoder is a small function that takes RGBA pixels and returns a cleaned http(s) URL, or null.

There are four routes: `POST /links`, `GET /links`, `DELETE /links/:id` and `GET /events`. Requires `Authorization: Bearer` header matching one shared secret.

## Running

Install `npm install`, create a D1 database `npx wrangler d1 create linkdrop` and paste the id into `wrangler.toml`. Apply the schema locally `npx wrangler d1 migrations apply linkdrop --local`. Copy `.dev.vars.example` to `.dev.vars`, set a secret, and start the Worker `npm run dev`. `npm test` to run tests.

## Deploying

Apply the schema to the remote database `npx wrangler d1 migrations apply linkdrop --remote`, set the secret `npx wrangler secret put LINKDROP_SECRET`, and run `npm run deploy`.

## Limitations

The package includes the extension, the phone app, accounts, device pairing and push notifications. It is designed as a single shared inbox for finite number of members (5), and cannot operate as a multi-user service. Designed and tested primarily on MacOS/iOS, with no intended support for other operating system or devices.

There is no CORS support. Browsers cannot send a bearer header on `EventSource`, so `/events` is not directly available through browser `EventSource`. Clients that reconnect should refetch `GET /links`, since missed events are not replayed.
