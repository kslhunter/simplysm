import { normalize } from "path";

/**
 * 리소스 파일 의존성을 추적하여 증분 빌드 시 전이적 무효화를 지원한다.
 *
 * referencedFile → Set<containingFile> 역방향 맵을 유지한다.
 * containingFile이 referencedFile을 참조하므로, referencedFile이 변경되면
 * containingFile도 재컴파일 대상에 포함되어야 한다.
 */
export class FileReferenceTracker {
  private readonly _referencingFiles = new Map<string, Set<string>>();

  /** 추적 중인 모든 참조 파일(키)의 이터레이터 */
  get referencedFiles(): IterableIterator<string> {
    return this._referencingFiles.keys();
  }

  /**
   * containingFile이 referencedFiles를 참조한다는 의존성을 등록한다.
   * 자기 참조(containingFile === referencedFile)는 무시한다.
   */
  add(containingFile: string, referencedFiles: Iterable<string>): void {
    const normalizedContaining = normalize(containingFile);
    for (const file of referencedFiles) {
      const normalizedRef = normalize(file);
      if (normalizedRef === normalizedContaining) {
        continue;
      }
      let referencing = this._referencingFiles.get(normalizedRef);
      if (referencing == null) {
        referencing = new Set([normalizedContaining]);
        this._referencingFiles.set(normalizedRef, referencing);
      } else {
        referencing.add(normalizedContaining);
      }
    }
  }

  /**
   * 변경된 파일 집합에 대해 전이적으로 영향받는 파일을 확장하여 반환한다.
   * 확장이 없으면 원본 Set을 그대로 반환한다.
   * 확장된 참조 레코드는 stale로 간주하여 정리한다.
   */
  update(changed: Set<string>): Set<string> {
    let allChanged: Set<string> | undefined;

    for (const modifiedFile of changed) {
      const normalizedModified = normalize(modifiedFile);
      const referencing = this._referencingFiles.get(normalizedModified);
      if (referencing != null) {
        allChanged ??= new Set(changed);
        for (const referencingFile of referencing) {
          allChanged.add(referencingFile);
        }
        this._referencingFiles.delete(normalizedModified);
      }
    }

    return allChanged ?? changed;
  }
}
