// tslint:disable

declare module "jsftp" {
  import {Readable} from "stream";
  import {EventEmitter} from "events";

  interface JSFtpOptions {
    host: string;
    port?: number | 21;
    user?: string | "anonymous";
    pass?: string | "@anonymous";
    useList?: boolean;
  }

  type JSFtpCallback<T> = (err: any, result: T) => void;

  interface JSFtpEntry {
    name: string;
    size: number;
    time: number;
    type: 0 | 1;
  }

  interface JSFtp extends EventEmitter {
    auth(user: string, password: string, callback: JSFtpCallback<void>): void;

    keepAlive(wait?: number): void;

    ls(path: string, callback: JSFtpCallback<JSFtpEntry[]>): void;

    list(path: string, callback: JSFtpCallback<any>): void;

    put(buffer: Buffer, path: string, callback: JSFtpCallback<void>): void;

    get(path: string, callback: JSFtpCallback<Readable>): void;

    setType(type: "A" | "AN" | "AT" | "AC" | "E" | "I" | "L", callback: JSFtpCallback<any>): void;

    raw(command: string, args: any[], callback: JSFtpCallback<void>): void;

    raw<T>(command: string, args: any[], callback: JSFtpCallback<T>): void;
  }

  interface JSFtpConstructor {
    new(options: JSFtpOptions): JSFtp;
  }

  const JSFtp: JSFtpConstructor;
  export = JSFtp;
}