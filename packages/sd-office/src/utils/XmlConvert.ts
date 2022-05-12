import xml2js from "xml2js";
import { stripPrefix } from "xml2js/lib/processors";

export class XmlConvert {
  public static async parseAsync(str: string, options?: { stripPrefix?: boolean }): Promise<any> {
    return await new Promise<any>((resolve, reject) => {
      xml2js.parseString(str, options?.stripPrefix ? { tagNameProcessors: [stripPrefix] } : {}, (err: Error | null, parsed) => {
        if (err != null) {
          reject(err);
          return;
        }
        resolve(parsed);
      });
    });
  }

  public static stringify(obj: any): string {
    const builder = new xml2js.Builder({ renderOpts: { pretty: false } });
    return builder.buildObject(obj);
  }
}
