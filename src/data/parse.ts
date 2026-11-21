// Parses the glimt markdown sources. Kept free of Vite/DOM so scripts/check.ts
// can run it under plain Node.

export type Oyne = "åpne" | "lukkede" | "begge";
export type Varighet = "10 sek" | "1 min" | "5 min";
export type Nivaa = "nybegynner" | "erfaren";
export type Inngang = "syn" | "lyd" | "kropp" | "tanke" | "følelse";

export interface Situasjon {
  tag: string;
  /** Text from the parenthesis, e.g. "kun åpne øyne" for bilkjøring. */
  note?: string;
}

export interface Glimt {
  nr: number;
  tittel: string;
  tekst: string;
  situasjon: Situasjon[];
  oyne: Oyne;
  oyneTekst: string;
  inngang: Inngang[];
  varighet: Varighet[];
  varighetTekst: string;
  nivaa: Nivaa;
  ny: boolean;
}

const INNGANG: Inngang[] = ["syn", "lyd", "kropp", "tanke", "følelse"];
const BUCKETS: Varighet[] = ["10 sek", "1 min", "5 min"];

/** Splits on commas that are not inside parentheses. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseOyne(s: string): Oyne {
  if (s.includes("/")) return "begge";
  if (s.startsWith("lukkede")) return "lukkede";
  if (s.startsWith("åpne")) return "åpne";
  throw new Error(`Ukjent øyne-verdi: ${s}`);
}

/** "10 sek–1 min" covers both ends; "1–5 min" covers 1 min and 5 min. */
function parseVarighet(s: string): Varighet[] {
  const norm = s.replace(/\s+/g, " ").trim();
  const [a, b] = norm.split("–").map((x) => x.trim());
  const unitB = b?.split(" ")[1] ?? a.split(" ")[1];
  const first = (a.includes(" ") ? a : `${a} ${unitB}`) as Varighet;
  const last = (b ?? a) as Varighet;
  const i = BUCKETS.indexOf(first);
  const j = BUCKETS.indexOf(last);
  if (i < 0 || j < 0) throw new Error(`Ukjent varighet: ${s}`);
  return BUCKETS.slice(i, j + 1);
}

export function parseGlimt(src: string, ny: boolean): Glimt[] {
  return src
    .split(/^## /m)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const head = lines[0].match(/^(\d+)\.\s+(.+)$/);
      if (!head) throw new Error(`Mangler nummer: ${lines[0]}`);
      const tagLine = lines.find((l) => l.startsWith("Tagger:"));
      if (!tagLine) throw new Error(`Mangler tagger i ${lines[0]}`);
      const parts = tagLine.slice("Tagger:".length).split("·").map((p) => p.trim());
      if (parts.length !== 5) throw new Error(`Feil antall tagger i ${lines[0]}`);
      const [sit, oyne, inn, varighet, nivaa] = parts;
      const inngang = inn.split(",").map((x) => x.trim()) as Inngang[];
      for (const x of inngang) {
        if (!INNGANG.includes(x)) throw new Error(`Ukjent inngang «${x}» i ${lines[0]}`);
      }
      if (nivaa !== "nybegynner" && nivaa !== "erfaren") {
        throw new Error(`Ukjent nivå «${nivaa}» i ${lines[0]}`);
      }
      return {
        nr: Number(head[1]),
        tittel: head[2],
        tekst: lines.slice(1).filter((l) => l !== tagLine).join("\n"),
        situasjon: splitTop(sit).map((s) => {
          const m = s.match(/^([^(]+?)\s*\((.+)\)$/);
          return m ? { tag: m[1].trim(), note: m[2].trim() } : { tag: s };
        }),
        oyne: parseOyne(oyne),
        oyneTekst: oyne,
        inngang,
        varighet: parseVarighet(varighet),
        varighetTekst: varighet,
        nivaa,
        ny,
      } satisfies Glimt;
    });
}

/** Throws if the collection breaks any of the app's invariants. */
export function validate(all: Glimt[]): void {
  const nrs = all.map((g) => g.nr);
  nrs.forEach((n, i) => {
    if (n !== i + 1) throw new Error(`Nummer ${n} på plass ${i + 1}: forventet ${i + 1}`);
  });
  for (const g of all) {
    if (g.situasjon.some((s) => s.tag === "bilkjøring") && g.oyne === "lukkede") {
      throw new Error(`Glimt ${g.nr} er tagget bilkjøring men har lukkede øyne`);
    }
  }
}
