import { describe, it } from "./deps.ts";
import { resolveSshKey } from "../src/incus-app-container-files/cli/commands/create-app-container/ssh-key.ts";

describe("ssh-key", () => {
  describe("resolveSshKey", () => {
    describe('given "gh:hugojosefson"', () => {
      it("should not throw", async () => {
        await resolveSshKey("gh:hugojosefson");
      });
    });
  });
});
