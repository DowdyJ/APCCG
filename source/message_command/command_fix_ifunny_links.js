import ApccgMessageCommand from "./apccg_message_command.js";
import { Logger, MessageType } from "../logger.js";

export default class IfunnyMessageCommand extends ApccgMessageCommand {
    pattern = /https:\/\/ifunny\.co.*/;

    isMatch(message) {
        return !!message.cleanContent.match(this.pattern);
    }

    async execute(message) {

        let newLink = await this.getIFunnyVideoUrl(message.cleanContent)
        if (newLink === "") {
            return;
        }
        await message.channel.send(`From ${message.author.username}:\n\n${newLink}`);

        try {
            await message.delete();
        } catch (err) {
            // Expected sometimes - another bot in the server may already have deleted the
            // original link message (e.g. a moderation bot reacting to the same link).
            Logger.log(`Could not delete original message (likely already removed): ${err.message}`, MessageType.VERBOSE);
        }
    }

    getTitle() {
        return "ifunny Link Fix";
    }

    getDescription() {
        return "Triggers on ifunny.co links. Retrieves video url.";
    }

    async getIFunnyVideoUrl(siteUrl, retries = 10, delay = 3000) {
        const url = siteUrl;
        Logger.log(`Converting link: ${siteUrl}`)

        const abortController = new AbortController();

        try {
          let timeout = setTimeout(() => {abortController.abort()}, delay);

          const response = await fetch(url, {
              headers: {
                  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0",
                  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                  "Accept-Language": "en-US,en;q=0.5",
                  "Sec-GPC": "1",
                  "Upgrade-Insecure-Requests": "1",
                  "Sec-Fetch-Dest": "document",
                  "Sec-Fetch-Mode": "navigate",
                  "Sec-Fetch-Site": "none",
                  "Sec-Fetch-User": "?1",
                  "Priority": "u=0, i"
              },
              method: "GET",
              signal:abortController.signal
          })

          clearTimeout(timeout);

          Logger.log("Finished fetching page.")
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }

          const html = await response.text();
          const startIndex = html.indexOf("data-src=", html.indexOf("<video")) + 10; // The length of the attribute and quote
          const endIndex = html.indexOf("\"", startIndex);
          const videoUrl = html.substring(startIndex, endIndex);

          return videoUrl;
        } catch (error) {
            console.log("Fetch failed with error: ");
            console.log(error.message);
            let retryValue = "";
            if (retries > 0) {
                retryValue = await this.getIFunnyVideoUrl(siteUrl, retries - 1, delay);
            }
          return retryValue;
        }
      }
}
