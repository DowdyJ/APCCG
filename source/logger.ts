import settings from '../settings.json' assert { type: "json"}

export { CustomLogger as Logger }

class CustomLogger {
    public static log(message : any, type : MessageType = MessageType.LOG) : void {
        let messageString : string= message as string;
        switch (type) {
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

