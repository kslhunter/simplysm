declare module "jsftp" {
  import {Socket} from 'net';
  import {EventEmitter} from 'events';

  interface JsftpOpts {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    createSocket?: ({port, host}: { port: number, host: string }, firstAction: () => {}) => Socket;
    useList?: boolean;
  }

  type ErrorCallback = (err: Error) => void;
  type RawCallback = (err: Error, data: { code: number, text: string }) => void;
  type ListCallback = (err: Error, dirContents: string) => void;
  type GetCallback = (err: Error, socket: Socket) => void;
  type LsCallback = (err: Error, res: [{ name: string }]) => void;

  interface JSFtp extends EventEmitter {
    ls(filePath: string, callback: LsCallback): void;

    list(filePath: string, callback: ListCallback): void;

    get(remotePath: string, callback: GetCallback): void;

    get(remotePath: string, localPath: string, callback: ErrorCallback): void;

    put(source: string | Buffer | NodeJS.ReadableStream, remotePath: string, callback: ErrorCallback): void;

    rename(from: string, to: string, callback: ErrorCallback): void;

    // Ftp.raw(command, params, callback)
    raw(command: string, callback: RawCallback): void;

    raw(command: string, arg1: any, callback: RawCallback): void;

    raw(command: string, arg1: any, arg2: any, callback: RawCallback): void;

    raw(command: string, arg1: any, arg2: any, arg3: any, callback: RawCallback): void;

    raw(command: string, arg1: any, arg2: any, arg3: any, arg4: any, callback: RawCallback): void;

    keepAlive(timeInMs?: number): void;

    destroy(): void;
  }

  interface JSFtpConstructor {
    new(options: JsftpOpts): JSFtp;
  }

  const JSFtp: JSFtpConstructor;
  export = JSFtp;
}
