import discord from 'discord.js'
import { GatewayIntentBits } from 'discord.js';
import hmt from './hmt.json' assert { type: "json"}


import { CustomClient } from "./source/customclient.js"

let TOKEN : string = hmt.APCCG_BOT_TOKEN;
let ApplicationID : string = hmt.APPLICATION_ID;

let client : CustomClient = new CustomClient({ intents: [GatewayIntentBits.Guilds] }, TOKEN, ApplicationID);

client.on('ready', () => {
  console.log(`Logged in as ${client?.user?.tag}`);
});

client.on('interactionCreate', async (interaction : discord.Interaction) => {
  try {
    await client.ProcessCommandsAsync(interaction);
  }
  catch (err : any) {
    console.log(`Error occured in command ${(interaction as discord.CommandInteraction)?.commandName}. Details: ${err}`);
  }
});

await client.login(TOKEN);



