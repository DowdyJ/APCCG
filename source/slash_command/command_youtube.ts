import { CommandInteraction, GuildMember, InteractionType, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import { AudioPlayer, NoSubscriberBehavior, VoiceConnection, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import ytdl from 'ytdl-core';



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

    shouldRepeatCurrentTrack : boolean = false;

    private toggleRepeatCurrentTrack(interaction: CommandInteraction) : boolean {
        this.shouldRepeatCurrentTrack = !this.shouldRepeatCurrentTrack;

        if (this.shouldRepeatCurrentTrack) {
            interaction.reply("Repeating current track!");
        }
        else {
            interaction.reply("I am repeat you off :pensive:")
        }

        return true;
    }


    private playNextSong(interaction: CommandInteraction): void {
        if (this.shouldRepeatCurrentTrack && this.currentSongUrl !== null) {

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

            this.currentSongUrl = videoUrl;

            const stream = ytdl(videoUrl, { filter: 'audioonly' });
            const resource = createAudioResource(stream);

            this.audioPlayer.play(resource);
            interaction.channel!.send(`Playing **${videoUrl}**`);
        } else {
            Logger.log("No more songs in the queue.", MessageType.DEBUG);
            interaction.channel!.send("I am SO DONE");
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

        this.videoUrlListQueue.push(videoUrl);

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
            interaction.reply("My god did that smell good");
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
