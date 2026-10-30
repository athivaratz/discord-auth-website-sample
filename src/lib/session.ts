export type SessionUser = { id: string; username: string };

export const SESSION_COOKIE = "session";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE = SEVEN_DAYS_MS / 1000;

type SessionPayload = SessionUser & { exp: number };

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function withBase64Padding(value: string): string {
	const remainder = value.length % 4;
	if (remainder === 0) return value;
	return value + "=".repeat(4 - remainder);
}

function base64UrlToBytes(value: string): Uint8Array | null {
	try {
		const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
		const binary = atob(withBase64Padding(base64));
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes;
	} catch {
		return null;
	}
}

async function hmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export async function createSession(user: SessionUser, secret: string, now = Date.now()): Promise<string> {
	const payload: SessionPayload = {
		id: user.id,
		username: user.username,
		exp: now + SEVEN_DAYS_MS,
	};
	const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
	const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), payloadBytes);
	const payloadPart = bytesToBase64Url(payloadBytes);
	const signaturePart = bytesToBase64Url(new Uint8Array(signature));
	return `${payloadPart}.${signaturePart}`;
}

export async function readSession(
	value: string | null | undefined,
	secret: string,
	now = Date.now(),
): Promise<SessionUser | null> {
	if (!value) return null;
	const parts = value.split(".");
	if (parts.length !== 2) return null;

	const payloadBytes = base64UrlToBytes(parts[0]);
	const signatureBytes = base64UrlToBytes(parts[1]);
	if (!payloadBytes || !signatureBytes) return null;

	try {
		const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), signatureBytes, payloadBytes);
		if (!ok) return null;

		const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<SessionPayload>;
		if (typeof payload.id !== "string" || typeof payload.username !== "string") return null;
		if (typeof payload.exp !== "number" || payload.exp <= now) return null;
		return { id: payload.id, username: payload.username };
	} catch {
		return null;
	}
}
