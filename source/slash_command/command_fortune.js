import { SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import child_process from "child_process";

export default class CommandFortune extends ApccgSlashCommand {
    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder().setName("fortune").setDescription("Get a random fortune");
    }

    async execute(args) {
        const interaction = args[0];

        const fortuneText = await this.getUnattributedFortune();

        if (fortuneText == null) {
            interaction.reply("Failed to consult the fortune spirits.");
            return false;
        }

        interaction.reply(`*${fortuneText}*`);
        return true;
    }

    // Fortune files near-universally mark a quote's source with a "-- Author" line.
    // There's no separate "quotes" database to exclude, so retry until we get one without it.
    async getUnattributedFortune(maxAttempts = 25) {
        for (let i = 0; i < maxAttempts; i++) {
            const stdout = await this.runFortune();
            if (stdout == null) return null;

            const text = stdout.trim();
            if (!/^\s*--/m.test(text)) {
                return text;
            }
        }

        return null;
    }

    runFortune() {
        return new Promise((resolve) => {
            child_process.exec("fortune -s", (error, stdout) => {
                if (error) {
                    Logger.log(`Error running fortune: ${error}`, MessageType.ERROR);
                    resolve(null);
                    return;
                }

                resolve(stdout);
            });
        });
    }

    getTitle() {
        return "Fortune";
    }

    getDescription() {
        return `**/fortune** -> Get a random fortune`;
    }
}
