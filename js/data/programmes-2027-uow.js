/* UOW (香港伍倫貢學院) — SSSDP, list and demand only. */
(function (root) {
  'use strict';
  var SRC = {
  "label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）",
  "url": "https://student.hk/",
  "asOf": "2026-11-17",
  "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"
};
  var FRESH = [];
  FRESH.push({"id": "UOW-JSSW01", "inst": "UOW", "code": "JSSW01", "titleZh": "營運及管理（榮譽）航空學士", "titleEn": "", "scoring": {"scale": null, "formula": {"type": "best_n", "n": 5}, "weights": [], "defaultWeight": 1, "catCAsElective": false, "aplAsElective": false, "csdCounted": false, "referenceUsable": false}, "scores": {"uq": null, "median": null, "lq": null, "mean": 14.9, "entryYear": 2026, "publishedFor": 2027, "isSimulated": false, "reference": "none"}, "admissions": {"firstYearQuota": 25.0, "quota": 15.0, "bandA": 343.0, "competition": 22.87, "offered": 31.0}, "requirements": {"status": "general_only"}, "status": "partial", "blockedReason": null, "notes": ["此頁未列出入學分數換算表 → 不計算分數（不以假設的換算表評分）。", "指南印出的編號與東華學院重複（同為 JSSWxx），已按院校分開儲存，未擅自改號。"], "source": {"label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）", "url": "https://student.hk/", "asOf": "2026-11-17", "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"}, "sourceKey": "HOKYAU_2026", "provenance": {"extraction": "vision-transcription", "page": "sssdp_p31.tsv"}});
  FRESH.push({"id": "UOW-JSSW02", "inst": "UOW", "code": "JSSW02", "titleZh": "航運服務及營運管理學士（榮譽）", "titleEn": "", "scoring": {"scale": null, "formula": {"type": "best_n", "n": 5}, "weights": [], "defaultWeight": 1, "catCAsElective": false, "aplAsElective": false, "csdCounted": false, "referenceUsable": false}, "scores": null, "admissions": {"firstYearQuota": 5.0, "quota": 5.0, "bandA": 120.0, "competition": 24.0, "offered": null}, "requirements": {"status": "general_only"}, "status": "partial", "blockedReason": null, "notes": ["此頁未列出入學分數換算表 → 不計算分數（不以假設的換算表評分）。", "指南印出的編號與東華學院重複（同為 JSSWxx），已按院校分開儲存，未擅自改號。"], "source": {"label": "學友社《中六升學指南 2026》— SSSDP／自資學位課程（資料由院校提供）", "url": "https://student.hk/", "asOf": "2026-11-17", "note": "此等頁面未列出入學分數換算表，故本工具不計算分數，只列出課程與收生數據。"}, "sourceKey": "HOKYAU_2026", "provenance": {"extraction": "vision-transcription", "page": "sssdp_p31.tsv"}});

  root.JUPAS_SOURCES = root.JUPAS_SOURCES || {};
  root.JUPAS_SOURCES.HOKYAU_2026 = root.JUPAS_SOURCES.HOKYAU_2026 || SRC;
  var byId = {};
  (root.JUPAS_PROGRAMMES || []).forEach(function (p) { byId[p.id] = p; });
  FRESH.forEach(function (p) { byId[p.id] = p; });
  root.JUPAS_PROGRAMMES = Object.keys(byId).map(function (k) { return byId[k]; });
})(typeof globalThis !== 'undefined' ? globalThis : this);
