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
|--------------------------------|------------------------------------------------------------------------|
| APPLICATION_ID                | The application id for the bot                                        |
| BOT_TOKEN                     | A Discord bot token for login                                         |
| ALT_BOT_APPLICATION_ID        | If USE_ALT_BOT is true, you will need this field. Takes an app id     |
| ALT_BOT_TOKEN                 | If USE_ALT_BOT is true, you will need this field. Takes a bot token   |

There is also a `settings.json` in the root folder with these options:

| Key               | Effect                                                                 |
|-------------------|-------------------------------------------------------------------------|
| USE_ALT_BOT       | Log in as the alt bot (ALT_BOT_TOKEN/ALT_BOT_APPLICATION_ID) instead   |
| DEBUG             | Enable debug-level logging                                            |
| VERBOSE_LOGGING   | Enable extra-verbose logging (voice connection internals, etc.)       |
| REGISTER_COMANDS  | Re-register slash commands with Discord on startup                    |

## Currently implemented commands

| Command                                                                              | Effect                                                                     |
|---------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| /help                                                                                | Show an interactive dropdown menu listing every command and its details     |
| /hello                                                                               | Sanity check to check bot responsiveness                                    |
| /coinflip [flip_times] [(Optional) heads_outcome] [(Optional) tails_outcome] [(Optional) no_fun_mode] | Flip a coin one or more times                                     |
| /roll [XdY]                                                                          | Roll a Y-sided dice X times                                                 |
| /kedama add [face]                                                                   | Add a kaomoji face to the dictionary                                        |
| /kedama roll                                                                         | Get a random registered kaomoji face                                        |
| /kedama list                                                                         | Browse all registered kaomoji as a paginated embed (10 per page)            |
| /custom add [command_name] [command_text] [(Optional) command_attachment]           | Add a new custom command                                                    |
| /custom remove [command_name]                                                       | Remove an existing custom command                                           |
| /custom invoke [command_name]                                                       | Invoke an existing custom command                                           |
| /custom list                                                                        | Browse all custom commands in an interactive dropdown viewer (previews text/images/gifs/audio, cycles between multiple outputs for a command with the arrow buttons) |
| /configure twitter_fix_url [replacement_url]                                        | Set the domain twitter.com/x.com links get rewritten to (persisted)         |
| /radio play [stream_name]                                                           | Join your voice channel and play the named stream                          |
| /radio stop                                                                         | Stop playing and leave the voice channel                                    |
| /radio list                                                                         | List all available radio stations                                           |
| /radio add [stream_name] [stream_url]                                              | Add a radio stream to the list                                              |
| /radio remove [stream_name]                                                         | Remove a radio stream from the list                                         |
| /docker add [name] [command] [(Optional) notes]                                    | Register a new Docker command                                               |
| /docker remove [name]                                                               | Remove a registered Docker command                                          |
| /docker run [name]                                                                  | Run a registered Docker command                                             |
| /docker stop [name]                                                                 | Stop a running container                                                    |
| /docker info [name]                                                                 | Show details about a registered Docker command                              |
| /docker status                                                                      | Show running containers and available commands                             |
| /docker op [user] [permission flags]                                               | Grant a user Docker operator permissions                                    |
| /docker de-op [user]                                                                | Remove a user's Docker operator permissions                                 |
| ->[command name] or ~>[command name]                                               | Shorthand for invoking a custom command without typing `/custom invoke`     |

## Other Utilities
It automatically replaces twitter.com and x.com links with the configured domain (default `vxtwitter.com`, changeable via `/configure twitter_fix_url`), allowing for embeds in Discord.
It automatically replaces ifunny.co links with a direct link to the underlying video.
It converts H265 mp4 videos to H264, also allowing for embeds.
It responds to messages containing "qrd" with a quick rundown for a modern audience.

## License
This project is licensed under the GPL-3.0 license.
