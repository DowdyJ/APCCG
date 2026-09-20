import { SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";

export default class CommandHello extends ApccgSlashCommand {
    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder().setName("hello").setDescription("yeet the baby");
    }

    async execute(args) {
        let interaction = args[0];

        await interaction.reply("UwU");
        return true;
    }

    getTitle() {
        return "Utility";
    }

    getDescription() {
        return `**/hello** -> OwO`;
    }
}
