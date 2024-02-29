import { describe, it } from "https://deno.land/std@0.217.0/testing/bdd.ts";
import { extractShebangCommand } from "../usr_local_bin/incus-app-container-files/fn.ts";

describe("fn", () => {
  describe("extractShebangCommand", () => {
    it("should not throw on empty input", () => {
      extractShebangCommand("");
    });
  });
});
