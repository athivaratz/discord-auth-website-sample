import { env } from "cloudflare:workers";
import type { DiscordConfig } from "./discord";

export type AppConfig = DiscordConfig & {
	sessionSecret: string;
	inviteUrl: string;
};

// Thrown when an env value is missing. Only the variable name goes into the message.
export class ConfigError extends Error {}

export function getConfig(): AppConfig {
	const values = {
		DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID,
		DISCORD_CLIENT_SECRET: env.DISCORD_CLIENT_SECRET,
		DISCORD_BOT_TOKEN: env.DISCORD_BOT_TOKEN,
		DISCORD_GUILD_ID: env.DISCORD_GUILD_ID,
		DISCORD_ROLE_ID: env.DISCORD_ROLE_ID,
		DISCORD_INVITE_URL: env.DISCORD_INVITE_URL,
		SITE_URL: env.SITE_URL,
		SESSION_SECRET: env.SESSION_SECRET,
	};

	for (const [name, value] of Object.entries(values)) {
		if (!value) throw new ConfigError(`Missing ${name}`);
	}

	return {
		clientId: values.DISCORD_CLIENT_ID,
		clientSecret: values.DISCORD_CLIENT_SECRET,
		botToken: values.DISCORD_BOT_TOKEN,
		guildId: values.DISCORD_GUILD_ID,
		roleId: values.DISCORD_ROLE_ID,
		siteUrl: values.SITE_URL,
		sessionSecret: values.SESSION_SECRET,
		inviteUrl: values.DISCORD_INVITE_URL,
	};
}
