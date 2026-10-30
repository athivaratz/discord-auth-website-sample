# Discord auth website sample

ตัวอย่างการล็อกอินด้วย Discord สำหรับเว็บการเรียน นักเรียนที่ล็อกอินแล้วจะได้บทบาท (role) Student ในเซิร์ฟเวอร์โดยอัตโนมัติ ส่วนบอทในโฟลเดอร์ `bot/` ช่วยส่งลิงก์ให้นักเรียนและเช็ก role ได้ ก่อนเริ่มต้องเตรียมสิ่งเหล่านี้

- Discord application สำหรับสร้างบอทและ OAuth2 ทำได้ที่ Developer Portal
- บัญชี Cloudflare สำหรับ deploy เว็บ
- VPS หรือเครื่องที่รัน Node ได้ สำหรับรันบอท

ขั้นตอนแบบละเอียดอยู่ในส่วนภาษาอังกฤษด้านล่าง

## English

This example signs a student in with Discord and gives them a role (`Student`) on one Discord server. The site is built with Astro and runs on Cloudflare Workers. The bot in `bot/` sends students a link to the site and can check whether they already have the role. It runs on a Linux machine under systemd.

## How the login works

1. The login button sends the browser to Discord with a random `state` value and the `identify` scope.
2. Discord redirects back to `/api/auth/callback` with a `code`. The site checks that `state` matches the `oauth_state` cookie, then exchanges the code for an access token and reads the user's id and display name.
3. The access token is not stored. The site keeps only the user id and name, in a signed cookie named `session` that lasts 7 days.
4. On each visit to the home page, the site asks Discord whether the user is in the server. If the user is in the server and does not have the role yet, the site adds the role with the bot token.

The site asks Discord only for the `identify` scope. It cannot put a user into the server. The role is added only to users who are already members.

## Before you start

- Node 22.23.4 or later. The root `package.json` sets this in `engines`.
- Bun. The scripts in this repo use `bun` and `bunx`, and the repo includes `bun.lock`.
- A Discord account and a server where you can manage roles and add bots.
- A Cloudflare account, for `wrangler`.
- For the bot: Node 22 or later (see `bot/package.json`) on a machine that stays on, such as a VPS.

## Discord setup

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and press **New Application**.
2. On the **General Information** page, copy the **Application ID**. It becomes `DISCORD_CLIENT_ID`.
3. On the **OAuth2** page, press **Reset Secret** if needed and copy the **Client Secret**. It becomes `DISCORD_CLIENT_SECRET`.
4. On the **OAuth2** page, under **Redirects**, add these two URLs:
   - `http://localhost:4321/api/auth/callback` for local development
   - your production `SITE_URL` followed by `/api/auth/callback`, for example `https://student-hub.example.workers.dev/api/auth/callback`
5. On the **Bot** page, press **Reset Token** and copy the token. It becomes `DISCORD_BOT_TOKEN`. The bot does not need any privileged intents.
6. On the **OAuth2** page, open **URL Generator**. Select the scopes `bot` and `applications.commands`. Under bot permissions, select only **Manage Roles**. Open the generated URL and add the bot to your server.
7. In Discord, open **Server Settings**, then **Roles**. Drag the bot's role above the `Student` role. The bot can only give roles that sit below its own role, so keep it below any admin or moderator roles too.
8. Turn on **Developer Mode** in **User Settings**, then **Advanced**. Right click the server icon and copy the server ID. It becomes `DISCORD_GUILD_ID`. Right click the `Student` role in **Server Settings** and copy its ID. It becomes `DISCORD_ROLE_ID`.
9. Create an invite link for the server that does not expire. It becomes `DISCORD_INVITE_URL`.

## Run it locally

```sh
bun install
cp .dev.vars.example .dev.vars
```

Open `.dev.vars` and fill in the values from the Discord setup. Set `SESSION_SECRET` to a long random string, for example the output of `openssl rand -hex 32`. Then start the dev server:

```sh
bun run dev
```

The site runs at `http://localhost:4321`. Locally, `.dev.vars` overrides the values in `wrangler.jsonc`.

In development only, you can add `?demo=in`, `?demo=nomember`, or `?demo=error` to the home page URL to see each state without Discord. The middleware ignores this switch in production builds.

## Deploy to Cloudflare Workers

Log in to Cloudflare, then store the three secrets. Wrangler asks for each value.

```sh
bunx wrangler login
bunx wrangler secret put DISCORD_CLIENT_SECRET
bunx wrangler secret put DISCORD_BOT_TOKEN
bunx wrangler secret put SESSION_SECRET
```

The other values are plain variables. Set them in `wrangler.jsonc` under `vars`:

- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_ROLE_ID`
- `DISCORD_INVITE_URL`
- `SITE_URL`

Then build and deploy:

```sh
bun run build
bunx wrangler deploy
```

After the first deploy, add your production callback URL to the **OAuth2** redirects in the Developer Portal (see step 4 above).

## The bot

The bot adds two slash commands, `/verify` and `/role-check`. It sends the link to the site and checks the role. Setup, tests, and the systemd unit are in [bot/README.md](bot/README.md).

## Tests

```sh
bun run test
cd bot && npm test
```

`bun run test` runs the site tests with Vitest. `npm test` in `bot/` runs the bot tests with the Node test runner.

## Security notes

- Keep secrets out of git. `.dev.vars`, `.env`, and `bot/.env` are ignored. Use `.dev.vars` locally, Worker secrets in production, and `bot/.env` for the bot.
- The access token from Discord is not stored. The site reads the user's id and name, then drops the token.
- The session cookie is signed with HMAC-SHA256 using `SESSION_SECRET`. It is `httpOnly`, `sameSite=lax`, and `secure` in production.
- The login state is checked against a cookie that lasts 10 minutes.
- The home page sends `Cache-Control: private, no-store`, because it depends on the cookie.
- The login scope is `identify` only.
- If the bot token leaks, press **Reset Token** on the **Bot** page in the Developer Portal, then update the secret.

## File map

- `astro.config.mjs`: Astro config. Cloudflare adapter, server output, sessions off.
- `wrangler.jsonc`: Worker config and the plain variables.
- `.dev.vars.example`: template for local variables.
- `src/env.d.ts`: types for the Worker env and `Astro.locals`.
- `src/middleware.ts`: reads the session cookie and handles the dev-only `?demo=` switch.
- `src/lib/config.ts`: reads the variables and throws `ConfigError` for missing ones.
- `src/lib/session.ts`: creates and checks the signed session cookie.
- `src/lib/discord.ts`: login URL, token exchange, user lookup, and role update.
- `src/lib/session.test.ts`: session tests.
- `src/lib/discord.test.ts`: Discord helper tests with a mock `fetch`.
- `src/pages/index.astro`: home page. Checks the role on each signed-in visit.
- `src/pages/api/auth/login.ts`: starts the login and sets the `state` cookie.
- `src/pages/api/auth/callback.ts`: finishes the login and sets the session cookie.
- `src/pages/api/auth/logout.ts`: clears the session cookie. `GET` redirects home.
- `src/components/DiscordIcon.astro`: Discord icon.
- `src/components/GitHubIcon.astro`: GitHub icon.
- `bot/`: the Discord bot. See [bot/README.md](bot/README.md).
