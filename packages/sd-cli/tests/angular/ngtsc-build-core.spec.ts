import { describe, it, expect } from "vitest";
import { buildReverseDeps } from "../../src/angular/ngtsc-build-core";

describe("buildReverseDeps", () => {
  // Acceptance: 정방향 맵에서 역방향 인덱스를 구축한다
  it("builds reverse index from forward deps with multiple owners sharing a dep", () => {
    const forward = new Map<string, ReadonlySet<string>>([
      ["comp.ts", new Set(["shared.scss", "theme.scss"])],
      ["dialog.ts", new Set(["shared.scss"])],
    ]);

    const reverse = buildReverseDeps(forward);

    expect(reverse.get("shared.scss")).toEqual(new Set(["comp.ts", "dialog.ts"]));
    expect(reverse.get("theme.scss")).toEqual(new Set(["comp.ts"]));
    expect(reverse.size).toBe(2);
  });

  // Acceptance: 빈 맵이면 역방향 맵도 비어있다
  it("returns empty map for empty input", () => {
    const reverse = buildReverseDeps(new Map());

    expect(reverse.size).toBe(0);
  });

  // Unit: 하나의 소유자가 여러 의존성을 가진 경우
  it("maps each dep to its single owner", () => {
    const forward = new Map<string, ReadonlySet<string>>([
      ["comp.ts", new Set(["a.scss", "b.scss", "c.scss"])],
    ]);

    const reverse = buildReverseDeps(forward);

    expect(reverse.size).toBe(3);
    expect(reverse.get("a.scss")).toEqual(new Set(["comp.ts"]));
    expect(reverse.get("b.scss")).toEqual(new Set(["comp.ts"]));
    expect(reverse.get("c.scss")).toEqual(new Set(["comp.ts"]));
  });

  // Unit: 의존성이 빈 Set인 소유자는 역방향 맵에 영향 없음
  it("ignores owners with empty dep sets", () => {
    const forward = new Map<string, ReadonlySet<string>>([
      ["comp.ts", new Set<string>()],
      ["dialog.ts", new Set(["shared.scss"])],
    ]);

    const reverse = buildReverseDeps(forward);

    expect(reverse.size).toBe(1);
    expect(reverse.get("shared.scss")).toEqual(new Set(["dialog.ts"]));
  });
});
