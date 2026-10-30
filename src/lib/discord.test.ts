import { afterEach, expect, test, vi } from "vitest";
import {
	DiscordError,
	ensureRole,
	exchangeCode,
	fetchUser,
	loginUrl,
	type DiscordConfig,
} from "./discord";

const config: DiscordConfig = {
	clientId: "client-id",
	clientSecret: "client-secret",
	botToken: "bot-token",
	guildId: "guild-id",
	roleId: "role-id",
	siteUrl: "http://localhost:4321",
};

const redirectUri = "http://localhost:4321/api/auth/callback";
const userAgent = "DiscordBot (https://github.com/athivaratz/discord-auth-boilerplate, 1.0.0)";

afterEach(() => {
	vi.restoreAllMocks();
});

function headerValue(init: RequestInit | undefined, name: string): string | null {
	return new Headers(init?.headers).get(name);
}

test("loginUrl asks only for identify", () => {
	const raw = loginUrl(config, "state-value");
	const url = new URL(raw);
	expect(url.origin + url.pathname).toBe("https://discord.com/oauth2/authorize");
	expect(url.searchParams.get("response_type")).toBe("code");
	expect(url.searchParams.get("client_id")).toBe("client-id");
	expect(url.searchParams.get("scope")).toBe("identify");
	expect(url.searchParams.get("state")).toBe("state-value");
	expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
	expect(raw).toContain(encodeURIComponent(redirectUri));
	expect(raw).not.toContain("guilds.join");
	expect(url.searchParams.get("prompt")).toBeNull();
});

test("exchangeCode posts a form body", async () => {
	const fetchFn = vi.fn(async () => Response.json({ access_token: "access-token" }));
	await expect(exchangeCode(config, "auth-code", fetchFn)).resolves.toBe("access-token");

	expect(fetchFn).toHaveBeenCalledOnce();
	const [url, init] = fetchFn.mock.calls[0];
	expect(url).toBe("https://discord.com/api/oauth2/token");
	expect(init?.method).toBe("POST");
	expect(headerValue(init, "Content-Type")).toBe("application/x-www-form-urlencoded");
	const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams(String(init?.body));
	expect(body.get("grant_type")).toBe("authorization_code");
	expect(body.get("code")).toBe("auth-code");
	expect(body.get("redirect_uri")).toBe(redirectUri);
	expect(body.get("client_id")).toBe("client-id");
	expect(body.get("client_secret")).toBe("client-secret");
});

test("exchangeCode throws DiscordError on 401", async () => {
	const fetchFn = vi.fn(async () => new Response(null, { status: 401 }));
	const error = await exchangeCode(config, "auth-code", fetchFn).then(
		() => null,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(DiscordError);
	expect(error).toMatchObject({ status: 401 });
});

test("fetchUser uses global_name", async () => {
	const fetchFn = vi.fn(async () => Response.json({ id: "1", username: "ada", global_name: "Ada Lovelace" }));
	await expect(fetchUser("access-token", fetchFn)).resolves.toEqual({ id: "1", username: "Ada Lovelace" });
	const [url, init] = fetchFn.mock.calls[0];
	expect(url).toBe("https://discord.com/api/v10/users/@me");
	expect(headerValue(init, "Authorization")).toBe("Bearer access-token");
});

test("fetchUser falls back to username", async () => {
	const fetchFn = vi.fn(async () => Response.json({ id: "1", username: "ada", global_name: null }));
	await expect(fetchUser("access-token", fetchFn)).resolves.toEqual({ id: "1", username: "ada" });
});

test("ensureRole returns noMember on 404 and does not PUT", async () => {
	const fetchFn = vi.fn(async () => new Response(null, { status: 404 }));
	await expect(ensureRole(config, "user-id", fetchFn)).resolves.toBe("noMember");
	expect(fetchFn).toHaveBeenCalledOnce();
	const [url, init] = fetchFn.mock.calls[0];
	expect(url).toBe("https://discord.com/api/v10/guilds/guild-id/members/user-id");
	expect(init?.method).toBe("GET");
	expect(headerValue(init, "Authorization")).toBe("Bot bot-token");
	expect(headerValue(init, "User-Agent")).toBe(userAgent);
});

test("ensureRole returns granted when the member already has the role", async () => {
	const fetchFn = vi.fn(async () => Response.json({ roles: ["other", "role-id"] }));
	await expect(ensureRole(config, "user-id", fetchFn)).resolves.toBe("granted");
	expect(fetchFn).toHaveBeenCalledOnce();
});

test("ensureRole PUTs the role when it is missing", async () => {
	const fetchFn = vi.fn(async (url: string) => {
		if (url.endsWith("/roles/role-id")) return new Response(null, { status: 204 });
		return Response.json({ roles: ["other"] });
	});
	await expect(ensureRole(config, "user-id", fetchFn)).resolves.toBe("granted");
	expect(fetchFn).toHaveBeenCalledTimes(2);
	const [url, init] = fetchFn.mock.calls[1];
	expect(url).toBe("https://discord.com/api/v10/guilds/guild-id/members/user-id/roles/role-id");
	expect(init?.method).toBe("PUT");
	expect(headerValue(init, "Authorization")).toBe("Bot bot-token");
	expect(headerValue(init, "User-Agent")).toBe(userAgent);
});

test("ensureRole returns error when PUT is forbidden", async () => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	const fetchFn = vi.fn(async (url: string) => {
		if (url.endsWith("/roles/role-id")) return new Response(null, { status: 403 });
		return Response.json({ roles: [] });
	});
	await expect(ensureRole(config, "user-id", fetchFn)).resolves.toBe("error");
	expect(console.error).toHaveBeenCalledWith("Discord request failed (403)");
});

test("ensureRole returns error when the member lookup is rate limited", async () => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	const fetchFn = vi.fn(async () => new Response(null, { status: 429 }));
	await expect(ensureRole(config, "user-id", fetchFn)).resolves.toBe("error");
	expect(fetchFn).toHaveBeenCalledOnce();
	expect(console.error).toHaveBeenCalledWith("Discord request failed (429)");
});

test("ensureRole returns error when fetch rejects", async () => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	const fetchFn = vi.fn(async () => {
		throw new Error("socket closed");
	});
	await expect(ensureRole(config, "user-id", fetchFn)).resolves.toBe("error");
	expect(console.error).toHaveBeenCalledWith("Discord request failed (network)");
	const line = vi.mocked(console.error).mock.calls.flat().join(" ");
	expect(line).not.toContain("bot-token");
});
