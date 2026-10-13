/* HKDSE subject catalogue (Category A core + electives, Category B, Category C).
 * Free-form input is avoided: students pick from this list so the engine always
 * gets a known subject code. */
(function (root) {
  'use strict';

  var CORES = [
    { code: 'CHI', label: '中國語文 Chinese Language', zh: '中國語文', gradable: true },
    { code: 'ENG', label: '英國語文 English Language', zh: '英國語文', gradable: true },
    { code: 'MATH', label: '數學（必修部分）Mathematics (Compulsory)', zh: '數學', gradable: true },
    { code: 'CSD', label: '公民與社會發展 Citizenship and Social Development', zh: '公民與社會發展', gradable: false,
      levels: ['A', 'NA'], note: '只設「達標」／「未達標」，不計分。' }
  ];

  var ELECTIVES = [
    { code: 'M1', label: '數學延伸部分單元一 Calculus and Statistics', zh: 'M1（微積分與統計）' },
    { code: 'M2', label: '數學延伸部分單元二 Algebra and Calculus', zh: 'M2（代數與微積分）' },
    { code: 'BIO', label: '生物 Biology', zh: '生物' },
    { code: 'CHEM', label: '化學 Chemistry', zh: '化學' },
    { code: 'PHY', label: '物理 Physics', zh: '物理' },
    { code: 'SCI', label: '綜合科學 Integrated Science', zh: '綜合科學' },
    { code: 'CS', label: '組合科學 Combined Science', zh: '組合科學' },
    { code: 'ECON', label: '經濟 Economics', zh: '經濟' },
    { code: 'BAFS', label: '企業、會計與財務概論 BAFS', zh: '企業、會計與財務概論' },
    { code: 'GEOG', label: '地理 Geography', zh: '地理' },
    { code: 'HIST', label: '歷史 History', zh: '歷史' },
    { code: 'CHIST', label: '中國歷史 Chinese History', zh: '中國歷史' },
    { code: 'CLIT', label: '中國文學 Chinese Literature', zh: '中國文學' },
    { code: 'ELIT', label: '英語文學 Literature in English', zh: '英語文學' },
    { code: 'ICT', label: '資訊及通訊科技 ICT', zh: '資訊及通訊科技' },
    { code: 'DAT', label: '設計與應用科技 DAT', zh: '設計與應用科技' },
    { code: 'VA', label: '視覺藝術 Visual Arts', zh: '視覺藝術' },
    { code: 'MUSIC', label: '音樂 Music', zh: '音樂' },
    { code: 'PE', label: '體育 Physical Education', zh: '體育' },
    { code: 'ERS', label: '倫理與宗教 Ethics and Religious Studies', zh: '倫理與宗教' },
    { code: 'HMSC', label: '健康管理與社會關懷 Health Management and Social Care', zh: '健康管理與社會關懷' },
    { code: 'THS', label: '旅遊與款待 Tourism and Hospitality Studies', zh: '旅遊與款待' },
    { code: 'TL', label: '科技與生活 Technology and Living', zh: '科技與生活' }
  ];

  var CAT_B = {
    label: '應用學習 Applied Learning (Category B)',
    levels: [
      { code: 'ADII', label: '達標並表現優異 (II)  Attained with Distinction II' },
      { code: 'ADI', label: '達標並表現優異 (I)  Attained with Distinction I' },
      { code: 'A', label: '達標 Attained' }
    ],
    note: '只適用於個別課程；未列明承認 ApL 的課程不會把 ApL 計入分數。'
  };

  var CAT_C = {
    label: '其他語言 Other Languages (Category C)',
    langs: [
      { code: 'JAP', label: '日語 Japanese', levels: ['N1', 'N2', 'N3'] },
      { code: 'KOR', label: '韓語 Korean', levels: ['6', '5', '4', '3'] },
      { code: 'FRA', label: '法語 French', levels: ['C2', 'C1', 'B2', 'B1', 'A2'] },
      { code: 'GER', label: '德語 German', levels: ['C2', 'C1', 'B2', 'B1', 'A2'] },
      { code: 'SPA', label: '西班牙語 Spanish', levels: ['C2', 'C1', 'B2', 'B1', 'A2'] },
      { code: 'URD', label: '烏爾都語 Urdu', levels: ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C', 'D', 'E'] }
    ]
  };

  var LEVELS = ['U', '1', '2', '3', '4', '5', '5*', '5**'];

  var LABELS = {};
  CORES.concat(ELECTIVES).forEach(function (s) { LABELS[s.code] = s.zh || s.label; });

  root.JUPAS_SUBJECTS = {
    CORES: CORES, ELECTIVES: ELECTIVES, CAT_B: CAT_B, CAT_C: CAT_C,
    LEVELS: LEVELS, LABELS: LABELS,
    label: function (code) { return LABELS[code] || code; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
