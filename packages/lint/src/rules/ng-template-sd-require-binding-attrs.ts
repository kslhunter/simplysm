import { getTemplateParserServices } from "@angular-eslint/utils";
import { createRule } from "../utils/create-rule";

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

/**
 * sd-* 컴포넌트에서 plain attribute 사용을 제한하고 Angular property binding을 강제하는 ESLint 규칙.
 *
 * @remarks
 * `sd-` 접두사를 가진 커스텀 컴포넌트에서 허용되지 않은 plain attribute를 감지합니다.
 * 허용 목록(id, class, style, title, tabindex, role)과 허용 접두사(aria-, data-, sd-)에
 * 해당하지 않는 attribute는 `[attr]="..."` 형태의 property binding으로 변환하도록 autofix합니다.
 */
export default createRule({
  name: "ng-template-sd-require-binding-attrs",
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow non-whitelisted plain attributes on prefixed components (e.g. sd-*) and require using Angular property bindings instead.',
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          selectorPrefixes: { type: "array", items: { type: "string" } },
          allowAttributes: { type: "array", items: { type: "string" } },
          allowAttributePrefixes: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      requireBindingForAttribute:
        'Attribute "{{attrName}}" is not allowed as a plain attribute on "{{elementName}}". Use a property binding instead, e.g. [{{attrName}}]="…".',
    },
  },
  defaultOptions: [{}] as [RuleOptions],
  create(context) {
    const parserServices = getTemplateParserServices(context);
    const userOptions = context.options.at(0) ?? {};
    const selectorPrefixes = userOptions.selectorPrefixes ?? DEFAULT_OPTIONS.selectorPrefixes;
    const allowAttributes = userOptions.allowAttributes ?? DEFAULT_OPTIONS.allowAttributes;
    const allowAttributePrefixes =
      userOptions.allowAttributePrefixes ?? DEFAULT_OPTIONS.allowAttributePrefixes;

    const allowedAttrSet = new Set(allowAttributes.map((attr) => attr.toLowerCase()));

    function isTargetElement(node: { name: string }): boolean {
      const tagName = node.name.toLowerCase();
      return selectorPrefixes.some((prefix) => tagName.startsWith(prefix.toLowerCase()));
    }

    function isWhitelistedPlainAttr(attr: { name: string }): boolean {
      const name = attr.name.toLowerCase();
      if (allowedAttrSet.has(name)) return true;
      return allowAttributePrefixes.some((prefix) => name.startsWith(prefix.toLowerCase()));
    }

    return {
      Element(node: {
        name: string;
        attributes: Array<{
          name: string;
          value: string;
          sourceSpan: { start: { offset: number }; end: { offset: number } };
        }>;
        sourceSpan: { start: { offset: number }; end: { offset: number } };
      }) {
        if (!isTargetElement(node)) return;

        for (const attr of node.attributes) {
          if (isWhitelistedPlainAttr(attr)) continue;

          const span = attr.sourceSpan;
          const loc = parserServices.convertNodeSourceSpanToLoc(span as never);

          context.report({
            loc,
            messageId: "requireBindingForAttribute",
            data: { attrName: attr.name, elementName: node.name },
            fix(fixer) {
              const start = span.start.offset;
              const end = span.end.offset;
              if (start >= end) return null;

              const rawValue = attr.value;
              if (rawValue === "") {
                return fixer.replaceTextRange([start, end], `[${attr.name}]="true"`);
              }

              const escaped = rawValue.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
              return fixer.replaceTextRange([start, end], `[${attr.name}]="'${escaped}'"`);
            },
          });
        }
      },
    };
  },
});
