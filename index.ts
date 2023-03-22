import discord from 'discord.js'
import settings from './settings.json' assert { type: "json"}
import hmt from './hmt.json' assert { type: "json"}
import { CustomClient } from "./source/customclient.js"

let client = CustomClient.Instance();

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

await client.LogIn();



