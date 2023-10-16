import discord from "discord.js";

import ApccgMessageCommand from "./apccg_message_command.js";

export default class CommandFixTwitterLinks extends ApccgMessageCommand {

    public pattern: RegExp = /qrd/

    public async execute(message: discord.Message): Promise<void> {
        message.reply("🤴🛐\n👽🤝\n🔮💭\n🇫🇷🤖✋\n🏰💰🌍\n👑🩸🌳\n🚀🌌🏙️ (🌆= Bogdangrad)\n🧬🔬🌍\n👶🎨✨\n🧠⚡🏔️🛸\n📜👼🌍🔧\n🤖🔍🌍\n🤖🪱👤\n👼🗣️📞🙏⛪\n🤝🔍❄️🛸\n🇫🇷🗣️⚡\n🏦💰🔐 (🏦❌💰, 🏦✅🤴)\n👥🕰️🌌\n🌌🌀🤝❓🕊️");
    }
}