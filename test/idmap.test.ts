import { describe, it } from "https://deno.land/std@0.220.1/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.220.1/assert/assert_equals.ts";
import { getNextIdmapBaseAbove } from "../usr_local_bin/incus-app-container-files/idmap.ts";

const cases = [
  [0, 1_000_000],
  [1_000_000, 2_000_000],
  [1_000_001, 3_000_000],
  [1_999_999, 3_000_000],
  [2_000_000, 3_000_000],
  [2_000_001, 4_000_000],
  [2_999_999, 4_000_000],
  [3_000_000, 4_000_000],
];

describe("idmap", () => {
  for (const [input, expected] of cases) {
    describe(`getNextIdmapBaseAbove(${input})`, () =>
      it(`should return ${expected}`, () =>
        assertEquals(getNextIdmapBaseAbove(input), expected)));
  }
});
