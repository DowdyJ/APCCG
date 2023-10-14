import { SlashCommandBuilder } from "discord.js";
import discord from 'discord.js'
import Command from "./command.js"

import { REST, Routes, SlashCommandStringOption } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';

export default class CommandHello extends Command {
    public Disabled(): boolean {
        return false;
    }
    
    public CommandData(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName("hello").setDescription("yeet the baby");
    }

    public async Execute(args: any[]): Promise<boolean> {
        let interaction = (args[0] as discord.CommandInteraction);

        await interaction.reply('UwU');
        return true;
    }

}