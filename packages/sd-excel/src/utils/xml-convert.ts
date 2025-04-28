import { XMLBuilder, XMLParser } from "fast-xml-parser";

export class XmlConvert {
  public static parse(str: string, options?: { stripTagPrefix?: boolean }) {
    const result = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      attributesGroupName: "$",
      parseAttributeValue: false,
      parseTagValue: false,
      isArray: (tagName: string, jPath: string, isLeafNode: boolean, isAttribute: boolean) => {
        return !isAttribute && jPath.split(".").length > 1;
      },
    }).parse(str);
    return options?.stripTagPrefix ? this._stripTagPrefix(result) : result;
  }

  public static stringify(obj: any) {
    return new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      attributesGroupName: "$",
    }).build(obj);
  }

  private static _stripTagPrefix(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this._stripTagPrefix(item));
    }
    else if (typeof obj === "object" && obj !== null) {
      const newObj: any = {};

      for (const key in obj) {
        const value = obj[key];

        // Attribute는 prefix를 제거하면 안 된다.
        if (key === "$") {
          newObj[key] = value;
        }
        else {
          // 태그 이름에서만 ":"을 기준으로 prefix 제거
          const cleanKey = key.includes(":") ? key.split(":")[1] : key;
          newObj[cleanKey] = this._stripTagPrefix(value);
        }
      }

      return newObj;
    }
    else {
      return obj;
    }
  }
}

/*import xml2js from "xml2js";

export class XmlConvert {
  public static async parseAsync(str: string, options?: { stripPrefix?: boolean }): Promise<any> {
    return await xml2js.parseStringPromise(str, options?.stripPrefix ? {tagNameProcessors: [xml2js.processors.stripPrefix]} : {});
  }

  public static stringify(obj: any): string {
    const builder = new xml2js.Builder({renderOpts: {pretty: false}});
    return builder.buildObject(obj);
  }
}*/