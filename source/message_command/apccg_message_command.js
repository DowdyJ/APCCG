export default class ApccgMessageCommand {
    pattern = new RegExp("(?=a)(?!a)");

    isMatch(message) {
        return !!message.cleanContent.match(this.pattern);
    }

    async execute(message) {
        throw new Error('Unimplemented method "execute()"');
    }

    getTitle() {
        throw new Error("Unimplemented method GetTitle");
    }

    getDescription() {
        throw new Error("Unimplemented method GetDescription");
    }
}
