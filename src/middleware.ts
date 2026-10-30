import { defineMiddleware } from "astro:middleware";
import { ConfigError, getConfig } from "./lib/config";
import { readSession, SESSION_COOKIE } from "./lib/session";

const demoStates = {
	in: "granted",
	nomember: "noMember",
	error: "error",
} as const;

export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.user = null;

	try {
		const { sessionSecret } = getConfig();
		const value = context.cookies.get(SESSION_COOKIE)?.value;
		context.locals.user = await readSession(value, sessionSecret);
	} catch (error) {
		context.locals.user = null;
		if (error instanceof ConfigError) console.error(error.message);
	}

	const demo = context.url.searchParams.get("demo");
	const demoState =
		demo === "in" || demo === "nomember" || demo === "error" ? demoStates[demo] : undefined;

	if (import.meta.env.DEV && demoState) {
		context.locals.user = { id: "0", username: "athvrt" };
		context.locals.demoState = demoState;
	}

	return next();
});
