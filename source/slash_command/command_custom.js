import { InteractionType, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import fs from "fs";
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import path from "path";
import Database from "../database.js";

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
        **/custom list** -> List all registered command names
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

        let res = await Database.instance().getAllCustomCommandNames();

        if (!res || res.length === 0) {
            interaction.reply("No custom commands registered.");
            return false;
        }

        let responseText = "## Command Names:\n";
        for (const obj of res) {
            responseText += "- " + obj.command_name + "\n";
        }

        interaction.reply(responseText);

        return true;
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
