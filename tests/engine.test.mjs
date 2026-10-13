/* Engine tests — real arithmetic, hand-verified against the published rules.
 * Run: node --test tests/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const E = require(path.join(here, '..', 'js', 'engine.js'));
require(path.join(here, '..', 'js', 'data', 'institutions.js'));
require(path.join(here, '..', 'js', 'data', 'apl.js'));
require(path.join(here, '..', 'js', 'data', 'programmes.js'));
require(path.join(here, '..', 'js', 'data', 'programmes-ext.js'));

const INST = globalThis.JUPAS_INSTITUTIONS;
const PROGS = globalThis.JUPAS_PROGRAMMES;
const byId = (id) => PROGS.find((p) => p.id === id);

const profile = (o = {}) => Object.assign({
  chi: '3', eng: '4', math: '4', csd: 'A',
  electives: [{ code: 'PHY', level: '3' }, { code: 'M2', level: '4' }, { code: 'ECON', level: '4' }],
  catB: [], catC: []
}, o);

const score = (p, prof = profile()) => E.computeScore(prof, p, INST[p.inst]);

/* ------------------------------------------------------------------ *
 * Grade conversion
 * ------------------------------------------------------------------ */

test('grade conversion follows each published scale', () => {
  const s85 = E.SCALES.scale85.catA;
  assert.equal(s85['5**'], 8.5);
  assert.equal(s85['5*'], 7);
  assert.equal(s85['5'], 5.5);
  assert.equal(s85['4'], 4);
  assert.equal(s85['U'], 0);
  const s7 = E.SCALES.scale7.catA;
  assert.equal(s7['5**'], 7);
  assert.equal(s7['5*'], 6);
  assert.equal(s7['5'], 5);
});

/* ------------------------------------------------------------------ *
 * Best-5 with subject weighting — CityU JS1201
 * CHI 3 (x1.5) = 4.5 | ENG 4 (x2.5) = 10 | MATH 4 (x2.5) = 10
 * PHY 3 (x2.5) = 7.5 | M2 4 (x2.5) = 10 | ECON 4 (x1) = 4
 * Best 5 (ENG forced) = 10 + 10 + 10 + 7.5 + 4.5 = 42
 * ------------------------------------------------------------------ */

test('JS1201 weighted best-5 arithmetic is exact', () => {
  const p = byId('CITYU-JS1201');
  const r = score(p);
  assert.equal(r.ok, true);
  assert.equal(r.score, 42);
  assert.deepEqual(r.counted.map((c) => c.code).sort(), ['CHI', 'ENG', 'M2', 'MATH', 'PHY']);
  const eng = r.counted.find((c) => c.code === 'ENG');
  assert.equal(eng.weight, 2.5);
  assert.equal(eng.subtotal, 10);
  const chi = r.counted.find((c) => c.code === 'CHI');
  assert.equal(chi.weight, 1.5);
  assert.equal(chi.subtotal, 4.5);
});

test('ECON at x1 is the one dropped by best-5', () => {
  const p = byId('CITYU-JS1201');
  const r = score(p);
  assert.equal(r.counted.some((c) => c.code === 'ECON'), false);
});

test('JS1201 delta vs published LQ / median', () => {
  const ev = E.evaluate(profile(), byId('CITYU-JS1201'), INST.CITYU);
  assert.equal(ev.deltaLq, -0.5);          // 42 - 42.5
  assert.equal(ev.deltaMedian, -1.5);      // 42 - 43.5
  assert.equal(ev.verdict, 'below-lq');
});

/* ------------------------------------------------------------------ *
 * "3 core + 2 elective" — CityU JS1071 Data Science
 * CHI 3 x1 = 3 | ENG 5=5.5 x1.5 = 8.25 | MATH 5=5.5 x2 = 11 | PHY 5*=7 x1 | ECON 4 x1
 * = 3 + 8.25 + 11 + 7 + 4 = 33.25
 * ------------------------------------------------------------------ */

test('JS1071 cores + 2 electives arithmetic is exact', () => {
  const prof = profile({ eng: '5', math: '5', electives: [{ code: 'PHY', level: '5*' }, { code: 'ECON', level: '4' }] });
  const r = E.computeScore(prof, byId('CITYU-JS1071'), INST.CITYU);
  assert.equal(r.score, 33.25);
  assert.equal(r.counted.length, 5);
  assert.deepEqual(r.counted.map((c) => c.code), ['CHI', 'ENG', 'MATH', 'PHY', 'ECON']);
});

/* ------------------------------------------------------------------ *
 * M1/M2 rules
 * ------------------------------------------------------------------ */

test('JS1211: when Maths and M1/M2 are both taken, only the better one counts', () => {
  const prof = profile({ math: '4', electives: [{ code: 'M2', level: '5' }] });
  const r = E.computeScore(prof, byId('CITYU-JS1211'), INST.CITYU);
  assert.equal(r.counted.some((c) => c.code === 'MATH'), false, 'weaker Maths must be dropped');
  assert.equal(r.counted.some((c) => c.code === 'M2'), true);
  assert.match(r.warnings.join(' '), /只計較高分的一科/);
});

test('CityU: M1 and M2 together count as one subject', () => {
  const prof = profile({ electives: [{ code: 'M1', level: '5' }, { code: 'M2', level: '5*' }, { code: 'PHY', level: '4' }] });
  const r = E.computeScore(prof, byId('CITYU-JS1204'), INST.CITYU);
  const maths = r.pool.filter((c) => c.code === 'M1' || c.code === 'M2');
  assert.equal(maths.length, 1);
  assert.equal(maths[0].code, 'M2', 'the higher-scoring module is kept');
});

/* ------------------------------------------------------------------ *
 * Mandatory subjects
 * ------------------------------------------------------------------ */

test('JS1000 is ineligible when Maths is not taken at all', () => {
  const prof = profile({ math: '', electives: [{ code: 'ECON', level: '5' }, { code: 'BAFS', level: '5' }] });
  const r = E.computeScore(prof, byId('CITYU-JS1000'), INST.CITYU);
  assert.equal(r.ok, false);
  assert.equal(r.status, 'ineligible');
  assert.match(r.blockedReason, /MATH/);
});

test('JS1050 needs one science elective', () => {
  const prof = profile({ electives: [{ code: 'ECON', level: '5' }, { code: 'BAFS', level: '5' }] });
  const r = E.computeScore(prof, byId('CITYU-JS1050'), INST.CITYU);
  assert.equal(r.ok, false);
  assert.match(r.blockedReason, /BIO／CHEM／PHY/);
});

test('blocked programmes are never scored', () => {
  const r = E.computeScore(profile(), byId('CITYU-JS1805'), INST.CITYU);
  assert.equal(r.ok, false);
  assert.equal(r.status, 'blocked');
  assert.equal(r.score, null);
});

/* ------------------------------------------------------------------ *
 * HKUST partial-data handling
 * ------------------------------------------------------------------ */

test('HKUST programmes compute but are flagged partial with the assumption stated', () => {
  const p = byId('HKUST-JS5312');
  assert.equal(p.status, 'partial');
  const r = score(p);
  assert.equal(r.ok, true);
  assert.equal(r.status, 'partial');
  assert.match(r.warnings.join(' '), /第 6 科加分率未在官方文件公布/);
  assert.match(r.warnings.join(' '), /未收錄於本工具所依據的分數文件/);
});

test('HKUST Engineering uses the published English x2 / Maths x2 only', () => {
  const prof = profile({ eng: '5', math: '5', electives: [{ code: 'PHY', level: '5' }, { code: 'M2', level: '5' }] });
  const r = E.computeScore(prof, byId('HKUST-JS5240'), INST.HKUST);
  // ENG 5.5x2=11, MATH 5.5x2=11, PHY 5.5, M2 5.5, CHI 3 -> best5 = 11+11+5.5+5.5+3 = 36
  assert.equal(r.score, 36);
  assert.equal(r.status, 'partial');
});

/* ------------------------------------------------------------------ *
 * Category B / C
 * ------------------------------------------------------------------ */

test('Applied Learning only counts where the programme recognises it', () => {
  const prof = profile({ catB: [{ code: 'APL1', level: 'ADII' }] });
  const recognised = E.computeScore(prof, byId('CITYU-JS1040'), INST.CITYU);
  assert.equal(recognised.pool.some((c) => c.kind === 'catB' && c.points === 4), true);
  const notRecognised = E.computeScore(prof, byId('CITYU-JS1204'), INST.CITYU);
  assert.equal(notRecognised.pool.some((c) => c.kind === 'catB'), false);
});

test('Category B grades map to the published points, and Attained scores nothing', () => {
  const p = byId('CITYU-JS1040');   // recognises some ApL subjects
  const pts = (level) => E.computeScore(profile({ catB: [{ code: 'APL1', level }] }), p, INST.CITYU)
    .pool.find((c) => c.kind === 'catB').points;
  assert.equal(pts('ADII'), 4);     // comparable to Level 4 or above (HKEAA)
  assert.equal(pts('ADI'), 3);      // comparable to Level 3 (HKEAA)
  assert.equal(pts('A'), 0);
});

test('only one Applied Learning subject counts, even if two are entered', () => {
  const prof = profile({ catB: [{ code: 'APL1', level: 'ADI' }, { code: 'APL2', level: 'ADII' }] });
  const r = E.computeScore(prof, byId('CITYU-JS1040'), INST.CITYU);
  const apl = r.pool.filter((c) => c.kind === 'catB');
  assert.equal(apl.length, 1, 'exactly one ApL subject may sit in the pool');
  assert.equal(apl[0].points, 4, 'the better result is the one kept');
  assert.match(r.warnings.join(' '), /應用學習科目最多只計一科/);
});

test('Applied Learning Chinese (NCS) is never scored', () => {
  const prof = profile({ catB: [{ code: 'APL61', level: 'AD', ncs: true }] });
  const r = E.computeScore(prof, byId('CITYU-JS1040'), INST.CITYU);
  assert.equal(r.pool.some((c) => c.kind === 'catB'), false);
  assert.match(r.warnings.join(' '), /應用學習中文（非華語學生適用）/);
});

test('an ApL subject that reaches the counted set is flagged partial, with the caveat printed', () => {
  // CityU JS1040: best 5, English x2. With only one weak elective, an AD(II) lands in the top 5.
  const prof = profile({
    chi: '3', eng: '4', math: '4',
    electives: [{ code: 'ECON', level: '3' }],
    catB: [{ code: 'APL1', level: 'ADII' }]
  });
  const r = E.computeScore(prof, byId('CITYU-JS1040'), INST.CITYU);
  assert.equal(r.ok, true);
  assert.equal(r.counted.some((c) => c.category === 'catB'), true);
  assert.equal(r.status, 'partial');
  assert.match(r.warnings.join(' '), /只承認官方「指定」的應用學習科目/);
});

test('the Applied Learning catalogue is complete and self-consistent', () => {
  const APL = globalThis.JUPAS_APL;
  assert.ok(APL, 'Category B catalogue should load');
  assert.ok(APL.COURSES.length >= 60, `expected the full published list, got ${APL.COURSES.length}`);
  const codes = new Set();
  for (const c of APL.COURSES) {
    assert.ok(c.code && c.en, `${c.code}: missing identity`);
    assert.equal(codes.has(c.code), false, `duplicate ApL code ${c.code}`);
    codes.add(c.code);
    assert.ok(c.years.length > 0, `${c.code}: no examination year`);
    assert.ok(APL.AREAS.some((a) => a.id === c.areaId), `${c.code}: unknown area ${c.areaId}`);
    assert.equal(c.ncs, c.areaId === 'NCS', `${c.code}: NCS flag must follow the area`);
  }
  assert.ok(APL.source.url.includes('hkeaa.edu.hk'), 'catalogue must cite HKEAA');
  // every course that feeds the 2027 exam year is findable (the JUPAS cycle this tool targets)
  assert.ok(APL.forYear(2027).length >= 50, 'most courses run for the 2027 cohort');
});

test('Category C conversion is institution-specific', () => {
  const cityu = profile({ catC: [{ code: 'JAP', level: 'N1' }] });
  const hkust = profile({ catC: [{ code: 'JAP', level: 'N1' }] });
  const c = E.computeScore(cityu, byId('CITYU-JS1204'), INST.CITYU).pool.find((x) => x.code === 'JAP');
  const k = E.computeScore(hkust, byId('HKUST-JS5300'), INST.HKUST).pool.find((x) => x.code === 'JAP');
  assert.equal(c.points, 7);      // CityU: Japanese N1 = 7
  assert.equal(k.points, 8.5);    // HKUST: Japanese N1 = 8.5
});

/* ------------------------------------------------------------------ *
 * Minimum requirements
 * ------------------------------------------------------------------ */

test('failed core subject is reported with the exact gap', () => {
  const req = E.checkRequirements(profile({ chi: '2' }), byId('CITYU-JS1204'), INST.CITYU);
  assert.equal(req.met, false);
  const f = req.fails.find((x) => x.code === 'CHI');
  assert.equal(f.have, '2');
  assert.equal(f.need, '3');
});

test('CSD not attained fails the gate', () => {
  const req = E.checkRequirements(profile({ csd: 'NA' }), byId('CITYU-JS1204'), INST.CITYU);
  assert.equal(req.met, false);
  assert.equal(req.fails[0].code, 'CSD');
});

test('HKUST 332A33 needs two electives at level 3', () => {
  const req = E.checkRequirements(profile({ electives: [{ code: 'PHY', level: '3' }, { code: 'ECON', level: '2' }] }), byId('HKUST-JS5300'), INST.HKUST);
  assert.equal(req.met, false);
  assert.equal(req.label, '332A33');
  assert.equal(req.fails.some((x) => x.code === 'ELECTIVE2'), true);
});

test('a clean 332A33 profile passes the HKUST gate', () => {
  const req = E.checkRequirements(profile({ chi: '3', eng: '3', math: '2', electives: [{ code: 'PHY', level: '3' }, { code: 'ECON', level: '3' }] }), byId('HKUST-JS5300'), INST.HKUST);
  assert.equal(req.met, true);
});

/* ------------------------------------------------------------------ *
 * Bands and plan analysis
 * ------------------------------------------------------------------ */

test('band boundaries match the 20-choice structure', () => {
  assert.equal(E.bandOf(1), 'A');
  assert.equal(E.bandOf(3), 'A');
  assert.equal(E.bandOf(4), 'B');
  assert.equal(E.bandOf(10), 'C');
  assert.equal(E.bandOf(11), 'D');
  assert.equal(E.bandOf(15), 'D');
  assert.equal(E.bandOf(16), 'E');
  assert.equal(E.bandOf(20), 'E');
  assert.equal(E.bandOf(21), null);
  assert.equal(E.MAX_CHOICES, 20);
});

test('plan analysis flags duplicates, gaps and all-reach Band A', () => {
  const strong = profile({ chi: '5', eng: '5**', math: '5**', electives: [{ code: 'PHY', level: '5**' }, { code: 'M2', level: '5*' }] });
  const plan = [
    byId('CITYU-JS1201'), byId('CITYU-JS1201'), byId('CITYU-JS1204')
  ];
  const a = E.analysePlan(profile(), plan, (code) => INST[code]);
  assert.equal(a.warnings.some((w) => /重複選擇/.test(w.text)), true);
  assert.equal(a.warnings.some((w) => /空位/.test(w.text)), true);
  assert.equal(a.warnings.some((w) => /Band A 三個選擇全部低於/.test(w.text)), true);
  assert.equal(a.bandSummary.A.n, 3);
  assert.equal(a.rows[0].band, 'A');
  assert.equal(a.rows[2].band, 'A');

  const b = E.analysePlan(strong, plan, (code) => INST[code]);
  assert.equal(b.rows[2].kind, 'safe');
});

/* ------------------------------------------------------------------ *
 * What-if
 * ------------------------------------------------------------------ */

test('lift suggestions identify the cheapest single grade to close the gap', () => {
  const p = byId('CITYU-JS1201');
  const lifts = E.liftSuggestions(profile(), p, INST.CITYU);
  const chi = lifts.find((l) => l.code === 'CHI');
  assert.equal(chi.from, '3');
  assert.equal(chi.to, '4');
  assert.equal(chi.gain, 1.5);          // (4 - 3) x 1.5 weighting
  const phy = lifts.find((l) => l.code === 'PHY');
  assert.equal(phy.gain, 2.5);          // (4 - 3) x 2.5 weighting
  assert.equal(lifts[0].gain >= lifts[lifts.length - 1].gain, true);
});

/* ------------------------------------------------------------------ *
 * Roster integrity — the rules the product depends on
 * ------------------------------------------------------------------ */

test('every programme is well formed', () => {
  assert.equal(PROGS.length > 150, true, 'roster should cover the loaded institutions');
  const ids = new Set();
  for (const p of PROGS) {
    assert.ok(p.id && p.code && (p.titleZh || p.titleEn), `${p.id} missing identity fields`);
    assert.equal(ids.has(p.id), false, `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(INST[p.inst], `${p.id} has no institution config`);
    assert.ok(p.source && p.source.label && p.source.asOf, `${p.id} missing a dated source`);
    if (p.status === 'blocked') {
      assert.ok(p.blockedReason, `${p.id} blocked without a reason`);
    } else {
      assert.ok(p.scoring && p.scoring.formula, `${p.id} has no scoring formula`);
      assert.ok(p.scoring.formula.type, `${p.id} formula has no type`);
    }
    if (p.scores) {
      assert.ok(p.scores.median != null && p.scores.lq != null, `${p.id} history is half-filled`);
      assert.ok(p.scores.entryYear && p.scores.publishedFor, `${p.id} history is not dated`);
    }
  }
});

test('all nine participating institutions are configured', () => {
  const nine = ['HKU', 'CUHK', 'HKUST', 'CITYU', 'POLYU', 'HKBU', 'LU', 'EDUHK', 'HKMU'];
  nine.forEach((code) => assert.ok(INST[code], `${code} missing from institution config`));
  assert.equal(Object.keys(INST).length, 9);
});

test('a programme is never scored on a ladder its institution has not published', () => {
  // HKBU's conversion is not published in the aggregate, so its ladder is null.
  assert.equal(INST.HKBU.defaultScale, null);
  const fake = {
    id: 'HKBU-TEST', inst: 'HKBU', code: 'JS9999', titleZh: '', titleEn: 'x',
    scoring: {}, scores: null, requirements: {}, status: 'verified', source: { label: 'x', asOf: 'x' }
  };
  const r = E.computeScore(profile(), fake, INST.HKBU);
  assert.equal(r.ok, false);
  assert.equal(r.status, 'blocked');
  assert.match(r.blockedReason, /換算/);
});

test('LU / EdUHK / HKMU are scored on the 7-point ladder, not the 8.5 ladder', () => {
  ['LU', 'EDUHK', 'HKMU'].forEach((code) => assert.equal(INST[code].defaultScale, 'scale7', code));
  ['HKU', 'CUHK', 'HKUST', 'CITYU', 'POLYU'].forEach((code) => assert.equal(INST[code].defaultScale, 'scale85', code));

  // A 5** is worth 7 at LU and 8.5 at HKU — the same grade, different score.
  const prof = profile({ chi: '5**', eng: '5**', math: '5**', electives: [{ code: 'PHY', level: '5**' }, { code: 'CHEM', level: '5**' }] });
  const lu = PROGS.find((p) => p.inst === 'LU' && p.scoring && p.scoring.scale === 'scale7');
  const hku = PROGS.find((p) => p.inst === 'HKU' && p.scoring);
  assert.ok(lu && hku);
  const luScore = E.computeScore(prof, lu, INST.LU);
  const hkuScore = E.computeScore(prof, hku, INST.HKU);
  assert.equal(luScore.ok, true);
  assert.equal(hkuScore.ok, true);
  // five 5** at LU = 35 (7 each); at HKU the same five are 12.75 + 12.75 + 8.5 x 3 = 51
  assert.equal(luScore.score, 35);
  assert.equal(hkuScore.score, 51);
});

test('HKU publishes its 6th-subject bonus rate, so it is not a guess', () => {
  const p = PROGS.find((x) => x.id === 'HKU-JS6793');
  assert.ok(p, 'HKU JS6793 should be present');
  assert.equal(p.scoring.sixthBonusRate, 0.2);
  assert.equal(p.scoring.formula.type, 'best_n_plus_bonus');
  const five = E.computeScore(profile({ chi: '4', eng: '5', math: '5', electives: [{ code: 'PHY', level: '4' }, { code: 'ECON', level: '4' }] }), p, INST.HKU);
  assert.equal(five.ok, true);
  // ENG 5.5x1.5=8.25, MATH 5.5x1.5=8.25, best 3 = PHY 4, ECON 4, CHI 4 -> 28.5 (no 6th subject, so no bonus)
  assert.equal(five.score, 28.5);

  const six = E.computeScore(profile({ chi: '4', eng: '5', math: '5', electives: [{ code: 'PHY', level: '4' }, { code: 'ECON', level: '4' }, { code: 'BAFS', level: '5' }] }), p, INST.HKU);
  assert.equal(six.ok, true);
  // best of the three remaining rises to BAFS 5 = 5.5, so 8.25 + 8.25 + 5.5 + 4 + 4 = 30, plus 0.2 x 6th (4) = 30.8
  assert.equal(six.score, 30.8);
});

test('extracted rows keep their provenance', () => {
  const parsed = PROGS.filter((p) => p.provenance && p.provenance.extraction === 'parsed');
  assert.ok(parsed.length >= 100, `expected the parsed institutions to be loaded, got ${parsed.length}`);
  parsed.forEach((p) => {
    assert.equal(p.sourceKey, 'JUPAS_2025_AGG', `${p.id}: extracted row from an unexpected source`);
    assert.ok(p.source.url.includes('jupas.edu.hk'), `${p.id}: source is not the official publication`);
  });
});

test('every computable programme produces a number for a plausible profile', () => {
  const prof = profile({ chi: '4', eng: '4', math: '5', electives: [{ code: 'PHY', level: '4' }, { code: 'CHEM', level: '5' }, { code: 'M2', level: '5' }] });
  for (const p of PROGS) {
    const r = E.computeScore(prof, p, INST[p.inst]);
    if (!r.ok) {
      // Only two legitimate reasons to refuse: unverified rules, or a subject the
      // programme demands and this profile does not have.
      assert.ok(['blocked', 'ineligible'].indexOf(r.status) >= 0, `${p.id} refused with ${r.status}`);
      assert.ok(r.blockedReason, `${p.id} refused without saying why`);
      continue;
    }
    assert.equal(r.score > 0, true, `${p.id} produced ${r.score}`);
    assert.ok(r.counted.length > 0, `${p.id} counted nothing`);
    r.counted.forEach((c) => assert.equal(c.weighted > 0 || c.points === 0, true, `${p.id}: ${c.code} weighted ${c.weighted}`));
  }
});

test('published median is never below the published lower quartile', () => {
  for (const p of PROGS) {
    if (!p.scores || p.scores.median == null || p.scores.lq == null) continue;
    assert.ok(p.scores.median >= p.scores.lq, `${p.id}: median ${p.scores.median} < LQ ${p.scores.lq}`);
  }
});
