import { Message, SlashCommandBuilder, InteractionType, TextChannel } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import discord from "discord.js";

import { Curl, HeaderInfo } from "node-libcurl";
import querystring from "querystring";
import { EmbedBuilder } from "@discordjs/builders";

// Commands to mimic behavior of these curl commands
//  Get match data:               curl https://www.saltybet.com/state.json?t=1679211472638
//  Sign-in and store the cookie: curl --cookie-jar cookie.txt -d email={email} -d pword={password} -d authenticate=signin https://www.saltybet.com/authenticate?signin=1
//  Bet on a team:                curl --cookie cookie.txt -d selectedplayer=player1 -d wager=400 https://www.saltybet.com/ajax_place_bet.php

// Unused potentially useful curl requests
//  Get bet data (leaderboard):   curl https://www.saltybet.com/zdata.json?t=1679295371937"

export default class SaltyBetCommands extends ApccgSlashCommand {
    static serverChannelsToMessage: string[] = [];
    static lastRecordedStatus: string = "";

    public override getTitle(): string {
        return "Salty Bet Commands";
    }

    public override getDescription(): string {
        return `**/salty sign-in** _[email] [pass]_ -> Log-in to SaltyBet using your email and password                           
**/salty bet** _[team] [amount]_ -> Place a bet for a team or player.                                          
**/salty balance** -> Retrieve your current balance                                              
**/salty sign-out** -> Sign-out from SaltyBet (Removes sign-in cookie)                            
**/salty status** -> Fetch current match details, including current bet amounts and team names.`;
    }

    public override commandData(): any {
        return new SlashCommandBuilder()
            .setName("salty")
            .setDescription("Interact with SaltyBet")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("sign-in")
                    .setDescription("sign in to SaltyBet")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("email").setDescription("email for sign-in")
                    )
                    .addStringOption((input) =>
                        input.setRequired(true).setName("password").setDescription("password for sign-in")
                    )
            )
            .addSubcommand((subcommand) => subcommand.setName("sign-out").setDescription("sign out from SaltyBet"))
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("bet")
                    .setDescription("bet for a team")
                    .addNumberOption((input) =>
                        input
                            .setRequired(true)
                            .setName("teamnumber")
                            .setChoices({ name: "team 1", value: 1 }, { name: "team 2", value: 2 })
                            .setDescription("team to vote for")
                    )
                    .addNumberOption((input) =>
                        input.setRequired(true).setName("betamount").setDescription("amount to bet (-1 for all-in)")
                    )
            )
            .addSubcommand((subcommand) => subcommand.setName("balance").setDescription("get your current balance"))
            .addSubcommand((subcommand) =>
                subcommand.setName("status").setDescription("log SaltyBet match data to channel")
            );
    }

    public override async execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as discord.CommandInteraction;

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        let subcommandName: string = interaction.options.getSubcommand();

        switch (subcommandName) {
            case "sign-in":
                return await this.signIn(
                    interaction,
                    interaction.options.get("email")?.value as string,
                    interaction.options.get("password")?.value as string
                );
            case "sign-out":
                return await this.signOut(interaction);
            case "bet":
                return await this.voteForTeam(
                    interaction,
                    (interaction.options.get("teamnumber")?.value as number) ?? 1,
                    (interaction.options.get("betamount")?.value as number) ?? 0
                );
            case "balance":
                if (!(await this.isCookieValid(interaction))) {
                    interaction.reply("Not logged in or session expired. Please log in again with _/salty sign-in_");
                    return false;
                }
                interaction.reply(`You have \$${await this.getCurrentDollarAmount(interaction)}`);
                return true;
            case "status":
                await this.logCurrentMatchInfo(interaction);
                return true;
            default:
                Logger.log("Invalid subcommand run on /salty", MessageType.ERROR);
        }
        return true;
    }

    public override disabled(): boolean {
        return false;
    }

    private async logCurrentMatchInfo(interaction: discord.CommandInteraction): Promise<boolean> {
        let embed = await this.createEmbedForSaltyInfo();
        await interaction.reply({ embeds: [embed] });
        return true;
    }

    private async createEmbedForSaltyInfo(): Promise<discord.EmbedBuilder> {
        let activeTeamsData: ActiveTeamsData | null = await this.getActiveTeamsData();
        if (activeTeamsData === null) {
            Logger.log("Active teams data was null in CreateEmbedForSaltyInfo()", MessageType.DEBUG);
            return new EmbedBuilder().setTitle("BROKE");
        }

        let green = 0x478778;
        let blue = 0x6699cc;
        let grey = 0x818589;
        let error = 0xff00ff;

        let color;
        let modeStatus;
        switch (activeTeamsData?.status) {
            case "locked":
                color = blue;
                modeStatus = "betting closed";
                break;
            case "open":
                color = green;
                modeStatus = "betting open";
                break;
            case "2":
                color = grey;
                modeStatus = "match ended";
                break;
            default:
                color = error;
                break;
        }
        let ratioString: string =
            +activeTeamsData.p1total === 0 || +activeTeamsData.p2total === 0
                ? "N/A"
                : +activeTeamsData.p1total > +activeTeamsData.p2total
                ? `${(+activeTeamsData.p1total / +activeTeamsData.p2total).toFixed(2)} : 1`
                : `1 : ${(+activeTeamsData.p2total / +activeTeamsData.p1total).toFixed(2)}`;
        return (
            new EmbedBuilder()
                .setTitle("Match Info")
                .setColor(color)
                //.setDescription("")
                .setThumbnail("https://www.saltybet.com/images/ranksmall/rank13.png")
                .addFields(
                    {
                        name: "Stats",
                        value: `Odds: ${ratioString}\nStatus: ${modeStatus}`,
                    },
                    {
                        name: `${activeTeamsData?.p1name}`,
                        value: `\$${activeTeamsData.p1total}`,
                        inline: true,
                    },
                    { name: "\u200B", value: "\u200B", inline: true },
                    {
                        name: `${activeTeamsData?.p2name}`,
                        value: `\$${activeTeamsData.p2total}`,
                        inline: true,
                    },
                    { name: "\u200B", value: "\u200B", inline: false }
                )

                .setTimestamp()
                .setFooter({
                    text: `${activeTeamsData.remaining}`,
                    iconURL: "https://www.saltybet.com/images/SALTYBETheader3.png",
                })
        );
    }

    private async signOut(interaction: discord.CommandInteraction) {
        return new Promise<boolean>((resolve, reject) => {
            let curl = new Curl();
            let postUrl: string = `https://www.saltybet.com/authenticate?signin=1`;

            const close = curl.close.bind(curl);

            curl.setOpt(Curl.option.URL, postUrl);
            curl.setOpt(Curl.option.POST, true);
            curl.setOpt(
                Curl.option.POSTFIELDS,
                querystring.stringify({
                    email: "",
                    pword: "",
                    authenticate: "signin",
                })
            );

            curl.setOpt(Curl.option.COOKIEJAR, this.getCookieFileName(interaction));

            curl.on("end", function (statusCode, data, headers) {
                Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
                Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
                Logger.log(`Headers: ${headers}`, MessageType.DEBUG);
                Logger.log(this.getInfo("TOTAL_TIME"), MessageType.DEBUG);

                if (statusCode !== 302) {
                    Logger.log(`Received unexpected response code: ${statusCode}`, MessageType.WARNING);
                    reject(`Received unexpected response code: ${statusCode}`);
                    interaction.reply({
                        ephemeral: true,
                        content: "Failed to log out.",
                    });
                    return false;
                }

                interaction.reply({
                    ephemeral: true,
                    content: "Successfully logged out.",
                });
                this.close();
                resolve(true);
            });

            curl.on("error", (err) => {
                Logger.log(`Error: ${err.message}`, MessageType.ERROR);
                interaction.reply({
                    ephemeral: true,
                    content: "Failed to log out.",
                });
                close();
                reject(err.message);
            });

            curl.perform();
        });
    }

    private async signIn(
        interaction: discord.CommandInteraction,
        username: string,
        password: string
    ): Promise<boolean> {
        if (await this.isCookieValid(interaction)) {
            interaction.reply("Already signed in!");
            return true;
        }

        return new Promise<boolean>((resolve, reject) => {
            let curl = new Curl();
            let postUrl: string = `https://www.saltybet.com/authenticate?signin=1`;

            const close = curl.close.bind(curl);

            curl.setOpt(Curl.option.URL, postUrl);
            curl.setOpt(Curl.option.POST, true);
            curl.setOpt(
                Curl.option.POSTFIELDS,
                querystring.stringify({
                    email: username,
                    pword: password,
                    authenticate: "signin",
                })
            );

            curl.setOpt(Curl.option.COOKIEJAR, this.getCookieFileName(interaction));

            curl.on("end", function (statusCode, data, headers) {
                Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
                Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
                Logger.log(`Headers: ${headers}`, MessageType.DEBUG);
                Logger.log(this.getInfo("TOTAL_TIME"), MessageType.DEBUG);

                if (statusCode !== 302) {
                    Logger.log(`Received unexpected response code: ${statusCode}`, MessageType.WARNING);
                    reject(`Received unexpected response code: ${statusCode}`);
                    interaction.reply({
                        ephemeral: true,
                        content: "Failed to log in.",
                    });
                    return false;
                }

                interaction.reply({
                    ephemeral: true,
                    content: "Successfully logged in.",
                });
                this.close();
                resolve(true);
            });

            curl.on("error", (err) => {
                Logger.log(`Error: ${err.message}`, MessageType.ERROR);
                interaction.reply({
                    ephemeral: true,
                    content: "Failed to log in.",
                });
                close();
                reject(err.message);
            });

            curl.perform();
        });
    }

    async voteForTeam(interaction: discord.CommandInteraction, teamNumber: number, amount: number): Promise<boolean> {
        let activeTeamsData = await this.getActiveTeamsData();

        if (!(await this.isCookieValid(interaction))) {
            interaction.reply("Not logged in or session expired. Please log in again with _/salty sign-in_");
            return false;
        }

        let currentBalance: number = +(await this.getCurrentDollarAmount(interaction));

        return new Promise<boolean>((resolve, reject) => {
            Logger.log(`Trying to vote for team number ${teamNumber} with \$${amount}`, MessageType.DEBUG);

            let curl = new Curl();
            let postUrl: string = `https://www.saltybet.com/ajax_place_bet.php`;
            let selectedPlayerValue: string = teamNumber === 1 ? "player1" : "player2";
            const close = curl.close.bind(curl);

            if (currentBalance > amount || amount === -1) amount = currentBalance;

            curl.setOpt(Curl.option.URL, postUrl);
            curl.setOpt(Curl.option.POST, true);
            curl.setOpt(Curl.option.COOKIEFILE, this.getCookieFileName(interaction));
            curl.setOpt(
                Curl.option.POSTFIELDS,
                querystring.stringify({
                    selectedplayer: selectedPlayerValue,
                    wager: amount,
                })
            );

            curl.on("end", function (statusCode, data, headers) {
                Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
                Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
                SaltyBetCommands.printHeaders(headers as HeaderInfo[]);

                interaction.reply({
                    content: `Bet \$${amount} on ${
                        selectedPlayerValue === "player1" ? activeTeamsData?.p1name : activeTeamsData?.p2name
                    }!`,
                });

                this.close();
                resolve(true);
            });

            curl.on("error", (err) => {
                Logger.log(`Error: ${err.message}`, MessageType.ERROR);
                interaction.reply({ content: "Failed to place bet." });
                close();
                reject(err.message);
            });

            curl.perform();
        });
    }

    async getActiveTeamsData(): Promise<ActiveTeamsData | null> {
        return new Promise<ActiveTeamsData | null>((resolve, reject) => {
            let curl = new Curl();
            let requestUrl: string = `https://www.saltybet.com/state.json?t=${Date.now()}`;
            let result: ActiveTeamsData | null = null;

            curl.setOpt("URL", requestUrl);

            curl.on("end", function (statusCode, data, headers) {
                Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
                Logger.log(`Return payload: ${data}`, MessageType.DEBUG);
                Logger.log(this.getInfo("TOTAL_TIME"), MessageType.DEBUG);

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
                    parsedData.p1total.replace(/,/g, ""),
                    parsedData.p2total.replace(/,/g, ""),
                    parsedData.status,
                    parsedData.alert,
                    parsedData.x,
                    parsedData.remaining
                );

                this.close();
                resolve(result);
            });

            curl.on("error", (err) => {
                Logger.log(`Error: ${err.message}`, MessageType.ERROR);
                reject(err.message);
            });

            curl.perform();
        });
    }

    async getCurrentDollarAmount(interaction: discord.CommandInteraction): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let curl = new Curl();
            let requestUrl: string = `https://www.saltybet.com/`;
            curl.setOpt(Curl.option.URL, requestUrl);
            curl.setOpt(Curl.option.COOKIEFILE, this.getCookieFileName(interaction));

            curl.on("end", function (statusCode, data, headers) {
                this.close();
                resolve(SaltyBetCommands.extractDollarBalanceFromHTML(data as string));
            });

            curl.on("error", (err) => {
                Logger.log(`Error: ${err.message}`, MessageType.ERROR);
                reject(err.message);
            });

            curl.perform();
        });
    }

    async isCookieValid(interaction: discord.CommandInteraction): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let curl = new Curl();
            let requestUrl: string = `https://www.saltybet.com/ajax_get_rank.php`;

            curl.setOpt(Curl.option.URL, requestUrl);
            curl.setOpt(Curl.option.COOKIEFILE, this.getCookieFileName(interaction));

            curl.on("end", function (statusCode, data, headers) {
                Logger.log(`Status: ${statusCode}`, MessageType.DEBUG);
                Logger.log(`Return payload: ${data as string}`, MessageType.DEBUG);

                if (statusCode !== 200) {
                    Logger.log(`Received unexpected response code: ${statusCode}`, MessageType.WARNING);
                    reject(`Received unexpected response code: ${statusCode}`);
                }

                SaltyBetCommands.printHeaders(headers as Array<HeaderInfo>);

                if (data) {
                    this.close();
                    resolve(true);
                } else {
                    this.close();
                    resolve(false);
                }
            });

            curl.on("error", (err) => {
                Logger.log(`Error: ${err.message}`, MessageType.ERROR);
                reject(err.message);
            });

            curl.perform();
        });
    }

    public static printHeaders(headers: HeaderInfo[]): void {
        headers.forEach((element) => {
            Logger.log("----START HEADER----", MessageType.DEBUG);
            Logger.log(element.result?.version, MessageType.DEBUG);
            Logger.log(element.result?.reason, MessageType.DEBUG);
            Logger.log(element.result?.code, MessageType.DEBUG);
            Logger.log(element["Set-Cookie"], MessageType.DEBUG);
            Logger.log("-----END HEADER-----", MessageType.DEBUG);
        });
    }

    public static extractDollarBalanceFromHTML(data: string): string {
        let moneyValue: string = "🤷‍♂️";
        let matchResults = data.match('class="dollar" id="balance">([0-9,]+)</span>');
        if (matchResults !== null) moneyValue = matchResults[1].replace(/,/g, "");

        return moneyValue;
    }

    getCookieFileName(interaction: discord.CommandInteraction): string {
        return `salty_cookies/${interaction.user.id}.txt`;
    }
}

class ActiveTeamsData {
    constructor(
        p1name: string,
        p2name: string,
        p1total: string,
        p2total: string,
        status: string,
        alert: string,
        x: number,
        remaining: string
    ) {
        this.p1name = p1name;
        this.p2name = p2name;
        this.p1total = p1total;
        this.p2total = p2total;
        this.status = status;
        this.alert = alert;
        this.x = x;
        this.remaining = remaining;
    }

    public p1name: string;
    public p2name: string;
    public p1total: string;
    public p2total: string;
    public alert: string;
    public status: string;
    public x: number;
    public remaining: string;
}
