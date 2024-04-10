import { assertEquals, describe, it } from "./deps.ts";
import { resolveMultiArgument } from "../src/incus-app-container-files/multi-argument.ts";

describe("multi-argument", () => {
  describe("resolveMultiArgument", () => {
    it('given "gh:hugojosefson", should return ["gh:hugojosefson"]', async () => {
      assertEquals(await resolveMultiArgument("gh:hugojosefson"), [
        "gh:hugojosefson",
      ]);
    });
  });
});
