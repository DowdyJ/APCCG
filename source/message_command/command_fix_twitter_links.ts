import discord from "discord.js";

import ApccgMessageCommand from "./apccg_message_command.js";

export default class CommandFixTwitterLinks extends ApccgMessageCommand {

    public pattern: RegExp = /https:\/\/x\.com.*|https:\/\/twitter\.com.*/

    public async execute(message: discord.Message): Promise<void> {
        let newLink = message.cleanContent.replace("twitter.com", "vxtwitter.com").replace("x.com", "vxtwitter.com");
        await message.channel.send(`From ${message.author.username}:\n\n${newLink}`);
        await message.delete();
    }
}