# Discord auth boilerplate

This example signs a student in with Discord and adds a role on one server. It runs on Cloudflare Workers.

## How it works

1. Login with Discord sends the student to Discord with a random `state` value and the `identify` scope.
2. Discord redirects to `/api/auth/callback` with a code. The site checks that `state` matches the cookie, exchanges the code for an access token, and reads the user id and username.
3. The access token is thrown away. The browser keeps a signed cookie for 7 days.
4. On each visit, the site checks the server member and adds the role when the member does not have it yet. The bot token is used for that call, and the bot only gets the Manage Roles permission.

## Local setup

```sh
bun install
cp .dev.vars.example .dev.vars
```

Fill in `.dev.vars`. Use a long random string for `SESSION_SECRET`, for example the output of `openssl rand -hex 32`.

```sh
bun run dev
```

In the Discord Developer Portal, add `http://localhost:4321/api/auth/callback` as a redirect URI.

## Deploy to Cloudflare Workers

```sh
bunx wrangler login
bunx wrangler secret put DISCORD_CLIENT_SECRET
bunx wrangler secret put DISCORD_BOT_TOKEN
bunx wrangler secret put SESSION_SECRET
```

Edit the plain values in `wrangler.jsonc`. Then build and deploy:

```sh
bun run build
bunx wrangler deploy
```

Add the production redirect URI in the Developer Portal: your `SITE_URL` plus `/api/auth/callback` (for example `https://student-hub.example.workers.dev/api/auth/callback`).

## Tests

```sh
bun run test
```

## File map

- `astro.config.mjs`: Cloudflare Workers adapter, on-request rendering, and `session: false`.
- `wrangler.jsonc`: Worker name and the plain env values.
- `.dev.vars.example`: local env template. Copy it to `.dev.vars`.
- `src/env.d.ts`: types for the Worker env and `Astro.locals`.
- `src/lib/config.ts`: reads env inside the Worker.
- `src/lib/session.ts`: creates and checks the signed session cookie.
- `src/lib/discord.ts`: login URL, token exchange, user lookup, and role update.
- `src/lib/session.test.ts`: session cookie tests.
- `src/lib/discord.test.ts`: Discord helper tests with a mock `fetch`.
- `src/middleware.ts`: reads the session cookie, and keeps the dev `?demo=` switch.
- `src/pages/api/auth/login.ts`: starts Discord login.
- `src/pages/api/auth/callback.ts`: finishes login and sets the session cookie.
- `src/pages/api/auth/logout.ts`: clears the session cookie. GET only redirects home.
- `src/pages/index.astro`: the student hub page. A signed in user is checked for the role on each load.
- `src/components/DiscordIcon.astro`: Discord icon.
- `src/components/GitHubIcon.astro`: GitHub icon.
