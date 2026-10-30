import type { APIRoute } from "astro";
import { ConfigError, getConfig } from "../../../lib/config";
import { loginUrl } from "../../../lib/discord";

export const GET: APIRoute = ({ cookies, redirect }) => {
	try {
		const config = getConfig();
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		let state = "";
		for (const byte of bytes) state += byte.toString(16).padStart(2, "0");

		cookies.set("oauth_state", state, {
			httpOnly: true,
			secure: import.meta.env.PROD,
			sameSite: "lax",
			path: "/",
			maxAge: 600,
		});

		return redirect(loginUrl(config, state), 302);
	} catch (error) {
		if (error instanceof ConfigError) console.error(error.message);
		return new Response("Login failed. Go back and try again.", { status: 502 });
	}
};
