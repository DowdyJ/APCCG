import discord from "discord.js";
import { REST, Routes } from "discord.js";

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
    constructor(options, token, applicationID) {
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

        this.on("messageCreate", (message) => {
            try {
                this.handleMessages(message);
            }
            catch (err) {}
        });

        return;
    }

    static client = null;

    static instance() {
        if (CustomClient.client === null) {
            let TOKEN;
            let ApplicationID;

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

    async logInWrapper() {
        await this.login(this._token);
    }

    slashCommands = [];
    messageCommands = [];
    intervalCommands = [];

    // Discord's gateway can redeliver events already handled once (e.g. after a reconnect/resume),
    // so every dispatch path is guarded against processing the same message/interaction twice.
    recentlyHandledIds = new Set();

    markHandled(id) {
        if (this.recentlyHandledIds.has(id)) return false;
        this.recentlyHandledIds.add(id);
        if (this.recentlyHandledIds.size > 1000) {
            this.recentlyHandledIds.delete(this.recentlyHandledIds.values().next().value);
        }
        return true;
    }

    async processCommandsAsync(interaction) {
        let returnValue = false;
        if (!interaction.isChatInputCommand()) return returnValue;

        if (!this.markHandled(interaction.id)) {
            Logger.log(`Ignoring duplicate interaction ${interaction.id} (already handled)`, MessageType.WARNING);
            return returnValue;
        }

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

    async handleMessages(message) {
        if (message.author.bot) return;

        if (!this.markHandled(message.id)) {
            Logger.log(`Ignoring duplicate message ${message.id} (already handled)`, MessageType.WARNING);
            return;
        }

        for (const messageCommand of this.messageCommands) {
            if (messageCommand.isMatch(message)) {
                messageCommand.execute(message);
            }
        }
    }

    async getCommands() {
        await this.loadSlashCommands();
        await this.loadMessageCommands();
        await this.loadIntervalCommands();
        this.initializeHelpCommand();
    }

    initializeHelpCommand() {
        let helpCommand = this.slashCommands.filter((command) => command instanceof CommandHelp)[0];
        helpCommand.setRegisteredCommands(this.slashCommands, this.messageCommands, this.intervalCommands);
    }

    async loadIntervalCommands() {
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

    async loadMessageCommands() {
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

    async loadSlashCommands() {
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

    getSlashCommandBuilders() {
        let commands = [];

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

    async initializeCommands() {
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
