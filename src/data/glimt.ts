import originale from "./glimt.md?raw";
import nye from "./nye-glimt.md?raw";
import { parseGlimt, validate, type Glimt } from "./parse.ts";

export const GLIMT: Glimt[] = [...parseGlimt(originale, false), ...parseGlimt(nye, true)];
validate(GLIMT);

export function byNr(nr: number): Glimt | undefined {
  return GLIMT[nr - 1];
}

/** Situations offered as quick filters, in display order. */
export const SITUASJONER = [
  "alene",
  "tur",
  "natur",
  "jobb",
  "venting",
  "hjemme",
  "samtale",
  "måltid",
  "skjerm",
  "trening",
  "morgen",
  "kveld",
  "før søvn",
  "når urolig",
  "når lykkelig",
  "bilkjøring",
] as const;

/** "alle situasjoner" matches every filter except the safety-sensitive ones. */
export function matchesSituasjon(g: Glimt, sit: string): boolean {
  const tags = g.situasjon.map((s) => s.tag);
  if (tags.includes(sit)) return true;
  return tags.includes("alle situasjoner") && sit !== "bilkjøring" && sit !== "krise" && sit !== HVOR_SOM_HELST;
}

/** Tag for glimt that need no particular place, object, activity or mood. */
export const HVOR_SOM_HELST = "hvor som helst";

export function isKrise(g: Glimt): boolean {
  return g.situasjon.some((s) => s.tag === "krise");
}
