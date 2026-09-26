import ApccgMessageCommand from "./apccg_message_command.js";
import Database from "../database.js";
import { Logger, MessageType } from "../logger.js";

// Instagram embed-fixer mirrors flip in and out of service unpredictably (the original
// ddinstagram.com project is archived/unmaintained), so unlike the Twitter fixer we can't
// trust a single hardcoded domain. Instead we try these in order and post the first one
// that actually returns a working embed.
const MIRROR_DOMAINS = [
    "kkinstagram.com",
    "ddinstagram.com",
    "uuinstagram.com",
    "toinstagram.com",
    "gginstagram.com",
    "instagramfix.com",
    "ddinsta.ir",
    "eeinstagram.com",
    "vxinstagram.com",
    "iaxxis.gay",
];

// Sits behind Cloudflare bot-fight-mode, which challenges our validation request before it
// ever reaches oginstagram's own app (see the cf-mitigated handling in isEmbedFunctional()).
// We can't tell a real "post not found" apart from that challenge, so we can only trust it
// blindly - kept out of MIRROR_DOMAINS entirely (out of the parallel race too, since a pure
// race would let it win on raw speed regardless of rank) and only tried as an explicit final
// step once every mirror we can actually verify has failed.
const LAST_RESORT_DOMAIN = "oginstagram.com";

const INSTAGRAM_LINK_PATTERN = /https?:\/\/(?:www\.)?instagram\.com(\S*)/i;
const OG_MEDIA_TAG_PATTERN = /<meta[^>]+property=["'](?:og:video(?::url)?|og:image)["'][^>]+content=["']([^"']+)["']/i;

const FETCH_TIMEOUT_MS = 5000;

export default class CommandFixInstagramLinks extends ApccgMessageCommand {
    pattern = /https?:\/\/(?:www\.)?instagram\.com\/\S*/i;

    async execute(message) {
        const match = message.cleanContent.match(INSTAGRAM_LINK_PATTERN);
        if (!match) return;

        // Instagram's share button appends per-user tracking params (igsh, stkn, etc.) that
        // mirrors ignore entirely (verified: identical results with or without them) - drop
        // them so neither the candidate URLs nor the final posted link carry that along.
        const path = match[1].split("?")[0];

        const newLink = await this.findWorkingMirror(path);
        if (!newLink) {
            Logger.log("No Instagram mirror returned a functional embed; leaving original message alone.", MessageType.WARNING);
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

    async findWorkingMirror(path) {
        const parallelSetting = await Database.instance().getInstagramParallelMode();
        const parallelEnabled = parallelSetting === "true";

        return parallelEnabled
            ? await this.findWorkingMirrorParallel(path)
            : await this.findWorkingMirrorSequential(path);
    }

    async findWorkingMirrorSequential(path) {
        for (const domain of MIRROR_DOMAINS) {
            const candidateUrl = `https://${domain}${path}`;
            if (await this.isEmbedFunctional(candidateUrl)) {
                return candidateUrl;
            }
        }
        return await this.tryLastResort(path);
    }

    async findWorkingMirrorParallel(path) {
        // Promise.any resolves as soon as the first candidate fulfills, so latency is bounded
        // by whichever mirror answers fastest instead of the sum of every timeout in the chain
        // - it does NOT respect MIRROR_DOMAINS priority order, since the whole point is to stop
        // waiting on a slow/blocked mirror once a later one has already come back functional.
        const attempts = MIRROR_DOMAINS.map(async (domain) => {
            const candidateUrl = `https://${domain}${path}`;
            const isFunctional = await this.isEmbedFunctional(candidateUrl);
            if (!isFunctional) throw new Error(`${domain} not functional`);
            return candidateUrl;
        });

        try {
            return await Promise.any(attempts);
        } catch {
            // AggregateError - every candidate rejected (none were functional).
            return await this.tryLastResort(path);
        }
    }

    async tryLastResort(path) {
        const candidateUrl = `https://${LAST_RESORT_DOMAIN}${path}`;
        return (await this.isEmbedFunctional(candidateUrl)) ? candidateUrl : null;
    }

    async isEmbedFunctional(url) {
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

        try {
            // "manual" is load-bearing: when a mirror can't resolve a post it typically 302s
            // either straight back to the real instagram.com (a login wall with no usable OG
            // tags) or directly to a raw CDN media file. Following either of those would make
            // us validate the wrong response instead of the mirror's own - so any redirect here
            // is treated as that mirror failing, not as something to chase.
            const response = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" },
                redirect: "manual",
                signal: abortController.signal,
            });
            if (!response.ok) {
                // Some mirrors sit behind Cloudflare bot-fight-mode, which challenges our plain
                // server-side request (no JS engine to solve it) before it ever reaches the
                // mirror's own app - Cloudflare marks this with a `cf-mitigated: challenge`
                // response header. That tells us nothing about whether the mirror itself is
                // working; Discord's own crawler is typically allowlisted past it and fetches
                // fine even when we can't. Treat it as unverifiable-but-probably-fine rather
                // than a real failure, instead of permanently skipping the mirror.
                if (response.headers.get("cf-mitigated") === "challenge") {
                    Logger.log(`Mirror check for ${url} was Cloudflare-challenged (status ${response.status}); can't verify from here, trusting it anyway.`, MessageType.DEBUG);
                    return true;
                }

                Logger.log(`Mirror check for ${url} did not validate (status ${response.status}).`, MessageType.DEBUG);
                return false;
            }

            const html = await response.text();
            const isFunctional = OG_MEDIA_TAG_PATTERN.test(html);
            Logger.log(`Mirror check for ${url}: ${isFunctional ? "functional" : "no og:image/og:video tag found"}.`, MessageType.DEBUG);
            return isFunctional;
        } catch (err) {
            Logger.log(`Mirror check failed for ${url}: ${err.message}`, MessageType.DEBUG);
            return false;
        } finally {
            clearTimeout(timeout);
        }
    }

    getTitle() {
        return "Instagram Link Fix";
    }

    getDescription() {
        return `Triggers on instagram.com links. Tries mirrors (${MIRROR_DOMAINS.join(", ")}), falling back to ${LAST_RESORT_DOMAIN} only if all of those fail, and posts whichever one returns a working embed. `
            + `Order/racing controlled by /configure instagram_parallel_mode (default: sequential, in priority order).`;
    }
}
