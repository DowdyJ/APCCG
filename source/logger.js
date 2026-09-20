import settings from "../settings.json" with { type: "json" };

export const MessageType = Object.freeze({
    LOG: 0,
    WARNING: 1,
    ERROR: 2,
    DEBUG: 3,
    VERBOSE: 4,
});

class CustomLogger {
    static log(message, type = MessageType.LOG) {
        let messageString = message;
        switch (type) {
            case MessageType.VERBOSE:
                if (!settings.VERBOSE_LOGGING) break;
                messageString = "\x1b[36m[VERBOSE]\x1b[0m " + messageString;
                console.log(messageString);
                break;
            case MessageType.DEBUG:
                if (!settings.DEBUG) break;
                messageString = "\x1b[35m[DEBUG]\x1b[0m " + messageString;
                console.log(messageString);
                break;
            case MessageType.ERROR:
                messageString = "\x1b[31m[ERROR]\x1b[0m " + messageString;
                console.log(messageString);
                break;
            case MessageType.WARNING:
                messageString = "\x1b[33m[WARN]\x1b[0m  " + messageString;
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
