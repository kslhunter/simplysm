import {Exception} from "./Exception";

export class ArgumentsException extends Exception {
    public arguments: { [key: string]: any };

    public constructor(args: { [key: string]: any }) {
        super(`입력값이 잘못되었습니다. ${JSON.stringify(args)}`);
        this.arguments = args;
    }
}