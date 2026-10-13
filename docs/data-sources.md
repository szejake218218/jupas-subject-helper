# Data sources and provenance

Every number in this app traces to a source below with a date of last check.
Nothing in the roster is inferred, interpolated, remembered, or "probably fine".

## Sources in use

### 1. JUPAS — 2025 JUPAS Admissions Scores of 9 JUPAS Participating-institutions
- URL: https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf
- Last checked 2026-01-15
- Used for: **HKU (42 rows), HKMU (28), EdUHK (25), LU (13)** — 108 rows — plus the
  published **grade-conversion ladder of every institution**.
- The publication states that each institution supplies its own section, so this
  is an authoritative per-institution source, not a third-party digest.
- Extraction: `pdftotext -table` → `tools/generate.py` (per-institution column
  bands) → `tools/emit.py`. Every row is kept only if the published columns
  satisfy UQ ≥ median ≥ LQ (or median ≥ LQ where two columns are given).
- **Method validation:** the identical heuristic, run over the CityU section of
  this same PDF, reproduced **55 of 57** CityU rows exactly as read from CityU's
  own publication. Where it could not, it produced *nothing* rather than a wrong
  number.

### 2. CityUHK — Admission Score Formula and Admissions Scores for 2026 JUPAS
- URL: https://www.cityu.edu.hk/admo/sites/default/files/2026-01/2026_JUPAS_AdmissionScoreFormulaAndScores.pdf
- Published 7 January 2026 · last checked 2026-01-07
- Used for: 58 CityUHK programmes
- Gives: per-programme formula, included subjects, subject weightings, median and
  lower quartile (2025 entry recalculated on the 2026 formula), Category B/C
  conversion, and the M1/M2 notes (both modules count as one subject when both are
  taken; on JS1211 only the better of Maths and M1/M2 counts).
- **Status: `verified`.**

### 3. HKUST — 2025 JUPAS Admissions Scores
- URL: https://join.hkust.edu.hk/docs/2025_HKUST_JUPAS_ADMISSIONS_SCORES.pdf
- Last checked 2026-01-01
- Used for: 33 HKUST programmes (25 with 2025 scores, 8 with 2026 simulated
  Engineering scores).
- Gives: highest attainable / median / lower quartile on "best 5 + 6th subject
  bonus".
- **Does not give** the programme-specific subject weightings, nor the value of
  the 6th-subject bonus.
- **Status: `partial`** — computed as unweighted best 5 with no bonus, so the
  number is a **lower bound**. Printed on every affected programme in the UI.

### 4. CUHK IBBA (JS4202) + CUHK JUPAS FAQ
- URLs: http://ibba.bschool.cuhk.edu.hk/admissions/local-students-jupas-js4202 ·
  https://admission.cuhk.edu.hk/application/jupas/faq/
- Last checked 2026-01-01
- Gives: best-5 formula, median 26 / LQ 26 (2025 entry); CUHK's conversion
  (5\*\*=8.5 …) and the MBChB exception (5\*\*=7).
- **Status: `partial`.**

## Conversion ladders (the single most consequential config)

Taken from source 1, each institution's own statement:

| Institution | 5\*\* | 5\* | 5 | 4 | 3 | 2 |
|---|---|---|---|---|---|---|
| HKU, HKUST, CityU, CUHK\*, PolyU | 8.5 | 7 | 5.5 | 4 | 3 | 2 |
| **LU, EdUHK, HKMU** | **7** | **6** | **5** | 4 | 3 | 2 |
| HKBU | not published → nothing is scored | | | | | |

\* CUHK MBChB (JS4501/JS4502) uses the 7 ladder instead.

Scoring a LU or EdUHK programme on the 8.5 ladder overstates it by about 20%.
The ladder is therefore configuration, and a null ladder makes the engine refuse
to produce a number at all.

## Deliberately blocked rows (history shown, no score computed)

| Code | Institution | Reason |
|---|---|---|
| JS1805 | CityU | formula cell spans rows in the source PDF |
| JS1806 | CityU | formula cell spans rows in the source PDF |
| JS1807 | CityU | formula cell spans rows in the source PDF |
| JS1051 | CityU | formula cell merged in the source PDF |
| 2 HKU rows | HKU | published selection principle could not be parsed into a formula |

## Sections deliberately not loaded

| Institution | Why | Unblock by |
|---|---|---|
| PolyU | code / formula / score columns drift out of alignment in the aggregate PDF; row identity is lost | parsing PolyU's own "JUPAS Admissions Figures" PDF (its `Average HKDSE Score with Subject Weighting` column uses a much larger numeric range) |
| HKBU | publishes grade profiles + a mean score, **no conversion table** → no ladder exists to score on | obtaining HKBU's published grade conversion |
| CUHK | only the IBBA row is loaded; the aggregate's CUHK section pairs a grade profile with a weighted total and the row association is not yet reliable | CUHK's "Admission Grades" PDF + per-programme pages |

### 5. HKEAA — Category B: Applied Learning Subjects
- URL: https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/category_b_subjects/science
- Last checked 2026-01-15
- Used for: the Applied Learning course catalogue (`js/data/apl.js`) — 64 courses,
  six areas of studies, and the examination years each course is offered.
- Also the source of the points mapping: HKEAA states that **Attained with
  Distinction (I) is comparable to Level 3** and **Attained with Distinction (II)
  to Level 4 or above**, which is what the engine applies (3 / 4 / 0).
- ApL Chinese (for non-Chinese speaking students) is reported without the (I)/(II)
  split, and no institution conversion for it was found → scored as 0 with a
  warning rather than guessed.

### 6. Band A offer shares (marked 未核實 / unverified)

Aggregated third-party summary of 2025 offers by institution — not an official
JUPAS or institution publication. Kept in a separate panel with an explicit
unverified badge so it cannot contaminate the scoring roster.

## Annual update workflow

1. New institutional publications appear between January (CityU) and July.
2. Re-run the pipeline in `tools/` for the aggregate publication; it re-validates
   every row before emitting.
3. Update `scores.entryYear` / `scores.publishedFor` and each source's `asOf`.
4. Re-check formulas and weightings — they change every year.
5. `node --test tests/engine.test.mjs`. The integrity tests fail if a programme
   loses its source, its date, half its history, or is scored on an unpublished
   ladder.

## Legal / etiquette note

Every source above is institution-published and is credited with a link on each
programme. The JUPAS publication states that reproduction of its information
without written consent may be incomplete or misleading and that JUPAS takes no
responsibility for unauthorised use; CityUHK's PDF carries a similar notice. This
project therefore links to sources rather than republishing their tables, keeps
provenance on every row, and does not ship the extracted text of the PDFs.
