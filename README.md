# APCCG

This is a simple Discord bot with a set of Discord server utilities. 

## Installation
Requires Node.js 22.5.0 or later (for the built-in <code>node:sqlite</code> module).
This repo also pins a <code>min-release-age</code> in <code>.npmrc</code> so <code>npm install</code> refuses freshly-published dependency versions (a defense against supply chain attacks) &mdash; that setting is silently ignored on npm older than 11.10.0, so run <code>npm install -g npm@11</code> first if `npm --version` reports something older.
To use the video conversion feature, you will need to have ffmpeg/ffprobe installed.
Otherwise, simply run <code>npm install</code> in the root of the project. Then, to run the bot, run <code>node index.js</code>
Alternatively, you can use Docker. For that, simply run <code>./build_image.sh</code> and <code>./run_container.sh</code>

For the bot to run you will need a file called "hmt.json" in the root folder. It should have these entries:

| Key                           | Value                                                                 |
|-------------------------------|-----------------------------------------------------------------------|
| APPLICATION_ID                | THe application id for the bot                                        |
| BOT_TOKEN                     | A Discord bot token for login                                         |
| ALT_BOT_APPLICATION_ID        | If USE_ALT_BOT is true, you will need this field. Takes an APP id     |
| ALT_BOT_TOKEN                 | If USE_ALT_BOT is true, you will need this field. Takes an bot token  |

## Currently implemented commands

| Command                                                        | Effect                                                                     |
|----------------------------------------------------------------|----------------------------------------------------------------------------|
| /help                                                          | Show a help message                                                        |
| /hello                                                         | Sanity check to check bot responsiveness                                   |
| /docker add [command_name] [docker_command] [(Optional) notes] | Add a "docker run" command                                                 |
| /docker remove [command_name]                                  | Remove an existing command                                                 |
| /docker run [command_name]                                     | Run an available command                                                   |
| /docker stop [command_name]                                    | Stop a running container                                                   |
| /docker status                                                 | See running containers and available commands                              |
| /docker op [user]                                              | Add permissions to a user                                                  |
| /docker de-op [user]                                           | Remove permissions from a user                                             |
| /listenmoe play [music stream option]                          | Join a channel and play the stream specified (jpop/kpop)                   |
| /listenmoe stop                                                | Stop playing music leave the channel                                       |

## Other Utilities
It will automatically replace twitter.com and x.com links with vxtwitter.com, allowing for embeds in Discord.
It will convert H265 mp4 videos to H264, also allowing for embeds.

## License
This project is licensed under the GPL-3.0 license.
