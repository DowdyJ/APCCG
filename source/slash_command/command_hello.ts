import { SlashCommandBuilder } from "discord.js";
import discord from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";

export default class CommandHello extends ApccgSlashCommand {
    public override disabled(): boolean {
        return false;
    }

    public override commandData(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName("hello").setDescription("yeet the baby");
    }

    public override async execute(args: any[]): Promise<boolean> {
        let interaction = args[0] as discord.CommandInteraction;

        await interaction.reply("UwU");
        return true;
    }

    public override getTitle(): string {
        return "Utility";
    }

    public override getDescription(): string {
        return `**/hello** -> OwO`;
    }
}
