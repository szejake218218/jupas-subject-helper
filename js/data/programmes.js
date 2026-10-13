/* Programme roster with official scoring rules.
 *
 * Only programmes whose scoring formula, subject weightings and published
 * median / lower-quartile we could read from an official (or institution-
 * published) source are marked 'verified'. Where a rule is missing the entry
 * is 'partial' (computed with a stated assumption) or 'blocked' (not computed
 * at all). Nothing is filled in by guesswork.
 *
 * scores.entryYear = the admission year the median / LQ describe.
 * scores.publishedFor = the JUPAS exercise the source publishes them for.
 */
(function (root) {
  'use strict';

  var SOURCES = {
    CITYU_2026: {
      label: 'CityUHK — Admission Score Formula and Admissions Scores for 2026 JUPAS (PDF, 7 Jan 2026)',
      url: 'https://www.cityu.edu.hk/admo/sites/default/files/2026-01/2026_JUPAS_AdmissionScoreFormulaAndScores.pdf',
      asOf: '2026-01-07',
      note: '分數為 2025 年度正式遴選獲取錄者的中位數／下四分位數，按 2026 年度計分公式重算。'
    },
    HKUST_2025: {
      label: 'HKUST — 2025 JUPAS Admissions Scores (PDF)',
      url: 'https://join.hkust.edu.hk/docs/2025_HKUST_JUPAS_ADMISSIONS_SCORES.pdf',
      asOf: '2026-01-01',
      note: '官方以「最佳 5 科 + 第 6 科加分」計算，並套用課程專屬科目比重；本工具未取得該等比重。'
    },
    HKUST_2026_ENG: {
      label: 'HKUST — 2026 simulated scores for School of Engineering (same PDF, pp.12–13)',
      url: 'https://join.hkust.edu.hk/docs/2025_HKUST_JUPAS_ADMISSIONS_SCORES.pdf',
      asOf: '2026-01-01',
      note: '官方模擬分：英語×2 + 數學×2 + 三科指定比重 + 第 6 科加分。三科「指定比重」的實際數值未公布。'
    },
    CUHK_IBBA: {
      label: 'CUHK IBBA (JS4202) — Local Students JUPAS, 2025 entry admission scores',
      url: 'http://ibba.bschool.cuhk.edu.hk/admissions/local-students-jupas-js4202',
      asOf: '2026-01-01',
      note: '中大以最佳 5 科計算；公民與社會發展科「達標」不計入分數。'
    },
    CUHK_FAQ: {
      label: 'CUHK Undergraduate Admissions — JUPAS FAQ / Useful Information for JUPAS Applicants',
      url: 'https://admission.cuhk.edu.hk/application/jupas/faq/',
      asOf: '2026-01-01',
      note: 'Category A 換算：5**=8.5、5*=7、5=5.5、4=4、3=3、2=2、1=1（JS4501/JS4502 除外）。'
    }
  };

  function prog(inst, code, titleZh, titleEn, sourceKey, o) {
    o = o || {};
    return {
      id: inst + '-' + code,
      inst: inst,
      code: code,
      titleZh: titleZh,
      titleEn: titleEn,
      scoring: o.scoring || {},
      scores: (o.median == null && o.lq == null) ? null : {
        median: o.median, lq: o.lq,
        entryYear: o.entryYear || 2025,
        publishedFor: o.publishedFor || 2026,
        isSimulated: !!o.isSimulated
      },
      requirements: { status: 'general_only' },
      status: o.status || 'verified',
      blockedReason: o.blockedReason || null,
      notes: o.notes || [],
      source: SOURCES[sourceKey],
      sourceKey: sourceKey
    };
  }

  /* Shorthands --------------------------------------------------------- */

  // Best-N formula. w = [[weight, [subjects]], ...]; inc = must-include subjects.
  function bestN(inst, code, zh, en, n, o) {
    o = o || {};
    var formula = { type: o.bonus ? 'best_n_plus_bonus' : 'best_n', n: n };
    if (o.inc) formula.mustInclude = o.inc;
    if (o.anyGroup) formula.mustIncludeAny = o.anyGroup;
    o.scoring = {
      scale: 'scale85',
      formula: formula,
      weights: o.w || [],
      defaultWeight: 1,
      aplAsElective: !!o.apl,
      catCAsElective: true,
      csdCounted: false,
      slotRules: !!o.slotRules,
      sixthBonusRate: o.bonus ? null : undefined,
      assumptions: o.assumptions
    };
    if (o.m1m2xMath) o.scoring.m1m2ExclusiveWithMath = true;
    return prog(inst, code, zh, en, o.source || 'CITYU_2026', o);
  }

  // "3 core + 2 elective subjects" formula (CityU).
  function coresPlus2(inst, code, zh, en, o) {
    o = o || {};
    o.scoring = {
      scale: 'scale85',
      formula: { type: 'cores_plus_electives', electiveCount: 2 },
      weights: o.w || [],
      defaultWeight: 1,
      aplAsElective: !!o.apl,
      catCAsElective: true,
      csdCounted: false,
      slotRules: !!o.slotRules,
      assumptions: o.assumptions
    };
    return prog(inst, code, zh, en, o.source || 'CITYU_2026', o);
  }

  var P = [];
  function push(p) { P.push(p); return p; }

  /* ================================================================== *
   * CityUHK — formulas and weightings published per programme
   * ================================================================== */

  var C = 'CITYU';

  push(bestN(C, 'JS1211', '生物醫學工程學', 'BEng Biomedical Engineering', 5, {
    inc: [/* none */], w: [[2, ['ENG', 'MATH', 'BIO', 'CHEM', 'M1', 'M2', 'PHY']]],
    median: 39, lq: 38, m1m2xMath: true, apl: true,
    assumptions: ['官方註明：同時報考數學與 M1/M2 時只計其中一科（已按較高分者處理）。']
  }));
  push(coresPlus2(C, 'JS1300', '綜合生物科學與生物工程', 'Integrative Bioscience & Bioengineering (Bio3)', {
    w: [[2, ['ENG', 'BIO', 'CHEM']], [1.5, ['MATH', 'BAFS', 'DAT', 'ICT', 'M1', 'M2', 'PHY']]],
    apl: true, notes: ['2026 年度新課程，未有歷史收生分數。']
  }));
  push(prog(C, 'JS1805', '生物醫學', 'Biomedical Sciences', 'CITYU_2026', {
    median: 38.5, lq: 37.5, status: 'blocked',
    blockedReason: '官方文件中此課程的計分公式未能從文件中對應出來（PDF 表格跨行）。已拒絕估算。'
  }));
  push(prog(C, 'JS1806', '生物科學', 'BSc Biological Sciences', 'CITYU_2026', {
    median: 35.5, lq: 35, status: 'blocked',
    blockedReason: '官方文件中此課程的計分公式未能從文件中對應出來（PDF 表格跨行）。已拒絕估算。'
  }));
  push(prog(C, 'JS1807', '生物醫學科學', 'BSc Biomedical Sciences', 'CITYU_2026', {
    median: 45.5, lq: 43, status: 'blocked',
    blockedReason: '官方文件中此課程的計分公式未能從文件中對應出來（PDF 表格跨行）。已拒絕估算。'
  }));

  push(bestN(C, 'JS1000', '計算金融及金融科技', 'BSc Computational Finance and Financial Technology', 5, {
    inc: ['ENG', 'MATH'], median: 24.5, lq: 23.5 }));
  push(bestN(C, 'JS1001', '工商管理學士（環球商業）', 'BBA Global Business', 5, {
    w: [[1.5, ['ENG']]], median: 29.5, lq: 28 }));
  push(bestN(C, 'JS1002', '工商管理學士（會計）', 'BBA Accountancy', 5, {
    inc: ['MATH'], median: 22, lq: 21.5 }));
  push(bestN(C, 'JS1005', '工商管理學士（管理學）', 'BBA Management', 5, {
    inc: ['MATH'], median: 22, lq: 21.5 }));
  push(bestN(C, 'JS1007', '工商管理學士（市場營銷）', 'BBA Marketing', 5, {
    inc: ['ENG', 'MATH'], w: [[1.5, ['ENG']]], median: 24.5, lq: 23.5 }));
  push(bestN(C, 'JS1012', '經濟及金融', 'Economics and Finance', 5, {
    inc: ['MATH'], median: 23, lq: 22.5 }));
  push(bestN(C, 'JS1013', '工商管理學士（商業經濟）', 'BBA Business Economics', 5, {
    inc: ['MATH'], median: 22, lq: 21.5 }));
  push(bestN(C, 'JS1014', '工商管理學士（金融）', 'BBA Finance', 5, {
    inc: ['MATH'], median: 21.5, lq: 21.5 }));
  push(bestN(C, 'JS1017', '智能資訊系統學', 'Intelligent Information Systems', 5, {
    inc: ['MATH'], median: 21, lq: 20.5 }));
  push(bestN(C, 'JS1018', '工商管理學士（環球商業系統管理）', 'BBA Global Business Systems Management', 5, {
    inc: ['ENG', 'MATH'], median: 24, lq: 23.5 }));
  push(bestN(C, 'JS1019', '工商管理學士（商業人工智能）', 'BBA Artificial Intelligence in Business', 5, {
    inc: ['MATH'], median: 21, lq: 21 }));
  push(bestN(C, 'JS1026', '工商管理學士（商業決策分析）', 'BBA Business Decision Analytics', 5, {
    inc: ['MATH'], median: 21.5, lq: 21 }));
  push(bestN(C, 'JS1027', '工商管理學士（環球營運管理）', 'BBA Global Operations Management', 5, {
    inc: ['MATH'], median: 21.5, lq: 21 }));

  push(coresPlus2(C, 'JS1070', '人工智能、計算及變革', 'AI, Computing and Transformation (ACT)', {
    w: [[2, ['ENG', 'MATH']]], median: 31, lq: 30 }));
  push(coresPlus2(C, 'JS1071', '數據科學', 'Data Science', {
    w: [[2, ['MATH']], [1.5, ['ENG']]], median: 27.5, lq: 27.5 }));
  push(coresPlus2(C, 'JS1072', '數據科學（理學士）', 'BSc Data Science', {
    w: [[2, ['MATH']], [1.5, ['ENG']]], median: 29, lq: 28.5 }));
  push(coresPlus2(C, 'JS1074', '數據及系統工程', 'BSc Data and Systems Engineering', {
    w: [[2, ['MATH']], [1.5, ['ENG']]], median: 28, lq: 27.5 }));
  push(bestN(C, 'JS1204', '計算機科學', 'BSc Computer Science', 5, { median: 23, lq: 22 }));
  push(bestN(C, 'JS1218', '網絡安全', 'BSc Cybersecurity', 5, { median: 20.5, lq: 20.5 }));

  push(bestN(C, 'JS1201', '建築及土木工程', 'Architecture and Civil Engineering', 5, {
    inc: ['ENG'], w: [[2.5, ['ENG', 'MATH', 'M1', 'M2', 'PHY']], [1.5, ['CHI']]],
    median: 43.5, lq: 42.5 }));
  push(bestN(C, 'JS1205', '電機工程', 'Electrical Engineering', 5, {
    inc: ['ENG', 'MATH'], w: [[2, ['ENG', 'MATH', 'ICT', 'M1', 'M2', 'PHY']], [1.5, ['BIO', 'CHEM']]],
    median: 39, lq: 37 }));
  push(bestN(C, 'JS1207', '機械工程', 'Mechanical Engineering', 5, {
    inc: ['MATH'], w: [[2, ['ENG', 'MATH', 'PHY']], [1.5, ['CHEM', 'DAT', 'M1', 'M2']]],
    median: 34.5, lq: 34 }));
  push(bestN(C, 'JS1210', '材料科學及工程', 'BEng Materials Science and Engineering', 5, {
    inc: ['MATH'], w: [[2, ['MATH', 'PHY']], [1.5, ['ENG', 'BIO', 'CHEM', 'M1', 'M2']]],
    median: 34, lq: 32.5 }));
  push(bestN(C, 'JS1216', '智能製造工程', 'BEng Intelligent Manufacturing Engineering', 5, {
    inc: ['ENG', 'MATH'], median: 20, lq: 18 }));
  push(bestN(C, 'JS1217', '研究、創新及跨國工程', 'Pathway for Research, Innovation and Multinational Engineering (PRIME)', 5, {
    inc: ['ENG'], w: [[2, ['ENG', 'MATH', 'BIO', 'CHEM', 'DAT', 'ICT', 'M1', 'M2', 'PHY']]],
    median: 38.5, lq: 38 }));
  push(bestN(C, 'JS1219', '創新及企業工程', 'BEng Innovation and Enterprise Engineering', 5, {
    inc: ['ENG', 'MATH'], median: 19.5, lq: 18.5 }));

  push(bestN(C, 'JS1102', '國際關係及全球事務', 'BSocSc International Relations and Global Affairs', 5, {
    inc: ['ENG'], w: [[1.5, ['ENG']]], median: 24, lq: 23.5 }));
  push(coresPlus2(C, 'JS1103', '中文及歷史', 'BA Chinese and History', {
    w: [[2, ['ENG', 'CHI']], [1.5, ['CHIST', 'CLIT', 'HIST', 'VA']]], median: 36, lq: 35.5 }));
  push(bestN(C, 'JS1104', '英文', 'BA English', 5, {
    inc: ['ENG'], w: [[2.5, ['ENG']], [1.5, ['ELIT']]], median: 32, lq: 29.5 }));
  push(bestN(C, 'JS1106', '媒體與傳播', 'Media and Communication', 4, {
    inc: ['ENG'], w: [[1.25, ['ENG', 'CHI']]], median: 20.5, lq: 20 }));
  push(coresPlus2(C, 'JS1108', '公共事務及管理', 'BSocSc Public Affairs and Management', {
    w: [[1.5, ['ENG']]], median: 23.5, lq: 23 }));
  push(coresPlus2(C, 'JS1109', '語言學及語言應用', 'BA Linguistics and Language Applications', {
    w: [[2, ['ENG']], [1.5, ['CHI', 'MATH']]], median: 30, lq: 29.5 }));
  push(bestN(C, 'JS1111', '犯罪科學', 'BSocSc Crime Science', 4, {
    inc: ['ENG'], w: [[2, ['ENG']]], median: 23, lq: 23 }));
  push(bestN(C, 'JS1112', '心理學', 'BSocSc Psychology', 4, {
    inc: ['ENG'], w: [[2, ['ENG']]], median: 24.5, lq: 24 }));
  push(bestN(C, 'JS1113', '社會工作', 'BSocSc Social Work', 4, {
    inc: ['ENG'], w: [[2, ['ENG']]], median: 23, lq: 23 }));

  push(bestN(C, 'JS1200', '環球研究及科技創業', 'Global Research Enrichment and Technopreneurship (GREAT)', 4, {
    w: [[2.5, ['CHEM', 'M2', 'PHY']], [2, ['ENG', 'MATH', 'M1']], [1.5, ['BIO', 'ECON']]],
    median: 37, lq: 36.5 }));
  push(bestN(C, 'JS1202', '化學', 'BSc Chemistry', 4, {
    w: [[2, ['ENG', 'CHEM']], [1.5, ['MATH']]], median: 27.5, lq: 27 }));
  push(bestN(C, 'JS1206', '計算數學', 'BSc Computing Mathematics', 4, {
    inc: ['MATH'], w: [[2.5, ['MATH']], [2, ['ENG', 'M1', 'M2']], [1.5, ['BIO', 'CHEM', 'PHY']]],
    median: 37, lq: 36 }));
  push(bestN(C, 'JS1208', '物理學', 'BSc Physics', 4, {
    inc: ['MATH'], w: [[2, ['ENG', 'PHY']], [1.5, ['M1', 'M2']], [1.25, ['MATH']]],
    median: 28, lq: 27 }));

  push(bestN(C, 'JS1801', '獸醫學學士', 'Bachelor of Veterinary Medicine', 5, {
    inc: ['ENG', 'MATH', 'BIO', 'CHEM'], median: 33.5, lq: 32 }));

  push(bestN(C, 'JS1040', '創意媒體（卓越創意藝術與科技）', 'Creative Arts and Technology Excellence (CREATE)', 5, {
    inc: ['ENG'], w: [[2, ['ENG']]], apl: true, median: 28, lq: 24.5 }));
  push(bestN(C, 'JS1041', '創意媒體', 'Creative Media', 5, {
    inc: ['ENG'], w: [[2, ['ENG']]], apl: true, median: 25.5, lq: 25 }));
  push(bestN(C, 'JS1042', '文學士（創意媒體）', 'BA Creative Media', 5, {
    inc: ['ENG'], w: [[2, ['ENG']]], apl: true, median: 27.5, lq: 27 }));
  push(bestN(C, 'JS1043', '理學士（創意媒體）', 'BSc Creative Media', 5, {
    inc: ['ENG', 'MATH'], w: [[2, ['ENG']], [1.5, ['MATH']]], apl: true, median: 26.5, lq: 25.5 }));
  push(bestN(C, 'JS1044', '新媒體藝術', 'BAS New Media', 5, {
    inc: ['ENG'], w: [[2, ['ENG']]], apl: true, median: 24, lq: 24 }));

  push(bestN(C, 'JS1050', '國際可持續發展創新研究', 'INSPIRE (International Sustainability Programme)', 5, {
    inc: ['ENG', 'MATH'], anyGroup: [['BIO', 'CHEM', 'PHY']],
    w: [[2.5, ['MATH']], [2.5, ['BIO', 'CHEM', 'PHY']], [2, ['ENG']], [1.5, ['BIO', 'CHEM', 'GEOG', 'M1', 'M2', 'PHY']]],
    slotRules: true, median: 38, lq: 36.5,
    assumptions: ['官方比重按「第一科選修科／第二科選修科」釐定，本工具改以科目為準。'] }));
  push(prog(C, 'JS1051', '能源及環境', 'Energy and Environment', 'CITYU_2026', {
    median: 40.5, lq: 40, status: 'blocked',
    blockedReason: '官方文件中此課程的計分公式未能對應（PDF 合併儲存格）。已拒絕估算。'
  }));
  push(bestN(C, 'JS1053', '環境及可持續商業', 'BSc Environment and Sustainable Business', 5, {
    inc: ['ENG', 'MATH'], anyGroup: [['BIO', 'CHEM', 'PHY']],
    w: [[2.5, ['MATH']], [2.5, ['BIO', 'CHEM', 'PHY']], [2.5, ['ECON', 'BAFS']], [2, ['ENG']], [1.5, ['BIO', 'CHEM', 'GEOG', 'M1', 'M2', 'PHY']]],
    slotRules: true, median: 40, lq: 39.5,
    assumptions: ['官方比重按第幾科選修科釐定，本工具改以科目為準。'] }));

  push(bestN(C, 'JS1061', '法學士', 'Bachelor of Laws', 5, { inc: ['ENG'], median: 23, lq: 21.5 }));
  push(bestN(C, 'JS1052', '環境科學及工程與金融（雙學位）', 'BEng Environmental Science and Engineering and BBA Finance', 5, {
    inc: ['ENG', 'MATH'], anyGroup: [['BIO', 'CHEM', 'PHY']],
    w: [[2.5, ['MATH']], [2.5, ['BIO', 'CHEM', 'PHY']], [2, ['ENG']], [1.5, ['BIO', 'CHEM', 'GEOG', 'M1', 'M2', 'PHY']]],
    slotRules: true, median: 40, lq: 39.5,
    assumptions: ['官方比重按第幾科選修科釐定，本工具改以科目為準。'] }));
  push(bestN(C, 'JS1062', '法學士與會計（雙學位）', 'Bachelor of Laws and BBA Accountancy', 5, {
    inc: ['ENG'], w: [[1.5, ['ENG']]], median: 29, lq: 25 }));
  push(bestN(C, 'JS1123', '犯罪科學與法學士（雙學位）', 'BSocSc Crime Science and Bachelor of Laws', 5, {
    inc: ['ENG'], median: 24.5, lq: 23 }));
  push(bestN(C, 'JS1221', '計算機科學與計算金融（雙學位）', 'BSc Computer Science and BSc Computational Finance', 5, {
    median: 23, lq: 22 }));

  /* ================================================================== *
   * HKUST — official scores published; programme-specific weightings not held
   * ================================================================== */

  var K = 'HKUST';
  var HKUST_ASSUME = ['官方公布課程專屬科目比重，但未收錄於本工具所依據的分數文件 → 以未加權「最佳 5 科」計算。'];
  var HKUST_BONUS_ASSUME = ['官方為「最佳 5 科 + 第 6 科加分」，加分率未公布 → 未加分，分數為下限。'];

  function hkust(code, zh, en, median, lq, extra) {
    return bestN(K, code, zh, en, 5, Object.assign({
      bonus: true, median: median, lq: lq, source: 'HKUST_2025', status: 'partial',
      assumptions: HKUST_ASSUME.concat(HKUST_BONUS_ASSUME)
    }, extra || {}));
  }

  push(hkust('JS5101', '國際科研', 'International Research Enrichment', 38.25, 37.88));
  push(hkust('JS5102', '理學士（Group A）', 'Science (Group A)', 33.13, 32.63));
  push(hkust('JS5103', '理學士（Group B）', 'Science (Group B)', 33.38, 32.75));
  push(hkust('JS5118', '生物醫學及健康科學', 'BSc Biomedical and Health Sciences', 43.13, 40.50));
  push(hkust('JS5181', '理學士（人工智能延伸主修）', 'Science (Group A) with Extended Major in AI', 37.50, 36.00));
  push(hkust('JS5411', '環球中國研究', 'BSc Global China Studies', 29.23, 28.80));
  push(hkust('JS5412', '定量社會分析', 'BSc Quantitative Social Analysis', 33.00, 32.50));
  push(hkust('JS5711', '創新設計及科技', 'BSc Innovation, Design and Technology', 36.36, 34.72));
  push(hkust('JS5812', '環境管理及科技', 'BSc Environmental Management and Technology', 32.50, 31.05));
  push(hkust('JS5901', '科技及管理雙學位', 'BEng/BSc & BBA Dual Degree in Technology and Management', 62.48, 60.23));
  push(hkust('JS5811', '生物科技及商業', 'BSc Biotechnology and Business', 38.63, 36.56));
  push(hkust('JS5813', '數學及經濟', 'BSc Mathematics and Economics', 44.10, 39.20));
  push(hkust('JS5300', '工商管理', 'Business and Management', 35.00, 33.90));
  push(hkust('JS5311', '經濟學', 'BBA in Economics', 36.55, 35.40));
  push(hkust('JS5312', '金融學', 'BBA in Finance', 43.31, 41.81));
  push(hkust('JS5313', '環球商業管理', 'BBA in Global Business', 52.43, 50.40));
  push(hkust('JS5314', '資訊系統學', 'BBA in Information Systems', 35.93, 35.40));
  push(hkust('JS5315', '管理學', 'BBA in Management', 33.90, 33.90));
  push(hkust('JS5316', '市場學', 'BBA in Marketing', 32.55, 32.40));
  push(hkust('JS5317', '營運管理學', 'BBA in Operations Management', 32.40, 32.05));
  push(hkust('JS5318', '專業會計學', 'BBA in Professional Accounting', 34.05, 33.55));
  push(hkust('JS5331', '經濟及金融學', 'BSc in Economics and Finance', 48.19, 46.50));
  push(hkust('JS5332', '計量財務學', 'BSc in Quantitative Finance', 58.13, 56.06));
  push(hkust('JS5814', '風險管理及商業智能學', 'BSc in Risk Management and Business Intelligence', 44.25, 43.50));
  push(hkust('JS5822', '可持續發展及綠色金融', 'BSc in Sustainable and Green Finance', 37.88, 37.13));

  // 2026 simulated Engineering scores — English×2 and Maths×2 are published.
  function hkustEng(code, zh, en, median, lq) {
    return bestN(K, code, zh, en, 5, {
      bonus: true, inc: ['ENG', 'MATH'],
      w: [[2, ['ENG']], [2, ['MATH']]],
      median: median, lq: lq, source: 'HKUST_2026_ENG', status: 'partial', isSimulated: true,
      assumptions: [
        '官方公布：英語×2、數學×2，另加三科指定比重（實際數值未公布）→ 本工具只套用英語×2、數學×2。',
        '官方分數為以 2025 年入學數據套用 2026 計分公式得出的模擬分。',
        '加分率未公布 → 未加第 6 科分，分數為下限。'
      ]
    });
  }
  push(hkustEng('JS5212', '計算機工程', 'BEng in Computer Engineering', 46, 44));
  push(hkustEng('JS5220', '化學及生物工程', 'Chemical & Biological Engineering', 47, 44));
  push(hkustEng('JS5230', '土木及環境工程', 'Civil & Environmental Engineering', 41, 39));
  push(hkustEng('JS5240', '計算機科學及工程', 'Computer Science & Engineering', 50, 48));
  push(hkustEng('JS5250', '電子及計算機工程', 'Electronic & Computer Engineering', 44, 42));
  push(hkustEng('JS5260', '工業工程及決策分析', 'Industrial Engineering & Decision Analytics', 37, 36));
  push(hkustEng('JS5270', '機械及航空航天工程', 'Mechanical & Aerospace Engineering', 41, 40));
  push(hkustEng('JS5282', '工程學（人工智能延伸主修）', 'Engineering with Extended Major in AI', 49, 46));

  /* ================================================================== *
   * CUHK — one programme with a fully published formula so far
   * ================================================================== */

  push(bestN('CUHK', 'JS4202', '工商管理學士綜合課程', 'Integrated BBA', 5, {
    source: 'CUHK_IBBA', median: 26, lq: 26, status: 'partial',
    assumptions: ['中大以最佳 5 科計算（公民與社會發展科不計分）；課程專屬科目比重未在來源中列明。']
  }));

  root.JUPAS_SOURCES = SOURCES;
  root.JUPAS_PROGRAMMES = P;
})(typeof globalThis !== 'undefined' ? globalThis : this);
