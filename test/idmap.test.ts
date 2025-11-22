import { assertEquals, describe, it } from "./deps.ts";
import { getNextIdmapBaseAbove } from "../src/incus-app-container-files/cli/idmap.ts";

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
