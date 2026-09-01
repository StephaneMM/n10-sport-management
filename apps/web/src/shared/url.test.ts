import { describe, it, expect } from "vitest";
import { safeExternalUrl } from "./url";

describe("safeExternalUrl", () => {
  it("returns http(s) URLs unchanged", () => {
    expect(safeExternalUrl("https://youtube.com/x")).toBe("https://youtube.com/x");
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com");
  });

  it.each(["javascript:alert(document.cookie)", "data:text/html,x", "vbscript:x", "not a url"])(
    "drops %j",
    (value) => {
      expect(safeExternalUrl(value)).toBeUndefined();
    },
  );
});
