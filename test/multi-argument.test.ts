import { describe, it } from "https://deno.land/std@0.220.1/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.220.1/assert/assert_equals.ts";
import { resolveMultiArgument } from "../usr_local_bin/incus-app-container-files/multi-argument.ts";

describe("multi-argument", () => {
  describe("resolveMultiArgument", () => {
    it('given "gh:hugojosefson", should return ["gh:hugojosefson"]', async () => {
      assertEquals(await resolveMultiArgument("gh:hugojosefson"), [
        "gh:hugojosefson",
      ]);
    });
  });
});
