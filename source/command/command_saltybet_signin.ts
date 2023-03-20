import { Message, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "./command_daily";
import { ICommand } from "./icommand.js";
import { Logger, MessageType } from "../logger.js"
import discord from "discord.js"

import { Curl } from "node-libcurl";
import querystring from 'querystring';

export { SaltyBetCommands as Command };

class SaltyBetCommands implements ICommand
{
    CommandData(): SlashCommandBuilder {
        let builder : SlashCommandBuilder = new SlashCommandBuilder()
            .setName("saltysi")
            .setDescription("Sign-in to SaltyBet");

        builder.addStringOption((input) => input.setRequired(true).setName('email'));
        builder.addStringOption((input) => input.setRequired(true).setName('password'));

        return builder;
    }

    async Execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as discord.CommandInteraction;

        return await this.SignIn(
            interaction, 
            interaction.options.get("email")?.value as string, 
            interaction.options.get("password")?.value as string);
    }

    Disabled(): boolean {
        return false;
    }

    async SignIn(interaction : discord.CommandInteraction, username : string, password : string) : Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let curl = new Curl();
            let postUrl: string = `https://www.saltybet.com/authenticate?signin=1`

            const close = curl.close.bind(curl);

            curl.setOpt(Curl.option.URL, postUrl);
            curl.setOpt(Curl.option.POST, true)
            curl.setOpt(Curl.option.POSTFIELDS, querystring.stringify({
                email: username,
                pword : password,
                authenticate : 'signin'
            }));

            curl.setOpt("COOKIEJAR", this.GetCookieFileName(interaction));

            curl.on('error', close);

            curl.on('end', function(statusCode, data, headers) {
              Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
              Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
              Logger.log(`Headers: ${headers}`, MessageType.DEBUG);
              Logger.log(this.getInfo('TOTAL_TIME'), MessageType.DEBUG);
        
              if (statusCode !== 302) {
                Logger.log(`Received unexpected response code: ${statusCode}`, MessageType.WARNING);
                reject(`Received unexpected response code: ${statusCode}`);
                return false;
              }

              this.close();
              resolve(true);
            });
        
            curl.on('error', (err) => {
              Logger.log(`Error: ${err.message}`, MessageType.ERROR);
              reject(err.message);
            });
        
            curl.perform();
          });
    }

      GetCookieFileName(interaction : discord.CommandInteraction) : string {
        return `${interaction.user.id}.txt`;
      }
} 