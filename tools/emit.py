"""Emit js/data/programmes-ext.js from the validated parse (final_rows.json)."""
import json

ROWS = json.load(open('final_rows.json', encoding='utf-8'))

NORMALIZE = {'EdUHK': 'EDUHK'}   # institutions.js uses upper-case codes

INST_META = {
    'HKU':   {'short': '港大', 'nameZh': '香港大學', 'scale': 'scale85', 'provenance': 'parsed-official'},
    'HKMU':  {'short': '都大', 'nameZh': '香港都會大學', 'scale': 'scale7', 'provenance': 'parsed-official'},
    'EDUHK': {'short': '教大', 'nameZh': '香港教育大學', 'scale': 'scale7', 'provenance': 'parsed-official'},
    'LU':    {'short': '嶺大', 'nameZh': '嶺南大學', 'scale': 'scale7', 'provenance': 'parsed-official'},
}

SRC = {
    "label": "JUPAS — 2025 JUPAS Admissions Scores of 9 JUPAS Participating-institutions（官方彙編 PDF）",
    "url": "https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf",
    "asOf": "2026-01-15",
    "note": "每個院校的表格由該院校提供。分數為 2025 年度正式遴選獲取錄者的中位數／下四分位數，按 2026 年度計分公式重算。"
}

out = []
out.append("/* Programme rows for HKU / HKMU / EdUHK / LU / CUHK-partial, extracted from the")
out.append(" * official JUPAS aggregate publication by tools/parse_jupas.py and validated for")
out.append(" * structural consistency (UQ >= median >= LQ; median >= LQ) before emission.")
out.append(" *")
out.append(" * Titles for these institutions are published in English only, so titleZh is empty")
out.append(" * and the UI falls back to the English title.")
out.append(" */")
out.append("(function (root) {")
out.append("  'use strict';")
out.append("")
out.append("  var SRC = " + json.dumps(SRC, ensure_ascii=False, indent=2) + ";")
out.append("")
out.append("  var EXTRACTED = [];")

for inst_key, rows in ROWS.items():
    if not rows:
        continue
    inst = NORMALIZE.get(inst_key, inst_key)
    meta = INST_META[inst]
    out.append("")
    out.append("  /* ---- %s (%s) ---- */" % (meta['nameZh'], inst))
    for r in rows:
        inst = NORMALIZE.get(inst, inst)
        code = r['code'] if r['code'].startswith('JS') else 'JS' + r['code']
        entry = {
            'id': inst + '-' + code,
            'inst': inst,
            'code': code,
            'titleZh': '',
            'titleEn': r['title'],
            'scoring': r['scoring'],
            'scores': {
                'median': r['median'], 'lq': r['lq'],
                'upper': r.get('uq'),
                'entryYear': 2025, 'publishedFor': 2026, 'isSimulated': False,
            },
            'requirements': {'status': 'general_only'},
            'status': r['status'],
            'blockedReason': r.get('reason'),
            'notes': ([r['assumption']] if r.get('assumption') else []) + [r.get('raw', '')[:110]],
            'source': SRC,
            'sourceKey': 'JUPAS_2025_AGG',
            'provenance': {'extraction': 'parsed', 'source': 'official aggregate',
                           'validated': 'UQ >= median >= LQ structurally checked before emission'},
        }
        out.append("  EXTRACTED.push(" + json.dumps(entry, ensure_ascii=False) + ");")

out.append("")
out.append("  root.JUPAS_SOURCES = root.JUPAS_SOURCES || {};")
out.append("  root.JUPAS_SOURCES.JUPAS_2025_AGG = SRC;")
out.append("  root.JUPAS_PROGRAMMES = (root.JUPAS_PROGRAMMES || []).concat(EXTRACTED);")
out.append("})(typeof globalThis !== 'undefined' ? globalThis : this);")

open(r'C:\Users\jake\jupas-mvp\js\data\programmes-ext.js', 'w', encoding='utf-8').write("\n".join(out) + "\n")

tot = sum(len(v) for v in ROWS.values())
print('emitted', tot, 'rows:', {k: len(v) for k, v in ROWS.items() if v})
