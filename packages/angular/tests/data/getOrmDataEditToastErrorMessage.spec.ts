import { describe, it, expect } from "vitest";
import { getOrmDataEditToastErrorMessage } from "../../src/data/getOrmDataEditToastErrorMessage";

describe("Feature 1.2: getOrmDataEditToastErrorMessage (CONSIST-002)", () => {
  it("foreign key constraint 에러 → 한글 안내 메시지를 반환한다", () => {
    const err = new Error("Cannot delete a parent row: a foreign key constraint fails");
    expect(getOrmDataEditToastErrorMessage(err)).toBe(
      "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인 요망",
    );
  });

  it("REFERENCE 충돌 에러 → 한글 안내 메시지를 반환한다", () => {
    const err = new Error("UPDATE conflicted with the REFERENCE constraint");
    expect(getOrmDataEditToastErrorMessage(err)).toBe(
      "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인 요망",
    );
  });

  it("일반 에러 → 원본 메시지를 그대로 반환한다", () => {
    const err = new Error("Something went wrong");
    expect(getOrmDataEditToastErrorMessage(err)).toBe("Something went wrong");
  });

  it("Error가 아닌 값 → String 변환하여 반환한다", () => {
    expect(getOrmDataEditToastErrorMessage("plain string error")).toBe("plain string error");
  });
});
