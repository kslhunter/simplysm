import * as stream from "stream";

export class SocketFileResult {
    createdDateTime: Date;
    size: number;
    name: string;
    stream: stream.PassThrough;

    constructor(param: {
        name: string;
        stream: stream.PassThrough;
    }) {
        this.name = param.name;
        this.stream = param.stream;
        this.size = param.stream["_readableState"]["length"];
        this.createdDateTime = new Date();
    }
}
