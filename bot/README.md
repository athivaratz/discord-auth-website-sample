# Role bot

Two slash commands run in the server:

- `/verify` sends the steps to get the Student role, plus a link to the website.
- `/role-check` says whether you already have the Student role.

The website gives the Student role. This bot sends the link and checks the role. This bot does not listen for new members, because that needs the privileged Server Members intent and the website already handles roles.

## Setup

```sh
npm install
cp .env.example .env
```

Fill in `.env`. Then:

```sh
npm start
```

## Tests

```sh
npm test
```

## Ubuntu with systemd

Run the bot as a normal user. If `node` is not at `/usr/bin/node` (for example under nvm), run `which node` and put that path in `ExecStart`.

Save this as `/etc/systemd/system/student-hub-bot.service`:

```ini
[Unit]
Description=Student hub Discord bot
After=network-online.target

[Service]
User=<user>
WorkingDirectory=/home/<user>/discord-auth-boilerplate/bot
ExecStart=/usr/bin/node --env-file=.env src/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now student-hub-bot
journalctl -u student-hub-bot -f
```
