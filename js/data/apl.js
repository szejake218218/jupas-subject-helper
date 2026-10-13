/* Category B — Applied Learning (應用學習) course catalogue.
 *
 * Source: HKEAA "Category B: Applied Learning Subjects" subject-information page
 * (https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/category_b_subjects/science),
 * last checked 2026-01-15. Names and examination years are taken from that page
 * verbatim; Chinese names are added only where the Education Bureau's ApL
 * prospectus pairs them unambiguously.
 *
 * Official facts this file depends on:
 *   - Results are reported as "Attained", "Attained with Distinction (I)" and
 *     "Attained with Distinction (II)". HKEAA states Distinction (I) is
 *     comparable to Level 3 and Distinction (II) to Level 4 or above.
 *   - ApL Chinese (for non-Chinese speaking students) is reported only as
 *     "Attained" / "Attained with Distinction" — no (I)/(II) split.
 *   - Course titles change between cohorts (a renamed course appears on the
 *     HKEAA page as "Old Name / New Name").
 */
(function (root) {
  'use strict';

  var AREAS = [
    { id: 'CS', area: 'Creative Studies', zh: '創意學習' },
    { id: 'MC', area: 'Media and Communication', zh: '媒體及傳意' },
    { id: 'BL', area: 'Business, Management and Law', zh: '商業、管理及法律' },
    { id: 'SV', area: 'Services', zh: '服務' },
    { id: 'AS', area: 'Applied Science', zh: '應用科學' },
    { id: 'EP', area: 'Engineering and Production', zh: '工程及生產' },
    { id: 'NCS', area: 'Applied Learning Chinese (for non-Chinese speaking students)', zh: '應用學習中文（非華語學生適用）', ncs: true }
  ];

  // [areaId, name, chineseName or null, examYears]
  var RAW = [
    ['CS', 'Cultural and Creative Product Design', '文創產品設計', [2027, 2028, 2029]],
    ['CS', 'Fashion Image Design', '時裝形象設計', [2027, 2028, 2029]],
    ['CS', 'Interior and Exhibition Design / Interior and Event Spatial Design', '室內與展覽設計', [2027, 2028, 2029]],
    ['CS', 'Computer Game and Animation Design', '電腦遊戲及動畫設計', [2027, 2028, 2029]],
    ['CS', 'Digital Comic Design and Production', '數碼漫畫設計與製作', [2027, 2028, 2029]],
    ['CS', 'Popular Music Production', '流行音樂製作', [2027, 2028, 2029]],
    ['CS', 'Taking a Chance on Dance', '舞出新機－舞蹈藝術', [2027, 2028, 2029]],
    ['CS', 'The Essentials of Theatre Arts', '由戲開始．劇藝縱橫', [2027, 2028, 2029]],

    ['MC', 'Digital Media and Radio Production', '數碼媒體及電台製作', [2027, 2028, 2029]],
    ['MC', 'Film and Transmedia / Film Production', '電影製作', [2027, 2028, 2029]],
    ['MC', 'Digital Advertising', '數碼廣告', [2027, 2028, 2029]],
    ['MC', 'Multimedia Storytelling', '多媒體故事', [2027, 2028, 2029]],
    ['MC', 'PR and Multimedia Communication', '公關及多媒體傳訊', [2027, 2028, 2029]],
    ['MC', 'Applied Learning (Vocational English) – English Communication', '應用學習（職業英語）－英文傳意', [2027, 2028, 2029]],
    ['MC', 'Applied Learning (Vocational English) – English for Business Services', '應用學習（職業英語）－商用服務英語', [2027, 2028, 2029]],
    ['MC', 'Applied Learning (Vocational English) – English for Service Professionals', '應用學習（職業英語）－服務業專業英語', [2027, 2028, 2029]],
    ['MC', 'Creative English – Cultural Tourism', null, [2028]],
    ['MC', 'Creative English – Biz and Media', '創意英語－商務與媒體', [2027]],
    ['MC', 'English for the Creative Industries', null, [2029]],
    ['MC', 'Practical Translation (CHI-ENG)', '實用翻譯（漢英）', [2027, 2028]],
    ['MC', 'Applied Japanese and Japanese Culture', '應用日語及日本文化', [2027, 2028, 2029]],
    ['MC', 'Everyday Japanese and Japanese Culture', '生活日語及日本文化', [2027, 2028]],
    ['MC', 'Korean Language and Culture', '韓國語文及文化', [2027, 2028]],

    ['BL', 'Accounting in Action', null, [2028, 2029]],
    ['BL', 'Data Application for Business / AI Application in Business Data', '商業數據應用', [2027, 2028, 2029]],
    ['BL', 'Innovation and Entrepreneurship', '創新與創業', [2027, 2028, 2029]],
    ['BL', 'Introduction to Fintech', '金融科技入門', [2027, 2028, 2029]],
    ['BL', 'KOL Marketing and Generative AI', null, [2028, 2029]],
    ['BL', 'Modern Logistics Studies', '現代物流學', [2027, 2028, 2029]],
    ['BL', 'Law Enforcement in Hong Kong', '香港執法實務', [2027, 2028, 2029]],

    ['SV', 'Pâtisserie and Café Operations', '西式食品製作', [2027, 2028, 2029]],
    ['SV', 'Western Cuisine', null, [2027, 2028, 2029]],
    ['SV', 'Airport Passenger Terminal Operations / Airport Operations and Services', null, [2027, 2028, 2029]],
    ['SV', 'Hotel Operations', '酒店營運', [2027, 2028, 2029]],
    ['SV', 'Child Care and Development', null, [2027, 2028, 2029]],
    ['SV', 'Child Care and Education', null, [2027, 2028, 2029]],
    ['SV', 'Elderly Community Care and Support', null, [2029]],
    ['SV', 'Fundamental Cosmetology', null, [2027, 2028, 2029]],
    ['SV', 'Gerontech and Services', null, [2027, 2028]],

    ['AS', 'ESG – Environmental Assessment', null, [2029]],
    ['AS', 'Food Technology and Nutrition', null, [2027, 2028, 2029]],
    ['AS', 'Foundation in Chinese Medicine', null, [2027, 2028, 2029]],
    ['AS', 'Health Care Practice', null, [2027, 2028, 2029]],
    ['AS', 'Medical Laboratory Science', null, [2027, 2028, 2029]],
    ['AS', 'Pet Care and Grooming', null, [2028, 2029]],
    ['AS', 'Rehabilitation Care Practice', null, [2027, 2028, 2029]],
    ['AS', 'Applied Psychology', null, [2027, 2028]],
    ['AS', 'Practical Psychology', null, [2027, 2028, 2029]],
    ['AS', 'Exercise and Fitness Coaching', null, [2027, 2028, 2029]],
    ['AS', 'Exercise Science and Health Fitness', null, [2027, 2028, 2029]],

    ['EP', 'Digital Construction', null, [2027, 2028, 2029]],
    ['EP', 'Electrical and Energy Engineering', null, [2027, 2028, 2029]],
    ['EP', 'AI and Robotics', null, [2027, 2028, 2029]],
    ['EP', 'Computer Forensic Technology', null, [2027, 2028]],
    ['EP', 'Cybersecurity', null, [2027, 2028, 2029]],
    ['EP', 'eSports Technology and Management', null, [2027, 2028, 2029]],
    ['EP', 'Tech Basics', null, [2027, 2028, 2029]],
    ['EP', 'Aviation Studies', null, [2027, 2028, 2029]],
    ['EP', 'Railway Studies', null, [2027, 2028, 2029]],
    ['EP', 'UAV and Low-altitude Economy', null, [2028, 2029]],

    ['NCS', 'Chinese in Business Service', '商業服務中文', [2027]],
    ['NCS', 'Chinese in Practical Context', '實用情境中文', [2027, 2028, 2029]],
    ['NCS', 'Communicative Chinese', null, [2028, 2029]],
    ['NCS', 'Practical Chinese', '實務中文', [2027, 2028, 2029]]
  ];

  var COURSES = RAW.map(function (r, i) {
    var area = AREAS.filter(function (a) { return a.id === r[0]; })[0];
    return {
      code: 'APL' + (i + 1),
      areaId: r[0],
      area: area.area,
      areaZh: area.zh,
      en: r[1],
      zh: r[2],
      years: r[3],
      ncs: !!area.ncs,
      label: (r[2] ? r[2] + ' ' : '') + r[1]
    };
  });

  // Result levels. Distinction (I) is comparable to Level 3 and Distinction (II)
  // to Level 4 or above (HKEAA). ApL Chinese (NCS) has no (I)/(II) split.
  var LEVELS = [
    { code: 'ADII', label: '達標並表現優異 (II)  Attained with Distinction (II)', short: '優異 (II) = 4 分', comparable: '4 級或以上' },
    { code: 'ADI', label: '達標並表現優異 (I)  Attained with Distinction (I)', short: '優異 (I) = 3 分', comparable: '3 級' },
    { code: 'A', label: '達標 Attained', short: '達標 = 0 分', comparable: '不計分' }
  ];
  var LEVELS_NCS = [
    { code: 'AD', label: '達標並表現優異 Attained with Distinction', short: '優異（換算未公布）', comparable: '換算未公布' },
    { code: 'A', label: '達標 Attained', short: '達標（換算未公布）', comparable: '換算未公布' }
  ];

  root.JUPAS_APL = {
    AREAS: AREAS,
    COURSES: COURSES,
    LEVELS: LEVELS,
    LEVELS_NCS: LEVELS_NCS,
    source: {
      label: 'HKEAA — Category B: Applied Learning Subjects（學科資料頁）',
      url: 'https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/category_b_subjects/science',
      asOf: '2026-01-15'
    },
    byCode: function (code) {
      return COURSES.filter(function (c) { return c.code === code; })[0] || null;
    },
    forYear: function (year) {
      return COURSES.filter(function (c) { return c.years.indexOf(year) !== -1; });
    },
    yearLabel: function (c) {
      if (c.years.length === 3) return '2027–29';
      return c.years.join('、');
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
