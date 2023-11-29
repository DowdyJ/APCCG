import { CommandInteraction, GuildMember, InteractionType, SlashCommandBuilder } from "discord.js";
import discord from 'discord.js'
import ApccgSlashCommand from "./apccg_slash_command.js"
import { Logger, MessageType } from "../logger.js";
import { AudioPlayer, NoSubscriberBehavior, StreamType, VoiceConnection, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";


export default class CommandHello extends ApccgSlashCommand {
    public Disabled(): boolean {
        return false;
    }
    
    public CommandData(): any {
        return new SlashCommandBuilder()
        .setName("listenmoe")
        .setDescription("Interact with Listen.moe")
        .addSubcommand(subcommand => 
            subcommand
              .setName("play")
              .setDescription("Join a channel and play the stream specified")
              .addNumberOption(numberOption => numberOption
                .setName("audio_stream")
                .setDescription("Choose a stream to play")
                .setChoices({name: "J-Pop", value: 1}, {name: "K-Pop", value: 2})
                .setRequired(true))
              )
        .addSubcommand(subcommand => 
            subcommand
                .setName("stop")
                .setDescription("Stop playing music and leave the channel")
              );
    }

    public async Execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as discord.CommandInteraction;

      // Filters down command type so that getSubcommand() will work
      if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) 
        return false;

      let subcommandName : string = interaction.options.getSubcommand();

      switch (subcommandName) {
        case 'play':
          return await this.JoinChannelAndPlay(interaction);
        case 'stop':
          return await this.LeaveChannelAndStop(interaction);
        default:
          Logger.log("Invalid subcommand run on /listenmoe", MessageType.ERROR);
      }
      
      return false;
    }

    public override GetTitle(): string {
        return "Listen Moe";
    }

    public override GetDescription(): string {
        return `**/listenmoe play** [music stream option] -> Join a channel and play the stream specified
        **/listenmoe stop** -> Stop playing music leave the channel`
    }

    audioPlayer: AudioPlayer | null = null;
    connection: VoiceConnection | null = null; 

    private async JoinChannelAndPlay(interaction : CommandInteraction) : Promise<boolean> {
        let streamNumber = interaction.options.get("audio_stream")?.value as number ?? 1;
        let streamLink : string;

        if (streamNumber === 1) {
          streamLink = "https://listen.moe/fallback";  
          //streamLink = "https://listen.moe/opus";
        }
        else if (streamNumber === 2) {
            streamLink = "https://listen.moe/kpop/opus";
        }
        else {
            Logger.log("Bad stream number in listenmoe join.", MessageType.ERROR);
            // Default to J-Pop stream
            streamLink = "https://listen.moe/opus";
        }

        Logger.log(`Playing streamlink: ${streamLink}`, MessageType.DEBUG);

        if ((interaction.member! as GuildMember).voice.channel !== null) {
          Logger.log(`Joining channel and playing tunes.`, MessageType.DEBUG);

          this.connection = joinVoiceChannel({
            channelId: (interaction.member! as GuildMember).voice.channel!.id,
            guildId: interaction.guild!.id,
            adapterCreator: interaction.guild!.voiceAdapterCreator,
            }
          );

          this.audioPlayer = new AudioPlayer({
            behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
          }
        });
          this.audioPlayer.on('error', error => {
              console.error(`Audio Error: ${error.message}`);
          });
          
          this.audioPlayer.on('stateChange', (oldState, newState) => {
              console.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
          });
          
          this.audioPlayer.on('debug', message => {
              console.log(`Debug message from audio player:`);
              console.log(message);
          });

          const resource = createAudioResource(streamLink);

          this.connection.subscribe(this.audioPlayer);
          this.audioPlayer.play(resource);

          
          interaction.reply("This cosmic dance of bursting decadence and withheld permissions twists all our arms collectively, but if sweetness can win, and it can, then I’ll still be here tomorrow to high-five you yesterday, my friend. Peace.");
          return true;
        }
        else {
          interaction.reply("Where should I play those sick tunes HMMM?");
        }
        
        return false;
    }

    private async LeaveChannelAndStop(interaction: CommandInteraction) : Promise<boolean> {

      const guildId = interaction.guild!.id;
      if (!guildId) {
        return false;
      }
      
      const connection = getVoiceConnection(guildId);

      if (connection) {
          interaction.reply('My god did that smell good');
          connection.disconnect();
      } else {
          interaction.reply('LET ME IN');
      }

      return false;
    }



}