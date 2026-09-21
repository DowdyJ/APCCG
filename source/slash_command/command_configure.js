import { InteractionType, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import Database from "../database.js";

export default class CommandConfigure extends ApccgSlashCommand {
    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder()
            .setName("configure")
            .setDescription("configure bot behavior")
            .addSubcommand((input) =>
                input
                    .setName("twitter_fix_url")
                    .setDescription("Set the replacement domain used for x.com/twitter.com links")
                    .addStringOption((option) =>
                        option
                            .setName("replacement_url")
                            .setDescription("The domain to use, e.g. vxtwitter.com")
                            .setRequired(true)
                            .setMinLength(2)
                            .setMaxLength(100)
                    )
            );
    }

    async execute(args) {
        const interaction = args[0];

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        const subcommandName = interaction.options.getSubcommand();

        switch (subcommandName) {
            case "twitter_fix_url":
                return await this.configureTwitterCommand(interaction);
            default:
                Logger.log("Invalid subcommand run on /configure", MessageType.ERROR);
        }

        return false;
    }

    getTitle() {
        return "Configure";
    }

    getDescription() {
        return `**/configure twitter_fix_url** [domain] -> Set the replacement domain used for x.com/twitter.com links (e.g. vxtwitter.com)`;
    }

    async configureTwitterCommand(interaction) {
        const replacementUrl = interaction.options.getString("replacement_url")?.trim();

        if (replacementUrl == null || replacementUrl === "") {
            interaction.reply("Malformed input");
            return false;
        }

        const success = await Database.instance().setTwitterReplacementUrl(replacementUrl);

        if (success) {
            interaction.reply(`Successfully set URL to "${replacementUrl}"`);
        } else {
            interaction.reply(`Failed to set URL to "${replacementUrl}"`);
        }

        return success;
    }
}
