import { SlashCommandBuilder } from "discord.js";
import discord from 'discord.js'
import { ICommand } from "./icommand"

export { CommandDaily as Command }

class CommandDaily implements ICommand {
    public Disabled(): boolean {
        return false;
    }
    
    public CommandData(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName("daily").setDescription("get daily rewards");
    }

    public async Execute(args: any[]): Promise<boolean> {
        let interaction = (args[0] as discord.CommandInteraction);

        await interaction.reply('got!');
        return true;
    }

}