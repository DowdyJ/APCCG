import { SlashCommandBuilder } from "discord.js";
import discord from 'discord.js'
import { ICommand } from "./icommand"

import { REST, Routes, SlashCommandStringOption } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';

export { CommandHello as Command }

class CommandHello implements ICommand {
    public Disabled(): boolean {
        return false;
    }
    
    public CommandData(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName("hello").setDescription("yeet the baby");
    }

    public async Execute(args: any[]): Promise<boolean> {
        let interaction = (args[0] as discord.CommandInteraction);

        await interaction.reply('Pong!');
        return true;
    }

}