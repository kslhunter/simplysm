import { getTemplateParserServices } from "@angular-eslint/utils";
import type { TmplAstElement, TmplAstTextAttribute } from "@angular/compiler";
import { createRule } from "../utils/createRule";

export const RULE_NAME = "ng-template-sd-require-binding-attrs";

export interface RuleOptions {
  selectorPrefixes?: string[];
  allowAttributes?: string[];
  allowAttributePrefixes?: string[];
}

const DEFAULT_OPTIONS: Required<RuleOptions> = {
  selectorPrefixes: ["sd-"],
  allowAttributes: ["id", "class", "style", "title", "tabindex", "role"],
  allowAttributePrefixes: ["aria-", "data-", "sd-"],
};

type Options = [RuleOptions];
type MessageIds = "requireBindingForAttribute";

export default createRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow non-whitelisted plain attributes on prefixed components (e.g. sd-*) and require using Angular property bindings instead.",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          selectorPrefixes: {
            type: "array",
            items: { type: "string" },
          },
          allowAttributes: {
            type: "array",
            items: { type: "string" },
          },
          allowAttributePrefixes: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      requireBindingForAttribute:
        'Attribute "{{attrName}}" is not allowed as a plain attribute on "{{elementName}}". Use a property binding instead, e.g. [{{attrName}}]="…".',
    },
  },
  defaultOptions: [{}],
  create(context) {
    const parserServices = getTemplateParserServices(context);

    const userOptions = (context.options[0] as RuleOptions | undefined) ?? {};

    const selectorPrefixes = userOptions.selectorPrefixes ?? DEFAULT_OPTIONS.selectorPrefixes;
    const allowAttributes = userOptions.allowAttributes ?? DEFAULT_OPTIONS.allowAttributes;
    const allowAttributePrefixes =
      userOptions.allowAttributePrefixes ?? DEFAULT_OPTIONS.allowAttributePrefixes;

    const allowedAttrSet = new Set(allowAttributes.map((attr) => attr.toLowerCase()));

    function isTargetElement(node: TmplAstElement): boolean {
      const tagName = node.name.toLowerCase();
      return selectorPrefixes.some((prefix) => tagName.startsWith(prefix.toLowerCase()));
    }

    function isWhitelistedPlainAttr(attr: TmplAstTextAttribute): boolean {
      const name = attr.name.toLowerCase();

      if (allowedAttrSet.has(name)) return true;

      return allowAttributePrefixes.some((prefix) => name.startsWith(prefix.toLowerCase()));
    }

    return {
      Element(node: TmplAstElement) {
        if (!isTargetElement(node)) return;

        // node.attributes: foo="bar" 같은 plain attribute 목록
        for (const attr of node.attributes) {
          if (isWhitelistedPlainAttr(attr)) continue;

          const span = attr.sourceSpan;
          const loc = parserServices.convertNodeSourceSpanToLoc(span);

          context.report({
            loc,
            messageId: "requireBindingForAttribute",
            data: {
              attrName: attr.name,
              elementName: node.name,
            },
            fix(fixer) {
              const start = span.start.offset;
              const end = span.end.offset;
              if (typeof start !== "number" || typeof end !== "number" || start >= end) {
                return null;
              }

              const rawValue = attr.value;

              // 2. <sd-aaa bbb> -> <sd-aaa [bbb]="true">
              if (rawValue === "") {
                const replacement = `[${attr.name}]="true"`;
                return fixer.replaceTextRange([start, end], replacement);
              }

              // 1. aaa="bbb" -> [aaa]="'bbb'"
              const escaped = rawValue.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
              const expression = `'${escaped}'`;
              const replacement = `[${attr.name}]="${expression}"`;

              return fixer.replaceTextRange([start, end], replacement);
            },
          });
        }
      },
    };
  },
});
