import { EmbedBuilder, InteractionType, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import {
    AudioPlayer,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
} from "@discordjs/voice";
import Database from "../database.js";
import settings from "../../settings.json" with { type: "json" };

export default class CommandRadio extends ApccgSlashCommand {
    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder()
            .setName("radio")
            .setDescription("Play internet radio")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("play")
                    .setDescription("Join a channel and play the stream specified")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("stream_name").setDescription("name of the stream to play")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand.setName("stop").setDescription("Stop playing music and leave the channel")
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("remove")
                    .setDescription("Remove a stream from the list")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("stream_name").setDescription("name of the stream to remove")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("add")
                    .setDescription("Add a stream to the list")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("stream_name").setDescription("name of the stream to add")
                    )
                    .addStringOption((input) =>
                        input.setRequired(true).setName("stream_url").setDescription("URL of the stream to add")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand.setName("list").setDescription("Show list of all radio stations")
            );
    }

    async execute(args) {
        const interaction = args[0];

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        let subcommandName = interaction.options.getSubcommand();

        switch (subcommandName) {
            case "play":
                return await this.JoinChannelAndPlay(interaction);
            case "stop":
                return await this.leaveChannelAndStop(interaction);
            case "add":
                return await this.addRadioToDatabase(interaction);
            case "remove":
                return await this.removeRadioFromDatabase(interaction);
            case "list":
                return await this.listAvailableRadio(interaction);
            default:
                Logger.log("Invalid subcommand run on /radio", MessageType.ERROR);
        }

        return false;
    }

    getTitle() {
        return "Radio";
    }

    getDescription() {
        return `**/radio play** [radio name] -> Join a channel and play the stream specified
        **/radio stop** -> Stop playing music leave the channel
        **/radio list** -> Lists available radio stations
        **/radio add** [radio name] [radio stream url]-> Add a radio stream
        **/radio remove** [radio name] -> Delete radio entry from list`;
    }

    audioPlayerToChannelMap = {};
    connectionToChannelMap = {};
    lastStreamToChannelMap = {};

    getAudioPlayer(interaction) {
        if (interaction.guildId && interaction.guildId in this.audioPlayerToChannelMap) {
            return this.audioPlayerToChannelMap[interaction.guildId];
        }
        return null;
    }

    setAudioPlayer(interaction, audioPlayer) {
        if (interaction.guildId === null) return;
        if (audioPlayer === null) {
            delete this.audioPlayerToChannelMap[interaction.guildId];
            return;
        }
        this.audioPlayerToChannelMap[interaction.guildId] = audioPlayer;
    }

    getConnection(interaction) {
        if (interaction.guildId && interaction.guildId in this.connectionToChannelMap) {
            return this.connectionToChannelMap[interaction.guildId];
        }
        return null;
    }

    setConnection(interaction, connection) {
        if (interaction.guildId === null) return;
        if (connection === null) {
            delete this.connectionToChannelMap[interaction.guildId];
            return;
        }
        this.connectionToChannelMap[interaction.guildId] = connection;
    }

    getLastStream(interaction) {
        if (interaction.guildId && interaction.guildId in this.lastStreamToChannelMap) {
            return this.lastStreamToChannelMap[interaction.guildId];
        }
        return null;
    }

    setLastStream(interaction, lastStream) {
        if (interaction.guildId === null) return;
        if (lastStream === null) {
            delete this.lastStreamToChannelMap[interaction.guildId];
            return;
        }
        this.lastStreamToChannelMap[interaction.guildId] = lastStream;
    }

    async listAvailableRadio(interaction) {
        const databaseResult = await Database.instance().getAllRadioStations();

        if (databaseResult == null) {
            interaction.reply("The day the music died (today) :weary:");
            return false;
        }

        let radioNames = "";
        let radioUrls = "";

        for (const obj of databaseResult) {
            radioNames += obj.radio_name + "\n";
            radioUrls += obj.radio_stream_link + "\n";
        }

        if (radioNames === "") {
            radioNames = "-";
        }

        if (radioUrls === "") {
            radioUrls = "-";
        }

        const embed = new EmbedBuilder()
            .setTitle("Radio Stations")
            .setColor("#FFFFFF")
            .setTimestamp()
            .addFields(
                { name: "Radio Name", value: radioNames, inline: true },
                { name: "Radio URL", value: radioUrls, inline: true }
            );

        interaction.reply({ embeds: [embed] });
        return true;
    }

    async removeRadioFromDatabase(interaction) {
        const streamName = interaction.options.get("stream_name")?.value;
        if (streamName == null || typeof streamName !== "string") return false;

        let success = await Database.instance().removeRadioStation(streamName);
        if (success) interaction.reply("Successfully removed the radio, if it existed.");
        else interaction.reply("Failed to remove entry.");

        return success;
    }

    async addRadioToDatabase(interaction) {
        const streamName = interaction.options.get("stream_name")?.value;
        const streamUrl = interaction.options.get("stream_url")?.value;

        if (typeof streamName !== "string" || typeof streamUrl !== "string") return false;

        let success = await Database.instance().addRadioStation(streamName, streamUrl);

        if (success) interaction.reply(`Added ${streamUrl} as ${streamName}`);
        else interaction.reply(`Failed to add ${streamName}`);

        return success;
    }

    async JoinChannelAndPlay(interaction) {
        const streamName = interaction.options.get("stream_name")?.value;
        if (typeof streamName !== 'string') {
            interaction.reply("That is certainly not the name of the station!");
            return false;
        }

        let streamLink = await Database.instance().getRadioStationUrlByName(streamName);

        if (streamLink == null) {
            interaction.reply("No such number bozo");
            return false;
        }

        if (interaction.member.voice.channel === null) {
            interaction.reply("Where exactly should I play those sick tunes HMMM?");
            return false;
        }

        await interaction.deferReply();

        this.setLastStream(interaction, streamLink);
        const resource = createAudioResource(streamLink);

        Logger.log(`Playing streamlink: ${streamLink}`, MessageType.DEBUG);
        Logger.log(`Joining channel and playing tunes.`, MessageType.DEBUG);

        const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            debug: true,
        });
        this.setConnection(interaction, connection);

        connection.on("stateChange", (oldState, newState) => {
            Logger.log(
                `Voice connection transitioned from ${oldState.status} to ${newState.status}`,
                MessageType.DEBUG
            );

            // Covers external disconnects too (kicked from the channel, connection dropped, etc.),
            // not just /radio stop - otherwise stale state lingers here until a later /radio play
            // happens to overwrite it. Guarded so a stale listener from an old connection can't
            // clobber a newer connection's state for the same guild.
            if (
                (newState.status === VoiceConnectionStatus.Disconnected ||
                    newState.status === VoiceConnectionStatus.Destroyed) &&
                this.getConnection(interaction) === connection
            ) {
                Logger.log(
                    `Voice connection for guild ${interaction.guild.id} ended (${newState.status}) - clearing stored state.`,
                    MessageType.WARNING
                );
                this.setConnection(interaction, null);
                this.setAudioPlayer(interaction, null);
                this.setLastStream(interaction, null);
            }

            // @discordjs/voice never surfaces the raw websocket close code through its own
            // debug/error events, so we tap the internal networking object directly to get it.
            if (newState.status === "connecting" && newState.networking) {
                newState.networking.on("close", (code) => {
                    Logger.log(`Voice networking websocket closed with code ${code}`, MessageType.WARNING);
                });
            }
        });

        connection.on("error", (error) => {
            Logger.log(`Voice connection error: ${error.message}`, MessageType.ERROR);
        });

        connection.on("debug", (message) => {
            Logger.log(`Voice connection debug: ${message}`, MessageType.VERBOSE);
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        } catch (err) {
            Logger.log(`Voice connection never became ready: ${err.message}`, MessageType.ERROR);
            try {
                connection.destroy();
            } catch (destroyErr) {
                Logger.log(`Error destroying voice connection: ${destroyErr.message}`, MessageType.WARNING);
            }
            this.setConnection(interaction, null);
            await interaction.editReply("Couldn't connect to the voice channel - the connection never became ready.");
            return false;
        }

        const audioPlayer = new AudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        this.setAudioPlayer(interaction, audioPlayer);

        audioPlayer.on("error", (error) => {
            Logger.log(`Audio Error: ${error.message}`, MessageType.ERROR);
        });

        audioPlayer.on("stateChange", (oldState, newState) => {
            Logger.log(
                `Audio player transitioned from ${oldState.status} to ${newState.status}`,
                MessageType.DEBUG
            );
            if (newState.status === "idle") {
                Logger.log("Restarting audio stream.", MessageType.DEBUG);
                this.attemptToRestartAudio(interaction);
            }
        });

        audioPlayer.on("debug", (message) => {
            Logger.log(`Debug message from audio player:`, MessageType.VERBOSE);
            Logger.log(message, MessageType.VERBOSE);
        });

        connection.subscribe(audioPlayer);
        audioPlayer.play(resource);

        // Temporary diagnostic: DAVE's MLS handshake finishes asynchronously after the connection
        // reaches Ready, so this checks whether the encryption session actually becomes usable
        // around the time we start sending audio, rather than assuming "Transition executed" means it did.
        // Only runs at all when VERBOSE_LOGGING is on, since it's otherwise a pointless timer.
        if (settings.VERBOSE_LOGGING) {
            let daveChecks = 0;
            const daveCheckInterval = setInterval(() => {
                daveChecks++;
                const dave = connection.state?.dave;
                Logger.log(
                    `DAVE check ${daveChecks}: connection status=${connection.state?.status}, dave.session.ready=${dave?.session?.ready}, protocolVersion=${dave?.protocolVersion}`,
                    MessageType.VERBOSE
                );
                if (daveChecks >= 10 || connection.state?.status !== VoiceConnectionStatus.Ready) {
                    clearInterval(daveCheckInterval);
                }
            }, 1000);
        }

        await interaction.editReply(`Playing **${streamName}**`);
        return true;
    }

    attemptToRestartAudio(interaction) {
        const lastStream = this.getLastStream(interaction);
        if (lastStream == null) return;

        const resource = createAudioResource(lastStream);
        this.getAudioPlayer(interaction)?.play(resource);
    }

    async leaveChannelAndStop(interaction) {
        const guildId = interaction.guild.id;
        if (!guildId) {
            return false;
        }

        const connection = getVoiceConnection(guildId);

        if (connection) {
            try {
                connection.destroy();
            } catch (err) {
                Logger.log(`Error destroying voice connection: ${err.message}`, MessageType.WARNING);
            }
            this.setConnection(interaction, null);
            this.setAudioPlayer(interaction, null);
            this.setLastStream(interaction, null);
            interaction.reply("My god did that smell good");
        } else {
            interaction.reply("LET ME IN");
        }

        return false;
    }
}
