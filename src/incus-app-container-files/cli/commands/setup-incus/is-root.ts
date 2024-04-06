export function isRoot(): boolean {
  return Deno.uid() === 0;
}
