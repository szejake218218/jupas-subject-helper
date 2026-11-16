/* HKSYU (香港樹仁大學) — SSSDP, list and demand only. */
(function (root) {
  'use strict';
  var SRC = {
  "label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）",
  "url": "https://student.hk/",
  "asOf": "2026-11-17",
  "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"
};
  var FRESH = [];
  FRESH.push({"id": "HKSYU-JSSY01", "inst": "HKSYU", "code": "JSSY01", "titleZh": "金融科技（榮譽）商學士", "titleEn": "", "scoring": {"scale": null, "formula": {"type": "best_n", "n": 5}, "weights": [], "defaultWeight": 1, "catCAsElective": false, "aplAsElective": false, "csdCounted": false, "referenceUsable": false}, "scores": {"uq": null, "median": null, "lq": null, "mean": 17.0, "entryYear": 2026, "publishedFor": 2027, "isSimulated": false, "reference": "none"}, "admissions": {"firstYearQuota": 30.0, "quota": 30.0, "bandA": 218.0, "competition": 7.3, "offered": 71.0}, "requirements": {"status": "general_only"}, "status": "partial", "blockedReason": null, "notes": ["此頁未列出入學分數換算表 → 不計算分數（不以假設的換算表評分）。"], "source": {"label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）", "url": "https://student.hk/", "asOf": "2026-11-17", "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"}, "sourceKey": "HOKYAU_2026", "provenance": {"extraction": "vision-transcription", "page": "sssdp_p32.tsv"}});
  FRESH.push({"id": "HKSYU-JSSY02", "inst": "HKSYU", "code": "JSSY02", "titleZh": "應用數據科學（榮譽）理學士", "titleEn": "", "scoring": {"scale": null, "formula": {"type": "best_n", "n": 5}, "weights": [], "defaultWeight": 1, "catCAsElective": false, "aplAsElective": false, "csdCounted": false, "referenceUsable": false}, "scores": {"uq": null, "median": null, "lq": null, "mean": 15.9, "entryYear": 2026, "publishedFor": 2027, "isSimulated": false, "reference": "none"}, "admissions": {"firstYearQuota": 20.0, "quota": 20.0, "bandA": 228.0, "competition": 11.4, "offered": 28.0}, "requirements": {"status": "general_only"}, "status": "partial", "blockedReason": null, "notes": ["此頁未列出入學分數換算表 → 不計算分數（不以假設的換算表評分）。"], "source": {"label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）", "url": "https://student.hk/", "asOf": "2026-11-17", "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"}, "sourceKey": "HOKYAU_2026", "provenance": {"extraction": "vision-transcription", "page": "sssdp_p32.tsv"}});
  FRESH.push({"id": "HKSYU-JSSY03", "inst": "HKSYU", "code": "JSSY03", "titleZh": "娛樂及遊戲應用數碼方案（榮譽）理學士", "titleEn": "", "scoring": {"scale": null, "formula": {"type": "best_n", "n": 5}, "weights": [], "defaultWeight": 1, "catCAsElective": false, "aplAsElective": false, "csdCounted": false, "referenceUsable": false}, "scores": null, "admissions": {"firstYearQuota": 15.0, "quota": null, "bandA": null, "competition": null, "offered": null}, "requirements": {"status": "general_only"}, "status": "partial", "blockedReason": null, "notes": ["此頁未列出入學分數換算表 → 不計算分數（不以假設的換算表評分）。"], "source": {"label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）", "url": "https://student.hk/", "asOf": "2026-11-17", "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"}, "sourceKey": "HOKYAU_2026", "provenance": {"extraction": "vision-transcription", "page": "sssdp_p32.tsv"}});

  root.JUPAS_SOURCES = root.JUPAS_SOURCES || {};
  root.JUPAS_SOURCES.HOKYAU_2026 = root.JUPAS_SOURCES.HOKYAU_2026 || SRC;
  var byId = {};
  (root.JUPAS_PROGRAMMES || []).forEach(function (p) { byId[p.id] = p; });
  FRESH.forEach(function (p) { byId[p.id] = p; });
  root.JUPAS_PROGRAMMES = Object.keys(byId).map(function (k) { return byId[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this);
