import discord from "discord.js";
import ApccgMessageCommand from "./apccg_message_command.js";
import { Logger, MessageType } from "../logger.js";
import fetch from "node-fetch";

export default class IfunnyMessageCommand extends ApccgMessageCommand {
    public pattern: RegExp = /https:\/\/ifunny\.co.*/;

    public isMatch(message: discord.Message): boolean {
        return !!message.cleanContent.match(this.pattern);
    }

    public async execute(message: discord.Message): Promise<void> {

        let newLink = await this.getIFunnyVideoUrl(message.cleanContent)
        if (newLink === "") {
            return;
        }
        await (message.channel as discord.TextChannel).send(`From ${message.author.username}:\n\n${newLink}`);
        await message.delete();
    }

    public getTitle(): string {
        return "ifunny Link Fix";
    }

    public getDescription(): string {
        return "Triggers on ifunny.co links. Retrieves video url.";
    }

    public async getIFunnyVideoUrl(siteUrl, retries = 10, delay = 3000) {
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
