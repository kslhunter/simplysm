declare module "iconv" {
  namespace Iconv {
    interface Static {

      new(fromEncoding: string, toEncoding: string): Iconv;

      (fromEncoding: string, toEncoding: string): Iconv;
    }

    interface Iconv extends NodeJS.WritableStream {
      writable: boolean;

      convert(input: string | Buffer, encoding?: string): Buffer;

      write(buffer: Buffer | string, cb?: Function): boolean;

      write(input: string | Buffer, encoding?: string): boolean;

      write(str: string, encoding?: string, cb?: Function): boolean;

      end(): void;

      end(input?: string | Buffer, encoding?: string): void;

      end(buffer: Buffer, cb?: Function): void;

      end(str: string, cb?: Function): void;

      end(str: string, encoding?: string, cb?: Function): void;

      // copy from stream.Stream
      pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    }
  }

  const Iconv: { Iconv: Iconv.Static };
  export = Iconv;
}