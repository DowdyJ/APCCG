import ApccgMessageCommand from "./apccg_message_command.js";
import Database from "../database.js";
import { Logger, MessageType } from "../logger.js";

// The default domain x.com/twitter.com links get rewritten to, used until someone sets a
// different one via /configure twitter_fix_url. Safe to be any value, including a domain that
// itself contains "x.com" or "twitter.com" (e.g. "fixupx.com") - the replacement below runs as
// a single pass via a callback, so it can never re-match text it just inserted. The old chained
// `.replace("twitter.com", X).replace("x.com", X)` approach could NOT make that guarantee:
// switching X to "fixupx.com" turned "twitter.com" links into "fixupfixupx.com".
const DEFAULT_LINK_BASE = "vxtwitter.com";

const TWITTER_LINK_PATTERN = /https?:\/\/(?:www\.)?(?:x|twitter)\.com(\S*)/gi;

export default class CommandFixTwitterLinks extends ApccgMessageCommand {
    pattern = /https?:\/\/(?:www\.)?(?:x|twitter)\.com/i;

    async execute(message) {
        const configuredBase = await Database.instance().getTwitterReplacementUrl();
        const linkBase = configuredBase || DEFAULT_LINK_BASE;

        const newLink = message.cleanContent.replace(
            TWITTER_LINK_PATTERN,
            (_match, rest) => `https://${linkBase}${rest}`
        );
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
        return "Twitter Link Fix";
    }

    getDescription() {
        return `Triggers on twitter.com or x.com links. Converts to the configured domain (default: ${DEFAULT_LINK_BASE}). Change with /configure twitter_fix_url.`;
    }
}
