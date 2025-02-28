import discord, { TextChannel } from "discord.js";

import ApccgMessageCommand from "./apccg_message_command.js";

export default class CommandFixTwitterLinks extends ApccgMessageCommand {
    public pattern: RegExp = /https:\/\/x\.com.*|https:\/\/twitter\.com.*/;

    public override async execute(message: discord.Message): Promise<void> {
        let newLink = message.cleanContent.replace("twitter.com", "vxtwitter.com").replace("x.com", "vxtwitter.com");
        await (message.channel as TextChannel).send(`From ${message.author.username}:\n\n${newLink}`);
        await message.delete();
    }

    public override getTitle(): string {
        return "Twitter Link Fix";
    }

    public override getDescription(): string {
        return "Triggers on twitter.com or x.com links. Converts to vxtwitter.com.";
    }
}
