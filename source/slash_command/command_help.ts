import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js"
import ApccgMessageCommand from "../message_command/apccg_message_command.js";
import { Logger } from "../logger.js";


export default class CommandHelp extends ApccgSlashCommand {

    private registeredSlashCommands : ApccgSlashCommand[] = [];
    private registeredMessageCommands: ApccgMessageCommand[] = [];

    public Disabled(): boolean {
        return false;
    }
    
    public CommandData(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName("help").setDescription("see a list of commands");
    }

    public async Execute(args: any[]): Promise<boolean> {
        let interaction = (args[0] as CommandInteraction);
        
        let helpEmbed = new EmbedBuilder();
        helpEmbed
            .setColor(0xFFFFFF)
            .setDescription("Available commands")
            .setTitle("APCCG Help");
        
        for (const slashCommand of this.registeredSlashCommands) {
            try {
                helpEmbed.addFields({name: slashCommand.GetTitle(), value: slashCommand.GetDescription(), inline: false})
            } catch (error) {
                Logger.log((error as Error).message);
            }
        }

        
        for (const messageCommand of this.registeredMessageCommands) {
            try {
                helpEmbed.addFields({name: messageCommand.GetTitle(), value: messageCommand.GetDescription(), inline: false})
            } catch (error) {
                Logger.log((error as Error).message);
            }
        }

        interaction.reply({embeds: [helpEmbed]});
        
        return true;
    }

    public override GetTitle(): string {
        return "Help";
    }

    public override GetDescription(): string {
        return `**/help** -> See this message`
    }

    public SetRegisteredCommands(registeredSlashCommands : ApccgSlashCommand[], registeredMessageCommands: ApccgMessageCommand[]) {
        this.registeredMessageCommands = registeredMessageCommands;
        this.registeredSlashCommands = registeredSlashCommands;
    }

}