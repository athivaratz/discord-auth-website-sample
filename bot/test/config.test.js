import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readConfig } from "../src/config.js";

const token = "test-token-value";

const good = {
	DISCORD_BOT_TOKEN: token,
	DISCORD_CLIENT_ID: "111",
	DISCORD_GUILD_ID: "222",
	DISCORD_ROLE_ID: "333",
	SITE_URL: "https://student-hub.example",
};

describe("readConfig", () => {
	it("names missing variables and leaves out values", () => {
		assert.throws(
			() => readConfig({ DISCORD_BOT_TOKEN: token }),
			(error) => {
				assert.match(error.message, /DISCORD_CLIENT_ID/);
				assert.match(error.message, /DISCORD_GUILD_ID/);
				assert.match(error.message, /DISCORD_ROLE_ID/);
				assert.match(error.message, /SITE_URL/);
				assert.equal(error.message.includes(token), false);
				return true;
			},
		);
	});

	it("rejects a SITE_URL that is not https or localhost", () => {
		assert.throws(() => readConfig({ ...good, SITE_URL: "http://example.com" }), (error) => {
			assert.match(error.message, /SITE_URL/);
			assert.equal(error.message.includes(token), false);
			return true;
		});
	});

	it("returns the config for a good env", () => {
		assert.deepEqual(readConfig(good), {
			token,
			clientId: "111",
			guildId: "222",
			roleId: "333",
			siteUrl: "https://student-hub.example",
		});
		const local = readConfig({ ...good, SITE_URL: "http://localhost:4321" });
		assert.equal(local.siteUrl, "http://localhost:4321");
	});
});
