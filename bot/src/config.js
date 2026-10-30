const REQUIRED = [
	"DISCORD_BOT_TOKEN",
	"DISCORD_CLIENT_ID",
	"DISCORD_GUILD_ID",
	"DISCORD_ROLE_ID",
	"SITE_URL",
];

export function readConfig(env = process.env) {
	const missing = REQUIRED.filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(`Missing ${missing.join(", ")}`);
	}

	const siteUrl = env.SITE_URL;
	const allowed = siteUrl.startsWith("https://") || siteUrl.startsWith("http://localhost");
	if (!allowed) {
		throw new Error("SITE_URL must start with https:// or http://localhost");
	}

	return {
		token: env.DISCORD_BOT_TOKEN,
		clientId: env.DISCORD_CLIENT_ID,
		guildId: env.DISCORD_GUILD_ID,
		roleId: env.DISCORD_ROLE_ID,
		siteUrl,
	};
}
