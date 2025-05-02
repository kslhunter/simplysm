import { XMLBuilder, XMLParser } from "fast-xml-parser";

export class XmlConvert {
  static parse(str: string, options?: { stripTagPrefix?: boolean }) {
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
    return options?.stripTagPrefix ? this.#stripTagPrefix(result) : result;
  }

  static stringify(obj: any) {
    return new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      attributesGroupName: "$",
    }).build(obj);
  }

  static #stripTagPrefix(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.#stripTagPrefix(item));
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
          newObj[cleanKey] = this.#stripTagPrefix(value);
        }
      }

      return newObj;
    }
    else {
      return obj;
    }
  }
}