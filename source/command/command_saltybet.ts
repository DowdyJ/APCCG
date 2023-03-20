import { Message, SlashCommandBuilder, InteractionType } from "discord.js";
import { Command } from "./command_daily";
import { ICommand } from "./icommand.js";
import { Logger, MessageType } from "../logger.js"
import discord from "discord.js"

import { Curl, HeaderInfo } from "node-libcurl";
import querystring from 'querystring';

export { SaltyBetCommands as Command };

class SaltyBetCommands implements ICommand
{
    CommandData(): any {
        return new SlashCommandBuilder()
        .setName("salty")
        .setDescription("Interact with SaltyBet")
        .addSubcommand(subcommand => 
          subcommand
            .setName("sign-in")
            .setDescription("sign in to SaltyBet")
            .addStringOption((input) => input.setRequired(true).setName('email').setDescription("email for sign-in"))
            .addStringOption((input) => input.setRequired(true).setName('password').setDescription("password for sign-in")))
        .addSubcommand(subcommand => 
          subcommand
            .setName("bet")
            .setDescription("bet for a team")
            .addNumberOption((input) => input.setRequired(true).setName("teamnumber").setChoices({name: "team 1", value: 1}, {name: "team 2", value:2}).setDescription("team to vote for"))
            .addNumberOption((input) => input.setRequired(true).setName("betamount").setDescription("amount to bet")))
        .addSubcommand(subcommand =>
          subcommand
            .setName("start")
            .setDescription("start logging SaltyBet match data to channel"))
        .addSubcommand(subcommand =>
          subcommand
            .setName("stop")
            .setDescription("stop logging SaltyBet match data to channel"))
        .addSubcommand(subcommand =>
          subcommand
            .setName("test")
            .setDescription("test function")
        );
    }

    async Execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as discord.CommandInteraction;

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) 
          return false;

        let subcommandName : string = interaction.options.getSubcommand();

        switch (subcommandName) {
          case 'sign-in':
            return await this.SignIn(
              interaction, 
              interaction.options.get("email")?.value as string, 
              interaction.options.get("password")?.value as string);
          case 'bet':
            return await this.VoteForTeam(
              interaction,
              interaction.options.get("teamnumber")?.value as number ?? 1, 
              interaction.options.get("betamount")?.value as number ?? 0);
          case 'start':
            interaction.reply(`You have \$${await this.GetCurrentDollarAmount(interaction)}`);
            return false;
          case 'stop':
            await this.GetActiveTeamsData();
            return false;
          case 'test':
            await this.IsCookieValid(interaction);
            return true;
          default:
            Logger.log("Invalid subcommand run on salty", MessageType.ERROR);


        }
        return true;

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

          curl.setOpt(Curl.option.COOKIEJAR, this.GetCookieFileName(interaction));

          curl.on('error', close);

          curl.on('end', function(statusCode, data, headers) {
            Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
            Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
            Logger.log(`Headers: ${headers}`, MessageType.DEBUG);
            Logger.log(this.getInfo('TOTAL_TIME'), MessageType.DEBUG);
      
            if (statusCode !== 302) {
              Logger.log(`Received unexpected response code: ${statusCode}`, MessageType.WARNING);
              reject(`Received unexpected response code: ${statusCode}`);
              interaction.reply({ephemeral: true, content:"Failed to log in."})
              return false;
            }

            interaction.reply({ephemeral: true, content:"Successfully logged in."})
            this.close();
            resolve(true);
          });
      
          curl.on('error', (err) => {
            Logger.log(`Error: ${err.message}`, MessageType.ERROR);
            interaction.reply({ephemeral: true, content:"Failed to log in."})
            reject(err.message);
          });
      
          curl.perform();
        });
    }

    async VoteForTeam(interaction : discord.CommandInteraction, teamNumber : number, amount : number) : Promise<boolean> {
      let activeTeamsData = await this.GetActiveTeamsData();

      return new Promise<boolean>((resolve, reject) => {
          Logger.log(`Trying to vote for team number ${teamNumber} with \$${amount}`, MessageType.DEBUG);

          let curl = new Curl();
          let postUrl: string = `https://www.saltybet.com/ajax_place_bet.php`
          let selectedPlayerValue : string = teamNumber === 1 ? "player1" : "player2";
          const close = curl.close.bind(curl);
          

          curl.setOpt(Curl.option.URL, postUrl);
          curl.setOpt(Curl.option.POST, true)
          curl.setOpt(Curl.option.COOKIEFILE, this.GetCookieFileName(interaction));
          curl.setOpt(Curl.option.POSTFIELDS, querystring.stringify({
              selectedplayer : selectedPlayerValue,
              wager : amount,
          }));

          curl.on('end', function(statusCode, data, headers) {
            Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
            Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
            Logger.log(`Return headers: ${headers}`, MessageType.DEBUG);
            Logger.log(this.getInfo('TOTAL_TIME'), MessageType.DEBUG);
            
            interaction.reply({content: `Bet \$${amount} on ${selectedPlayerValue === 'player1' ? activeTeamsData?.p1name : activeTeamsData?.p2name}!`})
            
            this.close();
            resolve(true);
          });
      
          curl.on('error', (err) => {
            Logger.log(`Error: ${err.message}`, MessageType.ERROR);
            interaction.reply({content:"Failed to bet."});
            close();
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

    async GetCurrentDollarAmount(interaction : discord.CommandInteraction) : Promise<string> {
      return new Promise<string>((resolve, reject) => {
        let curl = new Curl();
        let requestUrl: string = `https://www.saltybet.com/`;
        curl.setOpt(Curl.option.URL, requestUrl);
        curl.setOpt(Curl.option.COOKIEFILE, this.GetCookieFileName(interaction));

        curl.on('end', function(statusCode, data, headers) {
          this.close();
          resolve(SaltyBetCommands.ExtractDollarBalanceFromHTML(data as string));
        });
    
        curl.on('error', (err) => {
          Logger.log(`Error: ${err.message}`, MessageType.ERROR);
          reject(err.message);
        });
    
        curl.perform();
      });      

    }

    async IsCookieValid(interaction : discord.CommandInteraction) : Promise<boolean> {
      return new Promise<boolean>((resolve, reject) => {
        let curl = new Curl();
        let requestUrl: string = `https://www.saltybet.com/ajax_get_rank.php`;

        curl.setOpt(Curl.option.URL, requestUrl);
        curl.setOpt(Curl.option.COOKIEFILE, this.GetCookieFileName(interaction));

        curl.on('end', function(statusCode, data, headers) {
          Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
          Logger.log(`Return payload: ${data as string}`, MessageType.DEBUG);
          
          if (statusCode !== 200) {
            Logger.log(`Received unexpected response code: ${statusCode}`, MessageType.WARNING);
            reject(`Received unexpected response code: ${statusCode}`);
          }
          
          SaltyBetCommands.PrintHeaders(headers as Array<HeaderInfo>);

          if (data) {
            this.close();
            resolve(true);
          } else {
            this.close();
            resolve(false);
          }
        });
    
        curl.on('error', (err) => {
          Logger.log(`Error: ${err.message}`, MessageType.ERROR);
          reject(err.message);
        });
    
        curl.perform();
      });    
    }

    public static PrintHeaders(headers : HeaderInfo[]) : void {
      headers.forEach(element => {
        Logger.log("----START HEADER----", MessageType.DEBUG);
        Logger.log(element.result?.version, MessageType.DEBUG);
        Logger.log(element.result?.reason, MessageType.DEBUG);
        Logger.log(element.result?.code, MessageType.DEBUG);
        Logger.log(element["Set-Cookie"], MessageType.DEBUG);
        Logger.log("-----END HEADER-----", MessageType.DEBUG);
      });
    }

    public static ExtractDollarBalanceFromHTML(data : string) : string {
      let moneyValue : string = "🤷‍♂️";
      let matchResults = data.match('class="dollar" id="balance">([0-9,]+)<\/span>');
      if (matchResults !== null)
        moneyValue = matchResults[1].replace(/,/g, '');
      
      return moneyValue;
    }

    GetCookieFileName(interaction : discord.CommandInteraction) : string {
        return `salty_cookies/${interaction.user.id}.txt`;
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