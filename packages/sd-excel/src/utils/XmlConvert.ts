import * as xml2js from "xml2js";

export class XmlConvert {
  public static async parseAsync(str: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      xml2js.parseString(str, (err, parsed) => {
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