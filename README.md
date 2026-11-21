# Glimt

Korte nonduale glimt for hverdagen, på **[glimt.kengurune.com](https://glimt.kengurune.com)**.

101 glimt: 51 originale (`src/data/glimt.md`) og 50 nye (`src/data/nye-glimt.md`), tagget med
Situasjon · Øyne · Inngang · Varighet · Nivå. Appen trekker et tilfeldig glimt etter hvor du er og
hvor lang tid du har, har timer med klokkelyd, favoritter, søk og filter, og virker offline (PWA).

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # sjekker glimt-dataene, typesjekker og bygger
```

## Legge til eller endre glimt

Rediger markdown-filene i `src/data/`. Hvert glimt er en `## <nr>. <tittel>`-blokk med tekst og en
`Tagger:`-linje med fem felt skilt med `·`. `scripts/check.ts` kjøres før bygging og stopper deployen
hvis numrene ikke er sammenhengende eller et glimt for bilkjøring har lukkede øyne.

## Deploy

Push til `main` bygger og deployer til Azure Static Web App `glimt` (ressursgruppe `kengurune`).
