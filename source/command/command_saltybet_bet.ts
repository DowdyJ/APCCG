import { Message, SlashCommandBuilder } from "discord.js";
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
        let builder = new SlashCommandBuilder().setName("saltyinfo").setDescription("Get active team data");
        builder.addNumberOption((input) => input.setRequired(true).setName("team number").setChoices({name: "team 1", value: 1}, {name: "team 2", value:2}));
        builder.addNumberOption((input) => input.setRequired(true).setName("amount to bet"));

        return builder;
    }

    async Execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as discord.CommandInteraction;
    
        let success : boolean = await this.VoteForTeam(
            interaction, 
            interaction.options.get("team number")?.value as number ?? 1, 
            interaction.options.get("amount to bet")?.value as number ?? 0);

        if (success)
            interaction.reply("NOT PISS");

        interaction.reply("IS PISS");

        return success;

    }

    Disabled(): boolean {
        return false;
    }

    async VoteForTeam(interaction : discord.CommandInteraction, teamNumber : number, amount : number) : Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            Logger.log(`Trying to vote for team number ${teamNumber} with \$${amount}`, MessageType.DEBUG);

            let curl = new Curl();
            let postUrl: string = `https://www.saltybet.com/ajax_place_bet.php`
            let selectedPlayerValue : string = teamNumber === 1 ? "player1" : "player2";
            const close = curl.close.bind(curl);
            
            curl.setOpt(Curl.option.URL, postUrl);
            curl.setOpt(Curl.option.POST, true)
            curl.setOpt(Curl.option.COOKIE, this.GetCookieFileName(interaction));
            curl.setOpt(Curl.option.POSTFIELDS, querystring.stringify({
                selectedplayer : selectedPlayerValue,
                wager : amount,
            }));

            curl.on('end', function(statusCode, data, headers) {
              Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
              Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
              Logger.log(`Return headers: ${headers}`, MessageType.DEBUG);
              Logger.log(this.getInfo('TOTAL_TIME'), MessageType.DEBUG);
        
              this.close();
              resolve(true);
            });
        
            curl.on('error', (err) => {
              Logger.log(`Error: ${err.message}`, MessageType.ERROR);
              close()
              reject(err.message);
            });
        
            curl.perform();
          });
        }

      GetCookieFileName(interaction : discord.CommandInteraction) : string {
        return `${interaction.user.id}.txt`;
      }
} 