import { describe, expect, it, afterEach } from "vitest";
import {
  INDEX_SUBMIT_TOKENS,
  indexSubmitCountLabel,
  indexSubmitPages,
  indexSubmitUrls,
} from "../src/lib/indexQueue";
import {
  SPEEDYINDEX_TOKENS_PER_URL,
  acceptSubmitUrls,
  submitIndexUrls,
} from "../src/lib/speedyindex";
import type { SiteRow } from "../src/types";

function row(partial: Partial<SiteRow> & Pick<SiteRow, "url" | "status">): SiteRow {
  return { ok: true, alive: true, ...partial };
}

const sample = row({
  url: "https://zeta.gb.net",
  status: 200,
  index: {
    indexed: true,
    pages: [
      { url: "https://zeta.gb.net/", slot: "home", indexed: true },
      {
        url: "https://zeta.gb.net/en-gb/bonuses/",
        slot: "bonus",
        indexed: false,
        coverageState: "Discovered - currently not indexed",
      },
      {
        url: "https://zeta.gb.net/en-gb/login/",
        slot: "login",
        indexed: false,
        coverageState: "Excluded by ‘noindex’ tag",
      },
      {
        url: "https://zeta.gb.net/en-gb/app/",
        slot: "app",
        indexed: false,
        stale: true,
        coverageState: "Crawled - currently not indexed",
      },
      { url: "https://zeta.gb.net/privacy-policy/", slot: "privacy-policy", indexed: false },
      { url: "https://zeta.gb.net/en-gb/games/", slot: "games", indexed: null },
    ],
  },
});

describe("index submit selection", () => {
  it("keeps the token price aligned with the server check", () => {
    expect(INDEX_SUBMIT_TOKENS).toBe(SPEEDYINDEX_TOKENS_PER_URL);
  });

  it("takes pages absent from the index, including a noindex tag", () => {
    expect(indexSubmitPages(sample).map((page) => page.url)).toEqual([
      "https://zeta.gb.net/en-gb/bonuses/",
      "https://zeta.gb.net/en-gb/login/",
    ]);
  });

  it("keeps a noindex site selectable, and skips a drop and URLs already sent", () => {
    const noindex = row({
      url: "https://alpha.it.com",
      status: 200,
      index: {
        indexed: false,
        noindex: true,
        pages: [{ url: "https://alpha.it.com/", slot: "home", indexed: false }],
      },
    });
    expect(indexSubmitPages(noindex).map((page) => page.url)).toEqual([
      "https://alpha.it.com/",
    ]);
    expect(indexSubmitPages(sample, true)).toEqual([]);
    expect(indexSubmitUrls(sample, new Set(["https://zeta.gb.net/en-gb/bonuses/"]))).toEqual([
      "https://zeta.gb.net/en-gb/login/",
    ]);
  });

  it("declines the page count for the confirm dialog", () => {
    expect(indexSubmitCountLabel(1)).toBe("1 страницу");
    expect(indexSubmitCountLabel(2)).toBe("2 страницы");
    expect(indexSubmitCountLabel(5)).toBe("5 страниц");
    expect(indexSubmitCountLabel(11)).toBe("11 страниц");
  });
});

describe("speedyindex submit", () => {
  const previous = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = previous;
  });

  it("drops anything that is not an http URL", () => {
    expect(acceptSubmitUrls(["javascript:alert(1)", "https://a.test/x", "https://a.test/x"]).urls).toEqual([
      "https://a.test/x",
    ]);
    expect(acceptSubmitUrls([]).error).toBe("Нет страниц для отправки");
  });

  it("does not call SpeedyIndex without a key", async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch;
    const result = await submitIndexUrls(["https://a.test/x"], undefined);
    expect(result.status).toBe(503);
    expect(called).toBe(false);
  });

  it("stops before creating a task when the balance cannot cover the reserve", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ code: 0, balance: { tokens: 50 } }));
    }) as typeof fetch;
    const result = await submitIndexUrls(["https://a.test/x"], "test-key");
    expect(result.status).toBe(402);
    expect(result.body.message).toContain("нужно 100");
    expect(calls).toEqual(["https://api.speedyindex.com/v2/account"]);
  });

  it("creates a pay-per-indexed task when the balance covers it", async () => {
    const calls: { url: string; body: unknown }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (String(input).endsWith("/account")) {
        return new Response(JSON.stringify({ code: 0, balance: { tokens: 100 } }));
      }
      return new Response(JSON.stringify({ code: 0, task_id: "task-1" }));
    }) as typeof fetch;
    const result = await submitIndexUrls(["https://a.test/x"], "test-key");
    expect(result.status).toBe(200);
    expect(result.body.taskId).toBe("task-1");
    expect(result.body.accepted).toEqual(["https://a.test/x"]);
    expect(calls[1]?.body).toMatchObject({
      urls: ["https://a.test/x"],
      pay_per_indexed: true,
    });
  });
});
