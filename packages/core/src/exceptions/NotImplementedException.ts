import {Exception} from "./Exception";

export class NotImplementedException extends Exception {
    constructor(message?: string) {
        super(message || "Not implemented");
    }
}
