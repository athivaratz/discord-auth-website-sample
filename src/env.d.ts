/// <reference types="astro/client" />

// Declared here so the three secrets are typed too. wrangler.jsonc only lists the plain vars.
declare namespace Cloudflare {
	interface Env {
		DISCORD_CLIENT_ID: string;
		DISCORD_CLIENT_SECRET: string;
		DISCORD_BOT_TOKEN: string;
		DISCORD_GUILD_ID: string;
		DISCORD_ROLE_ID: string;
		DISCORD_INVITE_URL: string;
		SITE_URL: string;
		SESSION_SECRET: string;
	}
}

declare module "cloudflare:workers" {
	export const env: Cloudflare.Env;
}

declare namespace App {
	interface Locals {
		user: { id: string; username: string } | null;
		demoState?: "noMember" | "granted" | "error";
	}
}
