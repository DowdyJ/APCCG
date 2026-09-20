import ApccgMessageCommand from "./apccg_message_command.js";
import fs from "fs";
import { execFile, spawn } from "child_process";

export default class CommandFixTwitterLinks extends ApccgMessageCommand {
    getTitle() {
        return "H265 Video Embed Fix";
    }

    getDescription() {
        return "Triggers on messages with one attachment that is an h265 format video. Converts to h264 and replaces original.";
    }

    isMatch(message) {
        if (message.attachments.size == 1) {
            let attach = message.attachments.first();
            return attach.contentType == "video/mp4";
        }

        return false;
    }

    async execute(message) {
        let attachment = message.attachments.first();

        const url = attachment.url;

        execFile("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_streams", url], (err, stdout) => {
            if (err) {
                console.error(err);
                return;
            }

            let metadata;
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
            });
        });
    }
}
