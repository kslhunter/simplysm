import { describe, it, expect } from "vitest";
import { parseBoolEnv } from "@simplysm/core-common";

describe("parseBoolEnv", () => {
  it('returns true for "true"', () => {
    expect(parseBoolEnv("true")).toBe(true);
  });

  it('returns true for "TRUE"', () => {
    expect(parseBoolEnv("TRUE")).toBe(true);
  });

  it('returns true for "1"', () => {
    expect(parseBoolEnv("1")).toBe(true);
  });

  it('returns true for "yes"', () => {
    expect(parseBoolEnv("yes")).toBe(true);
  });

  it('returns true for "on"', () => {
    expect(parseBoolEnv("on")).toBe(true);
  });

  it('returns false for "false"', () => {
    expect(parseBoolEnv("false")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(parseBoolEnv(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(parseBoolEnv("")).toBe(false);
  });

  it('returns false for non-standard string "abc"', () => {
    expect(parseBoolEnv("abc")).toBe(false);
  });
});
