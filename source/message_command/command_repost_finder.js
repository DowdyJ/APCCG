import ApccgMessageCommand from "./apccg_message_command.js";

export default class CommandRepostFinder extends ApccgMessageCommand {
    // Disabled until further development
    // pattern = /image\/.*|video\/.*/;

    getTitle() {
        return "Repost Finder";
    }

    getDescription() {
        return "Triggers on media attatched messages, tags messages as reposts if already found in channel history";
    }

    async execute(message) {}

    isMatch(message) {
        if (message.attachments.size == 1) {
            let attach = message.attachments.first();
            return !!attach.contentType.match(this.pattern);
        }
        return false;
    }
}
