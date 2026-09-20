import discord, { Attachment, TextChannel } from "discord.js";
import ApccgMessageCommand from "./apccg_message_command.js";
import fs from "fs";
import { execFile, spawn } from "child_process";

interface FfprobeStream {
    codec_name?: string;
}

interface FfprobeOutput {
    streams: FfprobeStream[];
}

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

        execFile("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_streams", url], (err, stdout) => {
            if (err) {
                console.error(err);
                return;
            }

            let metadata: FfprobeOutput;
            try {
                metadata = JSON.parse(stdout);
            } catch (parseErr) {
                console.error(parseErr);
                return;
            }

            const isH265 = metadata.streams.some((stream) => stream.codec_name === "hevc");
            if (!isH265) return;

            let statusMessage = message.reply({
                content: "Converting video...",
                allowedMentions: {
                    repliedUser: false,
                },
            });

            const output = `./tmp/video_data/${Math.round(Math.random() * 10000000)}.mp4`;

            // -y avoids ffmpeg blocking on an interactive overwrite prompt
            const ffmpegProcess = spawn("ffmpeg", ["-y", "-i", url, "-c:v", "libx264", output]);

            ffmpegProcess.on("error", function (err) {
                console.error("Error:", err);
            });

            ffmpegProcess.on("close", function (code) {
                if (code !== 0) {
                    console.error(`ffmpeg exited with code ${code}`);
                    return;
                }

                (message.channel as TextChannel)
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
            });
        });
    }
}
