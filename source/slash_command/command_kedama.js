import { InteractionType, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import Database from "../database.js";

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

        let kedamaFaces = "";

        for (const obj of databaseResult) {
            kedamaFaces += obj.face + "\n";
        }

        if (kedamaFaces === "") {
            kedamaFaces = "-";
        }

        interaction.reply(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        interaction.channel.send(`\`\`\`\n${kedamaFaces}\n\`\`\``);
        interaction.channel.send("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
        return true;
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
