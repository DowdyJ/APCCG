import { DatabaseSync } from "node:sqlite";
import { Logger, MessageType } from "./logger.js";

export default class Database {
    static dbinstance = null;

    constructor() {
        try {
            this.sqliteDatabase = new DatabaseSync("./data/apccg.db");
            console.log("Connected to the database.");
        } catch (err) {
            Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
            console.error(err.message);
        }
    }

    static instance() {
        if (Database.dbinstance == null) {
            Database.dbinstance = new Database();
            Database.dbinstance.createTablesIfNotExist();
        }

        return Database.dbinstance;
    }

    createTablesIfNotExist() {
        Logger.log(`Initializing tables...`, MessageType.DEBUG);

        this.sqliteDatabase.exec(`CREATE TABLE IF NOT EXISTS DockerCommands (
            command_name TEXT PRIMARY KEY NOT NULL,
            command_contents TEXT,
            notes TEXT
        )`);

        this.sqliteDatabase.exec(`CREATE TABLE IF NOT EXISTS TrustedUsers (
            user_id TEXT PRIMARY KEY NOT NULL,
            can_alter_users NUMERIC DEFAULT 0,
            can_add_commands NUMERIC DEFAULT 0,
            can_remove_commands NUMERIC DEFAULT 0,
            can_run_commands NUMERIC DEFAULT 0,
            can_stop_commands NUMERIC DEFAULT 0
        )`);

        this.sqliteDatabase.exec(`CREATE TABLE IF NOT EXISTS RadioStreams (
            radio_name TEXT PRIMARY KEY NOT NULL,
            radio_stream_link TEXT NOT NULL
        )`);

        this.sqliteDatabase.exec(`CREATE TABLE IF NOT EXISTS KSpamRemovalChannels (
            channel_id TEXT PRIMARY KEY NOT NULL
        )`);

        this.sqliteDatabase.exec(`CREATE TABLE IF NOT EXISTS KedamaFaces (
            id INTEGER PRIMARY KEY,
            face TEXT NOT NULL UNIQUE
        )`);

        this.sqliteDatabase.exec(`CREATE TABLE IF NOT EXISTS CustomCommands (
            command_name TEXT NOT NULL,
            command_text TEXT,
            attachment_path TEXT
        )`);
    }

    getAllCustomCommandNames() {
        Logger.log(`Getting all commands`);
        return new Promise((resolve, reject) => {
            try {
                const rows = this.sqliteDatabase.prepare(`
                SELECT DISTINCT command_name
                FROM CustomCommands
                ORDER BY rowid ASC, command_name ASC`).all();
                resolve(rows);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
            }
        });
    }

    getAllCustomCommands() {
        Logger.log(`Getting all commands with full data`);
        return new Promise((resolve, reject) => {
            try {
                const rows = this.sqliteDatabase.prepare(`
                SELECT command_name, command_text, attachment_path
                FROM CustomCommands
                ORDER BY rowid ASC, command_name ASC`).all();
                resolve(rows);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
            }
        });
    }

    getSingleCommand(commandName) {
        return new Promise((resolve, reject) => {
            let rows;
            try {
                rows = this.sqliteDatabase.prepare(`
                SELECT command_name, command_text, attachment_path
                FROM CustomCommands
                WHERE command_name = ?
                ORDER BY rowid ASC`).all(commandName);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
                return;
            }

            if (rows == null || rows.length === 0) {
                resolve(null);
                return;
            }

            let rowN = 0;
            if (rows.length > 1) {
                rowN = Math.floor(Math.random() * (rows.length));
                rowN = (rowN === rows.length) ? rows.length - 1 : rowN;
            }

            let result = rows[rowN];
            resolve(result);
            return;
        });
    }

    removeSingleCommand(commandName) {
        Logger.log(`Removing command '${commandName}'`);
        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            DELETE FROM CustomCommands
            WHERE command_name = ?`).run(commandName);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    addCustomCommand(commandName, commandText, attachmentPath) {
        Logger.log(`Adding command ${commandName}`);
        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            INSERT INTO CustomCommands (command_name, command_text, attachment_path)
            VALUES (?, ?, ?)`).run(commandName, commandText, attachmentPath);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    getAllKedama() {
        Logger.log(`Getting all kedama faces`);
        return new Promise((resolve, reject) => {
            try {
                const rows = this.sqliteDatabase.prepare(`
                SELECT face
                FROM KedamaFaces`).all();
                resolve(rows);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
            }
        });
    }

    addKedama(kaomoji) {
        Logger.log(`Adding face ${kaomoji}`);
        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            INSERT INTO KedamaFaces (face)
            VALUES (?)`).run(kaomoji);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    addChannelToKPurge(channelId) {
        Logger.log(`Adding channel to purge ${channelId}`);
        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            INSERT INTO KSpamRemovalChannels (channel_id)
            VALUES (?)`).run(channelId);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    removeChannelToKPurge(channelId) {
        Logger.log(`Removing channel to purge ${channelId}`);
        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            DELETE FROM KSpamRemovalChannels
            WHERE channel_id = ?`).run(channelId);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    getAllChannelsToKPurge() {
        Logger.log(`Retrieving all channels to purge`);
        return new Promise((resolve, reject) => {
            try {
                const rows = this.sqliteDatabase.prepare(`
                SELECT channel_id
                FROM KSpamRemovalChannels`).all();
                resolve(rows);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
            }
        });
    }

    addRadioStation(radioName, radioLink) {
        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            INSERT INTO RadioStreams (radio_name, radio_stream_link)
            VALUES (?,?)`).run(radioName, radioLink);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    getRadioStationUrlByName(radioName) {
        return new Promise((resolve, reject) => {
            let rows;
            try {
                rows = this.sqliteDatabase.prepare(`
                SELECT radio_name, radio_stream_link
                FROM RadioStreams
                WHERE radio_name = ?`).all(radioName);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
                return;
            }

            if (rows == null || rows.length === 0) {
                resolve(null);
                return;
            }

            let result = rows[0];
            resolve(result.radio_stream_link);
            return;
        });
    }

    removeRadioStation(radioName) {
        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            DELETE FROM RadioStreams
            WHERE radio_name = ?`).run(radioName);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    getAllRadioStations() {
        return new Promise((resolve, reject) => {
            try {
                const rows = this.sqliteDatabase.prepare(`
                SELECT radio_name, radio_stream_link
                FROM RadioStreams`).all();
                resolve(rows);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
            }
        });
    }

    addDockerUser(userId, canAlterUsers, canAddCommands, canRemoveCommands, canRunCommands, canStopCommands) {
        Logger.log(`Adding user ${userId}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            INSERT INTO TrustedUsers (user_id, can_alter_users, can_add_commands, can_remove_commands, can_run_commands, can_stop_commands)
            VALUES (?,?,?,?,?,?)`).run(
                    userId,
                    canAlterUsers ? 1 : 0,
                    canAddCommands ? 1 : 0,
                    canRemoveCommands ? 1 : 0,
                    canRunCommands ? 1 : 0,
                    canStopCommands ? 1 : 0,
                );
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    removeDockerUser(userId) {
        Logger.log(`Removing user ${userId}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
            DELETE FROM TrustedUsers
            WHERE user_id = ?`).run(userId);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    getUserPermissions(userId) {
        Logger.log(`Checking user permissions for ${userId}`, MessageType.DEBUG);
        return new Promise((resolve, reject) => {
            let rows;
            try {
                rows = this.sqliteDatabase.prepare(`
            SELECT *
            FROM TrustedUsers
            WHERE user_id = ?`).all(userId);
            } catch (err) {
                console.log(err);
                Logger.log(
                    `SQL Error: ${err?.message}; ${err.name}; ${err.cause}; ${err}`,
                    MessageType.WARNING
                );
                reject(null);
                return;
            }

            if (rows.length == 0) {
                let noPerms = {
                    canAlterUsers: false,
                    canRunCommands: false,
                    canStopContainers: false,
                    canAddCommands: false,
                    canRemoveCommands: false,
                };
                resolve(noPerms);
                return;
            }

            let userPermData = rows[0];
            let userPerms = {
                canAlterUsers: (userPermData.can_alter_users) == 1,
                canRunCommands: (userPermData.can_run_commands) == 1,
                canStopContainers: (userPermData.can_stop_commands) == 1,
                canAddCommands: (userPermData.can_add_commands) == 1,
                canRemoveCommands: (userPermData.can_remove_commands) == 1,
            };
            resolve(userPerms);
            return;
        });
    }

    addDockerCommand(commandName, commandContents, notes = "-") {
        Logger.log(`Adding new command '${commandContents}' as '${commandName}'`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
                INSERT INTO DockerCommands (command_name, command_contents, notes)
                VALUES (?,?,?)`).run(commandName, commandContents, notes);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    removeDockerCommand(commandName) {
        Logger.log(`Removing command ${commandName}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            try {
                this.sqliteDatabase.prepare(`
                DELETE FROM DockerCommands
                WHERE command_name = ?`).run(commandName);
                resolve(true);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(false);
            }
        });
    }

    getCommandContentsByName(commandName) {
        Logger.log(`Inspecting command ${commandName}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            let rows;
            try {
                rows = this.sqliteDatabase.prepare(`
                SELECT command_contents, notes
                FROM DockerCommands
                WHERE command_name = ?`).all(commandName);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
                return;
            }

            if (rows.length == 0) {
                Logger.log(`SQL Error: No results`, MessageType.WARNING);
                resolve(null);
                return;
            }

            resolve(rows[0]);
            return;
        });
    }

    getAllDockerCommands() {
        Logger.log("Inspecting all commands", MessageType.DEBUG);
        return new Promise((resolve, reject) => {
            try {
                const rows = this.sqliteDatabase.prepare(`
                SELECT command_name, command_contents, notes
                FROM DockerCommands`).all();
                resolve(rows);
            } catch (err) {
                Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                resolve(null);
            }
        });
    }
}
