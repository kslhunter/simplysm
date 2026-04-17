import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import {
  ImplicitReceiver,
  parseTemplate,
  PropertyRead,
  ThisReceiver,
  TmplAstBoundDeferredTrigger,
  TmplAstDeferredBlock,
  TmplAstForLoopBlock,
  TmplAstIfBlock,
  TmplAstIfBlockBranch,
  TmplAstLetDeclaration,
  TmplAstSwitchBlock,
  TmplAstSwitchBlockCase,
  TmplAstSwitchBlockCaseGroup,
} from "@angular/compiler";
import { createRule } from "../utils/create-rule";

function traverseNode(
  node: TSESTree.Node,
  callback: (n: TSESTree.Node) => void,
): void {
  callback(node);
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "range" || key === "loc") continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c != null && typeof c === "object" && "type" in c) {
          traverseNode(c as TSESTree.Node, callback);
        }
      }
    } else if (child != null && typeof child === "object" && "type" in child) {
      traverseNode(child as TSESTree.Node, callback);
    }
  }
}

/**
 * Angular 표현식 AST를 재귀 순회하여 ImplicitReceiver/ThisReceiver 위의
 * PropertyRead 이름(클래스 필드 참조)을 수집한다.
 * 로컬 변수(localVars)에 포함된 이름은 제외한다.
 */
function collectExprIdentifiers(ast: any, localVars: Set<string>, ids: Set<string>): void {
  if (ast == null || typeof ast !== "object") return;

  if (
    ast instanceof PropertyRead &&
    (ast.receiver instanceof ImplicitReceiver || ast.receiver instanceof ThisReceiver) &&
    typeof ast.name === "string" &&
    !localVars.has(ast.name)
  ) {
    ids.add(ast.name);
  }

  for (const key of Object.keys(ast)) {
    if (key === "span" || key === "sourceSpan" || key === "nameSpan") continue;
    const val = ast[key];
    if (Array.isArray(val)) {
      for (const v of val) {
        if (v != null && typeof v === "object") {
          collectExprIdentifiers(v, localVars, ids);
        }
      }
    } else if (val != null && typeof val === "object") {
      collectExprIdentifiers(val, localVars, ids);
    }
  }
}

/**
 * Angular 템플릿 AST 노드를 재귀 순회하여 바인딩 표현식 내 식별자를 수집한다.
 * 구조 디렉티브(*ngFor 등)의 로컬 변수와 @let 선언은 스코프에서 제외한다.
 */
function collectTemplateNodeIdentifiers(
  node: any,
  localVars: Set<string>,
  ids: Set<string>,
): void {
  const currentLocals = new Set(localVars);

  // 구조 디렉티브의 로컬 변수 (*ngFor="let item of items")
  if (Array.isArray(node.variables)) {
    for (const v of node.variables) {
      if (typeof v.name === "string") {
        currentLocals.add(v.name);
      }
    }
  }

  // @let 선언: 자기 자신의 value 표현식 스캔 시 자기 이름은 로컬이 아님
  // (@let foo = foo + 1 같은 self-reference는 Angular가 금지하므로 고려 불필요)
  if (node instanceof TmplAstLetDeclaration && typeof node.name === "string") {
    currentLocals.add(node.name);
  }

  // @let value 표현식: 타입 선언(LetDeclaration.value: AST)과 런타임 형상(ASTWithSource 유사체)이
  // 불일치하므로, 공통 node.value?.ast 경로에 의존하지 않고 명시 분기로 추출한다.
  if (node instanceof TmplAstLetDeclaration) {
    const expr = (node.value as { ast?: unknown }).ast ?? node.value;
    collectExprIdentifiers(expr, currentLocals, ids);
  }

  // @if 브랜치의 expressionAlias (예: `@if (cond; as alias)`)
  if (node instanceof TmplAstIfBlockBranch && node.expressionAlias?.name != null) {
    currentLocals.add(node.expressionAlias.name);
  }

  // @for 로컬 변수: `item` 및 사용자 별칭 contextVariables (예: `let idx = $index`)
  if (node instanceof TmplAstForLoopBlock) {
    if (typeof node.item.name === "string") {
      currentLocals.add(node.item.name);
    }
    for (const ctxVar of node.contextVariables) {
      if (typeof ctxVar.name === "string") {
        currentLocals.add(ctxVar.name);
      }
    }
  }

  // 보간 / BoundText / BoundAttribute 등 ASTWithSource 노드용 공통 경로.
  // LetDeclaration 은 위에서 명시 분기로 처리되므로 여기서 제외한다 (이중 수집 방지).
  if (!(node instanceof TmplAstLetDeclaration) && node.value?.ast != null) {
    collectExprIdentifiers(node.value.ast, currentLocals, ids);
  }
  // @if 브랜치 조건 표현식
  if (node instanceof TmplAstIfBlockBranch && node.expression != null) {
    collectExprIdentifiers(node.expression, currentLocals, ids);
  }
  // @switch 표현식
  if (node instanceof TmplAstSwitchBlock) {
    collectExprIdentifiers(node.expression, currentLocals, ids);
  }
  // @case 표현식 (@default는 null)
  if (node instanceof TmplAstSwitchBlockCase && node.expression != null) {
    collectExprIdentifiers(node.expression, currentLocals, ids);
  }
  // @for iterable/trackBy 표현식 (item/contextVariables는 이미 currentLocals에 반영됨)
  if (node instanceof TmplAstForLoopBlock) {
    collectExprIdentifiers(node.expression, currentLocals, ids);
    collectExprIdentifiers(node.trackBy, currentLocals, ids);
  }
  // @defer 트리거의 value 표현식 (BoundDeferredTrigger만 value를 가진다)
  if (node instanceof TmplAstDeferredBlock) {
    for (const bucket of [node.triggers, node.prefetchTriggers, node.hydrateTriggers]) {
      for (const trigger of Object.values(bucket)) {
        if (trigger instanceof TmplAstBoundDeferredTrigger) {
          collectExprIdentifiers(trigger.value, currentLocals, ids);
        }
      }
    }
  }
  // BoundAttribute (입력 바인딩)
  if (Array.isArray(node.inputs)) {
    for (const input of node.inputs) {
      if (input.value?.ast != null) {
        collectExprIdentifiers(input.value.ast, currentLocals, ids);
      }
    }
  }
  // BoundEvent (이벤트 바인딩)
  if (Array.isArray(node.outputs)) {
    for (const output of node.outputs) {
      if (output.handler?.ast != null) {
        collectExprIdentifiers(output.handler.ast, currentLocals, ids);
      }
    }
  }
  // 구조 디렉티브 속성 (templateAttrs)
  if (Array.isArray(node.templateAttrs)) {
    for (const attr of node.templateAttrs) {
      if (attr.value?.ast != null) {
        collectExprIdentifiers(attr.value.ast, currentLocals, ids);
      }
    }
  }
  // 자식 노드 재귀: @let 선언은 이후 형제에게 스코프를 전파한다
  if (Array.isArray(node.children)) {
    collectSiblingNodes(node.children, currentLocals, ids);
  }

  // @if의 분기 — IfBlock에는 children이 없고 branches로 노출된다
  if (node instanceof TmplAstIfBlock) {
    for (const branch of node.branches) {
      collectTemplateNodeIdentifiers(branch, currentLocals, ids);
    }
  }

  // @switch의 그룹 — SwitchBlock에는 children이 없고 groups로 노출된다
  if (node instanceof TmplAstSwitchBlock) {
    for (const group of node.groups) {
      collectTemplateNodeIdentifiers(group, currentLocals, ids);
    }
  }

  // @switch 그룹 내 @case 노드들 — children은 일반 경로로 처리된다
  if (node instanceof TmplAstSwitchBlockCaseGroup) {
    for (const c of node.cases) {
      collectTemplateNodeIdentifiers(c, currentLocals, ids);
    }
  }

  // @for의 @empty 블록 — ForLoopBlock.empty는 별도 BlockNode이며 children을 가진다
  if (node instanceof TmplAstForLoopBlock && node.empty != null) {
    collectSiblingNodes(node.empty.children, currentLocals, ids);
  }

  // @defer 분기 블록 (@placeholder, @loading, @error) — children은 별도 분기에 존재
  if (node instanceof TmplAstDeferredBlock) {
    for (const sub of [node.placeholder, node.loading, node.error]) {
      if (sub != null) {
        collectSiblingNodes(sub.children, currentLocals, ids);
      }
    }
  }
}

/**
 * 형제 노드 배열을 순회하며 식별자를 수집한다.
 * @let 선언이 나오면 이후 형제 노드의 localVars에 이름을 추가해 스코프를 전파한다.
 */
function collectSiblingNodes(
  nodes: readonly any[],
  localVars: Set<string>,
  ids: Set<string>,
): void {
  const scopedLocals = new Set(localVars);
  for (const node of nodes) {
    collectTemplateNodeIdentifiers(node, scopedLocals, ids);
    if (node instanceof TmplAstLetDeclaration && typeof node.name === "string") {
      scopedLocals.add(node.name);
    }
  }
}

/**
 * Angular 인라인 템플릿 문자열에서 바인딩 표현식이 참조하는 식별자를 수집한다.
 * @angular/compiler의 parseTemplate을 사용하여 AST 기반으로 정확히 추출한다.
 */
function collectTemplateIdentifiers(templateText: string): Set<string> {
  const ids = new Set<string>();
  const result = parseTemplate(templateText, "");
  collectSiblingNodes(result.nodes, new Set(), ids);
  return ids;
}

/**
 * Angular `@Component` 내 미사용 `protected readonly` 필드를 감지하는 ESLint 규칙.
 *
 * @remarks
 * `@Component` 데코레이터가 있는 클래스에서 `protected readonly` 필드가
 * 인라인 템플릿과 클래스 본문 어디에서도 참조되지 않으면 보고합니다.
 * autofix로 해당 필드를 제거합니다.
 */
export default createRule({
  name: "ts-no-unused-protected-readonly",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow unused protected readonly fields in Angular components",
    },
    fixable: "code",
    messages: {
      unusedField: 'Protected readonly field "{{name}}" is not used in class or template.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      "ClassDeclaration, ClassExpression"(
        classNode: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
      ) {
        const componentDecorator = classNode.decorators.find((d) => {
          if (d.expression.type === AST_NODE_TYPES.CallExpression) {
            const callee = d.expression.callee;
            return callee.type === AST_NODE_TYPES.Identifier && callee.name === "Component";
          }
          return false;
        });

        if (componentDecorator == null) return;

        const expr = componentDecorator.expression as TSESTree.CallExpression;
        const args = expr.arguments;
        const firstArg = args.at(0);
        if (firstArg == null || firstArg.type !== AST_NODE_TYPES.ObjectExpression) return;

        const templateProp = firstArg.properties.find(
          (p): p is TSESTree.Property =>
            p.type === AST_NODE_TYPES.Property &&
            p.key.type === AST_NODE_TYPES.Identifier &&
            p.key.name === "template",
        );

        if (templateProp == null) return;

        let templateText = "";
        const templateValue = templateProp.value;
        if (templateValue.type === AST_NODE_TYPES.TemplateLiteral) {
          templateText = templateValue.quasis.map((q) => q.value.raw).join("");
        } else if (
          templateValue.type === AST_NODE_TYPES.Literal &&
          typeof templateValue.value === "string"
        ) {
          templateText = templateValue.value;
        }

        if (templateText === "") return;

        const protectedReadonlyFields = classNode.body.body.filter(
          (node): node is TSESTree.PropertyDefinition =>
            node.type === AST_NODE_TYPES.PropertyDefinition &&
            node.accessibility === "protected" &&
            node.readonly === true &&
            !node.static &&
            node.key.type === AST_NODE_TYPES.Identifier,
        );

        const templateIdentifiers = collectTemplateIdentifiers(templateText);

        for (const field of protectedReadonlyFields) {
          const fieldName = (field.key as TSESTree.Identifier).name;

          const usedInTemplate = templateIdentifiers.has(fieldName);

          const usedInClass = classNode.body.body.some((member) => {
            if (member === field) return false;
            let found = false;
            traverseNode(member, (node) => {
              if (node.type === AST_NODE_TYPES.Identifier && node.name === fieldName) {
                found = true;
              }
            });
            return found;
          });

          if (!usedInTemplate && !usedInClass) {
            context.report({
              node: field,
              messageId: "unusedField",
              data: { name: fieldName },
              fix(fixer) {
                let start = field.range[0];
                let end = field.range[1];

                const textBefore = sourceCode.text.slice(0, start);
                const leadingMatch = textBefore.match(/\n[ \t]*$/);
                if (leadingMatch) {
                  start -= leadingMatch[0].length - 1;
                }

                const afterText = sourceCode.text.slice(end);
                const trailingMatch = afterText.match(/^;?[ \t]*\r?\n/);
                if (trailingMatch) {
                  end += trailingMatch[0].length;
                }

                return fixer.removeRange([start, end]);
              },
            });
          }
        }
      },
    };
  },
});
