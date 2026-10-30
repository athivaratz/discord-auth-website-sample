import type { SessionUser } from "./session";

const API = "https://discord.com/api/v10";
const USER_AGENT = "DiscordBot (https://github.com/athivaratz/discord-auth-website-sample, 1.0.0)";

export type DiscordConfig = {
	clientId: string;
	clientSecret: string;
	botToken: string;
	guildId: string;
	roleId: string;
	siteUrl: string;
};

export type MemberStatus = "noMember" | "granted" | "error";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class DiscordError extends Error {
	status: number;

	constructor(status: number) {
		super(String(status));
		this.name = "DiscordError";
		this.status = status;
	}
}

function redirectUri(config: DiscordConfig): string {
	return `${config.siteUrl}/api/auth/callback`;
}

function botHeaders(config: DiscordConfig): HeadersInit {
	return {
		Authorization: `Bot ${config.botToken}`,
		"User-Agent": USER_AGENT,
	};
}

async function callDiscord(fetchFn: FetchFn, url: string, init: RequestInit): Promise<Response | "network"> {
	try {
		return await fetchFn(url, init);
	} catch {
		return "network";
	}
}

export function loginUrl(config: DiscordConfig, state: string): string {
	const url = new URL("https://discord.com/oauth2/authorize");
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("scope", "identify");
	url.searchParams.set("state", state);
	url.searchParams.set("redirect_uri", redirectUri(config));
	return url.toString();
}

export async function exchangeCode(config: DiscordConfig, code: string, fetchFn: FetchFn = fetch): Promise<string> {
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri(config),
		client_id: config.clientId,
		client_secret: config.clientSecret,
	});
	const response = await fetchFn("https://discord.com/api/oauth2/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	if (!response.ok) throw new DiscordError(response.status);
	const data = (await response.json()) as { access_token: string };
	return data.access_token;
}

export async function fetchUser(accessToken: string, fetchFn: FetchFn = fetch): Promise<SessionUser> {
	const response = await fetchFn(`${API}/users/@me`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) throw new DiscordError(response.status);
	const data = (await response.json()) as {
		id: string;
		username: string;
		global_name?: string | null;
	};
	return {
		id: data.id,
		username: data.global_name ?? data.username,
	};
}

export async function ensureRole(
	config: DiscordConfig,
	userId: string,
	fetchFn: FetchFn = fetch,
): Promise<MemberStatus> {
	const memberUrl = `${API}/guilds/${config.guildId}/members/${userId}`;
	const memberResponse = await callDiscord(fetchFn, memberUrl, {
		method: "GET",
		headers: botHeaders(config),
	});
	if (memberResponse === "network") {
		console.error("Discord request failed (network)");
		return "error";
	}
	if (memberResponse.status === 404) return "noMember";
	if (memberResponse.status !== 200) {
		console.error(`Discord request failed (${memberResponse.status})`);
		return "error";
	}

	try {
		const member = (await memberResponse.json()) as { roles?: string[] };
		if (member.roles?.includes(config.roleId)) return "granted";
	} catch {
		console.error("Discord request failed (200)");
		return "error";
	}

	const putResponse = await callDiscord(fetchFn, `${memberUrl}/roles/${config.roleId}`, {
		method: "PUT",
		headers: botHeaders(config),
	});
	if (putResponse === "network") {
		console.error("Discord request failed (network)");
		return "error";
	}
	if (putResponse.status === 204) return "granted";
	console.error(`Discord request failed (${putResponse.status})`);
	return "error";
}
