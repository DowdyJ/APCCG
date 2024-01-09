import discord from "discord.js";

export default class ApccgIntervalCommand {
    commandData(): discord.SlashCommandBuilder {
        throw new Error("Unimplemented method CommandData");
    }

    execute(args: any[]): Promise<boolean> {
        throw new Error("Unimplemented method Execute");
    }

    executeInterval(): Promise<boolean> {
        throw new Error("Unimplemented method ExecuteInterval")
    }

    disabled(): boolean {
        throw new Error("Unimplemented method Disabled");
    }

    getTitle(): string {
        throw new Error("Unimplemented method GetTitle");
    }

    getDescription(): string {
        throw new Error("Unimplemented method GetDescription");
    }

    shouldRepeatNow(): Promise<boolean> {
        throw new Error("Unimplemented method shouldRepeatNow");
    }

    getInterval(): number {
        throw new Error("Unimplemented method getInterval");
    }
}
