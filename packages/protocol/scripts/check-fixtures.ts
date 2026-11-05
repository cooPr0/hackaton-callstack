import { PlayerView } from "../src";
import { loadFixtures, schemaFor, secretLeak } from "./fixtures";

let failed = 0;
for (const { dir, file, data } of loadFixtures()) {
  const res = schemaFor(dir, file).safeParse(data);
  if (!res.success) {
    failed++;
    console.error(`✖ ${dir}/${file}\n${res.error.message}`);
    continue;
  }
  if (dir === "views" && secretLeak(PlayerView.parse(data))) {
    failed++;
    console.error(`✖ ${dir}/${file}: secret visible to a non-cue-giver before REVEAL`);
    continue;
  }
  console.log(`✔ ${dir}/${file}`);
}
if (failed) {
  console.error(`\n${failed} fixture(s) failed`);
  process.exit(1);
}
