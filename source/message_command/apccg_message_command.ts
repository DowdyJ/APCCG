import discord from "discord.js";

export default class ApccgMessageCommand {
    public pattern: RegExp = new RegExp("(?=a)(?!a)");

    public isMatch(message: discord.Message): boolean {
        return !!message.cleanContent.match(this.pattern);
    }

    public async execute(message: discord.Message): Promise<void> {
        throw new Error('Unimplemented method "execute()"');
    }

    public getTitle(): string {
        throw new Error("Unimplemented method GetTitle");
    }

    public getDescription(): string {
        throw new Error("Unimplemented method GetDescription");
    }
}
