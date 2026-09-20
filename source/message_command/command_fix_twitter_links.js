import ApccgMessageCommand from "./apccg_message_command.js";

export default class CommandFixTwitterLinks extends ApccgMessageCommand {
    pattern = /https:\/\/x\.com.*|https:\/\/twitter\.com.*/;

    async execute(message) {
        let newLink = message.cleanContent.replace("twitter.com", "vxtwitter.com").replace("x.com", "vxtwitter.com");
        await message.channel.send(`From ${message.author.username}:\n\n${newLink}`);
        await message.delete();
    }

    getTitle() {
        return "Twitter Link Fix";
    }

    getDescription() {
        return "Triggers on twitter.com or x.com links. Converts to vxtwitter.com.";
    }
}
