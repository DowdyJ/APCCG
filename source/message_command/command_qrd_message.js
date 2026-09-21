import ApccgMessageCommand from "./apccg_message_command.js";

export default class CommandQRD extends ApccgMessageCommand {
    pattern = /qrd/;

    async execute(message) {
        message.reply(
            "🤴🛐\n👽🤝\n🔮💭\n🇫🇷🤖✋\n🏰💰🌍\n👑🩸🌳\n🚀🌌🏙️ (🌆= Bogdangrad)\n🧬🔬🌍\n👶🎨✨\n🧠⚡🏔️🛸\n📜👼🌍🔧\n🤖🔍🌍\n🤖🪱👤\n👼🗣️📞🙏⛪\n🤝🔍❄️🛸\n🇫🇷🗣️⚡\n🏦💰🔐 (🏦❌💰, 🏦✅🤴)\n👥🕰️🌌\n🌌🌀🤝❓🕊️"
        );
    }

    getTitle() {
        return "Bog Pill";
    }

    getDescription() {
        return "Triggers on 'qrd'. Gives the quick rundown for a modern audience.";
    }
}
