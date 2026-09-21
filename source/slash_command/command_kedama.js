import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    InteractionType,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import Database from "../database.js";

const KEDAMA_PAGE_SIZE = 10;
const KEDAMA_COLLECTOR_TIMEOUT_MS = 120_000;

export default class CommandHello extends ApccgSlashCommand {
    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder().setName("kedama").setDescription("Use a random kaomoji face")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add a new kaomoji to roll")
                .addStringOption((input) =>
                    input.setRequired(true).setName("kaomoji").setDescription("the face to add")
                )
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("roll").setDescription("roll your fortune")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("Show a list of all kaomoji")
        );
    }

    async execute(args) {
        const interaction = args[0];

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        let subcommandName = interaction.options.getSubcommand();

        switch (subcommandName) {
            case "add":
                return await this.addKaomojiToDatabase(interaction);
            case "roll":
                return await this.getRandomKaomoji(interaction);
            case "list":
                return await this.listAllKaomoji(interaction);
            default:
                Logger.log("Invalid subcommand run on /radio", MessageType.ERROR);
        }

        return false;
    }

    getTitle() {
        return "Kedama";
    }

    getDescription() {
        return `**/kedama add** [face] -> Add face to dictionary
        **/kedama roll** -> Get a random face
        **/kedama list** -> Print a list of all registered emojis
        `;
    }

    async addKaomojiToDatabase(interaction) {
        const kaomoji = interaction.options.get("kaomoji")?.value;

        if (typeof kaomoji !== "string") return false;

        let success = await Database.instance().addKedama(kaomoji);

        if (success) interaction.reply(`Added ${kaomoji}`);
        else interaction.reply(`**PEBKAC Error**`);

        return success;
    }

    async listAllKaomoji(interaction) {
        const databaseResult = await Database.instance().getAllKedama();

        if (databaseResult == null) {
            interaction.reply("The day the kedama died (today) :weary:");
            return false;
        }

        const faces = databaseResult.map((obj) => obj.face);
        const pages = [];
        for (let i = 0; i < faces.length; i += KEDAMA_PAGE_SIZE) {
            pages.push(faces.slice(i, i + KEDAMA_PAGE_SIZE));
        }
        if (pages.length === 0) pages.push([]);

        let currentPage = 0;

        await interaction.reply({
            embeds: [this.buildKedamaEmbed(pages, currentPage, faces.length)],
            components: [this.buildKedamaRow(pages, currentPage)],
        });

        if (pages.length <= 1) return true;

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: KEDAMA_COLLECTOR_TIMEOUT_MS,
        });

        collector.on("collect", async (componentInteraction) => {
            if (componentInteraction.user.id !== interaction.user.id) {
                await componentInteraction.reply({
                    content: "This isn't your kedama list - run /kedama list yourself!",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (componentInteraction.customId === "kedama_prev") {
                currentPage = Math.max(0, currentPage - 1);
            } else if (componentInteraction.customId === "kedama_next") {
                currentPage = Math.min(pages.length - 1, currentPage + 1);
            }

            await componentInteraction.update({
                embeds: [this.buildKedamaEmbed(pages, currentPage, faces.length)],
                components: [this.buildKedamaRow(pages, currentPage)],
            });
        });

        collector.on("end", async () => {
            try {
                await message.edit({ components: [this.buildKedamaRow(pages, currentPage, true)] });
            } catch (error) {
                Logger.log(error.message);
            }
        });

        return true;
    }

    buildKedamaEmbed(pages, pageIndex, totalCount) {
        const entries = pages[pageIndex];
        const lines =
            entries.length === 0
                ? "-"
                : entries.map((face, i) => `${pageIndex * KEDAMA_PAGE_SIZE + i + 1}. ${face}`).join("\n");

        return new EmbedBuilder()
            .setColor(0xffffff)
            .setTitle("Kedama Faces")
            .setDescription("```\n" + lines + "\n```")
            .setFooter({ text: `Page ${pageIndex + 1}/${pages.length} - ${totalCount} total` });
    }

    buildKedamaRow(pages, pageIndex, disabled = false) {
        const prevButton = new ButtonBuilder()
            .setCustomId("kedama_prev")
            .setLabel("◀ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || pageIndex === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId("kedama_next")
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || pageIndex === pages.length - 1);

        return new ActionRowBuilder().addComponents(prevButton, nextButton);
    }

    async getRandomKaomoji(interaction) {
        const databaseResult = await Database.instance().getAllKedama();

        if (databaseResult == null) {
            interaction.reply("The day the kedama died (today) :weary:");
            return false;
        }

        let randomIndex = Math.floor(Math.random() * (databaseResult.length));

        interaction.reply(databaseResult[randomIndex].face);
        return true;
    }
}
