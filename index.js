import { CustomClient } from "./source/customclient.js"
import { Logger, MessageType } from "./source/logger.js"

process.on('unhandledRejection', (err) => {
  Logger.log(`Unhandled rejection (ignored to keep the bot alive): ${err?.stack ?? err}`, MessageType.ERROR);
});

process.on('uncaughtException', (err) => {
  Logger.log(`Uncaught exception (ignored to keep the bot alive): ${err?.stack ?? err}`, MessageType.ERROR);
});

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
