# 코드 리뷰: replace-deps-hardlink

## LOGIC-001 [Medium] watch 모드에서 내용 동일 skip 시에도 onChanged 콜백이 호출됨

- **위치:** packages/sd-cli/src/deps/replace-deps/replace-deps.ts:289

`watchReplaceDeps`의 `onChange` 핸들러에서, 모든 파일이 `isFileContentSame`으로 skip되어 실제 복사가 0건이어도 `options?.onChanged?.()`가 무조건 호출된다.

```typescript
// :274 — skip 가능
if (await isFileContentSame(changedPath, destPath)) continue;
// ...
// :289 — 하지만 여기는 항상 도달
options?.onChanged?.();
```

현재 `onChanged`를 사용하는 호출자가 없어(BaseOrchestrator:76에서 옵션 미전달) 실제 오동작은 없지만, 향후 사용 시 불필요한 리빌드를 유발할 수 있다.

**개선 방향:** 실제로 복사가 발생한 경우에만 `onChanged`를 호출하도록 플래그를 추가한다.

---

## DESIGN-001 [Low] setupCount 변수가 불필요

- **위치:** packages/sd-cli/src/deps/replace-deps/replace-deps.ts:139,163

`setupCount`를 `let`으로 선언 후 `copiedEntries.length`를 재할당하고 있다. `copiedEntries.length`를 직접 사용하면 된다.

```typescript
// :139
let setupCount = 0;
// :163
setupCount = copiedEntries.length;
// :165
logger.success(`replace-deps 설정 완료 (${setupCount}개 의존성 교체)`);
```

**개선 방향:** `setupCount` 변수를 제거하고 `copiedEntries.length`를 직접 사용한다.

---

## DESIGN-002 [Low] copyWithUnlink의 재귀 호출 시 filter가 최상위 기준으로 작동하지 않을 수 있음

- **위치:** packages/sd-cli/src/deps/replace-deps/replace-deps.ts:54-63

`createCopyFilter`는 소스 루트로부터의 상대 경로의 **첫 번째 세그먼트**로 필터링한다. `copyWithUnlink`의 재귀 호출에서 자식 디렉토리 내부의 파일에 대해 filter를 호출하면, `path.relative(sourcePath, child)`는 여전히 최상위 소스 루트 기준이므로 정상 작동한다. 단, `fsx.copy`의 원본 구현(`collectCopyEntries`)과 달리 filter에 소스 경로가 아닌 자식 경로가 전달되므로, filter가 소스 루트 기준 상대경로를 사용하는 한 문제없지만 `createCopyFilter`의 `path.relative` 기준이 `sourcePath`(최상위 루트)이므로 하위 디렉토리의 자식에 대해서도 올바르게 동작한다. 이는 거짓양성이 아니라 **의도 확인이 필요한 지점**이다.

실제로: `copyWithUnlink`는 재귀 시 자식의 절대경로를 filter에 전달하고, filter는 `path.relative(소스루트, 자식절대경로)`로 첫 세그먼트를 추출하므로 정상이다. 하지만 `fsx.copy`가 사용하는 `collectCopyEntries`와 달리 별도의 소스→타겟 경로 매핑 로직이 없어, 동작이 미묘하게 다를 수 있다.

**개선 방향:** 재귀 호출 시 filter는 최상위 디렉토리 자식에만 적용되므로 (하위에서는 이미 허용된 디렉토리 내부), 하위 재귀에서는 filter를 전달하지 않는 것이 의도에 더 명확하다.
