import { describe, it, expect } from "vitest";
import { signJwt, decodeJwt } from "@simplysm/service-server";

describe("signJwt expiresHours", () => {
  const secret = "test-secret-key-0123456789";

  it("인자 생략 시 12시간 만료", async () => {
    const token = await signJwt(secret, { roles: [], data: {} });
    const payload = decodeJwt(token);
    expect(payload.exp! - payload.iat!).toBe(12 * 3600);
  });

  it("expiresHours 지정 시 해당 시간으로 만료 (7일=168시간)", async () => {
    const token = await signJwt(secret, { roles: [], data: {} }, 7 * 24);
    const payload = decodeJwt(token);
    expect(payload.exp! - payload.iat!).toBe(7 * 24 * 3600);
  });
});
