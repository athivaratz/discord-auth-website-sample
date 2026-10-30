# Discord auth boilerplate

ตัวอย่างเล็กๆ สำหรับเว็บการเรียน ให้นักเรียนล็อกอินด้วย Discord แล้วได้ยศ Student ในเซิร์ฟเวอร์อัตโนมัติ เว็บเขียนด้วย Astro และรันบน Cloudflare Workers ส่วนบอทในโฟลเดอร์ `bot/` มีแค่คำสั่งส่งลิงก์เว็บกับคำสั่งเช็กยศ รันบน VPS ด้วย systemd เว็บขอสิทธิ์แค่ `identify` เลยไม่มีการดึงใครเข้าเซิร์ฟเวอร์ ถ้ายังไม่ได้เข้า หน้าเว็บจะให้กดเข้าเอง

This example signs a student in with Discord and adds a role on one server. It runs on Cloudflare Workers. A small bot in `bot/` points people to the site and lets them check the role.

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

## Discord setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Copy the Application ID. That value is `DISCORD_CLIENT_ID`.
3. On the OAuth2 page, copy the Client Secret (`DISCORD_CLIENT_SECRET`). Add a redirect URI for local development (`http://localhost:4321/api/auth/callback`) and one for production (your `SITE_URL` plus `/api/auth/callback`).
4. On the Bot page, reset the token and copy it (`DISCORD_BOT_TOKEN`). No privileged intents are needed.
5. Invite the bot with the OAuth2 URL Generator. Use the scopes `bot` and `applications.commands`, and only the Manage Roles permission.
6. In Server Settings > Roles, drag the bot role above Student and below every admin or moderator role. A bot can only give roles below its own.
7. Enable Developer Mode in Discord (User Settings > Advanced). Copy the server ID (`DISCORD_GUILD_ID`) and the Student role ID (`DISCORD_ROLE_ID`).
8. Create an invite link that does not expire. That URL is `DISCORD_INVITE_URL`.

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

## Bot

The bot has two commands, `/verify` and `/role-check`. Setup, tests, and a systemd unit are in `bot/README.md`.

## Tests

```sh
bun run test
cd bot && npm test
```

## Security

Keep secrets out of git. Use `.dev.vars` locally, Worker secrets in production, and `bot/.env` for the bot.

The access token from Discord login is not stored. The site reads the user id, then drops the token. The browser keeps a signed cookie.

The site never adds people to the server. The login scope is `identify` only.

If the bot token leaks, reset it on the Bot page in the Developer Portal.

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
- `bot/package.json`: bot package. npm, discord.js, Node 22.
- `bot/.env.example`: bot env template. Copy it to `bot/.env`.
- `bot/src/config.js`: reads bot env and checks `SITE_URL`.
- `bot/src/commands.js`: `/verify` and `/role-check` reply builders.
- `bot/src/index.js`: logs in, registers the guild commands, and answers them.
- `bot/test/config.test.js`: config tests.
- `bot/test/commands.test.js`: command reply tests.
- `bot/README.md`: setup, tests, and the systemd unit.
