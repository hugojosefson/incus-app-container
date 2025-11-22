import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
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
