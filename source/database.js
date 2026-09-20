import sqlite3 from "sqlite3";
import { Logger, MessageType } from "./logger.js";

export default class Database {
    static dbinstance = null;

    constructor() {
        this.sqliteDatabase = new sqlite3.Database(
            "./data/apccg.db",
            sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            (err) => {
                if (err) {
                    Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                    console.error(err.message);
                }
                console.log("Connected to the database.");
            }
        );
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

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS DockerCommands (
            command_name TEXT PRIMARY KEY NOT NULL,
            command_contents TEXT,
            notes TEXT
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS TrustedUsers (
            user_id TEXT PRIMARY KEY NOT NULL,
            can_alter_users NUMERIC DEFAULT 0,
            can_add_commands NUMERIC DEFAULT 0,
            can_remove_commands NUMERIC DEFAULT 0,
            can_run_commands NUMERIC DEFAULT 0,
            can_stop_commands NUMERIC DEFAULT 0
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS RadioStreams (
            radio_name TEXT PRIMARY KEY NOT NULL,
            radio_stream_link TEXT NOT NULL
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS KSpamRemovalChannels (
            channel_id TEXT PRIMARY KEY NOT NULL
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS RepoastChannels (
            channel_id TEXT PRIMARY KEY NOT NULL
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS RepoastForgetMe (
            message_id TEXT PRIMARY KEY NOT NULL
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS RepoastMedia (
            message_id TEXT PRIMARY KEY NOT NULL,
            channel_id TEXT NOT NULL,
            message_hash TEXT NOT NULL
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS KedamaFaces (
            id INTEGER PRIMARY KEY,
            face TEXT NOT NULL UNIQUE
        )`);

        this.sqliteDatabase.run(`CREATE TABLE IF NOT EXISTS CustomCommands (
            command_name TEXT NOT NULL,
            command_text TEXT,
            attachment_path TEXT
        )`);
    }

    getAllCustomCommandNames() {
        Logger.log(`Getting all commands`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT DISTINCT command_name
                FROM CustomCommands
                ORDER BY rowid ASC, command_name ASC`,
                (err, rows) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows);
                    return;
                }
            );
        });
    }

    getSingleCommand(commandName) {
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT command_name, command_text, attachment_path
                FROM CustomCommands
                WHERE command_name = ?
                ORDER BY rowid ASC`,
                [commandName],
                (err, rows) => {
                    if (err) {
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
                }
            );
        });
    }

    removeSingleCommand(commandName) {
        Logger.log(`Removing command '${commandName}'`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            DELETE FROM CustomCommands
            WHERE command_name = ?`,
                [commandName],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    addCustomCommand(commandName, commandText, attachmentPath) {
        Logger.log(`Adding command ${commandName}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO CustomCommands (command_name, command_text, attachment_path)
            VALUES (?, ?, ?)`,
                [commandName, commandText, attachmentPath],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    getAllKedama() {
        Logger.log(`Getting all kedama faces`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT face
                FROM KedamaFaces`,
                (err, rows) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows);
                    return;
                }
            );
        });
    }

    addKedama(kaomoji) {
        Logger.log(`Adding face ${kaomoji}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO KedamaFaces (face)
            VALUES (?)`,
                [kaomoji],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    addChannelToKPurge(channelId) {
        Logger.log(`Adding channel to purge ${channelId}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO KSpamRemovalChannels (channel_id)
            VALUES (?)`,
                [channelId],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    removeChannelToKPurge(channelId) {
        Logger.log(`Removing channel to purge ${channelId}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            DELETE FROM KSpamRemovalChannels
            WHERE channel_id = ?`,
                [channelId],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    getAllChannelsToKPurge() {
        Logger.log(`Retrieving all channels to purge`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT channel_id
                FROM KSpamRemovalChannels`,
                (err, rows) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows);
                    return;
                }
            );
        });
    }

    addChannelToPoast(channelId) {
        Logger.log(`Adding channel to find poasts ${channelId}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO RepoastChannels (channel_id)
            VALUES (?)`,
                [channelId],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    removeChannelFromPoast(channelId) {
        Logger.log(`Removing channel from finding poasts ${channelId}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            DELETE FROM RepoastChannels
            WHERE channel_id = ?`,
                [channelId],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    getAllChannelsToPoast() {
        Logger.log(`Retrieving all channels to find poasts`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT channel_id
                FROM RepoastChannels`,
                (err, rows) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows);
                    return;
                }
            );
        });
    }

    forgetMessageFromChannel(messageId) {
        Logger.log(`Adding message to be forgotten ${messageId}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO RepoastForgetMe (message_id)
            VALUES (?);

            DELETE FROM RepoastMedia
            WHERE message_id = ?;
            `,
                [messageId, messageId],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    addMediaPoastFromChannel(channelId, messageId, mediaHash) {
        Logger.log(`Adding media to be tracked, m:${messageId},c:${channelId}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO RepoastMedia (message_id, channel_id, media_hash)
            VALUES (?,?,?);
                `,
                [messageId, channelId, mediaHash],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    getAllMediaHashFromChannel(channelId) {
        Logger.log(`Retrieving all media poasts from channel ${channelId}`);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT *
                FROM RepoastMedia
                where channel_id = ${channelId}`,
                (err, rows) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows);
                    return;
                }
            );
        });
    }

    addRadioStation(radioName, radioLink) {
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO RadioStreams (radio_name, radio_stream_link)
            VALUES (?,?)`,
                [radioName, radioLink],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    getRadioStationUrlByName(radioName) {
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT radio_name, radio_stream_link
                FROM RadioStreams
                WHERE radio_name = ?`,
                [radioName],
                (err, rows) => {
                    if (err) {
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
                }
            );
        });
    }

    removeRadioStation(radioName) {
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            DELETE FROM RadioStreams
            WHERE radio_name = ?`,
                [radioName],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    getAllRadioStations() {
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT radio_name, radio_stream_link
                FROM RadioStreams`,
                (err, rows) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows);
                    return;
                }
            );
        });
    }

    addDockerUser(userId, canAlterUsers, canAddCommands, canRemoveCommands, canRunCommands, canStopCommands) {
        Logger.log(`Adding user ${userId}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            INSERT INTO TrustedUsers (user_id, can_alter_users, can_add_commands, can_remove_commands, can_run_commands, can_stop_commands)
            VALUES (?,?,?,?,?,?)`,
                [
                    userId,
                    canAlterUsers ? 1 : 0,
                    canAddCommands ? 1 : 0,
                    canRemoveCommands ? 1 : 0,
                    canRunCommands ? 1 : 0,
                    canStopCommands ? 1 : 0,
                ],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    removeDockerUser(userId) {
        Logger.log(`Removing user ${userId}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            DELETE FROM TrustedUsers
            WHERE user_id = ?`,
                [userId],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    getUserPermissions(userId) {
        Logger.log(`Checking user permissions for ${userId}`, MessageType.DEBUG);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
            SELECT *
            FROM TrustedUsers
            WHERE user_id = ?`,
                [userId],
                (err, rows) => {
                    if (err != null) {
                        console.log(err);
                        Logger.log(
                            `SQL Error: ${err?.message}; ${err.name}; ${err.cause}; ${err}`,
                            MessageType.WARNING
                        );
                        reject(null);
                        return;
                    } else if (rows.length == 0) {
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
                }
            );
        });
    }

    addDockerCommand(commandName, commandContents, notes = "-") {
        Logger.log(`Adding new command '${commandContents}' as '${commandName}'`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
                INSERT INTO DockerCommands (command_name, command_contents, notes)
                VALUES (?,?,?)`,
                [commandName, commandContents, notes],
                (err) => {
                    if (err != null) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                }
            );
        });
    }

    removeDockerCommand(commandName) {
        Logger.log(`Removing command ${commandName}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            this.sqliteDatabase.run(
                `
                DELETE FROM DockerCommands
                WHERE command_name = ?`,
                [commandName],
                (err) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(false);
                        return;
                    }

                    resolve(true);
                    return;
                }
            );
        });
    }

    getCommandContentsByName(commandName) {
        Logger.log(`Inspecting command ${commandName}`, MessageType.DEBUG);

        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT command_contents, notes
                FROM DockerCommands
                WHERE command_name = ?`,
                [commandName],
                (err, rows) => {
                    if (err || rows.length == 0) {
                        Logger.log(`SQL Error: ${err == null ? "No results" : err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows[0]);
                    return;
                }
            );
        });
    }

    getAllDockerCommands() {
        Logger.log("Inspecting all commands", MessageType.DEBUG);
        return new Promise((resolve, reject) => {
            this.sqliteDatabase.all(
                `
                SELECT command_name, command_contents, notes
                FROM DockerCommands`,
                (err, rows) => {
                    if (err) {
                        Logger.log(`SQL Error: ${err.message}`, MessageType.WARNING);
                        resolve(null);
                        return;
                    }

                    resolve(rows);
                    return;
                }
            );
        });
    }
}
