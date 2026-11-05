import { PlayerView } from "@tint/protocol";

/**
 * Every golden view in shared/fixtures/views, parsed with the protocol schema.
 * Used by the /dev gallery, the mock socket and unit tests.
 */
const raw = import.meta.glob<unknown>("@shared/fixtures/views/*.json", {
  eager: true,
  import: "default",
});

export const viewFixtures: Record<string, PlayerView> = Object.fromEntries(
  Object.entries(raw)
    .map(
      ([path, data]) =>
        [
          path
            .split("/")
            .pop()
            ?.replace(/\.json$/, "") ?? path,
          PlayerView.parse(data),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b)),
);

export function fixture(name: string): PlayerView {
  const v = viewFixtures[name];
  if (!v) throw new Error(`unknown view fixture "${name}"`);
  return v;
}
