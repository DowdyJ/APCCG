import discord from 'discord.js'

export interface ICommand {
    CommandData() : discord.SlashCommandBuilder;
    Execute(args : any[]) : Promise<boolean>;
    Disabled() : boolean;
}