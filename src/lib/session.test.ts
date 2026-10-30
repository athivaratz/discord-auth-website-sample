import { describe, expect, test } from "vitest";
import { createSession, readSession, SESSION_MAX_AGE } from "./session";

const secret = "test-secret";
const user = { id: "100", username: "ada" };

describe("session", () => {
	test("round trip", async () => {
		const value = await createSession(user, secret);
		await expect(readSession(value, secret)).resolves.toEqual(user);
	});

	test("tampered payload", async () => {
		const value = await createSession(user, secret);
		const [payload, signature] = value.split(".");
		const flipped = (payload[0] === "a" ? "b" : "a") + payload.slice(1);
		await expect(readSession(`${flipped}.${signature}`, secret)).resolves.toBeNull();
	});

	test("tampered signature", async () => {
		const value = await createSession(user, secret);
		const [payload, signature] = value.split(".");
		const flipped = (signature[0] === "a" ? "b" : "a") + signature.slice(1);
		await expect(readSession(`${payload}.${flipped}`, secret)).resolves.toBeNull();
	});

	test("wrong secret", async () => {
		const value = await createSession(user, secret);
		await expect(readSession(value, "other-secret")).resolves.toBeNull();
	});

	test("expired", async () => {
		const now = 1_700_000_000_000;
		const value = await createSession(user, secret, now);
		await expect(readSession(value, secret, now + SESSION_MAX_AGE * 1000)).resolves.toBeNull();
	});

	test("garbage strings", async () => {
		await expect(readSession("", secret)).resolves.toBeNull();
		await expect(readSession("abc", secret)).resolves.toBeNull();
		await expect(readSession("a.b.c", secret)).resolves.toBeNull();
	});
});
