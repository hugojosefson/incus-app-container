/*
 * via https://github.com/hugojosefson/incus-app-container
 * License: MIT
 * Copyright (c) 2022 Hugo Josefson
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { Config, getConfig } from "./config.ts";
import { createCli } from "./create-cli.ts";
import { CommandFailureError, ParseError } from "./deps.ts";

const config: Config = await getConfig();
const cli = await createCli(config);
try {
  await cli.run(Deno.args);
} catch (e) {
  if (e instanceof ParseError) {
    const hr = "-".repeat(Deno.consoleSize().columns);
    await cli.run(["--help"]);
    console.error(
      [
        hr,
        e.message,
        hr,
      ].join("\n"),
    );
    Deno.exit(2);
  }
  if (e instanceof CommandFailureError) {
    console.log(e.stdout);
    console.error(e.stderr);
    console.error(e.stack);
    Deno.exit(1);
  }
  throw e;
}
