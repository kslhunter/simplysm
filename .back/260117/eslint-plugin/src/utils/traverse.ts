import type { TSESTree } from "@typescript-eslint/utils";

/**
 * AST 노드를 재귀적으로 순회하며 콜백을 호출합니다.
 * parent, range, loc 속성은 순회에서 제외됩니다.
 *
 * @param node - 순회할 AST 노드
 * @param callback - 각 노드에서 호출될 콜백. false 반환 시 순회 중단
 * @returns 순회가 완료되면 true, 중단되면 false
 */
export function traverseNode(
  node: TSESTree.Node | null | undefined,
  callback: (node: TSESTree.Node) => boolean | void
): boolean {
  if (node == null || typeof node !== "object") return true;

  if (callback(node) === false) return false;

  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "range" || key === "loc") continue;

    const child = (node as unknown as Record<string, unknown>)[key];

    if (Array.isArray(child)) {
      for (const item of child) {
        if (isAstNode(item)) {
          if (!traverseNode(item, callback)) return false;
        }
      }
    } else if (isAstNode(child)) {
      if (!traverseNode(child, callback)) return false;
    }
  }

  return true;
}

function isAstNode(value: unknown): value is TSESTree.Node {
  return value != null && typeof value === "object" && "type" in value && typeof value.type === "string";
}
