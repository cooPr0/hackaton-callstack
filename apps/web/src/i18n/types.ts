import type { pl } from "./pl";

export const LANGS = ["pl", "en"] as const;
export type Lang = (typeof LANGS)[number];

/** Turns the `as const` Polish literals into plain string/function types other languages must match. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : { readonly [K in keyof T]: Widen<T[K]> };

/** The shape of every language's copy — Polish is the source of truth. */
export type Copy = Widen<typeof pl>;
