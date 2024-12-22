import xml2js from "xml2js";

export class XmlConvert {
  public static async parseAsync(str: string, options?: { stripPrefix?: boolean }): Promise<any> {
    return await xml2js.parseStringPromise(str, options?.stripPrefix ? {tagNameProcessors: [xml2js.processors.stripPrefix]} : {});
  }

  public static stringify(obj: any): string {
    const builder = new xml2js.Builder({renderOpts: {pretty: false}});
    return builder.buildObject(obj);
  }
}
