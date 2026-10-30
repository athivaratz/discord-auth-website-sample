import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ButtonStyle, MessageFlags } from "discord.js";
import { commandData, roleCheckReply, verifyReply } from "../src/commands.js";

describe("commands", () => {
	it("builds verify and role-check", () => {
		const data = commandData();
		assert.deepEqual(
			data.map((command) => command.name),
			["verify", "role-check"],
		);
		assert.equal(data[0].description, "Get the link to get your Student role");
		assert.equal(data[1].description, "Check if you have the Student role");
		for (const command of data) {
			assert.ok(command.description.length < 100);
		}
	});

	it("sends an ephemeral verify reply with a link button", () => {
		const url = "https://student-hub.example";
		const reply = verifyReply(url);
		assert.match(reply.content, /Login with Discord/);
		assert.match(reply.content, /Approve the request/);
		assert.match(reply.content, /Check again on the site/);
		assert.equal(reply.flags, MessageFlags.Ephemeral);
		assert.deepEqual(reply.allowedMentions, { parse: [] });

		const row = reply.components[0].toJSON();
		assert.equal(row.components.length, 1);
		const button = row.components[0];
		assert.equal(button.style, ButtonStyle.Link);
		assert.equal(button.label, "Open the website");
		assert.equal(button.url, url);
	});

	it("tells the caller whether they have the role", () => {
		const yes = roleCheckReply(true);
		const no = roleCheckReply(false);
		assert.equal(yes.content, "You have the Student role.");
		assert.equal(no.content, "You do not have the Student role yet. Use /verify to get it.");
		assert.equal(yes.flags, MessageFlags.Ephemeral);
		assert.equal(no.flags, MessageFlags.Ephemeral);
		assert.deepEqual(yes.allowedMentions, { parse: [] });
		assert.deepEqual(no.allowedMentions, { parse: [] });
	});
});
