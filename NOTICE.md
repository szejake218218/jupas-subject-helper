# NOTICE — data ownership and attribution

**This project is not affiliated with JUPAS, any university, the HKEAA or the
Education Bureau.** It is an independent, unofficial tool.

## Code vs data

The **code** in this repository is MIT licensed (see `LICENSE`). The **factual
content** reproduced under `js/data/` is not ours and is not covered by that
licence. It is quoted for the purpose of letting students check their own
eligibility, with the source credited on every record.

## Sources and their terms

| Content | Owner | Source | Their stated position |
|---|---|---|---|
| Programme formulas, subject weightings, median / lower quartile, conversion ladders | JUPAS and the nine participating institutions | JUPAS, *2025 JUPAS Admissions Scores of 9 JUPAS Participating-institutions* (PDF) | "The information contained on the JUPAS website is solely owned by JUPAS." Reproduction in whole or in part, in any format, without prior written consent may be "incomplete, misleading, and / or inaccurate"; JUPAS "takes no responsibility for the unauthorised use of any of its information." |
| CityUHK formulas, weightings, scores, Category B/C conversion | City University of Hong Kong | CityUHK "Admission Score Formula and Admissions Scores for 2026 JUPAS" (PDF) | "All rights reserved." Reproduced information "may be incomplete, misleading and/or inaccurate"; the University takes no responsibility for unauthorised use. |
| HKUST scores, Engineering simulated scores | HKUST | HKUST "2025 JUPAS Admissions Scores" (PDF) | Scores "provided for reference only" |
| Category B (Applied Learning) course list, result levels | HKEAA | HKEAA, Category B: Applied Learning Subjects | Subject information published by HKEAA |
| Band A offer shares | third-party aggregation, **not official** | see `docs/data-sources.md` | labelled 未核實 / unverified in the UI |

## What this repository does and does not do

- It **links to** every source and stamps each record with the source and the
  date it was last checked (`source`, `asOf` on every row).
- It does **not** ship the extracted text of the source PDFs. `.gitignore`
  excludes `tools/af.pdf`, `tools/af_table.txt` and the intermediate JSON, so a
  clone contains the parser but not a redistribution of the publications.
- It **refuses to compute** anything whose rule it could not read from a source,
  rather than estimating. Records carry `verified` / `partial` / `blocked`, and
  every `partial` result prints the assumption it made.

## If you fork or redeploy this

Check each source's terms of use and copyright notice first, and keep the
attribution and the "非官方 / not official" disclaimer intact. If you intend to
republish the score tables at scale, seek written permission from JUPAS and the
relevant institution. The safest reuse is of the *engine and UI*, pointing at
your own lawfully obtained data.

## Trademarks

JUPAS, HKDSE and the institution names are the property of their respective
owners and are used here descriptively, to identify the data and programmes
being discussed.
