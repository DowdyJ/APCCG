import { Message } from "discord.js";
import settings from "../settings.json" with { type: "json" };

export { CustomLogger as Logger };

class CustomLogger {
    public static log(message: any, type: MessageType = MessageType.LOG): void {
        let messageString: string = message as string;
        switch (type) {
            case MessageType.DEBUG:
                if (!settings.DEBUG) break;
                messageString = "e[35m[DEBUG]e[0m " + messageString;
                console.log(messageString);
                break;
            case MessageType.ERROR:
                messageString = "e[31m[ERROR]e[0m " + messageString;
                console.log(messageString);
                break;
            case MessageType.WARNING:
                messageString = "e[33m[WARN]e[0m  " + messageString;
                console.log(messageString);
                break;
            case MessageType.LOG:
                console.log(message);
                break;
            default:
                console.log(message);
        }
    }
}

export enum MessageType {
    LOG,
    WARNING,
    ERROR,
    DEBUG,
}
