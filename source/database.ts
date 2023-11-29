import sqlite3, { RunResult } from "sqlite3";
import { Logger, MessageType } from "./logger.js";

interface UserPermissions {
    canAlterUsers: boolean;
    canRunCommands: boolean;
    canStopContainers: boolean;
    canAddCommands: boolean;
    canRemoveCommands: boolean;
}

export default class Database {
    private static dbinstance: Database | null = null;
    private sqliteDatabase: sqlite3.Database;
    private constructor() {
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

    public static instance(): Database {
        if (Database.dbinstance == null) {
            Database.dbinstance = new Database();
            Database.dbinstance.createTablesIfNotExist();
        }

        return Database.dbinstance;
    }

    public createTablesIfNotExist(): void {
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
    }

    public addDockerUser(
        userId: string,
        canAlterUsers: boolean,
        canAddCommands: boolean,
        canRemoveCommands: boolean,
        canRunCommands: boolean,
        canStopCommands: boolean
    ): Promise<boolean> {
        Logger.log(`Adding user ${userId}`, MessageType.DEBUG);

        return new Promise<boolean>((resolve, reject) => {
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
                (err: Error | null) => {
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

    public removeDockerUser(userId: string): Promise<boolean> {
        Logger.log(`Removing user ${userId}`, MessageType.DEBUG);

        return new Promise<boolean>((resolve, reject) => {
            this.sqliteDatabase.run(
                `
            DELETE FROM TrustedUsers
            WHERE user_id = ?`,
                [userId],
                (err: Error | null) => {
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

    public getUserPermissions(userId: string): Promise<UserPermissions> {
        Logger.log(`Checking user permissions for ${userId}`, MessageType.DEBUG);
        return new Promise<UserPermissions>((resolve, reject) => {
            this.sqliteDatabase.all(
                `
            SELECT * 
            FROM TrustedUsers
            WHERE user_id = ?`,
                [userId],
                (err: Error | null, rows: unknown[]): void => {
                    if (err != null) {
                        console.log(err);
                        Logger.log(
                            `SQL Error: ${err?.message}; ${err.name}; ${err.cause}; ${err}`,
                            MessageType.WARNING
                        );
                        reject(null);
                        return;
                    } else if (rows.length == 0) {
                        let noPerms: UserPermissions = {
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
                    let userPerms: UserPermissions = {
                        canAlterUsers: ((userPermData as any).can_alter_users as number) == 1,
                        canRunCommands: ((userPermData as any).can_run_commands as number) == 1,
                        canStopContainers: ((userPermData as any).can_stop_commands as number) == 1,
                        canAddCommands: ((userPermData as any).can_add_commands as number) == 1,
                        canRemoveCommands: ((userPermData as any).can_remove_commands as number) == 1,
                    };
                    resolve(userPerms);
                    return;
                }
            );
        });
    }

    public addDockerCommand(commandName: string, commandContents: string, notes: string = "-"): Promise<boolean> {
        Logger.log(`Adding new command '${commandContents}' as '${commandName}'`, MessageType.DEBUG);

        return new Promise<boolean>((resolve, reject) => {
            this.sqliteDatabase.run(
                `
                INSERT INTO DockerCommands (command_name, command_contents, notes) 
                VALUES (?,?,?)`,
                [commandName, commandContents, notes],
                (err: Error | null) => {
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

    public removeDockerCommand(commandName: string): Promise<boolean> {
        Logger.log(`Removing command ${commandName}`, MessageType.DEBUG);

        return new Promise<boolean>((resolve, reject) => {
            this.sqliteDatabase.run(
                `
                DELETE FROM DockerCommands 
                WHERE command_name = ?`,
                [commandName],
                (err: Error | null) => {
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

    public getCommandContentsByName(commandName: string): Promise<object | null> {
        Logger.log(`Inspecting command ${commandName}`, MessageType.DEBUG);

        return new Promise<object | null>((resolve, reject) => {
            this.sqliteDatabase.all<object>(
                `
                SELECT command_contents, notes 
                FROM DockerCommands
                WHERE command_name = ?`,
                [commandName],
                (err: Error | null, rows: object[]) => {
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

    public getAllDockerCommands(): Promise<object[] | null> {
        Logger.log("Inspecting all commands", MessageType.DEBUG);
        return new Promise<object[] | null>((resolve, reject) => {
            this.sqliteDatabase.all<string>(
                `
                SELECT command_name, command_contents, notes 
                FROM DockerCommands`,
                (err: Error | null, rows: object[]) => {
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
