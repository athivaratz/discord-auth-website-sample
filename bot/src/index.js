import { Client, Events, GatewayIntentBits, MessageFlags, REST, Routes } from "discord.js";
import { commandData, roleCheckReply, verifyReply } from "./commands.js";
import { readConfig } from "./config.js";

function memberHasRole(member, roleId) {
	if (member?.roles?.cache) return member.roles.cache.has(roleId);
	if (Array.isArray(member?.roles)) return member.roles.includes(roleId);
	return false;
}

let config;
try {
	config = readConfig();
} catch (error) {
	console.error(error.message);
	process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(config.token);

// Guild commands update right away. Global commands can take time.
try {
	await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
		body: commandData(),
	});
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
console.log("Registered 2 commands.");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (ready) => {
	console.log(`Logged in as ${ready.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	if (interaction.guildId !== config.guildId) return;

	try {
		if (interaction.commandName === "verify") {
			await interaction.reply(verifyReply(config.siteUrl));
			return;
		}
		if (interaction.commandName === "role-check") {
			const hasRole = memberHasRole(interaction.member, config.roleId);
			await interaction.reply(roleCheckReply(hasRole, config.siteUrl));
		}
	} catch (error) {
		console.error(`${interaction.commandName}: ${error.message}`);
		if (interaction.replied || interaction.deferred) return;
		try {
			await interaction.reply({
				content: "Something went wrong. Try again later.",
				flags: MessageFlags.Ephemeral,
				allowedMentions: { parse: [] },
			});
		} catch (replyError) {
			console.error(`${interaction.commandName}: ${replyError.message}`);
		}
	}
});

async function shutdown() {
	await client.destroy();
	process.exit(0);
}

process.on("SIGTERM", () => {
	shutdown();
});
process.on("SIGINT", () => {
	shutdown();
});

try {
	await client.login(config.token);
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
