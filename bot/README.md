# Student Hub bot

The bot has two slash commands. It runs in your Discord server and works with the website in the parent folder.

- `/verify` replies with the steps to get the `Student` role, plus a button that opens the website. The reply is only visible to the person who ran it.
- `/role-check` replies whether the person who ran it already has the `Student` role. The reply is only visible to them.

The website gives the role. The bot only sends the link and reads the role. The bot does not listen for new members, so it does not need the privileged Server Members intent. The website checks the role on each signed-in visit, so the bot does not need to act when someone joins.

The bot ignores commands sent from any server other than the one set in `DISCORD_GUILD_ID`.

## Requirements

- Node 22 or later (see `engines` in `package.json`).
- The bot must be in your server with the **Manage Roles** permission and a role above `Student`. See the Discord setup in the [root README](../README.md).

## Setup

```sh
npm install
cp .env.example .env
```

Open `.env` and fill in the values:

- `DISCORD_BOT_TOKEN`: the bot token from the **Bot** page in the Developer Portal.
- `DISCORD_CLIENT_ID`: the Application ID from **General Information**.
- `DISCORD_GUILD_ID`: the server ID. Turn on Developer Mode, then right click the server.
- `DISCORD_ROLE_ID`: the `Student` role ID. Turn on Developer Mode, then right click the role.
- `SITE_URL`: the public URL of the website. It must start with `https://`, or with `http://localhost` for local testing.

Then start the bot:

```sh
npm start
```

When the bot starts, it registers `/verify` and `/role-check` for your server. Guild commands update right away, so you do not have to wait for them to show up. The bot logs `Registered 2 commands.` and then `Logged in as ...`.

If a variable is missing or `SITE_URL` is not allowed, the bot prints the error and exits. The error names the variable but never prints the token.

## Tests

```sh
npm test
```

The tests check the config rules and the reply text for both commands. They do not connect to Discord.

## Ubuntu with systemd

Run the bot as a normal user, not as root. If `node` is not at `/usr/bin/node` (for example when you use nvm), run `which node` and put that path in `ExecStart`.

Save this as `/etc/systemd/system/student-hub-bot.service`. Replace `<user>` with your user name, and change the `WorkingDirectory` path if the repo is somewhere else:

```ini
[Unit]
Description=Student hub Discord bot
After=network-online.target

[Service]
User=<user>
WorkingDirectory=/home/<user>/discord-auth-website-sample/bot
ExecStart=/usr/bin/node --env-file=.env src/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then load and start the service, and follow its log:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now student-hub-bot
journalctl -u student-hub-bot -f
```

The unit reads `.env` from the working directory through `--env-file`, so keep `.env` in the `bot/` folder.
