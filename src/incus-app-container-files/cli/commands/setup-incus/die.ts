export function die(message = "A fatal error occurred.", code = 1): never {
  console.error(message);
  return Deno.exit(code);
}
