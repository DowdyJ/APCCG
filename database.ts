const sqlite3 = require('sqlite3').verbose();



export class Database {
    private static db = new sqlite3.Database(':memory:', (err : any) => {
        if (err != null)
            console.log(`Error creating database: ${err}`);
        
        console.log("Database created.");
    });
    
    public static Init() : void {
        Database.db.Execute('CREATE TABLE IF NOT EXISTS users (discordId INTEGER PRIMARY KEY, points NUMBER, lastDailyTime NUMBER)');
    }

    public async GetUserData(userID : string) : Promise<boolean> {


        return true;
    }

    public async SetKeyForUser(userID : string, key : string, value : string) : Promise<boolean> {
        Database.db.Execute('');

        return true;
    }
}