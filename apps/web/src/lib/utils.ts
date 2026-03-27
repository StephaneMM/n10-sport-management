import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// Usage: cn("foo", "bar", { "baz": isBaz }) => "foo bar baz" if isBaz is true, otherwise "foo bar"