import {Exception} from "./Exception";
import {JsonConvert} from "..";

export class ArgumentsException extends Exception {
    arguments: { [key: string]: any };

    constructor(args: { [key: string]: any }) {
        super("입력값이 잘못되었습니다: " + JsonConvert.stringify(args, {space: 2}));
        this.arguments = args;
    }
}