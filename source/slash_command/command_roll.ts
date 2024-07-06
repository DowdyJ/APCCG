import { CommandInteraction, InteractionType, SlashCommandBuilder, range } from "discord.js";
import discord from "discord.js";
import ApccgSlashCommand from "./apccg_slash_command.js";
import { Logger } from "../logger.js";

export default class CommandRoll extends ApccgSlashCommand {
    public override disabled(): boolean {
        return false;
    }

    public override commandData(): any {
        return new SlashCommandBuilder().setName("roll").setDescription("roll a dice")
            .addStringOption((input) => input.setRequired(true).setDescription("Roll a Y sided dice X times (XdY)").setName("dice_string").setMinLength(3));
    }

    public override async execute(args: any[]): Promise<boolean> {
        const interaction = args[0] as discord.CommandInteraction;

        // Filters down command type so that getSubcommand() will work
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.isChatInputCommand()) return false;

        const diceString = interaction.options.getString("dice_string");
        const rollData = this.parseRollString(diceString);

        if (rollData == null || rollData.maxValue === undefined || rollData.count === undefined || rollData.maxValue === 0 || rollData.count === 0) {
            interaction.reply(`(                                 
            )                               /=>
           (  +__//_ / /|
            .''.__'.      / /|/\
           : () :              :\ ----|    \ )
            '..'__.'0|----|      \
                             0_0//        \
                                 |----    /----\
                                 -\ --|      \
                                    \      \
                                 \// '|      \
         Bang! Bang!                     .'/       |
                                        .:/        |
                                        :/__| triad sends their regards`);
            return false;
        }

        const resultNumbers = this.rollDice(rollData.maxValue, rollData.count);
        let resultNumberString = "";

        for (let i = 0; i < resultNumbers.length; i++) {
            resultNumberString += resultNumbers[i];
            if (i !== resultNumbers.length - 1) {
                resultNumberString += ", ";
            }
        }

        const replyString = `${rollData.count}d${rollData.maxValue}: ${resultNumberString}`;
        if (replyString.length >= 2000) {
            interaction.reply("Result too long for Discord :[");
            return false;
        }

        interaction.reply(`${rollData.count}d${rollData.maxValue}: ${resultNumberString}`);

        return true;
    }

    public override getTitle(): string {
        return "Roll";
    }

    public override getDescription(): string {
        return `**/roll** [XdY] -> Roll a Y sided dice X times`;
    }

    private parseRollString(rollString: string): RollData {
        const isNumberChar = (char: string) => { return char.charCodeAt(0) > 47 && char.charCodeAt(0) < 58 };

        let rollCountSring = "";
        let diceSizeString = "";

        let index = 0;
        while (index < rollString.length && isNumberChar(rollString.charAt(index))) {
            rollCountSring += rollString.charAt(index);
            index++;
        }

        index++;
        
        while (index < rollString.length && isNumberChar(rollString.charAt(index))) {
            diceSizeString += rollString.charAt(index);
            index++;
        }
        let count = parseInt(rollCountSring);
        let maxVal = parseInt(diceSizeString);

        Logger.log(`Count: ${count}, Max ${maxVal}`);
        if (Number.isNaN(count) || Number.isNaN(maxVal)) {
            return { maxValue: undefined, count: undefined};
        }
        return { maxValue: maxVal, count: count };
    }

    private rollDice(diceMax: number, diceCount: number) : Array<number> {
        let result = [];

        for (const i of range(diceCount)) {
            result.push(Math.floor(Math.random() * diceMax) + 1);
        }
        console.log(result);

        return result;
    }
}

interface RollData {
    maxValue: number;
    count: number;
}
