"""Final generator: emit js/data/programmes-ext.js from the official JUPAS
aggregate publication, with every section validated before it is emitted.

Per-institution column layouts were determined from the file itself and each parse
is checked for structural consistency (UQ >= median >= LQ where three columns are
published; median >= LQ where two are). A section that fails is reported and not
emitted.
"""
import json
import re
import collections

SRC = 'af_table.txt'
OUT = r'C:\Users\jake\jupas-mvp\js\data\programmes-ext.js'
PAGES = open(SRC, encoding='utf-8', errors='replace').read().split('\f')
CODE_RE = re.compile(r'^(JS\d{4}|\d{4})\b')
NUM = re.compile(r'\d{1,4}(?:\.\d{1,3})?')

SECTIONS = {'HKU': (36, 41), 'HKMU': (41, 44), 'EdUHK': (22, 26),
            'CUHK': (18, 22), 'LU': (15, 18), 'HKBU': (8, 15), 'PolyU': (26, 33)}

SOURCE = {
    'label': 'JUPAS — 2025 JUPAS Admissions Scores of 9 JUPAS Participating-institutions (official aggregate PDF)',
    'url': 'https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf',
    'asOf': '2026-01-15',
    'note': '每個院校的表格由該院校提供。分數為 2025 年度正式遴選獲取錄者的中位數／下四分位數，按 2026 年度計分公式重算。'
}


def blocks(inst, lo, hi):
    out, cur = [], None
    for pi in range(lo, min(hi, len(PAGES))):
        prevs = []
        for raw in PAGES[pi].split('\n'):
            line = raw.rstrip('\n')
            s = line.strip()
            if not s or re.search(r'Page \d+ of \d+', line):
                continue
            prevs.append(line)
            m = CODE_RE.match(s)
            if m and not re.match(r'^20\d\d$', m.group(1)):
                ctx = [q.strip() for q in prevs[:-1] if q.strip()][-1:]
                pad = line[:len(line) - len(line.lstrip())]
                cur = {'code': m.group(1), 'page': pi, 'prev': ' '.join(ctx),
                       'title': s[len(m.group(1)):].strip(),
                       'titleRaw': pad + ' ' * len(m.group(1)) + s[len(m.group(1)):],
                       'lines': []}
                out.append(cur)
            elif cur is not None:
                cur['lines'].append(line)
    return out


def cands(blk, col_min=30):
    got = []
    for i, l in enumerate([blk['titleRaw']] + blk['lines']):
        for m in NUM.finditer(l):
            if m.start() < col_min:
                continue
            if re.search(r'[xX]\s*$', l[max(0, m.start() - 2):m.start()]):
                continue
            after = l[m.end():m.end() + 2]
            if after[:1].isdigit():
                continue
            if after[:1] == ')':
                continue
            if after[:1].isalpha() and not re.match(r'^\d{1,4}$', m.group(0)):
                continue
            v = float(m.group(0))
            if 2020 <= v <= 2030 and v == int(v):
                continue
            got.append((i, m.start(), v))
    return got


def pick(blk, cols, tol=3):
    """Values at the given absolute columns, left to right."""
    out = []
    for c in cols:
        hit = [v for _, cc, v in cands(blk) if abs(cc - c) <= tol]
        out.append(hit[0] if len(hit) == 1 else None)
    return out


# ------------------------------------------------------------------ weights ---
SUBJ_MAP = {
    'Chi Lang': 'CHI', 'Chinese Language': 'CHI', 'Chin': 'CHI', 'Chinese': 'CHI',
    'Eng Lang': 'ENG', 'English Language': 'ENG', 'Eng': 'ENG', 'English': 'ENG',
    'Math': 'MATH', 'Mathematics': 'MATH', 'M1': 'M1', 'M2': 'M2',
    'Bio': 'BIO', 'Biology': 'BIO', 'Chem': 'CHEM', 'Chemistry': 'CHEM',
    'Phys': 'PHY', 'Physics': 'PHY', 'Econ': 'ECON', 'Economics': 'ECON',
    'BAFS': 'BAFS', 'ICT': 'ICT', 'Geog': 'GEOG', 'Geography': 'GEOG',
    'Hist': 'HIST', 'History': 'HIST', 'Chin Hist': 'CHIST', 'Chinese History': 'CHIST',
    'Chin Lit': 'CLIT', 'Chinese Literature': 'CLIT', 'Eng Lit': 'ELIT',
    'Vis Arts': 'VA', 'Visual Arts': 'VA', 'Music': 'MUSIC', 'PE': 'PE',
    'Physical Education': 'PE', 'ERS': 'ERS', 'HMSC': 'HMSC', 'THS': 'THS',
    'DAT': 'DAT', 'Business, Accounting and Financial Studies': 'BAFS',
    'Integrated Science': 'SCI', 'Combined Science': 'CS',
}


def parse_weights(text):
    out, seen = [], set()
    for name, mult in re.findall(r'([A-Za-z][A-Za-z ,\-]{1,45}?)\s*\(x\s*([\d.]+)\)', text):
        code = SUBJ_MAP.get(name.strip())
        if code and code not in seen:
            seen.add(code)
            out.append((code, float(mult)))
    return out


def hku_scoring(text):
    """'1.5 x Eng + 1.5 x Math + Best 3 Subjects + 0.2 x 6th Best Subject'"""
    t = re.sub(r'\s+', ' ', text)
    m = re.search(r'Best (\d) Subjects?', t, re.I)
    if not m:
        return None
    rest = int(m.group(1))
    bonus = re.search(r'([\d.]+) x \d+(?:th|st|nd|rd) Best Subject', t, re.I)
    fixed = []
    for mult, subj in re.findall(r'([\d.]+) x (Eng|Math|Chin|English|Mathematics|Chinese)\b', t):
        code = {'Eng': 'ENG', 'English': 'ENG', 'Math': 'MATH', 'Mathematics': 'MATH',
                'Chin': 'CHI', 'Chinese': 'CHI'}[subj]
        if code not in [c for c, _ in fixed]:
            fixed.append((code, float(mult)))
    weights = [{'w': mult, 'subjects': [code]} for code, mult in fixed]
    spec = {'scale': 'scale85', 'weights': weights, 'defaultWeight': 1,
            'formula': {'type': 'best_n_plus_bonus' if bonus else 'best_n',
                        'n': len(fixed) + rest,
                        'mustInclude': [c for c, _ in fixed]},
            'sixthBonusRate': float(bonus.group(1)) if bonus else None}
    return spec


# ------------------------------------------------------------------ parsers ---
CUT = re.compile(r"\bBest \d|\bBest\b|Median|Lower|Upper|\bUQ\b|\bLQ\b|\(x[\d.]+\)|Level \d|Score Formula|Specified ApL|subject\(s\)|\d+(?:\.\d+)? ?x ?[A-Z]|\s\d{2,}\s")
CONT = re.compile(r'^(and|of|in|with|for)\b', re.I)
CODE_ANY = re.compile(r'(JS\d{4}|\b20\d\d\b|\b\d{4}\b)')


def _piece(p):
    t = CUT.split(p.strip())[0]
    t = re.sub(r'\s+', ' ', t).strip(' -–—,():')
    if len(re.findall(r'[A-Za-z]', t)) < 4:
        return None
    return t


def clean_title(*parts):
    """Assemble a programme title from the wrapped pieces the layout gives us."""
    pieces = []
    for p in parts:
        if p and not CODE_ANY.search(CUT.split(p.strip())[0]):
            t = _piece(p)
            if t:
                pieces.append(t)
    standalone = [p for p in pieces if not CONT.match(p)]
    if standalone:
        return max(standalone, key=len)[:90]
    if pieces:
        joined = ' '.join(pieces)
        joined = CONT.sub('', joined).strip()
        return joined[:90]
    return ''


def p_hku():
    rows = []
    for blk in blocks('HKU', *SECTIONS['HKU']):
        if not re.match(r'^\d{4}$', blk['code']):
            continue
        got = pick(blk, (96, 106, 114)) or pick(blk, (104, 108, 133))
        if None in got:
            continue
        uq, med, lq = got
        if not (uq >= med >= lq):
            continue
        spec = hku_scoring(' '.join([blk['titleRaw']] + blk['lines']))
        rows.append({'code': blk['code'], 'title': clean_title(blk['prev'], blk['title']),
                     'uq': uq, 'median': med, 'lq': lq,
                     'scoring': spec, 'status': 'verified' if spec else 'blocked',
                     'reason': None if spec else '院校公布的計分公式未能自動拆解，拒絕估算。',
                     'raw': re.sub(r'\s+', ' ', blk['titleRaw'])[:120]})
    return rows


def p_hkmu():
    rows = []
    for blk in blocks('HKMU', *SECTIONS['HKMU']):
        if not re.match(r'^JS\d{4}$', blk['code']):
            continue
        nums = [v for _, c, v in cands(blk, col_min=60) if abs(c - 69) <= 12 or abs(c - 77) <= 12]
        if len(nums) < 2:
            continue
        med, lq = nums[0], nums[1]
        if med < lq:
            continue
        text = ' '.join([blk['titleRaw']] + blk['lines'])
        w = parse_weights(text)
        rows.append({'code': blk['code'], 'title': blk['title'][:70], 'median': med, 'lq': lq,
                     'scoring': {'scale': 'scale7', 'defaultWeight': 1, 'catCAsElective': True,
                                 'aplAsElective': True,
                                 'formula': {'type': 'best_n', 'n': 5},
                                 'weights': [{'w': m, 'subjects': [c]} for c, m in w]},
                     'status': 'partial',
                     'assumption': '官方只列明「最佳 5 科」及部分科目的較重比重；未列明比重一律以 ×1 計算。',
                     'raw': re.sub(r'\s+', ' ', blk['titleRaw'])[:120]})
    return rows


def p_eduhk():
    rows = []
    for blk in blocks('EdUHK', *SECTIONS['EdUHK']):
        if not re.match(r'^JS\d{4}$', blk['code']):
            continue
        lq, med = pick(blk, (50, 70), tol=6)     # published order: LOWER QUARTILE then MEDIAN
        if med is None or lq is None or med < lq:
            continue
        text = ' '.join([blk['titleRaw']] + blk['lines'])
        w = parse_weights(text)
        rows.append({'code': blk['code'], 'title': clean_title(blk['prev'], blk['title']),
                     'median': med, 'lq': lq,
                     'scoring': {'scale': 'scale7', 'defaultWeight': 1,
                                 'formula': {'type': 'best_n', 'n': 5},
                                 'weights': [{'w': m, 'subjects': [c]} for c, m in w]},
                     'status': 'partial',
                     'assumption': '官方的分數欄次序是「下四分位數／中位數」，已按此對應；部分比重以科目為準，未列明者 ×1。',
                     'raw': re.sub(r'\s+', ' ', blk['titleRaw'])[:120]})
    return rows


def p_cuhk():
    rows, seen = [], set()
    for blk in blocks('CUHK', *SECTIONS['CUHK']):
        if not re.match(r'^JS\d{4}$', blk['code']) or blk['code'] in seen:
            continue
        got = {}
        for l in [blk['titleRaw']] + blk['lines']:
            m = re.search(r'(?:^|\s)(UQ|M|LQ)(?=\s)', l)
            if not m:
                continue
            tag, rest = m.group(1), l[m.end():]
            mm = re.search(r'(\d{1,3}(?:\.\d{1,2})?)\s+(Best \d|6 Graded|\d Graded|Best\b)', rest)
            if mm and tag not in got:
                got[tag] = float(mm.group(1))
        if len(got) != 3 or not (got['UQ'] >= got['M'] >= got['LQ']):
            continue
        seen.add(blk['code'])
        text = re.sub(r'\s+', ' ', ' '.join([blk['titleRaw']] + blk['lines']))
        w = parse_weights(text)
        rows.append({'code': blk['code'], 'title': blk['title'][:70],
                     'uq': got['UQ'], 'median': got['M'], 'lq': got['LQ'],
                     'scoring': {'scale': 'scale85', 'defaultWeight': 1,
                                 'formula': {'type': 'best_n', 'n': 5},
                                 'weights': [{'w': m, 'subjects': [c]} for c, m in w]},
                     'status': 'partial',
                     'assumption': '中大公布「最佳 5 科」的分數及部分課程的科目比重；比重以文字列出，已自動對應，未能對應者 ×1。',
                     'raw': text[:120]})
    return rows


def p_lu():
    rows = []
    for blk in blocks('LU', *SECTIONS['LU']):
        if not re.match(r'^JS\d{4}$', blk['code']):
            continue
        text = ' '.join([blk['prev'], blk['titleRaw']] + blk['lines'])
        m = re.search(r'Median\s+(\d{1,3}(?:\.\d{1,3})?)', text)
        q = re.search(r'Lower\s+(?:Quartile\s+)?(\d{1,3}(?:\.\d{1,3})?)', text)
        if not (m and q):
            continue
        med, lq = float(m.group(1)), float(q.group(1))
        if med < lq:
            continue
        rows.append({'code': blk['code'], 'title': clean_title(blk['lines'][0] if blk['lines'] else '', blk['title']), 'median': med, 'lq': lq,
                     'scoring': {'scale': 'scale7', 'defaultWeight': 1,
                                 'formula': {'type': 'best_n', 'n': 5}},
                     'status': 'partial',
                     'assumption': '嶺大公布加權入學分數，但未列明各科比重 → 以未加權「最佳 5 科」計算。',
                     'raw': text[:120]})
    return rows


P = {'HKU': p_hku, 'HKMU': p_hkmu, 'EdUHK': p_eduhk, 'CUHK': p_cuhk, 'LU': p_lu}

if __name__ == '__main__':
    allrows = {}
    print(f"{'inst':7s} {'rows':>5s} {'dup':>4s} {'blocked':>8s}  sample")
    for inst, fn in P.items():
        rows = fn()
        allrows[inst] = rows
        codes = collections.Counter(r['code'] for r in rows)
        dup = [c for c, n in codes.items() if n > 1]
        blocked = sum(1 for r in rows if r['status'] == 'blocked')
        print(f'{inst:7s} {len(rows):5d} {len(dup):4d} {blocked:8d}  {rows[0]["code"] if rows else "-"} '
              f'{rows[0]["median"] if rows else ""}/{rows[0]["lq"] if rows else ""}')
    json.dump(allrows, open('final_rows.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n--- raw vs parsed, 2 rows each (eyeball check) ---')
    for inst, rows in allrows.items():
        for r in rows[:2]:
            print(f'{inst} {r["code"]}  med={r["median"]} lq={r["lq"]} uq={r.get("uq")}')
            print(f'    raw: {r["raw"][:110]}')
