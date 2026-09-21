import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    InteractionType,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    escapeMarkdown,
} from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import fs from "fs";
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import path from "path";
import Database from "../database.js";

// Discord select menus cap out at 25 options, so the full command list is split into
// batches of this size; Previous/Next buttons page between batches independently of
// which entry is currently selected in the dropdown.
const CUSTOM_LIST_BATCH_SIZE = 25;
const CUSTOM_LIST_COLLECTOR_TIMEOUT_MS = 120_000;
const CUSTOM_LIST_TEXT_PREVIEW_MAX_LENGTH = 1500;
const CUSTOM_LIST_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];
const CUSTOM_LIST_AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "flac", "m4a"];

export default class CommandCustom extends ApccgSlashCommand {
    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder().setName("custom").setDescription("interact with custom commands")
            .addSubcommand(
                (input) => input
                .setName("add")
                .setDescription("Add a new custom command")
                .addStringOption(
                    (commandName) => commandName
                    .setName("command_name")
                    .setDescription("The name of the command to add")
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(20))
                .addStringOption(
                    (commandName) => commandName
                    .setName("command_text")
                    .setDescription("Text for the command to respond with")
                    .setRequired(false))
                .addAttachmentOption(
                    (commandName) => commandName
                    .setName("command_attachment")
                    .setDescription("Attachment for the command to respond with")
                    .setRequired(false))
        )
        .addSubcommand(
            (input) => input
            .setName("remove")
            .setDescription("Remove an existing custom command")
            .addStringOption(
                (commandName) => commandName
                .setName("command_name")
                .setDescription("The name of the command to add")
                .setRequired(true))
        )
        .addSubcommand(
            (input) => input
            .setName("list")
            .setDescription("List all existing custom commands")
        )
        .addSubcommand(
            (input) => input
            .setName("invoke")
            .setDescription("invoke an existing custom command")
            .addStringOption(
                (commandName) => commandName
                .setName("command_name")
                .setDescription("The name of the command to add")
                .setRequired(true))
        )

    }

    async execute(args) {
        const interaction = args[0];

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        const subcommandName = interaction.options.getSubcommand();

        switch (subcommandName) {
            case "add":
                return await this.addNewCommand(interaction);
            case "remove":
                return await this.removeCommand(interaction);
            case "list":
                return await this.listAllCommands(interaction);
            case "invoke":
                return await this.invokeCommand(interaction);
            default:
                Logger.log("Invalid subcommand run on /custom", MessageType.ERROR);
        }

        return false;
    }

    getTitle() {
        return "Custom";
    }

    getDescription() {
        return `**/custom invoke** [command name] -> Use an existing custom command
        **/custom add** [command name] [response]-> Add a new command
        **/custom list** -> List all registered commands and preview what they output
        **/custom remove** [command name] -> Remove an existing command
        `;
    }

    async addNewCommand(interaction) {
        const downloadFile = (async (url, fileName) => {
            const res = await fetch(url);
            const destination = path.resolve("./data/attachments", fileName);
            const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
            await finished(Readable.fromWeb(res.body).pipe(fileStream));
        });

        const addCommandToDatabase = (async (commandData) => {
            if (commandData == null || commandData.commandName == null) {
                return false;
            }

            return Database.instance().addCustomCommand(commandData.commandName, commandData.commandText, commandData.attachmentPath);
        });

        const commandName = interaction.options.getString("command_name");
        const attachment = interaction.options.getAttachment("command_attachment");
        const commandText = interaction.options.getString("command_text");

        Logger.log(`Command ${commandName} with text: ${commandText}`, MessageType.DEBUG);

        let hasText = commandText != null;
        let hasAttachment = attachment != null;

        if (!hasText && !hasAttachment) {
            interaction.reply("Malformed input - needs text and/or attachment!");
            return false;
        }

        let fileName;
        if (hasAttachment) {
            const fileExtension = attachment.url.split("/").pop().split("?")[0].split(".").pop();
            fileName = `attachment_${Math.random()}.${fileExtension}`;
            Logger.log(`Downloading file with url: ${attachment.url}`, MessageType.DEBUG);
            try {
                await downloadFile(attachment.url, fileName);
            } catch (err) {
                Logger.log(`Failed to download attachment: ${err.message}`, MessageType.WARNING);
                interaction.reply(`Failed to add command "${commandName}" - could not download attachment`);
                return false;
            }
        }

        let commandData = { commandName: commandName, commandText: hasText ? commandText : "", attachmentPath: hasAttachment ? fileName : ""};
        let success = await addCommandToDatabase(commandData);

        if (success) {
            interaction.reply(`Successfully added command "${commandName}"`);
        }
        else {
            interaction.reply(`Failed to add command "${commandName}"`);
        }

        return success;
    }

    async removeCommand(interaction) {
        const commandName = interaction.options.getString("command_name");

        if (commandName == null || commandName == "") {
            interaction.reply("Failed to remove command");
            return false;
        }

        const success = await Database.instance().removeSingleCommand(commandName);

        if (success) {
            interaction.reply(`Removed command '${commandName}' if it existed.`);
        }
        else {
            interaction.reply(`Failed to remove command ${commandName}.`);
        }

        return success;
    }

    async listAllCommands(interaction) {
        const res = await Database.instance().getAllCustomCommands();

        if (!res || res.length === 0) {
            interaction.reply("No custom commands registered.");
            return false;
        }

        const groups = new Map();
        for (const row of res) {
            if (!groups.has(row.command_name)) groups.set(row.command_name, []);
            groups.get(row.command_name).push(row);
        }
        const uniqueNames = [...groups.keys()];

        const batches = [];
        for (let i = 0; i < uniqueNames.length; i += CUSTOM_LIST_BATCH_SIZE) {
            batches.push(uniqueNames.slice(i, i + CUSTOM_LIST_BATCH_SIZE));
        }

        let currentBatch = 0;
        let currentName = null;
        let currentVariation = 0;

        const buildView = () => {
            if (currentName == null) {
                return { embed: this.buildCustomListIntroEmbed(batches, currentBatch, uniqueNames.length), files: [] };
            }
            const variations = groups.get(currentName);
            return this.buildCustomEntryPreview(variations[currentVariation], currentVariation, variations.length);
        };

        const buildComponents = (disabled = false) => {
            const variations = currentName == null ? null : groups.get(currentName);
            const rows = [
                this.buildCustomListSelectRow(batches[currentBatch], groups, disabled),
                this.buildCustomVariationRow(variations, currentVariation, disabled),
            ];
            if (batches.length > 1) {
                rows.push(this.buildCustomListPageRow(batches, currentBatch, disabled));
            }
            return rows;
        };

        const { embed: initialEmbed } = buildView();
        await interaction.reply({ embeds: [initialEmbed], components: buildComponents() });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            time: CUSTOM_LIST_COLLECTOR_TIMEOUT_MS,
        });

        collector.on("collect", async (componentInteraction) => {
            if (componentInteraction.user.id !== interaction.user.id) {
                await componentInteraction.reply({
                    content: "This isn't your command list - run /custom list yourself!",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (componentInteraction.componentType === ComponentType.StringSelect) {
                currentName = componentInteraction.values[0];
                currentVariation = 0;
            } else if (componentInteraction.customId === "custom_list_prev") {
                currentBatch = Math.max(0, currentBatch - 1);
                currentName = null;
                currentVariation = 0;
            } else if (componentInteraction.customId === "custom_list_next") {
                currentBatch = Math.min(batches.length - 1, currentBatch + 1);
                currentName = null;
                currentVariation = 0;
            } else if (componentInteraction.customId === "custom_list_variation_prev") {
                currentVariation = Math.max(0, currentVariation - 1);
            } else if (componentInteraction.customId === "custom_list_variation_next") {
                const variations = groups.get(currentName) ?? [];
                currentVariation = Math.min(variations.length - 1, currentVariation + 1);
            }

            const { embed, files } = buildView();
            await componentInteraction.update({ embeds: [embed], components: buildComponents(), files, attachments: [] });
        });

        collector.on("end", async () => {
            try {
                await message.edit({ components: buildComponents(true) });
            } catch (error) {
                Logger.log(error.message);
            }
        });

        return true;
    }

    buildCustomListIntroEmbed(batches, batchIndex, totalCount) {
        const embed = new EmbedBuilder()
            .setColor(0xffffff)
            .setTitle("Custom Commands")
            .setDescription("Select a command from the dropdown below to preview it.");

        if (batches.length > 1) {
            embed.setFooter({ text: `Page ${batchIndex + 1}/${batches.length} - ${totalCount} total` });
        } else {
            embed.setFooter({ text: `${totalCount} total` });
        }

        return embed;
    }

    buildCustomListPageRow(batches, batchIndex, disabled = false) {
        const prevButton = new ButtonBuilder()
            .setCustomId("custom_list_prev")
            .setLabel("◀ Previous Page")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || batchIndex === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId("custom_list_next")
            .setLabel("Next Page ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || batchIndex === batches.length - 1);

        return new ActionRowBuilder().addComponents(prevButton, nextButton);
    }

    buildCustomListSelectRow(names, groups, disabled = false) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId("custom_list_select")
            .setPlaceholder("Choose a command to preview...")
            .setDisabled(disabled);

        for (const name of names) {
            const variations = groups.get(name);
            menu.addOptions({
                label: name.slice(0, 100),
                value: name,
                description: variations.length > 1 ? `${variations.length} variations` : undefined,
                emoji: this.getCustomEntryEmoji(variations[0]),
            });
        }

        return new ActionRowBuilder().addComponents(menu);
    }

    buildCustomVariationRow(variations, variationIndex, disabled = false) {
        const hasMultiple = variations != null && variations.length > 1;

        const prevButton = new ButtonBuilder()
            .setCustomId("custom_list_variation_prev")
            .setLabel("◀ Variation")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || !hasMultiple || variationIndex === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId("custom_list_variation_next")
            .setLabel("Variation ▶")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || !hasMultiple || variationIndex === variations.length - 1);

        return new ActionRowBuilder().addComponents(prevButton, nextButton);
    }

    getCustomEntryEmoji(entry) {
        if (entry.attachment_path) {
            const ext = entry.attachment_path.split(".").pop().toLowerCase();
            if (CUSTOM_LIST_IMAGE_EXTENSIONS.includes(ext)) return "🖼️";
            if (CUSTOM_LIST_AUDIO_EXTENSIONS.includes(ext)) return "🎵";
            return "📄";
        }
        return "📝";
    }

    buildCustomEntryPreview(entry, variationIndex = 0, variationCount = 1) {
        const embed = new EmbedBuilder().setColor(0xffffff).setTitle(escapeMarkdown(entry.command_name));
        const files = [];

        if (variationCount > 1) {
            embed.setFooter({ text: `Variation ${variationIndex + 1}/${variationCount}` });
        }

        if (entry.command_text) {
            const truncated =
                entry.command_text.length > CUSTOM_LIST_TEXT_PREVIEW_MAX_LENGTH
                    ? entry.command_text.slice(0, CUSTOM_LIST_TEXT_PREVIEW_MAX_LENGTH) + "..."
                    : entry.command_text;
            embed.setDescription(escapeMarkdown(truncated));
        }

        if (entry.attachment_path) {
            const filePath = path.resolve("./data/attachments", entry.attachment_path);

            if (!fs.existsSync(filePath)) {
                embed.addFields({ name: "Attachment", value: "⚠️ File missing on disk", inline: false });
            } else {
                const ext = entry.attachment_path.split(".").pop().toLowerCase();

                if (CUSTOM_LIST_IMAGE_EXTENSIONS.includes(ext)) {
                    files.push({ attachment: filePath, name: entry.attachment_path });
                    embed.setImage(`attachment://${entry.attachment_path}`);
                } else if (CUSTOM_LIST_AUDIO_EXTENSIONS.includes(ext)) {
                    files.push({ attachment: filePath, name: entry.attachment_path });
                    embed.addFields({
                        name: "Attachment",
                        value: `🎵 ${escapeMarkdown(entry.attachment_path)} (playable below - Discord can't embed audio inside an embed itself)`,
                        inline: false,
                    });
                } else {
                    embed.addFields({ name: "Attachment", value: escapeMarkdown(entry.attachment_path), inline: false });
                }
            }
        }

        if (!entry.command_text && !entry.attachment_path) {
            embed.setDescription("*(empty)*");
        }

        return { embed, files };
    }

    async invokeCommand(interaction) {
        const commandName = interaction.options.getString("command_name");

        const commandDataObj = await Database.instance().getSingleCommand(commandName);

        if (commandDataObj == null) {
            interaction.reply(`Failed to invoke command '${commandName}.'`);
            return false;
        }

        const commandText = commandDataObj.command_text;
        const attachmentPath = commandDataObj.attachment_path;

        if (commandText == null || commandText === "") {
            interaction.reply({files:[`./data/attachments/${attachmentPath}`]});
        }
        else if (attachmentPath == null || attachmentPath === "") {
            interaction.reply({content: `${commandText}`});
        }
        else {
            interaction.reply({content: `${commandText}`, files:[`./data/attachments/${attachmentPath}`]});
        }

        return true;
    }
}
