import { defineMiddleware } from "astro:middleware";

const demoStates = {
	in: "granted",
	nomember: "noMember",
	error: "error",
} as const;

export const onRequest = defineMiddleware((context, next) => {
	// The auth step fills user in later.
	context.locals.user = null;

	const demo = context.url.searchParams.get("demo");
	const demoState =
		demo === "in" || demo === "nomember" || demo === "error" ? demoStates[demo] : undefined;

	if (import.meta.env.DEV && demoState) {
		context.locals.user = { id: "0", username: "athvrt" };
		context.locals.demoState = demoState;
	}

	return next();
});
