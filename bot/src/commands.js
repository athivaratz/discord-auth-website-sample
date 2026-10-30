import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";

const noMentions = { parse: [] };

export function verifyCommand() {
	return new SlashCommandBuilder()
		.setName("verify")
		.setDescription("Get the link to get your Student role");
}

export function roleCheckCommand() {
	return new SlashCommandBuilder()
		.setName("role-check")
		.setDescription("Check if you have the Student role");
}

export function commandData() {
	return [verifyCommand().toJSON(), roleCheckCommand().toJSON()];
}

export function verifyReply(siteUrl) {
	const link = new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setLabel("Open the website")
		.setURL(siteUrl);
	const row = new ActionRowBuilder().addComponents(link);

	return {
		content: [
			"1. Open the website and press Login with Discord.",
			"2. Approve the request.",
			"3. Your Student role is added. If it does not show up, press Check again on the site.",
		].join("\n"),
		components: [row],
		flags: MessageFlags.Ephemeral,
		allowedMentions: noMentions,
	};
}

export function roleCheckReply(hasRole) {
	const content = hasRole
		? "You have the Student role."
		: "You do not have the Student role yet. Use /verify to get it.";

	return {
		content,
		flags: MessageFlags.Ephemeral,
		allowedMentions: noMentions,
	};
}
