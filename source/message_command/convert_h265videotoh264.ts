import discord, { Attachment, Message } from "discord.js";
import ffmpeg from "fluent-ffmpeg";
import ApccgMessageCommand from "./apccg_message_command.js";
import fs from "fs";

export default class CommandFixTwitterLinks extends ApccgMessageCommand {
    public override getTitle(): string {
        return "H265 Video Embed Fix";
    }

    public override getDescription(): string {
        return "Triggers on messages with one attachment that is an h265 format video. Converts to h264 and replaces original.";
    }

    public override isMatch(message: discord.Message): boolean {
        if (message.attachments.size == 1) {
            let attach = message.attachments.first() as Attachment;
            return attach.contentType == "video/mp4";
        }

        return false;
    }

    public override async execute(message: discord.Message): Promise<void> {
        let attachment = message.attachments.first() as Attachment;

        const url = attachment.url;

        ffmpeg.ffprobe(url, function (err, metadata) {
            if (err) {
                console.error(err);
                return;
            }

            const isH265 = metadata.streams.some((stream) => stream.codec_name === "hevc");
            if (isH265) {
                let statusMessage = message.reply({
                    content: "Converting video...",
                    allowedMentions: {
                        repliedUser: false,
                    },
                });

                const output = `./tmp/video_data/${Math.round(Math.random() * 10000000)}.mp4`;

                ffmpeg(url)
                    .videoCodec("libx264")
                    .on("end", function () {
                        message.channel
                            .send({
                                content: `From ${message.author.username}:`,
                                files: [`${output}`],
                                allowedMentions: {
                                    repliedUser: false,
                                },
                            })
                            .then(() => {
                                statusMessage.then((sm) => {
                                    sm.delete();
                                });
                                message.delete();

                                fs.rm(output, () => {});
                            });
                    })
                    .on("error", function (err) {
                        console.error("Error:", err);
                    })
                    .save(output);
            }
        });
    }
}
