import { describe, it } from "@std/testing/bdd";
import { resolveSshKey } from "../src/incus-app-container-files/cli/things/ssh-key.ts";

describe("ssh-key", () => {
  describe("resolveSshKey", () => {
    describe('given "gh:hugojosefson"', () => {
      it("should not throw", async () => {
        await resolveSshKey("gh:hugojosefson");
      });
    });
  });
});
