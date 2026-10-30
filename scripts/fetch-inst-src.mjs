/**
 * 악기 원본 음원을 내려받는다. `node scripts/fetch-inst-src.mjs`
 *
 * 받는 곳은 `.inst-src/`이고 **커밋하지 않는다**(합쳐서 83MB). 출처와 고른 이유는
 * `scripts/inst-sources.mjs` 머리말에 있다. 이미 있는 파일은 건너뛴다.
 *
 * 받은 뒤 `node scripts/prep-inst-wav.mjs`가 여기서 16개를 뽑아 `assets/inst/`에 넣는다.
 */
import { Buffer } from "node:buffer";
import { mkdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SOURCES, SRC_DIR } from "./inst-sources.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = join(ROOT, SRC_DIR);

mkdirSync(DIR, { recursive: true });

let got = 0;
let skipped = 0;

for (const { file, url } of SOURCES) {
  const dest = join(DIR, file);
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`건너뜀  ${file}`);
    skipped += 1;
    continue;
  }

  process.stdout.write(`받는 중 ${file} ... `);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${file}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`${(buf.length / 1e6).toFixed(1)}MB`);
  got += 1;
}

console.log(`\n받음 ${got} · 건너뜀 ${skipped} → ${SRC_DIR}/`);
