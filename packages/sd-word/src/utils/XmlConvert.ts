import xml2js from "xml2js";
import { stripPrefix } from "xml2js/lib/processors";

export class XmlConvert {
  public static async parseAsync(str: string, options?: { stripPrefix?: boolean }): Promise<any> {
    return await xml2js.parseStringPromise(str, options?.stripPrefix ? { tagNameProcessors: [stripPrefix] } : {});
  }

  public static stringify(obj: any): string {
    const builder = new xml2js.Builder({ renderOpts: { pretty: false } });
    return builder.buildObject(obj);
  }
}
