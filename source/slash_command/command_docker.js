import { EmbedBuilder, InteractionType, SlashCommandBuilder } from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger, MessageType } from "../logger.js";
import Database from "../database.js";
import child_process from "child_process";

export default class CommandDocker extends ApccgSlashCommand {
    disabled() {
        return false;
    }

    commandData() {
        return new SlashCommandBuilder()
            .setName("docker")
            .setDescription("Control containers with Docker")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("add")
                    .setDescription("Register a new Docker command")
                    .addStringOption((input) =>
                        input
                            .setRequired(true)
                            .setName("name")
                            .setDescription("short name for the command ([a-zA-Z0-9_]{3,20})")
                    )
                    .addStringOption((input) =>
                        input.setRequired(true).setName("command").setDescription("command to run (without --name)")
                    )
                    .addStringOption((input) =>
                        input.setRequired(false).setName("notes").setDescription("Server IP, other notes")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("remove")
                    .setDescription("Remove a command")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("name").setDescription("short name for the command")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("run")
                    .setDescription("Run a command")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("name").setDescription("short name for the command")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("stop")
                    .setDescription("Stop a running container")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("name").setDescription("short name for the command")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("info")
                    .setDescription("Show the command aliased by short name")
                    .addStringOption((input) =>
                        input.setRequired(true).setName("name").setDescription("short name for the command")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("op")
                    .setDescription("Add a user as a Docker operator")
                    .addUserOption((input) => input.setRequired(true).setName("user").setDescription("User to add"))
                    .addBooleanOption((input) =>
                        input.setRequired(true).setName("can_alter_users").setDescription("add/remove user permission")
                    )
                    .addBooleanOption((input) =>
                        input
                            .setRequired(true)
                            .setName("can_start_containers")
                            .setDescription("start container permission")
                    )
                    .addBooleanOption((input) =>
                        input
                            .setRequired(true)
                            .setName("can_stop_containers")
                            .setDescription("stop container permission")
                    )
                    .addBooleanOption((input) =>
                        input.setRequired(true).setName("can_add_commands").setDescription("add command permission")
                    )
                    .addBooleanOption((input) =>
                        input
                            .setRequired(true)
                            .setName("can_remove_commands")
                            .setDescription("remove command permission")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("de-op")
                    .setDescription("Remove a user as a Docker operator")
                    .addUserOption((input) => input.setRequired(true).setName("user").setDescription("User to remove"))
            )
            .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Show container status"));
    }

    getTitle() {
        return "Docker Commands";
    }

    getDescription() {
        return `**/docker add** _[command name] [docker command] [(Optional) notes]_ -> Add a "docker run" command
      **/docker remove** _[command name]_ -> Remove an existing command
      **/docker run** _[command name]_ -> Run an available command
      **/docker stop** _[command name]_ -> Stop a running container
      **/docker status** -> See running containers and available commands
      **/docker op** _[user]_ -> Add permissions to a user
      **/docker de-op** _[user]_ -> Remove permissions from a user
      **/docker info** _[command name]_ -> Display details about backing docker command`;
    }

    async execute(args) {
        const interaction = args[0];

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        let subcommandName = interaction.options.getSubcommand();

        switch (subcommandName) {
            case "add":
                return await this.addCommand(interaction);
            case "info":
                return await this.getCommandInfo(interaction);
            case "remove":
                return await this.removeCommand(interaction);
            case "run":
                return await this.runCommand(interaction);
            case "stop":
                return await this.stopContainer(interaction);
            case "status":
                return await this.getDockerStatus(interaction);
            case "op":
                return await this.addUser(interaction);
            case "de-op":
                return await this.removeUser(interaction);
            default:
                Logger.log("Invalid subcommand run on /docker", MessageType.ERROR);
        }
        return true;
    }

    rejectionString = "𝗧𝗵𝗲 𝗗𝗮𝗼 𝘁𝗵𝗮𝘁 𝗰𝗮𝗻 𝗯𝗲 𝘀𝗽𝗼𝗸𝗲𝗻 𝗶𝘀 𝗻𝗼𝘁 𝘁𝗵𝗲 𝗲𝘁𝗲𝗿𝗻𝗮𝗹 𝗗𝗮𝗼";

    async getCommandInfo(interaction) {
        let commandName = interaction.options.get("name")?.value;

        await interaction.reply(`Looking up info for ${commandName}...`);

        let database = Database.instance();
        let res = await database.getCommandContentsByName(commandName);

        if (res == null) {
            return new Promise((resolve, reject) => resolve(false));
        }

        let commandFunction = res.command_contents;

        if (commandFunction === "") commandFunction = "-";

        interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Command Info - ${commandName}`)
                    .setColor(0x6699cc)
                    .addFields(
                        {
                            name: "Command Name",
                            value: `${commandName}`,
                            inline: false,
                        },
                        {
                            name: "Command Function",
                            value: `${commandFunction}`,
                            inline: false,
                        }
                    )
                    .setTimestamp(),
            ],
        });

        return new Promise((resolve, reject) => resolve(true));
    }

    async addUser(interaction) {
        if (!(await this.canAlterUsers(interaction))) {
            interaction.reply(this.rejectionString);
            return new Promise((resolve, reject) => resolve(false));
        }

        let userToChange = interaction.user;
        const canAlterUsers = interaction.options.get("can_alter_users")?.value;
        const canAddCommands = interaction.options.get("can_add_commands")?.value;
        const canRemoveCommands = interaction.options.get("can_remove_commands")?.value;
        const canRunCommands = interaction.options.get("can_start_containers")?.value;
        const canStopCommands = interaction.options.get("can_stop_containers")?.value;

        let database = Database.instance();
        let res = await database.addDockerUser(
            userToChange.id,
            canAlterUsers,
            canAddCommands,
            canRemoveCommands,
            canRunCommands,
            canStopCommands
        );

        if (res) {
            interaction.reply(`Registered user \"${userToChange.username}\"`);
        } else {
            interaction.reply(`Failed to register user \"${userToChange.username}\"`);
        }

        return new Promise((resolve, reject) => resolve(res));
    }

    async removeUser(interaction) {
        if (!(await this.canAlterUsers(interaction))) {
            interaction.reply(this.rejectionString);
            return new Promise((resolve, reject) => resolve(false));
        }

        let userToChange = interaction.user;

        let database = Database.instance();
        let res = await database.removeDockerUser(userToChange.id);

        if (res) {
            interaction.reply(`Removed user \"${userToChange.username}\"`);
        } else {
            interaction.reply(`Failed to remove user \"${userToChange.username}\"`);
        }

        return new Promise((resolve, reject) => resolve(res));
    }

    async addCommand(interaction) {
        if (!(await this.canAddCommands(interaction))) {
            await interaction.reply(this.rejectionString);
            return new Promise((resolve, reject) => resolve(false));
        }

        let commandName = interaction.options.get("name")?.value;

        let acceptableCommandNameRegex = new RegExp("^[a-zA-Z0-9_]{3,20}$");
        if (!commandName.match(acceptableCommandNameRegex)) {
            await interaction.reply("You missed that one - try another! 🍾");
            return new Promise((resolve, reject) => resolve(false));
        }

        let commandString = interaction.options.get("command")?.value;
        let notes = interaction.options.get("notes")?.value;
        if (notes == null) notes = "-";

        let database = Database.instance();
        let res = await database.addDockerCommand(commandName, commandString, notes);

        if (res) interaction.reply(`Added command \"${commandName}\" as \"${commandString}\"`);
        else interaction.reply(`Error adding command \"${commandName}\" as \"${commandString}\"`);

        return new Promise((resolve, reject) => resolve(res));
    }

    async removeCommand(interaction) {
        if (!(await this.canRemoveCommands(interaction))) {
            interaction.reply(this.rejectionString);
            return new Promise((resolve, reject) => resolve(false));
        }

        let commandName = interaction.options.get("name")?.value;

        let database = Database.instance();
        let res = await database.removeDockerCommand(commandName);

        if (res) interaction.reply(`Removed command \"${commandName}\", if it existed.`);
        else interaction.reply(`Error removing command \"${commandName}\"`);

        return new Promise((resolve, reject) => resolve(res));
    }

    async runCommand(interaction) {
        if (!(await this.canRunCommands(interaction))) {
            interaction.reply(this.rejectionString);
            return new Promise((resolve, reject) => resolve(false));
        }

        let commandName = interaction.options.get("name")?.value;

        let database = Database.instance();
        let res = await database.getCommandContentsByName(commandName);

        if (res == null) {
            interaction.reply(`Failed to find command \"${commandName}\"`);
        } else {
            let commandContents = res.command_contents;
            interaction.reply(`Running container \"${commandName}\".`);
            let resArr = commandContents.split(" ");
            resArr.splice(2, 0, `--name="${commandName}"`);
            res = resArr.join(" ");
            child_process.spawn(`${res}`, { shell: true });
        }

        return new Promise((resolve, reject) => resolve(res != null));
    }

    async stopContainer(interaction) {
        if (!(await this.canStopCommands(interaction))) {
            interaction.reply(this.rejectionString);
            return new Promise((resolve, reject) => resolve(false));
        }

        let commandName = interaction.options.get("name")?.value;

        interaction.reply(`Stopping \"${commandName}\"...`);

        return new Promise((resolve, reject) => {
            child_process.exec(`docker stop ${commandName}`, (error, stdout, stderr) => {
                if (error) {
                    interaction.channel.send(`"${commandName}" was not running.`);
                    reject(`Error: ${error}`);
                    return;
                }
                if (stderr) {
                    interaction.channel.send(`"${commandName}" was not running.`);
                    reject(`Stderr: ${stderr}`);
                    return;
                }

                interaction.channel.send(`Stopped "${commandName}".`);
                resolve(true);
            });
        });
    }

    async getDockerStatus(interaction) {
        await interaction.reply(`Inpsecting status...`);

        let database = Database.instance();
        let res = await database.getAllDockerCommands();

        if (res == null) {
            return new Promise((resolve, reject) => resolve(false));
        }

        let commandNames = "";
        let commandFunctions = "";
        let notes = "";

        for (const commandRow of res) {
            commandNames += commandRow.command_name + "\n";
            commandFunctions += commandRow.command_contents + "\n";
            notes += commandRow.notes + "\n";
        }

        if (commandFunctions === "") commandFunctions = "-";
        if (commandNames === "") commandNames = "-";
        if (notes === "") notes = "-";

        let activeContainers = (await this.getRunningContainers()).filter((entry) => {
            return commandNames.includes(entry);
        });
        let activeContainerText;
        if (activeContainers.length === 0) {
            activeContainerText = "No running containers";
        } else {
            activeContainerText = activeContainers.join("\n");
        }

        interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Docker Info")
                    .setColor(0x6699cc)
                    .addFields(
                        {
                            name: "Command Name",
                            value: `${commandNames}`,
                            inline: true,
                        },
                        { name: "Notes", value: `${notes}`, inline: true },
                        {
                            name: "Active Containers",
                            value: `${activeContainerText}`,
                            inline: false,
                        }
                    )
                    .setTimestamp(),
            ],
        });

        return new Promise((resolve, reject) => resolve(true));
    }

    async canAlterUsers(interaction) {
        let database = Database.instance();
        let res = await database.getUserPermissions(interaction.user.id);

        return new Promise((resolve, reject) => resolve(res.canAlterUsers));
    }

    async canAddCommands(interaction) {
        let database = Database.instance();
        let res = await database.getUserPermissions(interaction.user.id);

        return new Promise((resolve, reject) => resolve(res.canAddCommands));
    }

    async canRemoveCommands(interaction) {
        let database = Database.instance();
        let res = await database.getUserPermissions(interaction.user.id);

        return new Promise((resolve, reject) => resolve(res.canRemoveCommands));
    }

    async canRunCommands(interaction) {
        let database = Database.instance();
        let res = await database.getUserPermissions(interaction.user.id);

        return new Promise((resolve, reject) => resolve(res.canRunCommands));
    }

    async canStopCommands(interaction) {
        let database = Database.instance();
        let res = await database.getUserPermissions(interaction.user.id);

        return new Promise((resolve, reject) => resolve(res.canStopContainers));
    }

    async getRunningContainers() {
        return new Promise((resolve, reject) => {
            child_process.exec(`docker ps`, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error: ${error}`);
                    return;
                }
                if (stderr) {
                    reject(`Stderr: ${stderr}`);
                    return;
                }

                let result = [];
                for (const output of stdout.matchAll(/(\w+)$/gm)) {
                    if (output[1] != "NAMES") result.push(output[1]);
                }

                resolve(result);
            });
        });
    }
}
