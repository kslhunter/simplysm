import * as stream from "stream";

export class SocketFileResult {
  public createdDateTime: Date;
  public size: number;
  public name: string;
  public stream: stream.PassThrough;

  public constructor(param: {
    name: string;
    stream: stream.PassThrough;
  }) {
    this.name = param.name;
    this.stream = param.stream;
    this.size = param.stream["_readableState"].length;
    this.createdDateTime = new Date();
  }
}
