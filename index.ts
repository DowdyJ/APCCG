import discord from 'discord.js'
import { GatewayIntentBits } from 'discord.js';
import hmt from './hmt.json' assert { type: "json"}


import { CustomClient } from "./source/customclient.js"

let TOKEN : string = hmt.discordBotKey;
let ApplicationID : string = hmt.applicationID;

let client : CustomClient = new CustomClient({ intents: [GatewayIntentBits.Guilds] }, TOKEN, ApplicationID);

client.on('ready', () => {
  console.log(`Logged in as ${client?.user?.tag}!`);
});

client.on('interactionCreate', async (interaction : discord.Interaction) => {
  await client.ProcessCommandsAsync(interaction);
});

await client.login(TOKEN);



