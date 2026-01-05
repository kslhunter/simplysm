import type { TSESTree } from "@typescript-eslint/utils";

/**
 * AST 노드를 재귀적으로 순회하며 콜백을 호출합니다.
 * parent, range, loc 속성은 순회에서 제외됩니다.
 */
export function traverseNode(
  node: TSESTree.Node | null | undefined,
  callback: (node: TSESTree.Node) => void
): void {
  if (node == null || typeof node !== "object") return;

  callback(node);

  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "range" || key === "loc") continue;

    const child = (node as unknown as Record<string, unknown>)[key];

    if (Array.isArray(child)) {
      for (const item of child) {
        if (isAstNode(item)) {
          traverseNode(item, callback);
        }
      }
    } else if (isAstNode(child)) {
      traverseNode(child, callback);
    }
  }
}

function isAstNode(value: unknown): value is TSESTree.Node {
  return value != null && typeof value === "object" && "type" in value && typeof value.type === "string";
}
