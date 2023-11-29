import discord from "discord.js";

export default class ApccgSlashCommand {
    commandData(): discord.SlashCommandBuilder {
        throw new Error("Unimplemented method CommandData");
    }

    execute(args: any[]): Promise<boolean> {
        throw new Error("Unimplemented method Execute");
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
}
