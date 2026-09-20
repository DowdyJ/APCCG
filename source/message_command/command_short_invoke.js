import ApccgMessageCommand from "./apccg_message_command.js";
import Database from "../database.js"

export default class CommandShortInvoke extends ApccgMessageCommand {
    pattern = /^->/

    async execute(message) {
        this.relayCommand(message);
    }

    getTitle() {
        return "Shorthand invoke custom message command";
    }

    getDescription() {
        return "The shorthand form of the slash command for invoking custom commands. use \"->[command name]\"";
    }

    async relayCommand(message) {
        if (message.content.length <= 2) {
            console.log("Short invoke command invalid length");
            return false;
        }

        const commandName = message.cleanContent.slice(2);

        console.log(`Command Name: ${commandName}`);

        const commandDataObj = await Database.instance().getSingleCommand(commandName);

        if (commandDataObj == null) {
            console.log(`Command does not exists ${commandName}`);
            var emj = "";
            if (Math.random() * 100 > 85) {
                switch (Math.floor((Math.random() * 10.0))) {
                    case 1:
                        emj += "🫷🏻";
                    case 2:
                        emj += "🐵";
                    case 3:
                        emj += "❌";
                        break;
                    case 4:
                        emj += "⚡";
                    case 5:
                        emj += "⚡";
                    case 6:
                        emj += "🏙️";
                    case 7:
                        emj += "🏙️";
                    case 8:
                        emj += "🗼";
                        break;
                    case 9:
                        emj += "🫵🏻";
                    case 10:
                        emj += "🔺";
                        break;
                    default:
                        emj += "🙎🏿‍♂️";
                        break;
                }
                emj += " No";
                message.reply(`${emj}`);
            }
            return false;
        }

        const commandText = commandDataObj.command_text;
        const attachmentPath = commandDataObj.attachment_path;

        if (commandText == null || commandText === "") {
            await message.channel.send({files:[`./data/attachments/${attachmentPath}`]});
        }
        else if (attachmentPath == null || attachmentPath === "") {
            await message.channel.send({content: `${commandText}`});
        }
        else {
            await message.channel.send({content: `${commandText}`, files:[`./data/attachments/${attachmentPath}`]});
        }

        return true;
    }
}
