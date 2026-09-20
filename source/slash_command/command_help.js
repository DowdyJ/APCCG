import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger } from "../logger.js";

export default class CommandHelp extends ApccgSlashCommand {
    registeredSlashCommands = [];
    registeredMessageCommands = [];
    registeredIntervalCommands = [];

    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder().setName("help").setDescription("see a list of commands");
    }

    async execute(args) {
        let interaction = args[0];

        let helpEmbed = new EmbedBuilder();
        helpEmbed.setColor(0xffffff).setDescription("Available commands").setTitle("APCCG Help");

        for (const slashCommand of this.registeredSlashCommands) {
            try {
                helpEmbed.addFields({
                    name: slashCommand.getTitle(),
                    value: slashCommand.getDescription(),
                    inline: false,
                });
            } catch (error) {
                Logger.log(error.message);
            }
        }

        for (const messageCommand of this.registeredMessageCommands) {
            try {
                helpEmbed.addFields({
                    name: messageCommand.getTitle(),
                    value: messageCommand.getDescription(),
                    inline: false,
                });
            } catch (error) {
                Logger.log(error.message);
            }
        }

        for (const intervalCommand of this.registeredIntervalCommands) {
            try {
                helpEmbed.addFields({
                    name: intervalCommand.getTitle(),
                    value: intervalCommand.getDescription(),
                    inline: false,
                });
            } catch (error) {
                Logger.log(error.message);
            }
        }

        interaction.reply({ embeds: [helpEmbed] });

        return true;
    }

    getTitle() {
        return "Help";
    }

    getDescription() {
        return `**/help** -> See this message`;
    }

    setRegisteredCommands(registeredSlashCommands, registeredMessageCommands, registeredIntervalCommands) {
        this.registeredMessageCommands = registeredMessageCommands;
        this.registeredSlashCommands = registeredSlashCommands;
        this.registeredIntervalCommands = registeredIntervalCommands;
    }
}
