import { CommandInteraction, GuildMember, InteractionType, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import { AudioPlayer, NoSubscriberBehavior, VoiceConnection, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import ytdl from 'ytdl-core';
import { google } from 'googleapis';
import hmt from "../../hmt.json" assert { type: "json" };


export default class CommandRadio extends ApccgSlashCommand {
    public disabled(): boolean {
        return false;
    }

    public commandData(): any {
        return new SlashCommandBuilder()
            .setName("youtube")
            .setDescription("Interact with Youtube")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("play")
                    .setDescription("Join a channel and play the video specified")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("video_url").setDescription("URL of the video to play")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand.setName("stop").setDescription("Stop playing music and leave the channel")
            )
            .addSubcommand((subcommand) =>
                subcommand.setName("repeat").setDescription("Toggle repeat of current song")
                    .addStringOption(option => 
                        option.setName("repeat_option")
                        .setDescription("Repeat track or playlist")
                        .addChoices({name: "playlist", value: "playlist"}, {name: "track", value: "track"}, {name: "off", value: "off"})
                        .setRequired(true))
            )
            .addSubcommand((subcommand) =>
                subcommand.setName("queue").setDescription("View song queue")
            )
            .addSubcommand((subcommand) =>
                subcommand.setName("skip").setDescription("Skip to the next song in the queue")
                    .addIntegerOption((option) => 
                        option.setName("number_to_skip")
                            .setDescription("Number of songs to skip")
                            .setRequired(false))
            )
            .addSubcommand((subcommand) =>
                subcommand.setName("shuffle").setDescription("Shuffle all songs in the queue")
            );
    }

    
    public async execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as CommandInteraction;

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        let subcommandName: string = interaction.options.getSubcommand();

        switch (subcommandName) {
            case "play":
                return await this.queueSong(interaction);
            case "stop":
                return await this.leaveChannelAndStop(interaction);
            case "repeat":
                return this.toggleRepeatCurrentTrack(interaction);
            case "queue":
                return this.viewQueue(interaction);
            case "skip":
                return this.skipSong(interaction);
            case "shuffle":
                return this.shuffleQueue(interaction);
            default:
                Logger.log("Invalid subcommand run on /youtube", MessageType.ERROR);
        }

        return false;
    }

    public override getTitle(): string {
        return "Youtube";
    }

    public override getDescription(): string {
        return `**/youtube play** [video URL] -> Join a channel and play the URL specified
        **/youtube stop** -> Stop playing music leave the channel
        **/youtube repeat** -> Toggle repeat of current song`;
    }

    audioPlayer: AudioPlayer | null = null;
    connection: VoiceConnection | null = null;
    currentSongUrl: string | null = null;
    videoUrlListQueue: string[] = [];

    youtube = google.youtube({
        version: 'v3',
        auth: hmt.YOUTUBE_API_KEY,
    });

    private shuffleQueue(interaction: CommandInteraction) : boolean {
        let newQueue = [];

        while (this.videoUrlListQueue.length !== 0) {
            let randomIndex = Math.floor(Math.random() * 100) % this.videoUrlListQueue.length;
        
            newQueue.push(this.videoUrlListQueue.splice(randomIndex, 1)[0]);    
        }

        this.videoUrlListQueue = newQueue;


        let factorialChart = [
            1, 
            2, 
            6, 
            24, 
            120, 
            720, 
            5040, 
            40320, 
            362880, 
            3628800,
            39916800,
            479001600,
            6227020800,
            87178291200,
            1307674368000,
            20922789888000,
            355687428096000,
            6402373705728000,
            121645100408832000n,
            2432902008176640000n
        ]

        if (this.videoUrlListQueue.length <= 20) {
            interaction.reply(`Picked the *definitive* best order for your playlist out of ${factorialChart[this.videoUrlListQueue.length - 1]} possiblities!`);
        }
        else {
            interaction.reply(`Picked the definitive best order for your playlist out of`);
            interaction.channel!.send("# NEAR INFINITE");
            interaction.channel!.send("possiblities!");
        }

        return true;
    }

    private skipSong(interaction: CommandInteraction) : boolean {
    
        this.repeatMode = "none";

        let skipNumber = interaction.options.get("number_to_skip")?.value as number ?? 1;

        while (skipNumber > 1) {
            this.videoUrlListQueue.shift();
            skipNumber--;
        }

        interaction.reply("Well I thought it was a good song UwU");

        this.playNextSong(interaction);

        return true;
    }

    repeatMode : "track" | "none" | "playlist" = "none";


    private toggleRepeatCurrentTrack(interaction: CommandInteraction) : boolean {

        let repeatOption = interaction.options.get("repeat_option")?.value as string;

        if (repeatOption === "none") {
            this.repeatMode = "none";
        }
        else if (repeatOption === "track") {
            this.repeatMode = "track";
        }
        else if (repeatOption === "playlist") {
            this.repeatMode = "playlist";
        }
        else {
            this.repeatMode = "none";
        }



        if (this.repeatMode === "track") {
            interaction.reply("Repeating current track!");
        }
        else if (this.repeatMode === "playlist") {
            interaction.reply("Repeating current playlist");
        }
        else {
            interaction.reply("I am repeat you off :pensive:");
        }

        return true;
    }


    private convertIsoDurationToSeconds(isoDuration : string) : number {
        let totalSeconds = 0;
        let hours = isoDuration.match(/(\d+)H/);
        let minutes = isoDuration.match(/(\d+)M/);
        let seconds = isoDuration.match(/(\d+)S/);
    
        if (hours) totalSeconds += parseInt(hours[1]) * 3600;
        if (minutes) totalSeconds += parseInt(minutes[1]) * 60;
        if (seconds) totalSeconds += parseInt(seconds[1]);
    
        return totalSeconds;
    }

    private async getPlaylistVideos(playlistId: string, nextPageToken = '', videoUrls: string[] = []): Promise<string[]> {
        try {
          const response = await this.youtube.playlistItems.list({
            part: ['snippet,contentDetails'],
            playlistId: playlistId,
            maxResults: 50, // Max allowed by the API
            pageToken: nextPageToken,
          });

          if (response === undefined) {
            return [];
          }
      
          response.data.items!.forEach(item => {
            const videoId = item.snippet!.resourceId!.videoId;
            const video = response!.data!.items![0];
            const title = video.snippet!.title;
            const channelName = video.snippet!.channelTitle;
            const durationSeconds = this.convertIsoDurationToSeconds(video.contentDetails!.endAt ?? "") - this.convertIsoDurationToSeconds(video.contentDetails!.startAt ?? "");

            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            videoUrls.push(videoUrl);
          });
      
          if (response.data.nextPageToken) {
            return this.getPlaylistVideos(playlistId, response.data.nextPageToken, videoUrls);
          } else {
            return videoUrls;
          }
        } catch (error) {
          console.error('Error fetching playlist videos:', error);
          return [];
        }
      }

    private viewQueue(interaction: CommandInteraction): boolean {
        interaction.reply("...");
        return true;
    }

    private playNextSong(interaction: CommandInteraction): void {
        if (this.repeatMode === "track" && this.currentSongUrl !== null) {

            const stream = ytdl(this.currentSongUrl, { filter: 'audioonly' });
            const resource = createAudioResource(stream);

            this.audioPlayer!.play(resource);
            interaction.channel!.send(`Playing **${this.currentSongUrl}**`);
            
            return;
        }

        if (this.videoUrlListQueue.length > 0) {
            const videoUrl = this.videoUrlListQueue.shift();
            

            if (videoUrl === undefined || this.audioPlayer === null) {
                return;
            }

            if (this.repeatMode === "playlist") {
                this.videoUrlListQueue.push(videoUrl);
            }


            this.currentSongUrl = videoUrl;

            const stream = ytdl(videoUrl, { filter: 'audioonly' });
            const resource = createAudioResource(stream);

            this.audioPlayer.play(resource);
            interaction.channel!.send(`Playing **${videoUrl}**`);
        } else {
            Logger.log("No more songs in the queue.", MessageType.DEBUG);
            this.leaveChannelAndStop(interaction);
        }
    }

    private joinChannelAndRegisterHooks(interaction: CommandInteraction) {
        if ((interaction.member! as GuildMember).voice.channel !== null) {
            Logger.log(`Joining channel and playing tunes.`, MessageType.DEBUG);

            this.connection = joinVoiceChannel({
                channelId: (interaction.member! as GuildMember).voice.channel!.id,
                guildId: interaction.guild!.id,
                adapterCreator: interaction.guild!.voiceAdapterCreator,
            });

            this.audioPlayer = new AudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                },
            });
            this.audioPlayer.on("error", (error) => {
                Logger.log(`Audio Error: ${error.message}`, MessageType.ERROR);
            });

            this.audioPlayer.on("stateChange", (oldState, newState) => {
                Logger.log(
                    `Audio player transitioned from ${oldState.status} to ${newState.status}`,
                    MessageType.DEBUG
                );

                if (newState.status === "idle") {
                    Logger.log("Starting next song.", MessageType.DEBUG);
                    this.playNextSong(interaction);
                }
            });

            this.audioPlayer.on("debug", (message) => {
                Logger.log(`Debug message from audio player:`, MessageType.DEBUG);
                Logger.log(message, MessageType.DEBUG);
            });

            this.connection.subscribe(this.audioPlayer);
            this.playNextSong(interaction);
            return true;
        } else {
            interaction.reply("Where exactly should I play those sick tunes HMMM?");
        }
    }

    private async queueSong(interaction: CommandInteraction): Promise<boolean> {
        const videoUrl = interaction.options.get("video_url")?.value;
        if (typeof videoUrl !== 'string') {
            interaction.reply("That is certainly not the URL of the video!");
            return false;
        }

        if (this.videoUrlListQueue.length === 0) {
            interaction.reply(`:laughing:`);
        }
        else {
            interaction.reply(`:pleading_face:`)
        }

        if (videoUrl.includes("&list=")) { // For indirect playlist links like https://www.youtube.com/watch?v=DN0RLQZ9b1k&list=iUtyHuSfghTlyp-udhwidadoPWOIDHAO&index=1
            let playlistId: string = "";
            videoUrl.split("&").forEach((substring) => {
                if (substring.includes("list=")) {
                    playlistId = substring.split("=")[1];
                }
            })

            if (playlistId === "") {
                interaction.channel!.send("Failed to parse playlist :c");
                return false;
            }

            Logger.log(`Fetching playlist data for list with identifier ${playlistId}`)
            this.videoUrlListQueue.push(...(await this.getPlaylistVideos(playlistId)));
        }
        else if (videoUrl.includes("playlist")) { // For direct playlist links like https://www.youtube.com/playlist?list=iUtyHuSfghTlyp-udhwidadoPWOIDHAO
            let playlistId: string = videoUrl.split("?")[1].split("=")[1];

            if (playlistId === "") {
                interaction.channel!.send("Failed to parse playlist :c");
                return false;
            }

            Logger.log(`Fetching playlist data for list with identifier ${playlistId}`)
            this.videoUrlListQueue.push(...(await this.getPlaylistVideos(playlistId)));
        }
        else {
            this.videoUrlListQueue.push(videoUrl);
        }

        if (this.connection !== null) {
            return true;
        }

        this.joinChannelAndRegisterHooks(interaction);

        return true;
    }

    private async leaveChannelAndStop(interaction: CommandInteraction): Promise<boolean> {
        const guildId = interaction.guild!.id;
        if (!guildId) {
            return false;
        }

        const connection = getVoiceConnection(guildId);

        if (connection) {
            if (interaction.replied) {
                interaction.channel!.send("My good did that smell god");
            }
            else {
                interaction.reply("My god did that smell good");
            }
            connection.disconnect();
            this.connection = null;
            this.audioPlayer = null;
            this.currentSongUrl = null;
            this.videoUrlListQueue = [];

        } else {
            interaction.reply("LET ME IN");
        }

        return true;
    }
}
