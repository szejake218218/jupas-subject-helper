/* UI layer. Renders three things: the grade input, the programme explorer, and
 * the 20-choice planner. All scoring comes from JUPAS_ENGINE — this file never
 * does arithmetic of its own. */
(function () {
  'use strict';

  var E = window.JUPAS_ENGINE;
  var SUBJ = window.JUPAS_SUBJECTS;
  var INST = window.JUPAS_INSTITUTIONS;
  var OTHER = window.JUPAS_OTHER_INSTITUTIONS || [];
  var SOURCES = window.JUPAS_SOURCES;
  var PROGS = window.JUPAS_PROGRAMMES;
  var STORE_KEY = 'jupas-mvp-v1';

  var LEVEL_LABEL = { '': '—', 'U': '不予評級', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '5*': '5*', '5**': '5**' };
  var VERDICT_CLASS = {
    'above-median': 'safe', 'between-lq-median': 'border', 'below-lq': 'reach',
    'ineligible': 'ineligible', 'blocked': 'blocked', 'no-history': 'unverified'
  };

  var state = {
    profile: blankProfile(),
    plan: [],
    open: {},
    filters: { q: '', insts: {}, onlyEligible: false, onlyComputable: false, onlyWithHistory: false, sort: 'delta' }
  };

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var num = function (n) { return (n == null) ? '—' : (Math.round(n * 100) / 100).toString(); };
  var signed = function (n) { return (n == null) ? '—' : (n > 0 ? '+' : '') + num(n); };

  function blankProfile() {
    return { chi: '', eng: '', math: '', csd: 'A', electives: [{ code: '', level: '' }], catB: [], catC: [] };
  }

  function readyProfile() {
    // Engine treats '' as "not taken".
    return state.profile;
  }

  function progById(id) { return PROGS.filter(function (p) { return p.id === id; })[0]; }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved.profile) state.profile = Object.assign(blankProfile(), saved.profile);
      if (Array.isArray(saved.plan)) state.plan = saved.plan.filter(progById);
      if (saved.filters) state.filters = Object.assign(state.filters, saved.filters);
    } catch (e) { /* a corrupt save must never block the app */ }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        profile: state.profile, plan: state.plan, filters: state.filters
      }));
    } catch (e) { /* private mode */ }
  }

  /* ------------------------------------------------------------------ *
   * Grade input
   * ------------------------------------------------------------------ */

  function levelOptions(selected, includeU) {
    var opts = includeU ? E.GRADE_ORDER : E.GRADE_ORDER.slice(1);
    var html = '';
    if (!includeU) html += '<option value=""' + (selected === '' ? ' selected' : '') + '>—</option>';
    opts.forEach(function (l) {
      html += '<option value="' + esc(l) + '"' + (selected === l ? ' selected' : '') + '>' +
        esc(LEVEL_LABEL[l] || l) + '</option>';
    });
    if (!includeU && E.GRADE_ORDER.indexOf(selected) === -1 && selected !== '') {
      html += '<option value="' + esc(selected) + '" selected>' + esc(selected) + '</option>';
    }
    return html;
  }

  function renderCores() {
    var cores = SUBJ.CORES;
    cores.forEach(function (c) {
      var host = document.querySelector('[data-core="' + c.code + '"]');
      if (!host) return;
      var html = '<label>' + esc(c.zh) + '</label>';
      if (c.code === 'CSD') {
        html += '<select data-core-select="CSD">' +
          '<option value="A"' + (state.profile.csd === 'A' ? ' selected' : '') + '>達標</option>' +
          '<option value="NA"' + (state.profile.csd === 'NA' ? ' selected' : '') + '>未達標</option>' +
          '</select>';
      } else {
        var key = c.code.toLowerCase();
        html += '<select data-core-select="' + c.code + '">' + levelOptions(state.profile[key], false) + '</select>';
      }
      host.innerHTML = html;
    });
  }

  function renderElectives() {
    var host = $('electiveRows');
    if (!host) return;
    var html = '';
    state.profile.electives.forEach(function (e, i) {
      html += '<div class="elective-row">' +
        '<select class="subj" data-elective-subject="' + i + '">' +
          '<option value="">— 選擇科目 —</option>' +
          SUBJ.ELECTIVES.map(function (s) {
            return '<option value="' + esc(s.code) + '"' + (e.code === s.code ? ' selected' : '') + '>' + esc(s.zh) + '</option>';
          }).join('') +
        '</select>' +
        '<select class="lvl" data-elective-level="' + i + '">' + levelOptions(e.level, false) + '</select>' +
        '<button class="row-remove" data-remove-elective="' + i + '" title="移除">×</button>' +
      '</div>';
    });
    host.innerHTML = html;
    $('btnAddElective').disabled = state.profile.electives.length >= 4;
  }

  var APL = window.JUPAS_APL;

  function renderCatB() {
    var host = $('catBRows');
    if (!host) return;
    var hint = $('catBHint');
    if (!APL) { if (hint) hint.textContent = '應用學習科目清單未載入。'; return; }
    if (hint) {
      hint.textContent = state.profile.catB.length
        ? '應用學習科目最多只計一科（作為一科選修科），而且只適用於官方指定的課程。'
        : '';
    }
    if (!state.profile.catB.length) { host.innerHTML = ''; return; }

    host.innerHTML = state.profile.catB.map(function (b, i) {
      var course = APL.byCode(b.code);
      var levels = (course && course.ncs) ? APL.LEVELS_NCS : APL.LEVELS;
      var groups = APL.AREAS.map(function (a) {
        var inArea = APL.COURSES.filter(function (c) { return c.areaId === a.id; });
        if (!inArea.length) return '';
        return '<optgroup label="' + esc(a.zh + '  ' + a.area) + '">' +
          inArea.map(function (c) {
            return '<option value="' + esc(c.code) + '"' + (b.code === c.code ? ' selected' : '') + '>' +
              esc(c.en) + '</option>';
          }).join('') + '</optgroup>';
      }).join('');

      var meta = '';
      if (course) {
        meta = '考試年份：' + APL.yearLabel(course);
        if (course.ncs) meta += ' · 非華語學生適用（部分院校明文不計）';
      }

      return '<div class="catb-row">' +
        '<div class="catb-main">' +
          '<select class="apl-subject" data-catb-subject="' + i + '">' +
            '<option value="">— 選擇應用學習科目 —</option>' + groups +
          '</select>' +
          '<select class="lvl" data-catb-level="' + i + '">' +
            levels.map(function (l) {
              return '<option value="' + esc(l.code) + '" title="' + esc(l.label) + '"' +
                (b.level === l.code ? ' selected' : '') + '>' + esc(l.short || l.label) + '</option>';
            }).join('') +
          '</select>' +
          '<button class="row-remove" data-remove-catb="' + i + '" title="移除">×</button>' +
        '</div>' +
        (meta ? '<div class="catb-meta">' + esc(meta) + '</div>' : '') +
      '</div>';
    }).join('');
  }

  function renderCatC() {
    var host = $('catCRows');
    if (!host) return;
    if (!state.profile.catC.length) { host.innerHTML = ''; return; }
    host.innerHTML = state.profile.catC.map(function (c, i) {
      var lang = SUBJ.CAT_C.langs.filter(function (l) { return l.code === c.code; })[0] || SUBJ.CAT_C.langs[0];
      return '<div class="elective-row">' +
        '<select class="subj" data-catc-lang="' + i + '">' +
          SUBJ.CAT_C.langs.map(function (l) {
            return '<option value="' + esc(l.code) + '"' + (c.code === l.code ? ' selected' : '') + '>' + esc(l.label) + '</option>';
          }).join('') +
        '</select>' +
        '<select class="lvl" data-catc-level="' + i + '">' +
          lang.levels.map(function (lv) {
            return '<option value="' + esc(lv) + '"' + (c.level === lv ? ' selected' : '') + '>' + esc(lv) + '</option>';
          }).join('') +
        '</select>' +
        '<button class="row-remove" data-remove-catc="' + i + '">×</button>' +
      '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Funnel — where this student's scores land across the whole roster
   * ------------------------------------------------------------------ */

  function evaluateAll() {
    var prof = readyProfile();
    return PROGS.map(function (p) { return E.evaluate(prof, p, INST[p.inst]); });
  }

  function renderFunnel() {
    var all = evaluateAll();
    var counts = { 'above-median': 0, 'between-lq-median': 0, 'below-lq': 0, 'blocked': 0, 'ineligible': 0, 'no-history': 0 };
    all.forEach(function (ev) { counts[ev.verdict] = (counts[ev.verdict] || 0) + 1; });

    var instCount = {};
    PROGS.forEach(function (p) { instCount[p.inst] = true; });
    var instN = Object.keys(instCount).length;

    var cells = [
      { k: 'above-median', cls: 'safe', label: '高於去年中位數' },
      { k: 'between-lq-median', cls: 'border', label: '介乎去年 LQ 與中位數' },
      { k: 'below-lq', cls: 'reach', label: '低於去年 LQ' },
      { k: 'ineligible', cls: '', label: '未達最低要求／欠指定科目' },
      { k: 'blocked', cls: '', label: '計分規則未核實（不計算）' },
      { k: 'no-history', cls: '', label: '課程無歷史分數' }
    ];
    $('funnel').innerHTML = cells.map(function (c) {
      return '<div class="cell ' + c.cls + '"><b>' + (counts[c.k] || 0) + '</b><span>' + esc(c.label) + '</span></div>';
    }).join('') +
      '<div class="cell"><b>' + PROGS.length + '</b><span>已收錄課程總數（來自 ' + instN + ' 所院校）</span></div>';
  }

  /* ------------------------------------------------------------------ *
   * Programme explorer
   * ------------------------------------------------------------------ */

  function visibleProgrammes() {
    var f = state.filters;
    var q = f.q.trim().toLowerCase();
    var rows = evaluateAll().filter(function (ev) {
      var p = ev.program;
      if (Object.keys(f.insts).length && !f.insts[p.inst]) return false;
      if (q) {
        var hay = (p.code + ' ' + p.titleZh + ' ' + p.titleEn).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      if (f.onlyEligible && ev.requirement.met === false) return false;
      if (f.onlyComputable && ev.score.status === 'blocked') return false;
      if (f.onlyWithHistory && !ev.history) return false;
      return true;
    });

    var cmp = {
      delta: function (a, b) {
        var av = a.deltaLq == null ? -Infinity : a.deltaLq;
        var bv = b.deltaLq == null ? -Infinity : b.deltaLq;
        return bv - av;
      },
      score: function (a, b) { return (b.score.score || -Infinity) - (a.score.score || -Infinity); },
      lq: function (a, b) {
        var av = a.history ? a.history.lq : Infinity;
        var bv = b.history ? b.history.lq : Infinity;
        return av - bv;
      },
      inst: function (a, b) {
        return (a.program.inst + a.program.code).localeCompare(b.program.inst + b.program.code);
      }
    }[f.sort] || cmpdeltaFallback;
    function cmpdeltaFallback(a, b) { return 0; }

    return rows.sort(cmp);
  }

  function metricBlock(ev) {
    var s = ev.score;
    var sc = s.ok ? num(s.score) : '—';
    var d = ev.deltaLq;
    var cls = d == null ? '' : (d >= 0 ? 'pos' : 'neg');
    return '<div class="prog-metrics">' +
      '<div><label>我的分數</label><b>' + sc + '</b></div>' +
      '<div><label>去年 LQ</label><b>' + (ev.history ? num(ev.history.lq) : '—') + '</b></div>' +
      '<div><label>去年中位數</label><b>' + (ev.history ? num(ev.history.median) : '—') + '</b></div>' +
      '<div><label>對比 LQ</label><b class="' + cls + '">' + signed(d) + '</b></div>' +
      '<div><label>最低要求</label><b>' + (ev.requirement.met === null ? '—' : (ev.requirement.met ? '✓ 符合' : '✗ 未符合')) + '</b></div>' +
      '</div>';
  }

  function detailBlock(ev) {
    var p = ev.program, s = ev.score, out = '';

    out += '<h4>計分方法</h4><div>' + esc(s.formulaLabel || '（未核實）') + '</div>';
    if (s.scale) out += '<div>成績換算：' + esc(s.scale.label) + '</div>';

    if (s.counted && s.counted.length) {
      out += '<h4>計入的科目</h4><table class="calc-table"><thead><tr>' +
        '<th>科目</th><th>等級</th><th>分數</th><th>比重</th><th>小計</th></tr></thead><tbody>';
      s.counted.forEach(function (c) {
        out += '<tr' + (c.isBonus ? ' class="dropped"' : '') + '><td>' + esc(SUBJ.label(c.code)) + (c.isBonus ? '（第 6 科加分）' : '') +
          '</td><td>' + esc(c.level) + '</td><td>' + num(c.points) + '</td><td>×' + num(c.weight) + '</td><td>' +
          num(c.isBonus ? c.bonus : c.weighted) + '</td></tr>';
      });
      out += '</tbody><tfoot><tr><td colspan="4">總分</td><td>' + num(s.score) + '</td></tr></tfoot></table>';

      var dropped = (s.pool || []).filter(function (c) {
        return !s.counted.some(function (x) { return x === c || x.code === c.code; });
      });
      if (dropped.length) {
        out += '<h4>未計入（分數較低）</h4><table class="calc-table"><tbody>';
        dropped.forEach(function (c) {
          out += '<tr class="dropped"><td>' + esc(SUBJ.label(c.code)) + '</td><td>' + esc(c.level) + '</td><td>' +
            num(c.points) + '</td><td>×' + num(c.weight) + '</td><td>' + num(c.weighted) + '</td></tr>';
        });
        out += '</tbody></table>';
      }
    } else {
      out += '<div>' + esc(s.blockedReason || '—') + '</div>';
    }

    if (ev.requirement.met === false) {
      out += '<h4>最低入學要求未符合</h4><ul>' +
        ev.requirement.fails.map(function (f) {
          return '<li>' + esc(f.label) + '（你：' + esc(f.have) + '）</li>';
        }).join('') + '</ul>';
    }
    if (ev.requirement.label) {
      out += '<div class="src">院校最低要求：' + esc(ev.requirement.label) + ' — ' + esc(ev.requirement.note) + '</div>';
    }

    if (s.warnings && s.warnings.length) {
      out += '<h4>計算限制</h4><ul>' + s.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
    }

    // What-if: cheapest single grade lift.
    var lifts = E.liftSuggestions(readyProfile(), p, INST[p.inst]);
    if (lifts.length && ev.history && ev.deltaLq != null && ev.deltaLq < 0) {
      var need = -ev.deltaLq;
      out += '<h4>想追上去年 LQ（差 ' + num(need) + ' 分）</h4><ul>' + lifts.slice(0, 4).map(function (l) {
        return '<li>' + esc(SUBJ.label(l.code)) + ' 由 ' + esc(l.from) + ' 升至 ' + esc(l.to) + ' → +' + num(l.gain) +
          '（變 ' + num(l.newScore) + '）' + (l.gain >= need ? ' <strong>足夠</strong>' : '') + '</li>';
      }).join('') + '</ul>';
    } else if (lifts.length) {
      out += '<h4>再升一級會加幾多分</h4><ul>' + lifts.slice(0, 4).map(function (l) {
        return '<li>' + esc(SUBJ.label(l.code)) + ' ' + esc(l.from) + '→' + esc(l.to) + '：+' + num(l.gain) + '</li>';
      }).join('') + '</ul>';
    }

    if (p.notes && p.notes.length) {
      out += '<h4>備註</h4><ul>' + p.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    }

    out += '<h4>資料來源</h4><div class="src">' + esc(p.source.label) + '<br>' +
      '<span class="asof">最後核對：' + esc(p.source.asOf) + ' · ' +
      (ev.history ? esc(ev.history.entryYear) + ' 年度入學分數（為 ' + esc(ev.history.publishedFor) + ' JUPAS 公布）' : '無歷史分數') +
      '</span><br><a href="' + esc(p.source.url) + '" target="_blank" rel="noopener">' + esc(p.source.url) + '</a></div>';

    return out;
  }

  function renderProgrammes() {
    var rows = visibleProgrammes();
    var inPlan = {};
    state.plan.forEach(function (id) { inPlan[id] = true; });

    $('progEmpty').hidden = rows.length > 0;
    $('progList').innerHTML = rows.map(function (ev) {
      var p = ev.program;
      var inst = INST[p.inst];
      var verdict = E.VERDICT_LABEL[ev.verdict] || ev.verdict;
      var vclass = VERDICT_CLASS[ev.verdict] || 'unverified';
      var statusBadge = '<span class="badge ' + p.status + '">' + (p.status === 'verified' ? '已核實' : p.status === 'partial' ? '部分' : '未核實') + '</span>';
      var open = state.open[p.id];

      return '<article class="prog' + (inPlan[p.id] ? ' in-plan' : '') + '" data-prog="' + esc(p.id) + '">' +
        '<div class="prog-head">' +
          '<span class="code">' + esc(p.code) + '</span>' +
          '<h3>' + esc(p.titleZh || p.titleEn || '(名稱待補)') +
            (p.titleZh && p.titleEn ? '<small>' + esc(p.titleEn) + '</small>' : '') + '</h3>' +
          '<span class="spacer"></span>' +
          '<span class="badge">' + esc(inst.short) + '</span>' +
          statusBadge +
          '<span class="badge ' + vclass + '">' + esc(verdict) + '</span>' +
        '</div>' +
        metricBlock(ev) +
        '<div class="prog-actions">' +
          '<button class="btn small' + (inPlan[p.id] ? ' inplan' : ' primary') + '" data-add="' + esc(p.id) + '"' +
            ' title="' + (inPlan[p.id] ? '點擊移出我的志願' : '加入我的志願') + '">' +
            (inPlan[p.id] ? '✓ 已在志願內 · 點擊移除' : '加入志願') + '</button>' +
          '<button class="btn small ghost" data-toggle="' + esc(p.id) + '">' + (open ? '收起詳情' : '詳情與計分過程') + '</button>' +
        '</div>' +
        (open ? '<div class="prog-detail">' + detailBlock(ev) + '</div>' : '') +
      '</article>';
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Planner
   * ------------------------------------------------------------------ */

  function renderPlan() {
    var plan = state.plan.map(progById).filter(Boolean);
    $('planCounter').textContent = plan.length + ' / ' + E.MAX_CHOICES;
    updateJumpCount(plan.length);

    var analysis = E.analysePlan(readyProfile(), plan, function (code) { return INST[code]; });

    $('planWarnings').innerHTML = analysis.warnings.map(function (w) {
      return '<div class="w ' + esc(w.level) + '">' + esc(w.text) + '</div>';
    }).join('');

    if (!analysis.rows.length) {
      $('planList').innerHTML = '<p class="plan-empty">尚未加入任何志願。在第 3 部分按「加入志願」，再在這裡排次序。</p>';
      return;
    }

    var html = '';
    E.BANDS.forEach(function (b) {
      var rows = analysis.rows.filter(function (r) { return r.band === b.band; });
      if (!rows.length) return;
      html += '<div class="band-group"><header><span class="badge band">Band ' + b.band + '</span>' +
        '<span>第 ' + b.from + '–' + b.to + ' 志願 · ' + rows.length + ' 個</span></header>';
      rows.forEach(function (r) {
        var ev = r.evaluation;
        var vclass = VERDICT_CLASS[ev.verdict] || 'unverified';
        html += '<div class="plan-item">' +
          '<span class="rank">' + r.rank + '</span>' +
          '<span class="badge band">' + esc(r.band) + '</span>' +
          '<span class="title">' + esc(r.program.code) + ' ' + esc(r.program.titleZh || r.program.titleEn) +
            '<small>' + esc(INST[r.program.inst].short) + ' · ' + esc(E.VERDICT_LABEL[ev.verdict]) +
            ' · 我的分數 ' + (ev.score.ok ? num(ev.score.score) : '—') +
            (ev.history ? ' / 去年 LQ ' + num(ev.history.lq) : '') + '</small></span>' +
          '<span class="badge ' + vclass + '">' + esc(ev.score.status === 'blocked' ? '未核實' : (ev.deltaLq == null ? '無歷史' : signed(ev.deltaLq))) + '</span>' +
          '<button class="mv" data-up="' + esc(r.program.id) + '" title="上移"' + (r.rank === 1 ? ' disabled' : '') + '>↑</button>' +
          '<button class="mv" data-down="' + esc(r.program.id) + '" title="下移"' + (r.rank === plan.length ? ' disabled' : '') + '>↓</button>' +
          '<button class="mv" data-remove="' + esc(r.program.id) + '" title="移除">×</button>' +
        '</div>';
      });
      html += '</div>';
    });
    $('planList').innerHTML = html;
  }

  /* ------------------------------------------------------------------ *
   * Sources + Band A panel
   * ------------------------------------------------------------------ */

  function renderSources() {
    var keys = Object.keys(SOURCES);
    $('sources').innerHTML = keys.map(function (k) {
      var s = SOURCES[k];
      var n = PROGS.filter(function (p) { return p.sourceKey === k; }).length;
      return '<div class="src-block"><strong>' + esc(s.label) + '</strong>' +
        '<div>' + esc(s.note) + '</div>' +
        '<div class="asof">用於 ' + n + ' 個課程 · 最後核對 ' + esc(s.asOf) + '</div>' +
        '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a></div>';
    }).join('');

    // Coverage: which institutions are loaded, on which ladder, and which are not.
    var rows = Object.keys(INST).map(function (code) {
      var i = INST[code];
      var n = PROGS.filter(function (p) { return p.inst === code; }).length;
      var scale = i.defaultScale ? (E.SCALES[i.defaultScale] ? E.SCALES[i.defaultScale].label : i.defaultScale) : '未收錄 → 不計算';
      var gap = i.noProgrammesReason || i.scaleNote || '';
      return '<tr><td>' + esc(i.nameZh) + (gap ? '<div class="asof">' + esc(gap) + '</div>' : '') +
        '</td><td class="num">' + n + '</td><td>' + esc(scale) + '</td>' +
        '<td>' + (i.gate ? esc(i.gate.label) : '未收錄') + '</td></tr>';
    }).join('');

    $('coverage').innerHTML =
      '<p class="hint">九所參與院校全部已配置。課程資料的覆蓋情況如下 —— 未載入的院校<strong>不是</strong>漏掉，' +
      '而是官方文件無法可靠對應每一行，寧願不計算。</p>' +
      '<table class="table"><thead><tr><th>院校</th><th class="num">已收錄課程</th>' +
      '<th>成績換算</th><th>最低要求</th></tr></thead><tbody>' + rows + '</tbody></table>';

    var dates = keys.map(function (k) { return SOURCES[k].asOf; }).sort();
    var instN = {};
    PROGS.forEach(function (p) { instN[p.inst] = true; });
    var parsed = PROGS.filter(function (p) { return p.provenance && p.provenance.extraction === 'parsed'; }).length;
    $('dataStamp').textContent = '資料最後核對：' + dates[dates.length - 1] + ' · ' +
      PROGS.length + ' 個課程 / ' + Object.keys(instN).length + ' 所院校' +
      (parsed ? '（其中 ' + parsed + ' 個由官方 PDF 自動抽取）' : '');

    var all = Object.keys(INST).map(function (c) { return INST[c]; })
      .concat(OTHER.map(function (o) { return { short: o.short, code: o.code, bandA: o.bandA, nameZh: o.nameZh }; }));
    $('bandATable').innerHTML = '<thead><tr><th>院校</th><th>Band A 考生佔取錄比例</th>' +
      '<th class="num">Band A 以外取錄</th><th class="num">總取錄人數</th></tr></thead><tbody>' +
      all.map(function (i) {
        var b = i.bandA;
        return '<tr><td>' + esc(i.nameZh || i.short) + '</td><td class="num">' + b.share.toFixed(1) + '%</td>' +
          '<td class="num">' + b.outside + '</td><td class="num">' + b.totalOffers + '</td></tr>';
      }).join('') + '</tbody>';
    $('bandANote').textContent = '此表為第三方整理的數據摘要，並非 JUPAS 或院校官方公布，已標示為「未核實」。' +
      '請以官方文件核對後才依賴它作排位決定。';
  }

  /* ------------------------------------------------------------------ *
   * Quick jump to / from the 20-choice plan
   * ------------------------------------------------------------------ */

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* matchMedia unavailable */ }
  var scrollBehaviour = function () { return reduceMotion ? 'auto' : 'smooth'; };

  function scrollToPlan() {
    var el = $('planPanel');
    if (el) el.scrollIntoView({ behavior: scrollBehaviour(), block: 'start' });
  }

  function scrollToGrades() {
    var el = $('gradePanel');
    if (el) el.scrollIntoView({ behavior: scrollBehaviour(), block: 'start' });
    else window.scrollTo({ top: 0, behavior: scrollBehaviour() });
  }

  function updateJumpCount(n) {
    var text = n + '/' + E.MAX_CHOICES;
    var jc = document.querySelector('.jumpcount');
    var fc = document.querySelector('.fab-count');
    if (jc) jc.textContent = text;
    if (fc) fc.textContent = text;
  }

  // The floating button follows the reader: it points at the plan until the plan
  // is actually on screen, then it points back at the grade input.
  function initFab() {
    var fab = $('fabNav');
    if (!fab) return;
    fab.addEventListener('click', function () {
      if (fab.classList.contains('at-plan')) scrollToGrades();
      else scrollToPlan();
    });
    var target = $('planPanel');
    function setMode(atPlan) {
      fab.classList.toggle('at-plan', atPlan);
      fab.querySelector('.fab-arrow').textContent = atPlan ? '↑' : '↓';
      fab.querySelector('.fab-text').textContent = atPlan ? '返回成績輸入' : '我的 20 個志願';
      fab.title = atPlan ? '跳回第 1 部分：輸入成績' : '快速跳至我的 20 個志願';
    }
    if ('IntersectionObserver' in window && target) {
      new IntersectionObserver(function (entries) {
        setMode(entries[0].isIntersecting);
      }, { rootMargin: '-15% 0px -35% 0px' }).observe(target);
    }
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */

  function rerenderAll() {
    renderFunnel();
    renderProgrammes();
    renderPlan();
    save();
  }

  function move(arr, id, dir) {
    var i = arr.indexOf(id);
    if (i < 0) return arr;
    var j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    var copy = arr.slice();
    copy.splice(i, 1);
    copy.splice(j, 0, id);
    return copy;
  }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.coreSelect) {
      var code = t.dataset.coreSelect;
      state.profile[code === 'CSD' ? 'csd' : code.toLowerCase()] = t.value;
      rerenderAll();
    } else if (t.dataset.electiveSubject != null) {
      state.profile.electives[+t.dataset.electiveSubject].code = t.value;
      rerenderAll();
    } else if (t.dataset.electiveLevel != null) {
      state.profile.electives[+t.dataset.electiveLevel].level = t.value;
      rerenderAll();
    } else if (t.dataset.catbSubject != null) {
      var bi = +t.dataset.catbSubject;
      var picked = APL ? APL.byCode(t.value) : null;
      state.profile.catB[bi].code = t.value;
      state.profile.catB[bi].ncs = !!(picked && picked.ncs);
      // Switching to/from an ApL Chinese (NCS) course changes which results exist.
      var allowed = (picked && picked.ncs) ? APL.LEVELS_NCS : APL.LEVELS;
      if (!allowed.some(function (l) { return l.code === state.profile.catB[bi].level; })) {
        state.profile.catB[bi].level = allowed[0].code;
      }
      renderCatB(); rerenderAll();
    } else if (t.dataset.catbLevel != null) {
      state.profile.catB[+t.dataset.catbLevel].level = t.value;
      rerenderAll();
    } else if (t.dataset.catcLang != null) {
      var i = +t.dataset.catcLang;
      state.profile.catC[i].code = t.value;
      state.profile.catC[i].level = (SUBJ.CAT_C.langs.filter(function (l) { return l.code === t.value; })[0] || {}).levels[0];
      renderCatC(); rerenderAll();
    } else if (t.dataset.catcLevel != null) {
      state.profile.catC[+t.dataset.catcLevel].level = t.value;
      rerenderAll();
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') {
      state.filters.q = t.value;
      renderProgrammes();
      save();
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add],[data-toggle],[data-up],[data-down],[data-remove],[data-remove-elective],[data-remove-catb],[data-remove-catc],.pill');
    if (!t) return;

    if (t.dataset.add) {
      var addId = t.dataset.add;
      var at = state.plan.indexOf(addId);
      if (at >= 0) {
        state.plan.splice(at, 1);           // clicking again takes the choice back out
      } else {
        if (state.plan.length >= E.MAX_CHOICES) {
          window.alert('已達 20 個志願上限。請先移除一個再新增。');
          return;
        }
        state.plan.push(addId);
      }
      rerenderAll();
    } else if (t.dataset.toggle) {
      var id = t.dataset.toggle;
      state.open[id] = !state.open[id];
      renderProgrammes();
    } else if (t.dataset.up) {
      state.plan = move(state.plan, t.dataset.up, -1); rerenderAll();
    } else if (t.dataset.down) {
      state.plan = move(state.plan, t.dataset.down, 1); rerenderAll();
    } else if (t.dataset.remove) {
      state.plan = state.plan.filter(function (x) { return x !== t.dataset.remove; }); rerenderAll();
    } else if (t.dataset.removeElective != null) {
      if (state.profile.electives.length > 1) {
        state.profile.electives.splice(+t.dataset.removeElective, 1);
        renderElectives(); rerenderAll();
      }
    } else if (t.dataset.removeCatb != null) {
      state.profile.catB.splice(+t.dataset.removeCatb, 1); renderCatB(); rerenderAll();
    } else if (t.dataset.removeCatc != null) {
      state.profile.catC.splice(+t.dataset.removeCatc, 1); renderCatC(); rerenderAll();
    } else if (t.classList.contains('pill')) {
      var inst = t.dataset.inst;
      if (state.filters.insts[inst]) delete state.filters.insts[inst];
      else state.filters.insts[inst] = true;
      renderInstFilter(); renderProgrammes(); save();
    }
  });

  $('btnAddElective').addEventListener('click', function () {
    if (state.profile.electives.length >= 4) return;
    state.profile.electives.push({ code: '', level: '' });
    renderElectives(); rerenderAll();
  });

  $('btnJumpPlan').addEventListener('click', scrollToPlan);

  $('btnAddCatB').addEventListener('click', function () {
    if (state.profile.catB.length >= 2) return;
    state.profile.catB.push({ code: '', level: 'ADII', ncs: false });
    renderCatB();
  });

  $('btnAddCatC').addEventListener('click', function () {
    if (state.profile.catC.length >= 2) return;
    state.profile.catC.push({ code: 'JAP', level: 'N1' });
    renderCatC(); rerenderAll();
  });

  $('btnClearProfile').addEventListener('click', function () {
    state.profile = blankProfile();
    renderCores(); renderElectives(); renderCatB(); renderCatC(); rerenderAll();
  });

  $('btnSample').addEventListener('click', function () {
    state.profile = {
      chi: '4', eng: '5', math: '5', csd: 'A',
      electives: [{ code: 'PHY', level: '4' }, { code: 'CHEM', level: '5' }, { code: 'M2', level: '5' }],
      catB: [], catC: []
    };
    renderCores(); renderElectives(); renderCatB(); renderCatC(); rerenderAll();
  });

  $('btnClearPlan').addEventListener('click', function () {
    if (!state.plan.length || window.confirm('清空全部 ' + state.plan.length + ' 個志願？')) {
      state.plan = []; rerenderAll();
    }
  });

  $('sortBy').addEventListener('change', function (e) {
    state.filters.sort = e.target.value; renderProgrammes(); save();
  });

  ['onlyEligible', 'onlyComputable', 'onlyWithHistory'].forEach(function (id) {
    $(id).addEventListener('change', function (e) {
      state.filters[id] = e.target.checked;
      renderProgrammes(); save();
    });
  });

  $('btnPrint').addEventListener('click', function () { window.print(); });

  $('btnExportPlan').addEventListener('click', function () {
    var lines = ['JUPAS 選科助手 — 我的 20 個志願（非官方，僅供參考）',
                 '匯出時間：' + new Date().toLocaleString(), ''];
    var prof = readyProfile();
    lines.push('成績：中文 ' + (prof.chi || '—') + '｜英文 ' + (prof.eng || '—') + '｜數學 ' + (prof.math || '—') +
      '｜公社 ' + (prof.csd === 'A' ? '達標' : '未達標') + '｜選修 ' +
      prof.electives.filter(function (x) { return x.code; }).map(function (x) { return SUBJ.label(x.code) + ' ' + x.level; }).join('、'));
    lines.push('');
    var rows = E.analysePlan(prof, state.plan.map(progById).filter(Boolean), function (c) { return INST[c]; }).rows;
    rows.forEach(function (r) {
      var ev = r.evaluation;
      lines.push('第 ' + r.rank + ' 位（Band ' + r.band + '）' + r.program.code + ' ' + r.program.titleZh +
        ' — ' + INST[r.program.inst].short +
        '｜我的分數 ' + (ev.score.ok ? num(ev.score.score) : '未核實') +
        (ev.history ? '｜去年中位數 ' + num(ev.history.median) + '｜去年 LQ ' + num(ev.history.lq) : '｜無歷史分數') +
        '｜' + E.VERDICT_LABEL[ev.verdict]);
    });
    lines.push('', '注意：分數只反映相對於去年獲取錄者的位置，不是取錄機會，也不是今年的收門檻。');
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jupas-plan.txt';
    document.body.appendChild(a); a.click(); a.remove();
  });

  function renderInstFilter() {
    var codes = Object.keys(INST);
    $('instFilter').innerHTML = codes.map(function (c) {
      return '<button class="pill" data-inst="' + esc(c) + '" aria-pressed="' + (state.filters.insts[c] ? 'true' : 'false') + '">' +
        esc(INST[c].short) + '</button>';
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  load();
  var fyEl = $('footerYear');
  if (fyEl) fyEl.textContent = new Date().getFullYear();
  renderCores();
  renderElectives();
  renderCatB();
  renderCatC();
  renderInstFilter();
  $('sortBy').value = state.filters.sort;
  $('onlyEligible').checked = !!state.filters.onlyEligible;
  $('onlyComputable').checked = !!state.filters.onlyComputable;
  $('onlyWithHistory').checked = !!state.filters.onlyWithHistory;
  $('q').value = state.filters.q || '';
  renderSources();
  initFab();
  rerenderAll();

  // Expose for smoke tests / console poking.
  window.__jupasApp = { state: state, rerenderAll: rerenderAll, evaluateAll: evaluateAll };
})();
