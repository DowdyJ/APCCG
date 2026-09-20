import { CustomClient } from "../customclient.js";
import Database from "../database.js";
import { Logger, MessageType } from "../logger.js";
import ApccgIntervalCommand from "./apccg_interval_command.js";
import { InteractionType, SlashCommandBuilder } from "discord.js";


export default class CommandPurgeKarutaSpam extends ApccgIntervalCommand {
    lastRepeatEpoch = 0;
    repeatIntervalSeconds = 60;
    minMessageAgeToDeleteSeconds = 300;
    // must be less than or equal to 100
    messagesToLookBackOnLimit = 100;
    currentlyDisabled = false;

    commandData() {
        return new SlashCommandBuilder()
            .setName("kpurge")
            .setDescription("Control the auto-pruning of messages from and invoking Karuta")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("register")
                    .setDescription("Register this channel to be purged")
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("unregister")
                    .setDescription("Remove this channel from the list of channels to be purged")
            )
            .addSubcommand((subcommand) =>
            subcommand
                .setName("force_delete")
                .setDescription("Remove messages around a certain message id")
                .addStringOption((input)=>
                    input.setName("messageid").setDescription("Id of message to center deletion around").setRequired(true)
                )
        );
    }

    execute(args) {
        const interaction = args[0];

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand())
            return new Promise(() => false);

        let subcommandName = interaction.options.getSubcommand();
        switch (subcommandName) {
            case "register":
                return this.addChannelToDatabase(interaction);
            case "unregister":
                return this.removeChannelFromDatabase(interaction);
            case "force_delete":
                return this.deleteMessagesAround(interaction);
            default:
                Logger.log("Invalid subcommand run on /kpurge", MessageType.ERROR);
        }

        return new Promise(() => false);
    }

    getInterval() {
        return this.repeatIntervalSeconds;
    }

    executeInterval() {
        this.lastRepeatEpoch = Date.now() / 1000;

        try {
            Database.instance().getAllChannelsToKPurge().then((registeredChannels) => {
                if (registeredChannels === null) {
                    return;
                }

                for (const channelIdRow of registeredChannels) {
                    CustomClient.instance().channels.fetch(channelIdRow.channel_id).then((channel) => {
                        if (channel === null || !channel.isTextBased()) {
                            return;
                        }

                        channel.messages.fetch({ limit: this.messagesToLookBackOnLimit, cache: false}).then((messages) => {
                            for (const message of messages.values()) {
                                this.shouldDeleteMessage(message).then(shouldDelete => {
                                    if (shouldDelete) {
                                        message.delete().catch((err)=>{ /*✍️ ( ῟ᾥ῏ )✍️*/ });
                                    }
                                }).catch((err)=>{ /*ᕙ꒰  ˙꒳​˙   ꒱ᕗ */ });
                            }
                        });
                    }).catch((err) => {});
                }

                return new Promise(() => true);
            });
        }
        catch (err) {
            Logger.log("Error encountered when deleting kspam")
        }

        return new Promise(() => false);
    }

    disabled() {
        return this.currentlyDisabled;
    }

    getTitle() {
        return "Wipe KSpam";
    }

    getDescription() {
        return `**/register** -> Register channel to be purged
        **/unregister** -> Unregister channel from the purge list
        **/force_delete** -> Delete messages around a given message id
        Triggers every ${this.repeatIntervalSeconds} seconds. Deletes all messages invoking karuta or from karuta that are older than ${this.minMessageAgeToDeleteSeconds} seconds`;
    }

    shouldRepeatNow() {
        if (Date.now() / 1000 - this.lastRepeatEpoch < this.repeatIntervalSeconds) {
            return new Promise(() => false);
        }

        return new Promise(() => true);
    }

    async shouldDeleteMessage(message) {
        const karutaId = '646937666251915264';
        const mantaroId = '213466096718708737';

        if (Math.abs(message.createdTimestamp - Date.now())/1000 < this.minMessageAgeToDeleteSeconds) {
            return false;
        }

        if (message.author.id === karutaId) {
            return true;
        }

        const messageContent = message.cleanContent;
        /* Purgable karuta text commands from users */
        if ((messageContent.startsWith('k') || messageContent.startsWith('K')) && messageContent.length < 30) {
            return true;
        }

        if (message.author.id === mantaroId && messageContent.match(/-https:\/\/(twitter|x).com/g)) {
            return true;
        }
    }

    async addChannelToDatabase(interaction) {
        const channelId = interaction.channel?.id;
        if (channelId === null || channelId === undefined) {
            return new Promise(() => false);
        }

        const success = await Database.instance().addChannelToKPurge(channelId);

        if (success) {
            interaction.reply("Added the channel to the naughty list");
        }
        else {
            interaction.reply("He's already dead boss");
        }

        return new Promise((resolve) => {success});
    }

    async deleteMessagesAround(interaction) {
        if (interaction.channel === null) {
            interaction.reply("Where ARE you?");
            return new Promise((resolve) => {false});
        }

        const aroundMessageId = interaction.options.get("messageid")?.value;

        interaction.channel.messages.fetch({ limit: this.messagesToLookBackOnLimit, around: aroundMessageId, cache: false}).then((messages) => {
            for (const message of messages.values()) {
                this.shouldDeleteMessage(message).then(shouldDelete => {
                    if (shouldDelete) {
                        message.delete().catch((err)=>{ /*✍️ ( ῟ᾥ῏ )✍️*/ });
                    }
                }).catch((err)=>{ /*ᕙ꒰  ˙꒳​˙   ꒱ᕗ */ });
            }
        });

        interaction.reply(`Attempting to delete messages around ${aroundMessageId}`).then((interactionResponse) => {setTimeout(()=>{interactionResponse.delete()}, 5000)});

        return new Promise((resolve) => {true});
    }

    async removeChannelFromDatabase(interaction) {
        const channelId = interaction.channel?.id;
        if (channelId === null || channelId === undefined) {
            return new Promise(() => false);
        }

        const success = await Database.instance().removeChannelToKPurge(channelId);

        if (success) {
            interaction.reply("The turkey has been pardoned");
        }
        else {
            interaction.reply("Wow, that went worse than I thought possible");
        }

        return new Promise((resolve) => {success});
    }
}
