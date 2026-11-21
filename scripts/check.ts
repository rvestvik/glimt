// Build-time sanity check of the glimt sources: 231 entries, numbered 1..231
// without gaps, and no driving glimt with closed eyes.
import { readFileSync } from "node:fs";
import { parseGlimt, validate } from "../src/data/parse.ts";

const read = (f: string) => readFileSync(new URL(`../src/data/${f}`, import.meta.url), "utf8");
const all = [...parseGlimt(read("glimt.md"), false), ...parseGlimt(read("nye-glimt.md"), true)];
validate(all);
if (all.length !== 231) throw new Error(`Forventet 231 glimt, fant ${all.length}`);
const bil = all.filter((g) => g.situasjon.some((s) => s.tag === "bilkjøring")).length;
console.log(`OK: ${all.length} glimt (${all.filter((g) => !g.ny).length} originale, ${all.filter((g) => g.ny).length} nye), ${bil} for bilkjøring`);
