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

## 2027-cycle update: 學友社《中六升學指南 2026》

- Source: 學友社 (Hok Yau Club) 《中六升學指南 2026》, JUPAS score tables pp. 133–175,
  data supplied by the institutions. Scanned PDF supplied by the user
  (`university_choice.pdf`, 32 pages, 3072×4096 per page, **no text layer**).
- Loaded as `js/data/programmes-2027*.js` (one file per institution). These records
  **override** any earlier record with the same JUPAS code, because the guide carries
  **2026-entry scores recomputed under each institution's 2027 method**.
- Transcription: every page read as an image at native resolution and transcribed by
  eye. OCR (RapidOCR) was tested and **rejected** — it read `入學分數` as `入星分数`,
  `學額競爭情況` as `学额鹅手情况`.

### Coverage after this pass — 424 programmes, 16 institutions

| Institution | Rows | How its figures are compared |
|---|---|---|
| 中大 CUHK | 65 | median + LQ published, weightings published → comparable |
| 城大 CityU | 60 | median + LQ, weights ×1.25/×1.5 → comparable |
| 港大 HKU | 59 | UQ/M/LQ, weights printed before the subject (`1.5 × 英文`) → comparable |
| 都大 HKMU | 51 | 28 JUPAS (M/LQ) + 22 SSSDP (listed only) |
| 理大 PolyU | 47 | mean is published but 科目比重 lives on Study@PolyU → **no comparison** |
| 科大 HKUST | 34 | M/LQ + per-subject weights → comparable |
| 教大 EdUHK | 26 | quartiles published as *already weighted*, weights not printed → **no comparison** |
| 浸大 HKBU | 23 | weighted **mean** only, weightings published → compared to the mean |
| 嶺大 LU | 20 | weighted **median only**, no LQ column → compared to the median |
| SSSDP: 高科院 11, 東華 8, 恒大 6, 聖方濟各 6, 樹仁 3, 伍倫貢 2, 珠海 1 | 37 | **no conversion table on those pages** → listed with demand data, never scored |

281 of the 424 rows have a reference this tool can reproduce and therefore compare
against. The rest are shown with their published numbers and an explicit reason.

### Four comparison modes (the engine had to grow)

Institutions do not publish comparable things, so `evaluate()` reports which figure a
programme is being compared with, and never substitutes another:

- `lq` — lower quartile (and median if printed)
- `median` — median only, no LQ (嶺大)
- `mean` — a weighted mean whose weightings are published, so it is reproducible (浸大)
- `none` — a figure is printed but its arithmetic is not reproducible (理大's
  Study@PolyU weightings, 教大's pre-weighted quartiles, SSSDP's missing table).
  The UI says so instead of comparing.

### Things the guide changed

1. **CityU adopts a new scoring method from 2027/28** (註四): weights move from
   ×2/×2.5 to ×1.25/×1.5, and several programmes move from "Best 5" to "3C+2X".
2. **JS1051, JS1805, JS1806, JS1807 are no longer `blocked`** — the guide prints
   their formulas and scores.
3. **浸大 is no longer unscorable.** The guide publishes its ladder (5**=7 — the
   7-point scale, not 8.5), so its 23 programmes moved from "no data" to `mean`
   comparison. Its Cat C table was transcribed except 烏爾都語, whose row overlapped
   and could not be read.

### Verification

- **19 of 19 unweighted 中大 rows reproduce exactly** when their printed grade
  profile is recomputed to their published total. That validates the transcription
  itself, not just the code. Weighted rows cannot be checked this way because the
  printed profile does not say *which* electives X1–X4 were.
- 嶺大: all 20 rows satisfy Band A ÷ 學額 = the printed 每學額競爭人數 to 2 d.p.
  (a reader who uses the second quota column fails JS7802 and JS7905, where the two
  columns differ).
- **Anomaly recorded, not corrected:** CityU JS1019 prints M 23 / LQ 23.5 — a median
  below its own lower quartile, which is arithmetically impossible. Stored as
  printed, flagged `anomaly: median_below_lq`, marked `partial`, labelled in the UI.
  The numbers were **not** swapped.

### Programmes in the app that the guide does not list

- **LU-JS7101** (B.A. Hons in Chinese) — from the official 2025 aggregate, absent
  from the guide's 嶺大 page. Kept, with its source recorded.
- Two further legacy rows (**HKMU-JS9555**, **LU-JS7123**) were fragments whose
  "title" field held a data row (`^ Bachelor of … 23 22`). They are not in the guide
  and were removed rather than repaired.
- The guide lists two CityU 2027 programmes the app did not have: **JS1063**
  (LLB & BSc Computer Science) and **JS1120** (卓越全球人文社科課程), both unscored.

## Band A offer shares (marked 未核實 / unverified)

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
