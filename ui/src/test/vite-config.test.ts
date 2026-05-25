// @vitest-environment node
import { describe, expect, it } from "vitest";

import viteConfig from "../../vite.config";

describe("Vite config", () => {
  it("proxies API requests in both dev and preview servers", () => {
    expect(viteConfig.server?.proxy).toEqual({
      "/api": "http://localhost:3000",
    });
    expect(viteConfig.preview?.proxy).toEqual({
      "/api": "http://localhost:3000",
    });
  });
});
