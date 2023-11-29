import discord from "discord.js";
import { REST, Routes, SlashCommandBuilder, GatewayIntentBits } from "discord.js";

import ApccgSlashCommand from "./slash_command/apccg_slash_command.js";

import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "url";
import settings from "../settings.json" assert { type: "json" };
import hmt from "../hmt.json" assert { type: "json" };
import ApccgMessageCommand from "./message_command/apccg_message_command.js";
import CommandHelp from "./slash_command/command_help.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CustomClient extends discord.Client {
    private constructor(options: discord.ClientOptions, token: string, applicationID: string) {
        super(options);
        this._token = token;
        this._applicationID = applicationID;
        this._rest = new REST({ version: "10" }).setToken(this._token);
        this.initializeCommands();
        this.on("messageCreate", (message: discord.Message) => {
            this.handleMessages(message);
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

            CustomClient.client = new CustomClient(
                {
                    intents: [
                        GatewayIntentBits.Guilds,
                        GatewayIntentBits.MessageContent,
                        GatewayIntentBits.GuildMessages,
                        GatewayIntentBits.GuildVoiceStates,
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

    public async processCommandsAsync(interaction: discord.Interaction): Promise<boolean> {
        let returnValue: boolean = false;
        if (!interaction.isChatInputCommand()) return returnValue;

        for (const c of this.slashCommands) {
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
        this.initializeHelpCommand();
    }

    private initializeHelpCommand() {
        let helpCommand = this.slashCommands.filter((command) => command instanceof CommandHelp)[0] as CommandHelp;
        helpCommand.setRegisteredCommands(this.slashCommands, this.messageCommands);
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

        return commands;
    }

    private initializeCommands(): void {
        (async () => {
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
        })();
    }
}
