# linkdrop-worker

> This is a distilled version of a larger private project, rewritten with the help of AI tools (Claude and OpenAI Codex). I reviewed and tested the result.

Linkdrop is an internal tool I built for sending QR links from desktop Chrome to an iPhone. The original is a Chrome extension, a PWA and a VPS-hosted API. This repo keeps only the core on Cloudflare Workers.

The extension finds a QR code on a page and posts the link here. The Worker strips tracking parameters, saves the link in D1 and ignores the same link if it arrives again within 45 seconds. A Durable Object then pushes new links to any phone connected to the event stream. The QR decoder is a small function that takes RGBA pixels and returns a cleaned http(s) URL, or null.

There are four routes: `POST /links`, `GET /links`, `DELETE /links/:id` and `GET /events`. All of them need an `Authorization: Bearer` header matching one shared secret.

## Running it

Install with `npm install`, then create a D1 database with `npx wrangler d1 create linkdrop` and paste the id it prints into `wrangler.toml`. Apply the schema locally with `npx wrangler d1 migrations apply linkdrop --local`. Copy `.dev.vars.example` to `.dev.vars`, set a secret, and start the Worker with `npm run dev`. `npm test` runs the tests and `npm run typecheck` checks the types.

## Deploying

Apply the schema to the remote database with `npx wrangler d1 migrations apply linkdrop --remote`, set the secret with `npx wrangler secret put LINKDROP_SECRET`, and run `npm run deploy`.

## What's missing

The extension, the phone app, accounts, device pairing and push notifications. It is a single shared inbox, not a multi-user service.
