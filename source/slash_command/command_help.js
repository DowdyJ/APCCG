import {
    ActionRowBuilder,
    ComponentType,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger } from "../logger.js";

const OVERVIEW_VALUE = "overview";
const COLLECTOR_TIMEOUT_MS = 120_000;

export default class CommandHelp extends ApccgSlashCommand {
    registeredSlashCommands = [];
    registeredMessageCommands = [];
    registeredIntervalCommands = [];

    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder().setName("help").setDescription("see a list of commands");
    }

    async execute(args) {
        let interaction = args[0];

        const entries = this.buildEntries();
        const overviewEmbed = this.buildOverviewEmbed(entries);
        const row = this.buildSelectRow(entries);

        await interaction.reply({ embeds: [overviewEmbed], components: [row] });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: COLLECTOR_TIMEOUT_MS,
        });

        collector.on("collect", async (componentInteraction) => {
            if (componentInteraction.user.id !== interaction.user.id) {
                await componentInteraction.reply({
                    content: "This isn't your help menu - run /help yourself!",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const selected = componentInteraction.values[0];
            const embed =
                selected === OVERVIEW_VALUE ? overviewEmbed : this.buildDetailEmbed(entries[Number(selected)]);

            await componentInteraction.update({ embeds: [embed], components: [row] });
        });

        collector.on("end", async () => {
            try {
                await message.edit({ components: [this.buildSelectRow(entries, true)] });
            } catch (error) {
                Logger.log(error.message);
            }
        });

        return true;
    }

    getTitle() {
        return "Help";
    }

    getDescription() {
        return `**/help** -> See this message`;
    }

    setRegisteredCommands(registeredSlashCommands, registeredMessageCommands, registeredIntervalCommands) {
        this.registeredMessageCommands = registeredMessageCommands;
        this.registeredSlashCommands = registeredSlashCommands;
        this.registeredIntervalCommands = registeredIntervalCommands;
    }

    buildEntries() {
        const entries = [];

        for (const command of this.registeredSlashCommands) {
            entries.push({ command, category: "Slash Commands", emoji: "⚡" });
        }
        for (const command of this.registeredMessageCommands) {
            entries.push({ command, category: "Message Triggers", emoji: "📨" });
        }
        for (const command of this.registeredIntervalCommands) {
            entries.push({ command, category: "Background Commands", emoji: "⏱️" });
        }

        return entries;
    }

    buildOverviewEmbed(entries) {
        const embed = new EmbedBuilder()
            .setColor(0xffffff)
            .setTitle("APCCG Help")
            .setDescription("Select a command below to see its details.");

        const byCategory = new Map();
        for (const entry of entries) {
            if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
            byCategory.get(entry.category).push(entry);
        }

        for (const [category, categoryEntries] of byCategory) {
            embed.addFields({
                name: category,
                value: categoryEntries.map((entry) => this.safeTitle(entry.command)).join("\n") || "-",
                inline: false,
            });
        }

        return embed;
    }

    buildDetailEmbed(entry) {
        return new EmbedBuilder()
            .setColor(0xffffff)
            .setTitle(`${entry.emoji} ${this.safeTitle(entry.command)}`)
            .setDescription(this.safeDescription(entry.command))
            .setFooter({ text: entry.category });
    }

    buildSelectRow(entries, disabled = false) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId("help_select")
            .setPlaceholder("Choose a command to see details...")
            .setDisabled(disabled);

        menu.addOptions({
            label: "Overview",
            description: "Show all commands grouped by category",
            value: OVERVIEW_VALUE,
            emoji: "📋",
        });

        entries.forEach((entry, index) => {
            menu.addOptions({
                label: this.safeTitle(entry.command).slice(0, 100),
                description: entry.category,
                value: String(index),
                emoji: entry.emoji,
            });
        });

        return new ActionRowBuilder().addComponents(menu);
    }

    safeTitle(command) {
        try {
            return command.getTitle();
        } catch (error) {
            Logger.log(error.message);
            return "Unknown";
        }
    }

    safeDescription(command) {
        try {
            return command.getDescription();
        } catch (error) {
            Logger.log(error.message);
            return "No description available.";
        }
    }
}
