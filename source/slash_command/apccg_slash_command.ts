import discord from 'discord.js'

export default class ApccgSlashCommand {

    CommandData() : discord.SlashCommandBuilder {
        throw new Error("Unimplemented method CommandData");
    };

    Execute(args : any[]) : Promise<boolean> {
        throw new Error("Unimplemented method Execute");
    };

    Disabled() : boolean {
        throw new Error("Unimplemented method Disabled");
    };

    GetTitle() : string {
        throw new Error("Unimplemented method GetTitle");
    }

    GetDescription() : string {
        throw new Error("Unimplemented method GetDescription");
    }
}