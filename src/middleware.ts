import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
	// Auth will fill this in.
	context.locals.user = null;

	if (import.meta.env.DEV && context.url.searchParams.get("demo") === "in") {
		context.locals.user = { username: "athvrt" };
	}

	return next();
});
