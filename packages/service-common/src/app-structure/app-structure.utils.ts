import type {
  AppStructureItem,
  FlatPermission,
} from "./app-structure.types";

export function isUsableModules<TModule>(
  modules: TModule[] | undefined,
  requiredModules: TModule[] | undefined,
  usableModules: TModule[] | undefined,
): boolean {
  // 1. requiredModules: 모두 있어야 함 (AND)
  if (requiredModules && requiredModules.length > 0) {
    if (!requiredModules.every((m) => usableModules?.includes(m))) {
      return false;
    }
  }

  // 2. modules: 하나라도 있으면 됨 (OR)
  return (
    modules == null || modules.length === 0 || modules.some((m) => usableModules?.includes(m))
  );
}

export function isUsableModulesChain<TModule>(
  modulesChain: TModule[][],
  requiredModulesChain: TModule[][],
  usableModules: TModule[] | undefined,
): boolean {
  // 각 레벨의 modules (OR) 체크
  for (const modules of modulesChain) {
    if (!isUsableModules(modules, undefined, usableModules)) {
      return false;
    }
  }

  // 각 레벨의 requiredModules (AND) 체크
  for (const requiredModules of requiredModulesChain) {
    if (!isUsableModules(undefined, requiredModules, usableModules)) {
      return false;
    }
  }

  return true;
}

export function getFlatPermissions<TModule>(
  items: AppStructureItem<TModule>[],
  usableModules: TModule[] | undefined,
): FlatPermission<TModule>[] {
  const results: FlatPermission<TModule>[] = [];

  type QueueItem = {
    item: AppStructureItem<TModule>;
    titleChain: string[];
    codeChain: string[];
    modulesChain: TModule[][];
    requiredModulesChain: TModule[][];
  };

  const queue: QueueItem[] = items.map((item) => ({
    item,
    titleChain: [],
    codeChain: [],
    modulesChain: [],
    requiredModulesChain: [],
  }));

  while (queue.length > 0) {
    const { item, titleChain, codeChain, modulesChain, requiredModulesChain } = queue.shift()!;

    const currTitleChain = [...titleChain, item.title];
    const currCodeChain = [...codeChain, item.code];
    const currModulesChain = item.modules ? [...modulesChain, item.modules] : modulesChain;
    const currRequiredModulesChain = item.requiredModules
      ? [...requiredModulesChain, item.requiredModules]
      : requiredModulesChain;

    if (!isUsableModulesChain(currModulesChain, currRequiredModulesChain, usableModules)) continue;

    // 1. 자식 enqueue
    if ("children" in item) {
      for (const child of item.children) {
        queue.push({
          item: child,
          titleChain: currTitleChain,
          codeChain: currCodeChain,
          modulesChain: currModulesChain,
          requiredModulesChain: currRequiredModulesChain,
        });
      }
    }

    // 1. 직접 perms 처리
    if ("perms" in item) {
      for (const perm of item.perms ?? []) {
        results.push({
          titleChain: currTitleChain,
          codeChain: [...currCodeChain, perm],
          modulesChain: currModulesChain,
        });
      }
    }

    // 2. subPerms 처리
    if ("subPerms" in item) {
      for (const subPerm of item.subPerms ?? []) {
        // subPerm도 모듈 체크
        if (!isUsableModules(subPerm.modules, subPerm.requiredModules, usableModules)) continue;

        for (const perm of subPerm.perms) {
          results.push({
            titleChain: currTitleChain,
            codeChain: [...currCodeChain, subPerm.code, perm],
            modulesChain: [...currModulesChain, subPerm.modules ?? []],
          });
        }
      }
    }
  }

  return results;
}
