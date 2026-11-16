/* Institution-level configuration: grade conversion scale, Category C table,
 * minimum entrance gate, and institution-wide scoring conventions.
 *
 * Conversion scales below are taken from the official JUPAS publication
 * "2025 JUPAS Admissions Scores of 9 JUPAS Participating-institutions", whose
 * per-institution sections are supplied by the institutions themselves:
 *
 *   HKU   : 5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1, Others=0
 *   HKUST : 5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1
 *   CityU : 5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1
 *   CUHK  : 5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1  (MBChB JS4501/JS4502: 5**=7 …)
 *   PolyU : 5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1
 *   HKMU  : 5**=7,   5*=6, 5=5,   4=4, 3=3, 2=2
 *   EdUHK : 5**=7,   5*=6, 5=5,   4=4, 3=3, 2=2, 1=1
 *   LU    : 5**=7,   5*=6, 5=5,   4=4, 3=3, 2=2, 1=1
 *   HKBU  : not stated in the publication → left null, so nothing is scored.
 *
 * A null defaultScale is deliberate: the engine refuses to score rather than
 * applying the wrong ladder to a student's grades.
 *
 * The nine institutions do NOT share one ladder. Scoring a LU or EdUHK programme
 * on the 8.5 scale overstates it by roughly 20%, which is why the ladder is
 * configuration and not a constant.
 */
(function (root) {
  'use strict';

  var CAT_C_7 = {   // C2 / N1 / Grade 6 = 7  (CUHK, CityU)
    JAP: { 'N1': 7, 'N2': 5.5, 'N3': 4 },
    KOR: { '6': 7, '5': 5.5, '4': 4, '3': 3 },
    FRA: { 'C2': 7, 'C1': 5.5, 'B2': 4, 'B1': 3, 'A2': 3 },
    GER: { 'C2': 7, 'C1': 5.5, 'B2': 4, 'B1': 3, 'A2': 3 },
    SPA: { 'C2': 7, 'C1': 5.5, 'B2': 4, 'B1': 3, 'A2': 3 },
    URD: { 'A++': 7, 'A+': 7, 'A': 7, 'B++': 5.5, 'B+': 5.5, 'B': 4, 'C': 4, 'D': 3, 'E': 3 }
  };

  var CAT_C_85 = {  // C2 / N1 / Grade 6 = 8.5  (HKUST)
    JAP: { 'N1': 8.5, 'N2': 5.5, 'N3': 3 },
    KOR: { '6': 8.5, '5': 5.5, '4': 4, '3': 3 },
    FRA: { 'C2': 8.5, 'C1': 7, 'B2': 5.5, 'B1': 4, 'A2': 3 },
    GER: { 'C2': 8.5, 'C1': 7, 'B2': 5.5, 'B1': 4, 'A2': 3 },
    SPA: { 'C2': 8.5, 'C1': 7, 'B2': 5.5, 'B1': 4, 'A2': 3 },
    URD: { 'A++': 8.5, 'A+': 7, 'A': 7, 'B++': 5.5, 'B+': 4, 'B': 3, 'C': 3, 'D': 2, 'E': 1 }
  };

  var AGG = 'JUPAS 官方彙編《2025 JUPAS Admissions Scores of 9 JUPAS Participating-institutions》';
  var NO_GATE = '此院校的最低入學要求未從官方文件逐一核實，故本工具不判斷資格。';
  var NO_CATC = '此院校的其他語言（丙類）換算表未收錄 → 不把丙類科目計入分數（寧可少計，不可亂計）。';

  var INSTITUTIONS = {
    HKU: {
      code: 'HKU', nameZh: '香港大學', nameEn: 'The University of Hong Kong', short: '港大',
      colour: '#1c4587',
      defaultScale: 'scale85', catC: null,
      scoringDefaults: { catCAsElective: false, aplAsElective: false, csdCounted: false },
      gate: null, gateNote: NO_GATE, gateSource: null,
      scaleSource: AGG + '：Category A 換算 5**=8.5、5*=7、5=5.5、4=4、3=3、2=2、1=1、Others=0',
      catCNote: NO_CATC,
      bandA: { share: 100.0, outside: 0, totalOffers: 2139, verified: false }
    },
    CUHK: {
      code: 'CUHK', nameZh: '香港中文大學', nameEn: 'The Chinese University of Hong Kong', short: '中大',
      colour: '#5b2c6f',
      defaultScale: 'scale85', catC: CAT_C_7,
      scoringDefaults: { catCAsElective: true, aplAsElective: false, csdCounted: false },
      gate: { CHI: 3, ENG: 3, MATH: 2, CSD: 'A', electiveLevels: [2], label: '332A2' },
      gateNote: '院校層面最低要求。個別課程的額外科目要求未收錄；MBChB（JS4501/JS4502）的成績換算不同（5**=7）。',
      gateSource: 'CUHK Undergraduate Admissions — JUPAS FAQ / Useful Information for JUPAS Applicants',
      bandA: { share: 99.8, outside: 6, totalOffers: 2978, verified: false }
    },
    HKUST: {
      code: 'HKUST', nameZh: '香港科技大學', nameEn: 'The Hong Kong University of Science and Technology', short: '科大',
      colour: '#003366',
      defaultScale: 'scale85', catC: CAT_C_85,
      scoringDefaults: { catCAsElective: true, aplAsElective: true, csdCounted: false },
      gate: { CHI: 3, ENG: 3, MATH: 2, CSD: 'A', electiveLevels: [3, 3], label: '332A33' },
      gateNote: '院校層面最低要求（332A33）。個別課程的額外科目要求未收錄。',
      gateSource: 'HKUST JUPAS 收生要求說明（2026 年度公開資料）',
      catBSource: 'HKUST 乙類應用學習換算：達標並表現優異(II)=4、達標並表現優異(I)=3',
      bandA: { share: 96.9, outside: 45, totalOffers: 1462, verified: false }
    },
    CITYU: {
      code: 'CITYU', nameZh: '香港城市大學', nameEn: 'City University of Hong Kong', short: '城大',
      colour: '#8b1d41',
      defaultScale: 'scale85', catC: CAT_C_7,
      scoringDefaults: {
        catCAsElective: true, aplAsElective: false, csdCounted: false,
        m1m2AsOne: true   // CityU note 2: M1 and M2 together count as one subject
      },
      gate: { CHI: 3, ENG: 3, MATH: 2, CSD: 'A', electiveLevels: [2], label: '332A2' },
      gateNote: '院校層面最低要求。個別課程的額外科目要求（如指定選修科、面試）未收錄。',
      gateSource: 'CityUHK JUPAS 入學要求（2026 JUPAS）',
      catBSource: 'CityUHK：指定課程承認部分應用學習科目，達標並表現優異(I)=3、(II)=4',
      bandA: { share: 78.0, outside: 392, totalOffers: 1782, verified: false }
    },
    POLYU: {
      code: 'POLYU', nameZh: '香港理工大學', nameEn: 'The Hong Kong Polytechnic University', short: '理大',
      colour: '#8c1d18',
      defaultScale: 'scale85', catC: null,
      scoringDefaults: { catCAsElective: false, aplAsElective: false, csdCounted: false },
      gate: null, gateNote: NO_GATE, gateSource: null,
      scaleSource: AGG + '：由 2020/21 起 5**=8.5、5*=7、5=5.5、4=4、3=3、2=2、1=1、Unclassified=0',
      catCNote: NO_CATC,
      catBSource: '理大：優異(II)（視為 4 級）=4、優異(I)（視為 3 級）=3',
      noProgrammesReason: '理大章節的課程代號、計分公式與分數欄在 PDF 內互相錯位（合併儲存格），無法可靠對應每一行 → 未載入個別課程資料。',
      bandA: { share: 88.6, outside: 211, totalOffers: 1850, verified: false }
    },
    HKBU: {
      code: 'HKBU', nameZh: '香港浸會大學', nameEn: 'Hong Kong Baptist University', short: '浸大',
      colour: '#1e5631',
      // Ladder published in 學友社《中六升學指南 2026》 p.138 (institution-supplied):
      // 1→1, 2→2, 3→3, 4→4, 5→5, 5*→6, 5**→7 — the 7-point scale, like LU/EdUHK/HKMU.
      defaultScale: 'scale7',
      catC: {
        JAP: { 'N1': 7, 'N2': 5.5, 'N3': 4 },
        KOR: { '6': 7, '5': 5.5, '4': 5.5, '3': 4 },
        FRA: { 'C2': 7, 'C1': 7, 'B2': 5.5, 'B1': 5.5, 'A2': 4 },
        GER: { 'C2': 7, 'C1': 7, 'B2': 5.5, 'B1': 5.5, 'A2': 4 },
        SPA: { 'C2': 7, 'C1': 7, 'B2': 5.5, 'B1': 5.5, 'A2': 4 }
      },
      scoringDefaults: { catCAsElective: true, aplAsElective: false, csdCounted: false },
      gate: null, gateNote: NO_GATE, gateSource: null,
      scaleSource: '學友社《中六升學指南 2026》p.138（院校提供資料）：5**=7、5*=6、5=5、4=4、3=3、2=2、1=1',
      catCNote: '丙類換算按指南 p.138 抄錄；烏爾都語一列字跡重疊、未能確認，故不計烏爾都語。',
      referenceNote: '浸大只公布「入學分數總平均分（最佳五科，含科目比重）」，沒有中位數／下四分位數 → 比較基準為平均分。',
      bandA: { share: 69.6, outside: 322, totalOffers: 1060, verified: false }
    },
    LU: {
      code: 'LU', nameZh: '嶺南大學', nameEn: 'Lingnan University', short: '嶺大',
      colour: '#7b1e3a',
      defaultScale: 'scale7', catC: null,
      scoringDefaults: { catCAsElective: false, aplAsElective: false, csdCounted: false },
      gate: null, gateNote: NO_GATE, gateSource: null,
      scaleSource: AGG + '：Category A Core/Elective Subjects 5**=7、5*=6、5=5、4=4、3=3、2=2、1=1',
      catCNote: NO_CATC,
      bandA: { share: 89.2, outside: 65, totalOffers: 604, verified: false }
    },
    EDUHK: {
      code: 'EDUHK', nameZh: '香港教育大學', nameEn: 'The Education University of Hong Kong', short: '教大',
      colour: '#14532d',
      defaultScale: 'scale7', catC: null,
      scoringDefaults: { catCAsElective: false, aplAsElective: true, csdCounted: false },
      gate: null, gateNote: NO_GATE, gateSource: null,
      scaleSource: AGG + '：Category A 5**=7、5*=6、5=5、4=4、3=3、2=2、1=1；乙類應用學習 優異(II)=4、優異(I)=3、達標=0',
      catCNote: NO_CATC,
      bandA: { share: 85.3, outside: 111, totalOffers: 753, verified: false }
    },
    HKMU: {
      code: 'HKMU', nameZh: '香港都會大學', nameEn: 'Hong Kong Metropolitan University', short: '都大',
      colour: '#3d2b56',
      defaultScale: 'scale7', catC: null,
      scoringDefaults: { catCAsElective: false, aplAsElective: true, csdCounted: false, m1m2AsOne: true },
      gate: null, gateNote: NO_GATE, gateSource: null,
      scaleSource: AGG + '：Category A 5**=7、5*=6、5=5、4=4、3=3、2=2；乙類 優異(II)=4、優異(I)=3；M1/M2 只計較佳的一科',
      catCNote: NO_CATC,
      bandA: { share: 52.8, outside: 1481, totalOffers: 3138, verified: false }
    }
  };

  /* ------------------------------------------------------------------ *
   * SSSDP / self-financing institutions (guide pp.144-148)
   *
   * These pages print no 入學分數換算表, so no ladder is published. The engine
   * therefore refuses to score them (defaultScale: null) and they are listed
   * with their published demand figures and mean/quartile numbers only.
   * ------------------------------------------------------------------ */
  var SSSDP_BASE = {
    defaultScale: null,
    catC: null,
    scoringDefaults: { catCAsElective: false, aplAsElective: false, csdCounted: false },
    gate: null, gateNote: NO_GATE, gateSource: null,
    scaleSource: null,
    scaleNote: '指南該頁未列出入學分數換算表 → 本工具不評分（不以假設的換算表計算）。',
    catCNote: '丙類換算表未列於指南該頁。',
    sssdp: true
  };
  var SSSDP_LIST = [
    ['SFU', '聖方濟各大學', 'Saint Francis University', '方濟各', '#6b4f2a'],
    ['CHC', '珠海學院', 'Chu Hai College of Higher Education', '珠海', '#1f4e79'],
    ['HSUHK', '香港恒生大學', 'The Hang Seng University of Hong Kong', '恒大', '#0b5d3b'],
    ['TWC', '東華學院', 'Tung Wah College', '東華', '#7b1e3a'],
    ['THEI', '香港高等教育科技學院', 'Technological and Higher Education Institute of Hong Kong', '高科院', '#264653'],
    ['UOW', '香港伍倫貢學院', 'UOW College Hong Kong', '伍倫貢', '#8a2d2d'],
    ['HKSYU', '香港樹仁大學', 'Hong Kong Shue Yan University', '樹仁', '#2e4a7d']
  ];
  SSSDP_LIST.forEach(function (row) {
    var entry = {
      code: row[0], nameZh: row[1], nameEn: row[2], short: row[3], colour: row[4],
      bandA: null
    };
    Object.keys(SSSDP_BASE).forEach(function (k) { entry[k] = SSSDP_BASE[k]; });
    INSTITUTIONS[row[0]] = entry;
  });

  root.JUPAS_INSTITUTIONS = INSTITUTIONS;
  root.JUPAS_OTHER_INSTITUTIONS = SSSDP_LIST.map(function (r) { return r[0]; });
})(typeof globalThis !== 'undefined' ? globalThis : this);
