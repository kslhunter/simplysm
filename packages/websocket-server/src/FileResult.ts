import {PassThrough} from "stream";

export class FileResult {
  public size: number;
  public createdAtDateTime: Date;

  public constructor(public name: string,
                     public stream: PassThrough) {
    this.size = stream["_readableState"].length;
    this.createdAtDateTime = new Date();
  }
}