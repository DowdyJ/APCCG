import { CustomClient } from "./source/customclient.js"

let client = CustomClient.instance();

client.on('ready', () => {
  console.log(`Logged in as ${client?.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    await client.processCommandsAsync(interaction);
  }
  catch (err) {
    console.log(`Error occured in command ${(interaction)?.commandName}. Details: ${err}`);
  }
});

await client.logInWrapper();
