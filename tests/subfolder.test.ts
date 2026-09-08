import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { matchesQuery } from "../src/lib/table";
import {
  hasSubfolderColumn,
  hasSubfolderData,
  subfolderFolderLabel,
  subfolderGlueLabel,
  subfolderHint,
  subfolderMatchOf,
  subfolderOf,
} from "../src/lib/subfolder";
import type { SiteRow, StatusPayload, SubfolderInfo } from "../src/types";

const snapshot = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../public/status.json"),
    "utf8",
  ),
) as StatusPayload;

function row(partial: Partial<SiteRow> & Pick<SiteRow, "url" | "status">): SiteRow {
  return {
    ok: false,
    alive: true,
    ...partial,
  };
}

function sf(partial: Partial<SubfolderInfo> = {}): SubfolderInfo {
  return {
    folder: null,
    csv: null,
    mode: null,
    match: null,
    glue: null,
    live_folder: null,
    error: null,
    ...partial,
  };
}

describe("subfolder helpers", () => {
  it("hides columns when a row has no subfolder object", () => {
    expect(
      hasSubfolderData(row({ url: "https://old.com", status: 200 })),
    ).toBe(false);
    expect(hasSubfolderColumn(snapshot.data)).toBe(
      snapshot.data.some((item) => item.subfolder != null),
    );
    expect(subfolderOf(row({ url: "https://old.com", status: 200 }))).toBeNull();
    expect(subfolderMatchOf(null)).toBeNull();
    expect(subfolderFolderLabel(null)).toBe("—");
    expect(subfolderGlueLabel(null)).toBe("—");
  });

  it("shows columns once any row has a subfolder object, including all-null", () => {
    const empty = row({
      url: "https://none.com",
      status: 200,
      subfolder: sf(),
    });
    expect(hasSubfolderData(empty)).toBe(true);
    expect(hasSubfolderColumn([empty])).toBe(true);
    expect(subfolderFolderLabel(empty.subfolder!)).toBe("—");
    expect(subfolderGlueLabel(empty.subfolder!.glue)).toBe("—");
    expect(subfolderMatchOf(empty.subfolder!)).toBeNull();
  });

  it("does not treat missing object as a red mismatch", () => {
    const mixed = [
      row({ url: "https://old.com", status: 200 }),
      row({
        url: "https://ok.com",
        status: 200,
        subfolder: sf({
          folder: "en-gb",
          csv: "en-gb[home]",
          mode: "home",
          match: true,
          glue: "canonical",
        }),
      }),
    ];
    expect(hasSubfolderColumn(mixed)).toBe(true);
    expect(subfolderMatchOf(subfolderOf(mixed[0]))).toBeNull();
    expect(subfolderFolderLabel(subfolderOf(mixed[0]))).toBe("—");
  });

  it("labels folder from CSV only and glue without 302", () => {
    const ok = sf({
      folder: "en-gb",
      csv: "en-gb[home]",
      mode: "home",
      match: true,
      glue: "canonical",
    });
    expect(subfolderFolderLabel(ok)).toBe("en-gb");
    expect(subfolderGlueLabel(ok.glue)).toBe("Canonical");
    expect(subfolderGlueLabel("301")).toBe("301");
    expect(subfolderGlueLabel("302")).toBe("—");
    expect(subfolderGlueLabel("redirect")).toBe("—");
    expect(subfolderMatchOf(ok)).toBe(true);

    const mismatch = sf({
      folder: "en-gb",
      csv: "en-gb[home]",
      mode: "home",
      match: false,
      glue: null,
    });
    expect(subfolderFolderLabel(mismatch)).toBe("en-gb");
    expect(subfolderMatchOf(mismatch)).toBe(false);
    expect(subfolderGlueLabel(mismatch.glue)).toBe("—");

    const csvEmptyLiveIt = sf({
      folder: null,
      csv: null,
      mode: null,
      match: false,
      glue: "canonical",
      live_folder: "it",
    });
    expect(subfolderFolderLabel(csvEmptyLiveIt)).toBe("—");
    expect(subfolderHint(csvEmptyLiveIt)).toBe("на сайте: it");
    expect(subfolderMatchOf(csvEmptyLiveIt)).toBe(false);

    const dead = sf({
      folder: "en-gb",
      csv: "en-gb[home]",
      mode: "home",
      match: null,
      glue: null,
      error: "домен не резолвится",
    });
    expect(subfolderFolderLabel(dead)).toBe("en-gb");
    expect(subfolderMatchOf(dead)).toBeNull();
    expect(subfolderGlueLabel(dead.glue)).toBe("—");
    expect(subfolderHint(dead)).toBe("домен не резолвится");
  });

  it("does not take cloak homepage redirect as subfolder glue", () => {
    const cloaked = row({
      url: "https://money.com",
      status: 302,
      redirect: { status: 302, location: "/", foreign: false },
      subfolder: sf({
        folder: "en-gb",
        csv: "en-gb[home]",
        mode: "home",
        match: true,
        glue: "canonical",
      }),
    });
    expect(cloaked.redirect?.status).toBe(302);
    expect(subfolderGlueLabel(cloaked.subfolder!.glue)).toBe("Canonical");
    expect(subfolderGlueLabel(String(cloaked.redirect?.status))).toBe("—");
  });

  it("finds subfolder names in table search", () => {
    const item = row({
      url: "https://betic-it.org",
      status: 200,
      subfolder: sf({
        folder: "it",
        csv: "it[home]:rewrite:root",
        mode: "home",
        match: true,
        glue: "canonical",
      }),
    });
    expect(matchesQuery(item, "it")).toBe(true);
    expect(matchesQuery(item, "en-gb")).toBe(false);
    expect(matchesQuery(item, "canonical")).toBe(true);
  });
});
