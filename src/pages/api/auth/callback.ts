import type { APIContext, APIRoute } from "astro";
import { ConfigError, getConfig } from "../../../lib/config";
import { DiscordError, exchangeCode, fetchUser } from "../../../lib/discord";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "../../../lib/session";

const FAIL = "Login failed. Go back and try again.";

function clearState(cookies: APIContext["cookies"]) {
	cookies.delete("oauth_state", { path: "/" });
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	if (url.searchParams.get("error")) {
		clearState(cookies);
		return redirect("/", 302);
	}

	const state = url.searchParams.get("state");
	const code = url.searchParams.get("code");
	const cookieState = cookies.get("oauth_state")?.value;

	if (!state || state !== cookieState || !code) {
		clearState(cookies);
		return new Response(FAIL, { status: 400 });
	}

	try {
		const config = getConfig();
		const accessToken = await exchangeCode(config, code);
		const user = await fetchUser(accessToken);
		const session = await createSession(user, config.sessionSecret);
		clearState(cookies);
		cookies.set(SESSION_COOKIE, session, {
			httpOnly: true,
			secure: import.meta.env.PROD,
			sameSite: "lax",
			path: "/",
			maxAge: SESSION_MAX_AGE,
		});
		return redirect("/", 302);
	} catch (error) {
		if (error instanceof DiscordError) {
			console.error(`Discord request failed (${error.status})`);
		} else if (error instanceof ConfigError) {
			console.error(error.message);
		} else {
			console.error("Login failed");
		}
		clearState(cookies);
		return new Response(FAIL, { status: 502 });
	}
};
