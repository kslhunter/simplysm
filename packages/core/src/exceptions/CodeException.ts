import {Exception} from "./Exception";

export class CodeException extends Exception {
    constructor(public code: string,
                message: string,
                public attributes?: { [key: string]: any }) {
        super(message);
    }
}