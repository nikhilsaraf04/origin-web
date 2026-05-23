// Tiny clsx replacement so we don't add a dependency.
export type ClsxValue = string | number | false | null | undefined;
export function clsx(...args: ClsxValue[]): string {
  return args.filter(Boolean).join(" ");
}
