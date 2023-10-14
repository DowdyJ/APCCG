import discord from 'discord.js'
import { REST, Routes, SlashCommandBuilder, GatewayIntentBits } from 'discord.js';

import Command from './command/command.js'

import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'url';
import settings from '../settings.json' assert { type: "json"}
import hmt from '../hmt.json' assert { type: "json"}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CustomClient extends discord.Client {
    private constructor(options : discord.ClientOptions, token : string, applicationID : string) {
        super(options);
        this._token = token;
        this._applicationID = applicationID;
        this._rest = new REST({ version: '10' }).setToken(this._token);
        this._InitializeCommands();
        return;
    }

    private static _client : CustomClient | null = null;

    public static Instance() : CustomClient {
        if (CustomClient._client === null) {
            let TOKEN : string = hmt.APCCG_BOT_TOKEN;
            let ApplicationID : string = hmt.APPLICATION_ID;

            CustomClient._client = new CustomClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] }, TOKEN, ApplicationID);
        }

        return CustomClient._client;
    }

    public async LogIn() : Promise<void> {
        await this.login(this._token);
    }

    private _token : string;
    private _applicationID : string;
    private _rest : REST;

    public commands : Command[] = [];

    public async ProcessCommandsAsync(interaction : discord.Interaction) : Promise<boolean> {
        let returnValue : boolean = false;
        if (!interaction.isChatInputCommand()) 
            return returnValue;

        for (const c of this.commands) {
            if (c.CommandData().name === interaction.commandName) {
                returnValue = await c.Execute([interaction]);
                break;
            }
        }

        return returnValue
    }

    private async _GetCommands() : Promise<void> {
        console.log("Started getting commands...");
        
            const commandsBasePath = path.join(__dirname, 'command');
            const commandFiles = fs.readdirSync(commandsBasePath).filter(file => file.endsWith('.js'));
    
            for (const file of commandFiles) {
                try {
                    if (file === "command.js")
                        continue;
                    
                    const filePath = path.join(commandsBasePath, file);
                    console.log("Loading the file " + file);
                    const commandModule = new (await import(filePath)).default
        
                    if (commandModule instanceof Command) {
                        this.commands.push(commandModule);
                    } else {
                        console.log(`[WARNING] The file at ${filePath} does not extend Command`);
                    }
                }
                catch (err) {
                    console.log("Error loading commands: " + err);
                }
            }
    
            console.log("Finished getting commands.");
        
    }

    private _GetSlashCommandBuilders() : SlashCommandBuilder[] {
        let commands : SlashCommandBuilder[] = [];

        for (const command of this.commands) {
            if (!command.Disabled()) {
                console.log(`Registering command named: ${command.CommandData().name}`);
                commands.push(command.CommandData());
            }
        }

        return commands;
    }

    private _InitializeCommands() : void {
        (async () => {
            await this._GetCommands();
            try {
                if (!settings.REGISTER_COMANDS)
                    return;
                
                    console.log('Updating slash commands...');

                await this._rest.put(Routes.applicationCommands(this._applicationID), { body: this._GetSlashCommandBuilders() });
            
            } catch (error) {
                console.error(error);
            }
          })();
    }

}