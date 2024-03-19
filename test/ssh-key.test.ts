import { describe, it } from "https://deno.land/std@0.220.1/testing/bdd.ts";
import {
  resolveSshKey,
} from "../usr_local_bin/incus-app-container-files/ssh-key.ts";

describe("ssh-key", () => {
  describe("resolveSshKey", () => {
    describe('given "gh:hugojosefson"', () => {
      it("should not throw", async () => {
        await resolveSshKey("gh:hugojosefson");
      });
    });
  });
});
