import discord from 'discord.js'
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { ICommand } from './command/icommand.js'
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import settings from '../settings.json' assert { type: "json"}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CustomClient extends discord.Client {
    public constructor(options : discord.ClientOptions, token : string, applicationID : string) {
        super(options);
        this._token = token;
        this._applicationID = applicationID;
        this._rest = new REST({ version: '10' }).setToken(this._token);
        this._InitializeCommands();
        return;
    }
    
    private _token : string;
    private _applicationID : string;
    private _rest : REST;

    public commands : ICommand[] = [];

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
            const filePath = path.join(commandsBasePath, file);
            const commandModule = await import(filePath);

            if ('Command' in commandModule) {
                this.commands.push(new commandModule.Command());
            } else {
                console.log(`[WARNING] The command at ${filePath} does not implement ICommand or does not export command as \'Command\'`);
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