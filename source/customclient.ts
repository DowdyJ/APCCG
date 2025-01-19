import discord from "discord.js";
import { REST, Routes, SlashCommandBuilder, GatewayIntentBits } from "discord.js";

import ApccgSlashCommand from "./slash_command/apccg_slash_command.js";

import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "url";
import settings from "../settings.json" with { type: "json" };
import hmt from "../hmt.json" with { type: "json" };
import ApccgMessageCommand from "./message_command/apccg_message_command.js";
import CommandHelp from "./slash_command/command_help.js";
import ApccgIntervalCommand from "./interval_command/apccg_interval_command.js";
import { Logger, MessageType } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CustomClient extends discord.Client {
    private constructor(options: discord.ClientOptions, token: string, applicationID: string) {
        super(options);
        this._token = token;
        this._applicationID = applicationID;
        this._rest = new REST({ version: "10" }).setToken(this._token);
        
        this.initializeCommands().then(() => {
            for (const intervalCommand of this.intervalCommands) {
                setTimeout(() => {
                    Logger.log(`Registering regular interval command ${intervalCommand.commandData().name}`);
                    setInterval(() => {
                        try {
                            Logger.log(`Executing regular interval command`);
                            intervalCommand.executeInterval()
                        }
                        catch (err) {
                            Logger.log(err, MessageType.LOG);
                        }
                    }, 
                    intervalCommand.getInterval() * 1000);
                }, 10 * 1000);
            }
        })
        
        this.on("messageCreate", (message: discord.Message) => {
            try {
                this.handleMessages(message);
            }
            catch (err) {}
        });
    
        return;
    }

    private static client: CustomClient | null = null;

    public static instance(): CustomClient {
        if (CustomClient.client === null) {
            let TOKEN: string;
            let ApplicationID: string;

            if (settings.USE_ALT_BOT) {
                ApplicationID = hmt.ALT_BOT_APPLICATION_ID;
                TOKEN = hmt.ALT_BOT_TOKEN;
            } else {
                ApplicationID = hmt.APPLICATION_ID;
                TOKEN = hmt.BOT_TOKEN;
            }
            /*
                GatewayIntentBits.Guilds,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
            */

            CustomClient.client = new CustomClient(
                {
                    // ᕙ꒰  ˙꒳​˙   ꒱ᕗ
                    intents: [
                        0b1111111111111111111111
                    ],
                },
                TOKEN,
                ApplicationID
            );
        }

        return CustomClient.client;
    }

    public async logInWrapper(): Promise<void> {
        await this.login(this._token);
    }

    private _token: string;
    private _applicationID: string;
    private _rest: REST;

    public slashCommands: ApccgSlashCommand[] = [];
    public messageCommands: ApccgMessageCommand[] = [];
    public intervalCommands: ApccgIntervalCommand[] = [];

    public async processCommandsAsync(interaction: discord.Interaction): Promise<boolean> {
        let returnValue: boolean = false;
        if (!interaction.isChatInputCommand()) return returnValue;

        for (const c of this.slashCommands) {
            if (c.commandData().name === interaction.commandName) {
                returnValue = await c.execute([interaction]);
                break;
            }
        }

        for (const c of this.intervalCommands) {
            if (c.commandData().name === interaction.commandName) {
                returnValue = await c.execute([interaction]);
                break;
            }
        }

        return returnValue;
    }

    private async handleMessages(message: discord.Message) {
        if (message.author.bot) return;

        for (const messageCommand of this.messageCommands) {
            if (messageCommand.isMatch(message)) {
                messageCommand.execute(message);
            }
        }
    }

    private async getCommands(): Promise<void> {
        await this.loadSlashCommands();
        await this.loadMessageCommands();
        await this.loadIntervalCommands();
        this.initializeHelpCommand();
    }

    private initializeHelpCommand() {
        let helpCommand = this.slashCommands.filter((command) => command instanceof CommandHelp)[0] as CommandHelp;
        helpCommand.setRegisteredCommands(this.slashCommands, this.messageCommands, this.intervalCommands);
    }

    private async loadIntervalCommands(): Promise<void> {
        console.log("Started getting interval commands...");

        const commandsBasePath = path.join(__dirname, "interval_command");
        const commandFiles = fs.readdirSync(commandsBasePath).filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            try {
                if (file === "apccg_interval_command.js") continue;

                const filePath = path.join(commandsBasePath, file);
                console.log("Loading the file " + file);
                const commandModule = new (await import(filePath)).default();

                if (commandModule instanceof ApccgIntervalCommand) {
                    this.intervalCommands.push(commandModule);
                } else {
                    console.log(`[WARNING] The file at ${filePath} does not extend ApccgIntervalCommand`);
                }
            } catch (err) {
                console.log("Error loading commands: " + err);
            }
        }

        console.log("Finished getting interval commands.");

    }

    private async loadMessageCommands(): Promise<void> {
        console.log("Started getting message commands...");

        const commandsBasePath = path.join(__dirname, "message_command");
        const commandFiles = fs.readdirSync(commandsBasePath).filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            try {
                if (file === "apccg_message_command.js") continue;

                const filePath = path.join(commandsBasePath, file);
                console.log("Loading the file " + file);
                const commandModule = new (await import(filePath)).default();

                if (commandModule instanceof ApccgMessageCommand) {
                    this.messageCommands.push(commandModule);
                } else {
                    console.log(`[WARNING] The file at ${filePath} does not extend ApccgMessageCommand`);
                }
            } catch (err) {
                console.log("Error loading commands: " + err);
            }
        }

        console.log("Finished getting message commands.");
    }

    private async loadSlashCommands(): Promise<void> {
        console.log("Started getting slash commands...");

        const commandsBasePath = path.join(__dirname, "slash_command");
        const commandFiles = fs.readdirSync(commandsBasePath).filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            try {
                if (file === "apccg_slash_command.js") continue;

                const filePath = path.join(commandsBasePath, file);
                console.log("Loading the file " + file);
                const commandModule = new (await import(filePath)).default();

                if (commandModule instanceof ApccgSlashCommand) {
                    this.slashCommands.push(commandModule);
                } else {
                    console.log(`[WARNING] The file at ${filePath} does not extend ApccgSlashCommand`);
                }
            } catch (err) {
                console.log("Error loading commands: " + err);
            }
        }

        console.log("Finished getting slash commands.");
    }

    private getSlashCommandBuilders(): SlashCommandBuilder[] {
        let commands: SlashCommandBuilder[] = [];

        for (const command of this.slashCommands) {
            if (!command.disabled()) {
                console.log(`Registering command named: ${command.commandData().name}`);
                commands.push(command.commandData());
            }
        }

        for (const command of this.intervalCommands) {
            if (!command.disabled()) {
                console.log(`Registering command named: ${command.commandData().name}`);
                commands.push(command.commandData());
            }
        }

        return commands;
    }

    private async initializeCommands(): Promise<void> {
        await this.getCommands();
        try {
            if (!settings.REGISTER_COMANDS) return;

            console.log("Updating slash commands...");

            await this._rest.put(Routes.applicationCommands(this._applicationID), {
                body: this.getSlashCommandBuilders(),
            });
        } catch (error) {
            console.error(error);
        }
    }
}
