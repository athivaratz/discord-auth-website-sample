import type { APIRoute } from "astro";
import { SESSION_COOKIE } from "../../../lib/session";

export const POST: APIRoute = ({ cookies, redirect }) => {
	cookies.delete(SESSION_COOKIE, { path: "/" });
	return redirect("/", 303);
};

export const GET: APIRoute = ({ redirect }) => {
	return redirect("/", 302);
};
