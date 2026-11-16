/* CHC (珠海學院) — SSSDP, list and demand only. */
(function (root) {
  'use strict';
  var SRC = {
  "label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）",
  "url": "https://student.hk/",
  "asOf": "2026-11-17",
  "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"
};
  var FRESH = [];
  FRESH.push({"id": "CHC-JSSCO2", "inst": "CHC", "code": "JSSCO2", "titleZh": "建築學（榮譽）理學士", "titleEn": "", "scoring": {"scale": null, "formula": {"type": "best_n", "n": 5}, "weights": [], "defaultWeight": 1, "catCAsElective": false, "aplAsElective": false, "csdCounted": false, "referenceUsable": false}, "scores": {"uq": null, "median": null, "lq": null, "mean": 13.4, "entryYear": 2026, "publishedFor": 2027, "isSimulated": false, "reference": "none"}, "admissions": {"firstYearQuota": 15.0, "quota": 20.0, "bandA": 171.0, "competition": 8.55, "offered": 20.0}, "requirements": {"status": "general_only"}, "status": "partial", "blockedReason": null, "notes": ["此頁未列出入學分數換算表 → 不計算分數（不以假設的換算表評分）。"], "source": {"label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）", "url": "https://student.hk/", "asOf": "2026-11-17", "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"}, "sourceKey": "HOKYAU_2026", "provenance": {"extraction": "vision-transcription", "page": "sssdp_p28.tsv"}});

  root.JUPAS_SOURCES = root.JUPAS_SOURCES || {};
  root.JUPAS_SOURCES.HOKYAU_2026 = root.JUPAS_SOURCES.HOKYAU_2026 || SRC;
  var byId = {};
  (root.JUPAS_PROGRAMMES || []).forEach(function (p) { byId[p.id] = p; });
  FRESH.forEach(function (p) { byId[p.id] = p; });
  root.JUPAS_PROGRAMMES = Object.keys(byId).map(function (k) { return byId[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this);
