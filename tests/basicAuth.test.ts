import { describe, expect, it } from "vitest";
import {
  authorizeBasic,
  parseDashboardUsers,
  unauthorizedResponse,
} from "../src/lib/basicAuth";

function header(user: string, password: string): string {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

describe("dashboard basic auth", () => {
  const users = parseDashboardUsers("anna:one,ivan:two:still");

  it("parses user:password pairs, password may contain colon", () => {
    expect(users).toEqual([
      { user: "anna", password: "one" },
      { user: "ivan", password: "two:still" },
    ]);
    expect(parseDashboardUsers("")).toEqual([]);
    expect(parseDashboardUsers("  ,,:x,foo:")).toEqual([]);
  });

  it("accepts a matching login and rejects the rest", () => {
    expect(authorizeBasic(header("anna", "one"), users)).toBe(true);
    expect(authorizeBasic(header("ivan", "two:still"), users)).toBe(true);
    expect(authorizeBasic(header("anna", "two:still"), users)).toBe(false);
    expect(authorizeBasic(header("anna", "ONE"), users)).toBe(false);
    expect(authorizeBasic(header("nobody", "one"), users)).toBe(false);
    expect(authorizeBasic(null, users)).toBe(false);
    expect(authorizeBasic("Bearer x", users)).toBe(false);
    expect(authorizeBasic(header("anna", "one"), [])).toBe(false);
  });

  it("asks the browser for credentials", () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toMatch(/^Basic /);
  });
});
