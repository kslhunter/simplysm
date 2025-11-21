// ng-template-sd-require-binding-attrs.js

import { getTemplateParserServices } from "@angular-eslint/utils";

export const RULE_NAME = "ng-template-sd-require-binding-attrs";

const DEFAULT_OPTIONS = {
  selectorPrefixes: ["sd-"],
  allowAttributes: ["id", "class", "style", "title", "tabindex", "role"],
  allowAttributePrefixes: ["aria-", "data-", "sd-"],
};

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow non-whitelisted plain attributes on prefixed components (e.g. sd-*) and require using Angular property bindings instead.",
      recommended: "error",
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

  create(context) {
    const parserServices = getTemplateParserServices(context);

    const userOptions = (context.options && context.options[0]) || {};

    const selectorPrefixes = userOptions.selectorPrefixes || DEFAULT_OPTIONS.selectorPrefixes;
    const allowAttributes = userOptions.allowAttributes || DEFAULT_OPTIONS.allowAttributes;
    const allowAttributePrefixes =
      userOptions.allowAttributePrefixes || DEFAULT_OPTIONS.allowAttributePrefixes;

    const allowedAttrSet = new Set(allowAttributes.map((attr) => attr.toLowerCase()));

    function isTargetElement(node) {
      const tagName = node.name.toLowerCase();
      return selectorPrefixes.some((prefix) => tagName.startsWith(prefix.toLowerCase()));
    }

    function isWhitelistedPlainAttr(attr) {
      const name = attr.name.toLowerCase();

      if (allowedAttrSet.has(name)) return true;

      return allowAttributePrefixes.some((prefix) => name.startsWith(prefix.toLowerCase()));
    }

    return {
      Element(node) {
        if (!isTargetElement(node)) return;

        // node.attributes: foo="bar" 같은 plain attribute 목록
        for (const attr of node.attributes) {
          if (isWhitelistedPlainAttr(attr)) continue;

          const span = attr.sourceSpan || node.sourceSpan;
          const loc = parserServices.convertNodeSourceSpanToLoc(span || node.sourceSpan);

          context.report({
            loc,
            messageId: "requireBindingForAttribute",
            data: {
              attrName: attr.name,
              elementName: node.name,
            },
            fix(fixer) {
              if (!span || span.start == null || span.end == null) {
                return null;
              }

              const start = span.start.offset;
              const end = span.end.offset;
              if (typeof start !== "number" || typeof end !== "number" || start >= end) {
                return null;
              }

              const rawValue = attr.value || "";

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
};
