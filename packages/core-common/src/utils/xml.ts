/**
 * XML conversion utility
 */
import type { XmlBuilderOptions } from "fast-xml-parser";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

//#region parse

/**
 * Parse XML string into an object
 * @param str XML string
 * @param options Options
 * @param options.stripTagPrefix Whether to remove tag prefix (namespace)
 * @returns Parsed object. Structure:
 *   - Attributes: grouped in `$` object
 *   - Text nodes: stored in `_` key
 *   - Child elements: converted to array (except root element)
 * @example
 * xmlParse('<root id="1"><item>hello</item></root>');
 * // { root: { $: { id: "1" }, item: [{ _: "hello" }] } }
 */
export function xmlParse(str: string, options?: { stripTagPrefix?: boolean }): unknown {
  const result = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "$",
    parseAttributeValue: false,
    parseTagValue: false,
    textNodeName: "_",
    isArray: (_tagName: string, jPath: string, _isLeafNode: boolean, isAttribute: boolean) => {
      return !isAttribute && jPath.split(".").length > 1;
    },
  }).parse(str) as unknown;
  return options?.stripTagPrefix ? stripTagPrefix(result) : result;
}

//#endregion

//#region stringify

/**
 * Serialize object to XML string
 * @param obj Object to serialize
 * @param options fast-xml-parser XmlBuilderOptions (optional)
 * @returns XML string
 * @example
 * xmlStringify({
 *   root: {
 *     $: { id: "1" },
 *     item: [{ _: "hello" }, { _: "world" }],
 *   },
 * });
 * // '<root id="1"><item>hello</item><item>world</item></root>'
 */
export function xmlStringify(obj: unknown, options?: XmlBuilderOptions): string {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "$",
    suppressBooleanAttributes: false,
    textNodeName: "_",
    ...options,
  }).build(obj);
}

//#endregion

//#region private

/**
 * Remove namespace prefix from tag name
 * @note Removes the namespace prefix in the format "ns:tag" from XML parsing results, leaving only the tag name.
 *       This allows consistent access to XML data without considering namespace.
 *       However, attributes are kept with their prefix.
 */
function stripTagPrefix(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripTagPrefix(item));
  }

  if (typeof obj === "object" && obj !== null) {
    const newObj: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const value = record[key];

      // Attributes must not have prefix removed
      if (key === "$") {
        newObj[key] = value;
      } else {
        // Remove prefix from tag names only, based on first ":"
        const colonIndex = key.indexOf(":");
        const cleanKey = colonIndex !== -1 ? key.slice(colonIndex + 1) : key;
        newObj[cleanKey] = stripTagPrefix(value);
      }
    }

    return newObj;
  }

  return obj;
}

//#endregion
