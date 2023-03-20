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
        return new SlashCommandBuilder().setName("saltyinfo").setDescription("Get active team data");
    }

    async Execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as discord.CommandInteraction;
        
        const teamData = await this.GetActiveTeamsData();

        if (teamData === null) {
            interaction.reply("Failed to get response 😔");
            return false;
        }
        
        let ratioString : string = +teamData.p1total === 0 || +teamData.p2total === 0 ? "N/A" : (+teamData.p1total > +teamData.p2total ? `${(+teamData.p1total/+teamData.p2total).toFixed(2)} : 1` : `1 : ${(+teamData.p2total/+teamData.p1total).toFixed(2)}`);
        
        interaction.reply(`Team 1: ${teamData.p1name}\nTeam 2: ${teamData.p2name}\nBetting odds: ${ratioString}\nMatches remaining: ${teamData.remaining}`);
        

        await this.SignIn(interaction, "joeldowdy7@gmail.com", "Ds86pTak");

        await this.VoteForTeam(interaction, 1, 1000);

        return true;

    }

    Disabled(): boolean {
        return true;
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

    async VoteForTeam(interaction : discord.CommandInteraction, teamNumber : number, amount : number) : Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
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


            curl.on('error', close);
        
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
              reject(err.message);
            });
        
            curl.perform();
          });
        }

    async GetActiveTeamsData(): Promise<ActiveTeamsData | null> {
        return new Promise<ActiveTeamsData | null>((resolve, reject) => {
          let curl = new Curl();
          let requestUrl: string = `https://www.saltybet.com/state.json?t=${Date.now()}`
          let result: ActiveTeamsData | null = null;
      
          curl.setOpt('URL', requestUrl);
      
          curl.on('end', function(statusCode, data, headers) {
            Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
            Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
            Logger.log(this.getInfo('TOTAL_TIME'), MessageType.DEBUG);
      
            let parsedData = JSON.parse(data as string);
      
            if (parsedData == null) {
              Logger.log("Failed to parse JSON response", MessageType.ERROR);
              reject("Failed to parse JSON response");
              return;
            }
      
            if (statusCode !== 200) {
              Logger.log(`Received unexpected response code: ${statusCode}`, MessageType.WARNING);
              reject(`Received unexpected response code: ${statusCode}`);
              return;
            }
      
            result = new ActiveTeamsData(
              parsedData.p1name,
              parsedData.p2name,
              parsedData.p1total.replace(/,/g, ''),
              parsedData.p2total.replace(/,/g, ''),
              parsedData.status,
              parsedData.alert,
              parsedData.x,
              parsedData.remaining
            );
      
            this.close();
            resolve(result);
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


class ActiveTeamsData {
    constructor(p1name : string, p2name : string, p1total : string, p2total : string, status : string, alert : string, x : number, remaining : string) {
        this.p1name = p1name;
        this.p2name = p2name;
        this.p1total = p1total;
        this.p2total = p2total;
        this.status = status;
        this.alert = alert;
        this.x = x;
        this.remaining = remaining;
    }

    public p1name : string;
    public p2name : string;
    public p1total : string;
    public p2total : string;
    public alert : string;
    public status : string;
    public x : number; 
    public remaining : string;
}