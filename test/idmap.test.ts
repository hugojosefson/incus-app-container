import { describe, it } from "https://deno.land/std@0.220.1/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.220.1/assert/assert_equals.ts";
import { getNextIdmapBaseAbove } from "../src/incus-app-container-files/idmap.ts";

const cases = [
  [0, 100_000],
  [100_000, 200_000],
  [100_001, 300_000],
  [199_999, 300_000],
  [200_000, 300_000],
  [200_001, 400_000],
  [299_999, 400_000],
  [300_000, 400_000],
];

describe("idmap", () => {
  for (const [input, expected] of cases) {
    describe(`getNextIdmapBaseAbove(${input})`, () =>
      it(`should return ${expected}`, () =>
        assertEquals(getNextIdmapBaseAbove(input), expected)));
  }
});
