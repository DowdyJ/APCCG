import settings from "../settings.json" with { type: "json" };

export const MessageType = Object.freeze({
    LOG: 0,
    WARNING: 1,
    ERROR: 2,
    DEBUG: 3,
});

class CustomLogger {
    static log(message, type = MessageType.LOG) {
        let messageString = message;
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

export { CustomLogger as Logger };
