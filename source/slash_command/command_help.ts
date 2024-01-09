import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import ApccgMessageCommand from "../message_command/apccg_message_command.js";
import { Logger } from "../logger.js";
import ApccgIntervalCommand from "../interval_command/apccg_interval_command.js";

export default class CommandHelp extends ApccgSlashCommand {
    private registeredSlashCommands: ApccgSlashCommand[] = [];
    private registeredMessageCommands: ApccgMessageCommand[] = [];
    private registeredIntervalCommands: ApccgIntervalCommand[] =[];

    public override disabled(): boolean {
        return false;
    }

    public override commandData(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName("help").setDescription("see a list of commands");
    }

    public override async execute(args: any[]): Promise<boolean> {
        let interaction = args[0] as CommandInteraction;

        let helpEmbed = new EmbedBuilder();
        helpEmbed.setColor(0xffffff).setDescription("Available commands").setTitle("APCCG Help");

        for (const slashCommand of this.registeredSlashCommands) {
            try {
                helpEmbed.addFields({
                    name: slashCommand.getTitle(),
                    value: slashCommand.getDescription(),
                    inline: false,
                });
            } catch (error) {
                Logger.log((error as Error).message);
            }
        }

        for (const messageCommand of this.registeredMessageCommands) {
            try {
                helpEmbed.addFields({
                    name: messageCommand.getTitle(),
                    value: messageCommand.getDescription(),
                    inline: false,
                });
            } catch (error) {
                Logger.log((error as Error).message);
            }
        }

        for (const intervalCommand of this.registeredIntervalCommands) {
            try {
                helpEmbed.addFields({
                    name: intervalCommand.getTitle(),
                    value: intervalCommand.getDescription(),
                    inline: false,
                });
            } catch (error) {
                Logger.log((error as Error).message);
            }
        }

        interaction.reply({ embeds: [helpEmbed] });

        return true;
    }

    public override getTitle(): string {
        return "Help";
    }

    public override getDescription(): string {
        return `**/help** -> See this message`;
    }

    public setRegisteredCommands(
        registeredSlashCommands: ApccgSlashCommand[],
        registeredMessageCommands: ApccgMessageCommand[],
        registeredIntervalCommands: ApccgIntervalCommand[]
    ) {
        this.registeredMessageCommands = registeredMessageCommands;
        this.registeredSlashCommands = registeredSlashCommands;
        this.registeredIntervalCommands = registeredIntervalCommands;
    }
}
