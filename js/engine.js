/* JUPAS score engine — pure functions, no DOM.
 * Loads as a classic <script> in the browser (window.JUPAS_ENGINE)
 * and as CommonJS in Node (require('./engine.js')) for tests.
 *
 * Design rule: never guess. If a weighting, scale or bonus is not published,
 * the result is labelled 'partial' or 'blocked' and the assumption is surfaced.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.JUPAS_ENGINE = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Grade scales
   * ------------------------------------------------------------------ */

  var SCALES = {
    scale85: {
      id: 'scale85',
      label: '5**=8.5 · 5*=7 · 5=5.5 · 4=4 · 3=3 · 2=2 · 1=1',
      catA: { 'U': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5.5, '5*': 7, '5**': 8.5 }
    },
    scale7: {
      id: 'scale7',
      label: '5**=7 · 5*=6 · 5=5 · 4=4 · 3=3 · 2=2 · 1=1',
      catA: { 'U': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '5*': 6, '5**': 7 }
    }
  };

  // Category B (Applied Learning). ATTAINED-only (no distinction) scores 0.
  var APL_POINTS = { 'ADII': 4, 'ADI': 3, 'A': 0, 'NA': 0 };
  var APL_LABEL = {
    'ADII': 'Attained with Distinction II',
    'ADI': 'Attained with Distinction I',
    'A': 'Attained'
  };

  // Category C (Other Languages) fallback table — institutions differ, so
  // each institution may override in its own config.
  var CAT_C_DEFAULT = {
    JAP: { 'N1': 7, 'N2': 5.5, 'N3': 4 },
    KOR: { '6': 7, '5': 5.5, '4': 4, '3': 3 },
    FRA: { 'C2': 7, 'C1': 5.5, 'B2': 4, 'B1': 3, 'A2': 3 },
    GER: { 'C2': 7, 'C1': 5.5, 'B2': 4, 'B1': 3, 'A2': 3 },
    SPA: { 'C2': 7, 'C1': 5.5, 'B2': 4, 'B1': 3, 'A2': 3 },
    URD: { 'A++': 7, 'A+': 7, 'A': 7, 'B++': 5.5, 'B+': 5.5, 'B': 4, 'C': 4, 'D': 3, 'E': 3 }
  };

  var GRADE_ORDER = ['U', '1', '2', '3', '4', '5', '5*', '5**'];
  var CORE_CODES = ['CHI', 'ENG', 'MATH'];

  // JUPAS 20 choices: Band A 1-3, B 4-6, C 7-10, D 11-15, E 16-20.
  var BANDS = [
    { band: 'A', from: 1, to: 3 },
    { band: 'B', from: 4, to: 6 },
    { band: 'C', from: 7, to: 10 },
    { band: 'D', from: 11, to: 15 },
    { band: 'E', from: 16, to: 20 }
  ];
  var MAX_CHOICES = 20;

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  function bandOf(rank) {
    for (var i = 0; i < BANDS.length; i++) {
      if (rank >= BANDS[i].from && rank <= BANDS[i].to) return BANDS[i].band;
    }
    return null;
  }

  function scaleOf(id) { return SCALES[id] || SCALES.scale85; }

  // Institution-wide scoring conventions merged under each programme's own spec.
  // Weighting rules are accepted in two shapes: [{w, subjects}] or [[w, subjects]].
  function normalizeWeights(weights) {
    if (!weights) return [];
    return weights.map(function (r) {
      if (Array.isArray(r)) return { w: r[0], subjects: r[1] || [] };
      return { w: r.w, subjects: r.subjects || [] };
    });
  }

  function mergeScoring(program, inst) {
    var out = {};
    var defaults = (inst && inst.scoringDefaults) || {};
    Object.keys(defaults).forEach(function (k) { out[k] = defaults[k]; });
    var sc = program.scoring || {};
    Object.keys(sc).forEach(function (k) { out[k] = sc[k]; });
    if (!out.scale && inst && inst.defaultScale) out.scale = inst.defaultScale;
    out.weights = normalizeWeights(out.weights);
    return out;
  }

  function gradePoints(level, scale) {
    if (level == null || level === '' ) return null;
    if (level === 'NA' || level === 'U') return scale.catA['U'];
    var p = scale.catA[level];
    return (p === undefined) ? null : p;
  }

  function resolveWeight(code, weights, fallback) {
    if (weights) {
      for (var i = 0; i < weights.length; i++) {
        if (weights[i].subjects && weights[i].subjects.indexOf(code) !== -1) return weights[i].w;
      }
    }
    return (fallback == null) ? 1 : fallback;
  }

  function nextGrade(level) {
    var i = GRADE_ORDER.indexOf(level);
    if (i < 0 || i === GRADE_ORDER.length - 1) return null;
    return GRADE_ORDER[i + 1];
  }

  function cloneProfile(p) {
    return {
      chi: p.chi, eng: p.eng, math: p.math, csd: p.csd,
      electives: (p.electives || []).map(function (e) { return { code: e.code, level: e.level }; }),
      catB: (p.catB || []).map(function (e) { return { code: e.code, level: e.level }; }),
      catC: (p.catC || []).map(function (e) { return { code: e.code, level: e.level }; })
    };
  }

  /* ------------------------------------------------------------------ *
   * Candidate pool
   * ------------------------------------------------------------------ */

  function buildPool(profile, program, inst) {
    var sc = mergeScoring(program, inst);
    var scale = scaleOf(sc.scale);
    var pool = [];
    var warnings = [];

    function add(code, level, kind, catCategory) {
      if (level == null || level === '' || level === 'NA') return;
      var pts;
      if (kind === 'catB') {
        pts = APL_POINTS[level];
        if (pts === undefined) { pts = 0; warnings.push('未知的應用學習等級：' + level); }
      } else if (kind === 'catC') {
        var table = (inst && inst.catC && inst.catC[code]) || CAT_C_DEFAULT[code] || {};
        pts = table[level];
        if (pts === undefined) { pts = 0; warnings.push('未知的其他語言等級：' + code + ' ' + level); }
      } else {
        pts = gradePoints(level, scale);
        if (pts === null) { pts = 0; warnings.push('未能識別等級：' + code + ' ' + level); }
      }
      pool.push({
        code: code, level: level, kind: kind, category: catCategory || 'catA',
        points: pts,
        weight: resolveWeight(code, sc.weights, sc.defaultWeight),
        weighted: pts * resolveWeight(code, sc.weights, sc.defaultWeight)
      });
    }

    add('CHI', profile.chi, 'core');
    add('ENG', profile.eng, 'core');
    add('MATH', profile.math, 'core');
    (profile.electives || []).forEach(function (e) { add(e.code, e.level, 'elective'); });
    if (sc.aplAsElective) {
      var aplAll = (profile.catB || []).filter(function (e) { return e.code && e.level; });
      // ApL Chinese (for NCS students) has no published conversion anywhere we hold,
      // and some institutions state outright that it is excluded. Score nothing.
      aplAll.filter(function (e) { return e.ncs; }).forEach(function () {
        warnings.push('應用學習中文（非華語學生適用）未公布分數換算，部分院校亦明文不計 → 不計分。');
      });
      var aplScored = aplAll.filter(function (e) { return !e.ncs; });
      if (aplScored.length > 1) {
        warnings.push('應用學習科目最多只計一科（作為一科選修科）→ 只計較高分的一科。');
      }
      aplScored
        .sort(function (a, b) { return (APL_POINTS[b.level] || 0) - (APL_POINTS[a.level] || 0); })
        .slice(0, 1)
        .forEach(function (e) { add(e.code, e.level, 'catB', 'catB'); });
    }
    if (sc.catCAsElective) {
      (profile.catC || []).forEach(function (e) { add(e.code, e.level, 'catC', 'catC'); });
    }

    // M1 and M2 taken together count as one subject (CityU note 2).
    if (sc.m1m2AsOne) {
      var exts = pool.filter(function (c) { return c.code === 'M1' || c.code === 'M2'; });
      if (exts.length > 1) {
        var keep = exts.slice().sort(function (a, b) { return b.weighted - a.weighted; })[0];
        pool = pool.filter(function (c) { return exts.indexOf(c) === -1 || c === keep; });
        warnings.push('M1 與 M2 同時報考：只當作一科計算（計較高分的 ' + keep.code + '）。');
      }
    }

    // "If both Mathematics and M1/M2 are taken, only one subject will be included."
    if (sc.m1m2ExclusiveWithMath) {
      var hasMath = pool.some(function (c) { return c.code === 'MATH'; });
      var ext = pool.filter(function (c) { return c.code === 'M1' || c.code === 'M2'; });
      if (hasMath && ext.length) {
        var math = pool.filter(function (c) { return c.code === 'MATH'; })[0];
        var best = ext.slice().sort(function (a, b) { return b.weighted - a.weighted; })[0];
        var drop = (best.weighted > math.weighted) ? math : best;
        pool = pool.filter(function (c) { return c !== drop; });
        warnings.push('數學 與 ' + best.code + ' 同時報考：只計較高分的一科（' + (drop === math ? '數學不計' : drop.code + ' 不計') + '）。');
      }
    }

    return { pool: pool, scale: scale, warnings: warnings };
  }

  /* ------------------------------------------------------------------ *
   * Scoring
   * ------------------------------------------------------------------ */

  function computeScore(profile, program, inst) {
    var sc = mergeScoring(program, inst);
    var formula = sc.formula || { type: 'best_n', n: 5 };

    if (program.status !== 'blocked' && (!sc.scale || !SCALES[sc.scale])) {
      return {
        ok: false, status: 'blocked', score: null, counted: [], pool: [],
        warnings: [], scale: null,
        blockedReason: (inst && (inst.scaleNote || inst.noProgrammesReason)) ||
          '此院校的成績換算表未收錄，無法按該校的尺度計算 → 拒絕計算。'
      };
    }
    var built = buildPool(profile, program, inst);
    var pool = built.pool;
    var warnings = built.warnings.slice();
    var status = program.status === 'blocked' ? 'blocked' : (program.status === 'partial' ? 'partial' : 'verified');

    if (program.status === 'blocked') {
      return {
        ok: false, status: 'blocked',
        blockedReason: program.blockedReason || '此課程的官方計分規則未能核實，不做計算。',
        score: null, counted: [], pool: pool, warnings: warnings, scale: built.scale
      };
    }

    var mustInclude = formula.mustInclude || [];
    var missing = mustInclude.filter(function (code) {
      return !pool.some(function (c) { return c.code === code; });
    });
    if (missing.length) {
      return {
        ok: false, status: 'ineligible',
        blockedReason: '此課程要求計入 ' + missing.join('、') + '，你未有報考／未輸入該科。',
        score: null, counted: [], pool: pool, warnings: warnings, scale: built.scale
      };
    }

    var mustIncludeAny = formula.mustIncludeAny || [];
    for (var g = 0; g < mustIncludeAny.length; g++) {
      var group = mustIncludeAny[g];
      if (!pool.some(function (c) { return group.indexOf(c.code) !== -1; })) {
        return {
          ok: false, status: 'ineligible',
          blockedReason: '此課程要求其中一科選修科為 ' + group.join('／') + '。',
          score: null, counted: [], pool: pool, warnings: warnings, scale: built.scale
        };
      }
    }

    var counted = [];
    var n = formula.n || 5;

    if (formula.type === 'cores_plus_electives') {
      CORE_CODES.forEach(function (code) {
        var c = pool.filter(function (x) { return x.code === code; })[0];
        if (c) counted.push(c);
      });
      var electives = pool
        .filter(function (c) { return CORE_CODES.indexOf(c.code) === -1; })
        .sort(function (a, b) { return b.weighted - a.weighted; })
        .slice(0, formula.electiveCount || 2);
      counted = counted.concat(electives);
      if (electives.length < (formula.electiveCount || 2)) {
        warnings.push('選修科不足：此公式要求 ' + (formula.electiveCount || 2) + ' 科選修科。');
        status = bumpStatus(status, 'partial');
      }
    } else {
      var forced = pool.filter(function (c) { return mustInclude.indexOf(c.code) !== -1; });
      var rest = pool
        .filter(function (c) { return mustInclude.indexOf(c.code) === -1; })
        .sort(function (a, b) { return b.weighted - a.weighted; });
      var needed = Math.max(0, n - forced.length);
      counted = forced.concat(rest.slice(0, needed));
      if (counted.length < n) {
        warnings.push('可計分科目只有 ' + counted.length + ' 科，少於公式要求的 ' + n + ' 科。');
        status = bumpStatus(status, 'partial');
      }
      // 6th-subject bonus (HKUST). Rate is not published in the source we hold.
      if (formula.type === 'best_n_plus_bonus') {
        var sixth = rest[needed];
        if (sixth) {
          if (sc.sixthBonusRate == null) {
            warnings.push('第 6 科加分率未在官方文件公布 → 未加分，此分數為下限。');
            status = bumpStatus(status, 'partial');
          } else {
            var bonus = Math.round(sixth.weighted * sc.sixthBonusRate * 100) / 100;
            sixth = { code: sixth.code, level: sixth.level, kind: sixth.kind, category: sixth.category,
                      points: sixth.points, weight: sixth.weight, weighted: sixth.weighted, bonus: bonus, isBonus: true };
            counted.push(sixth);
          }
        }
      }
    }

    // Slot-based weighting rules (e.g. "2.5: Physics in 1st Elective") cannot be
    // reproduced by a subject-based engine — say so instead of pretending.
    if (sc.slotRules) {
      warnings.push('此課程部分比重是按「第幾科選修科」而非科目本身釐定，本工具以科目為準 → 可能低估或高估。');
      status = bumpStatus(status, 'partial');
    }
    // An ApL subject that actually lands in the counted set is a partial result:
    // programmes recognise only *specified* ApL subjects, and we do not hold those lists.
    if (counted.some(function (c) { return c.category === 'catB'; })) {
      warnings.push('此課程只承認官方「指定」的應用學習科目；本工具不核對你的科目是否在該名單內 → 若不在名單內，此分數會偏高。');
      status = bumpStatus(status, 'partial');
    }
    if (sc.assumptions) {
      sc.assumptions.forEach(function (a) { warnings.push('假設：' + a); });
    }

    var total = 0;
    counted.forEach(function (c) {
      c.subtotal = Math.round(c.weighted * 100) / 100;
      total += (c.bonus != null) ? c.bonus : c.weighted;
    });
    total = Math.round(total * 100) / 100;

    return {
      ok: true, status: status, score: total, counted: counted, pool: pool,
      warnings: warnings, scale: built.scale,
      formulaLabel: formulaLabel(formula, sc)
    };
  }

  function formulaLabel(formula, sc) {
    var base;
    if (formula.type === 'cores_plus_electives') {
      base = '3 核心科 + ' + (formula.electiveCount || 2) + ' 選修科';
    } else {
      base = '最佳 ' + (formula.n || 5) + ' 科';
      if (formula.type === 'best_n_plus_bonus') base += ' + 第 6 科加分';
    }
    var inc = (formula.mustInclude || []).map(function (c) { return c; });
    if (inc.length) base += '（必須包括 ' + inc.join('、') + '）';
    if (formula.mustIncludeAny && formula.mustIncludeAny.length) {
      base += '（必須包括 ' + formula.mustIncludeAny.map(function (g) { return g.join('／'); }).join('、') + ' 其中一科）';
    }
    return base;
  }

  function bumpStatus(current, worse) {
    var rank = { verified: 0, partial: 1, blocked: 2, ineligible: 3 };
    return (rank[worse] > rank[current]) ? worse : current;
  }

  /* ------------------------------------------------------------------ *
   * Minimum requirements (institution gate)
   * ------------------------------------------------------------------ */

  function checkRequirements(profile, program, inst) {
    var gate = (program.requirements && program.requirements.gate) || (inst && inst.gate);
    var fails = [];
    if (!gate) {
      return { met: null, fails: [], label: '未收錄', note: '此課程的最低入學要求未收錄。' };
    }

    ['CHI', 'ENG', 'MATH'].forEach(function (code) {
      if (gate[code] == null) return;
      var have = code === 'CHI' ? profile.chi : code === 'ENG' ? profile.eng : profile.math;
      var need = gate[code];
      var points = GRADE_ORDER.indexOf(have);
      if (have == null || have === '' || points < GRADE_ORDER.indexOf(String(need))) {
        fails.push({ code: code, have: have || '—', need: String(need), label: code + ' 需第 ' + need + ' 級' });
      }
    });

    if (gate.CSD != null) {
      if (profile.csd !== 'A') {
        fails.push({ code: 'CSD', have: profile.csd === 'NA' ? '未達標' : '—', need: '達標', label: '公民與社會發展科需「達標」' });
      }
    }

    // Elective levels: gate.electiveLevels = [3,3] means the best two electives must each reach 3.
    var levels = gate.electiveLevels || [];
    if (levels.length) {
      var pool = [];
      if (profile.electives) profile.electives.forEach(function (e) { if (e.code) pool.push(e.level); });
      pool = pool
        .map(function (l) { return GRADE_ORDER.indexOf(l); })
        .filter(function (i) { return i >= 0; })
        .sort(function (a, b) { return b - a; });
      for (var i = 0; i < levels.length; i++) {
        var needIdx = GRADE_ORDER.indexOf(String(levels[i]));
        var haveIdx = (pool[i] == null) ? -1 : pool[i];
        if (haveIdx < needIdx) {
          fails.push({
            code: 'ELECTIVE' + (i + 1),
            have: (pool[i] == null) ? '—' : GRADE_ORDER[haveIdx],
            need: String(levels[i]),
            label: '第 ' + (i + 1) + ' 科選修科需第 ' + levels[i] + ' 級'
          });
        }
      }
    }

    return {
      met: fails.length === 0,
      fails: fails,
      label: gate.label || '',
      note: (program.requirements && program.requirements.note) || (inst && inst.gateNote) || ''
    };
  }

  /* ------------------------------------------------------------------ *
   * Full evaluation
   * ------------------------------------------------------------------ */

  function evaluate(profile, program, inst) {
    var score = computeScore(profile, program, inst);
    var req = checkRequirements(profile, program, inst);
    var hist = program.scores || null;
    var out = {
      program: program, score: score, requirement: req,
      history: hist,
      deltaLq: null, deltaMedian: null, verdict: 'unknown'
    };
    if (score.ok && hist && hist.lq != null) out.deltaLq = Math.round((score.score - hist.lq) * 100) / 100;
    if (score.ok && hist && hist.median != null) out.deltaMedian = Math.round((score.score - hist.median) * 100) / 100;
    out.verdict = verdictOf(out);
    return out;
  }

  // Historical position only — never a probability of admission.
  function verdictOf(ev) {
    if (!ev.score.ok) return ev.score.status === 'blocked' ? 'blocked' : 'ineligible';
    if (ev.deltaLq == null) return 'no-history';
    if (ev.deltaMedian != null && ev.deltaMedian >= 0) return 'above-median';
    if (ev.deltaLq >= 0) return 'between-lq-median';
    return 'below-lq';
  }

  var VERDICT_LABEL = {
    'above-median': '高於去年中位數',
    'between-lq-median': '介乎去年下四分位數與中位數',
    'below-lq': '低於去年下四分位數',
    'ineligible': '不符合／無法計算',
    'blocked': '計分規則未核實',
    'no-history': '無歷史分數'
  };

  /* ------------------------------------------------------------------ *
   * "What if" — which single grade lift closes the gap
   * ------------------------------------------------------------------ */

  function liftSuggestions(profile, program, inst) {
    var base = computeScore(profile, program, inst);
    if (!base.ok) return [];
    var slots = [];
    slots.push({ code: 'CHI', get: function (p) { return p.chi; }, set: function (p, v) { p.chi = v; } });
    slots.push({ code: 'ENG', get: function (p) { return p.eng; }, set: function (p, v) { p.eng = v; } });
    slots.push({ code: 'MATH', get: function (p) { return p.math; }, set: function (p, v) { p.math = v; } });
    (profile.electives || []).forEach(function (e, i) {
      slots.push({
        code: e.code || ('ELECTIVE' + (i + 1)),
        get: function (p) { return p.electives[i] && p.electives[i].level; },
        set: function (p, v) { p.electives[i].level = v; }
      });
    });

    var out = [];
    slots.forEach(function (slot) {
      var cur = slot.get(profile);
      var nxt = nextGrade(cur);
      if (!nxt) return;
      var p2 = cloneProfile(profile);
      slot.set(p2, nxt);
      var r = computeScore(p2, program, inst);
      if (!r.ok) return;
      var gain = Math.round((r.score - base.score) * 100) / 100;
      if (gain > 0) out.push({ code: slot.code, from: cur, to: nxt, gain: gain, newScore: r.score });
    });
    out.sort(function (a, b) { return b.gain - a.gain; });
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 20-choice plan analysis
   * ------------------------------------------------------------------ */

  function analysePlan(profile, plan, lookupInst) {
    var warnings = [];
    var seen = {};
    var bandSummary = { A: { n: 0, safe: 0, border: 0, reach: 0, bad: 0 },
                        B: { n: 0, safe: 0, border: 0, reach: 0, bad: 0 },
                        C: { n: 0, safe: 0, border: 0, reach: 0, bad: 0 },
                        D: { n: 0, safe: 0, border: 0, reach: 0, bad: 0 },
                        E: { n: 0, safe: 0, border: 0, reach: 0, bad: 0 } };

    if (plan.length > MAX_CHOICES) {
      warnings.push({ level: 'error', text: '志願超過 ' + MAX_CHOICES + ' 個（現有 ' + plan.length + ' 個）。' });
    }
    if (plan.length < MAX_CHOICES) {
      warnings.push({ level: 'info', text: '你只填了 ' + plan.length + ' / ' + MAX_CHOICES + ' 個志願，仍有 ' + (MAX_CHOICES - plan.length) + ' 個空位。' });
    }

    var rows = plan.map(function (p, i) {
      var ev = evaluate(profile, p, lookupInst(p.inst));
      var rank = i + 1;
      var band = bandOf(rank);
      var kind = !ev.score.ok ? 'bad'
        : (ev.deltaMedian != null && ev.deltaMedian >= 0) ? 'safe'
        : (ev.deltaLq != null && ev.deltaLq >= 0) ? 'border' : 'reach';
      bandSummary[band].n += 1;
      bandSummary[band][kind] += 1;
      if (seen[p.id]) {
        warnings.push({ level: 'error', text: '重複選擇：' + p.code + ' 出現多於一次（第 ' + seen[p.id] + ' 及第 ' + rank + ' 位）。' });
      } else {
        seen[p.id] = rank;
      }
      if (!ev.requirement.met && ev.requirement.met !== null) {
        warnings.push({ level: 'error', text: band + ' 組第 ' + rank + ' 位 ' + p.code + ' 未達最低要求：' + ev.requirement.fails.map(function (f) { return f.label; }).join('、') + '。' });
      }
      if (ev.score.status === 'blocked') {
        warnings.push({ level: 'warn', text: band + ' 組 ' + p.code + ' 的官方計分規則未核實，無法判斷位置。' });
      }
      return { rank: rank, band: band, program: p, evaluation: ev, kind: kind };
    });

    ['A', 'B', 'C', 'D', 'E'].forEach(function (b) {
      var s = bandSummary[b];
      if (!s.n) return;
      if (b === 'A') {
        if (s.safe === 0 && s.border === 0) {
          warnings.push({ level: 'warn', text: 'Band A 三個選擇全部低於去年下四分位數 → 沒有任何一個是「貼近歷史水平」的選擇。' });
        }
        if (s.bad > 0) {
          warnings.push({ level: 'warn', text: 'Band A 有 ' + s.bad + ' 個無法計分或未合資格的選擇。' });
        }
      }
      if (s.reach === s.n && s.n >= 3) {
        warnings.push({ level: 'info', text: 'Band ' + b + ' 全部選擇都低於去年下四分位數。' });
      }
    });

    var anySafe = rows.some(function (r) { return r.kind === 'safe'; });
    var anyInBandsABC = rows.some(function (r) { return r.kind === 'safe' && ['A', 'B', 'C'].indexOf(r.band) !== -1; });
    if (rows.length && !anyInBandsABC) {
      warnings.push({ level: 'warn', text: 'Band A–C 內沒有「高於去年中位數」的選擇。' });
    }
    if (rows.length && !anySafe) {
      warnings.push({ level: 'warn', text: '整份名單沒有任何一個是高於去年中位數的選擇。' });
    }

    return { rows: rows, warnings: warnings, bandSummary: bandSummary };
  }

  return {
    SCALES: SCALES,
    APL_POINTS: APL_POINTS,
    APL_LABEL: APL_LABEL,
    CAT_C_DEFAULT: CAT_C_DEFAULT,
    GRADE_ORDER: GRADE_ORDER,
    CORE_CODES: CORE_CODES,
    BANDS: BANDS,
    MAX_CHOICES: MAX_CHOICES,
    VERDICT_LABEL: VERDICT_LABEL,
    bandOf: bandOf,
    gradePoints: gradePoints,
    nextGrade: nextGrade,
    cloneProfile: cloneProfile,
    resolveWeight: resolveWeight,
    mergeScoring: mergeScoring,
    formulaLabel: formulaLabel,
    computeScore: computeScore,
    checkRequirements: checkRequirements,
    evaluate: evaluate,
    verdictOf: verdictOf,
    liftSuggestions: liftSuggestions,
    analysePlan: analysePlan
  };
});
