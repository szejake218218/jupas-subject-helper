# -*- coding: utf-8 -*-
"""Add the institutions' own published subject weightings to the 2027 layer.

Two institutions print the weightings only on their own websites, so the guide
layer carried their scores but refused to compare them (referenceUsable:false):

  POLYU  -- one PDF per scheme:
            https://www.polyu.edu.hk/saso/docdrive/jupas/2026_<CODE>_SW.pdf
            "Subject Name | Subject Weighting for 2026/27 Admission Exercise"
            Category A subjects are weighted 5, 7 or 10; Chinese / English >= 7.
  6th-subject bonus:
            https://www.polyu.edu.hk/study/ug/admissions/jupas/jupas-admission-selection
            "Bonus Score = 10% x Equivalent HKDSE Score x Weighting of the 6th
            subject", only for a 6th subject at Level 3 or above.

  EDUHK  -- https://eduhk.hk/acadprog/downloads/EdUHK_admission_scores_2026.pdf
            per-programme "HKDSE Subjects with Heavier Subject Weighting for
            Admission Score Calculation" (2026 entry column), multipliers
            x1.1 / x1.2 / x1.5 / x1.6 / x2 on a 7-point best 5.

Nothing is inferred: every weight below is read from those files, and the script
refuses to write if a subject table is incomplete, a weight is outside the
published set, or a category-A subject is left unmapped.

Usage:
    python tools/add-weightings.py --src <dir> [--write]

<dir> must contain  polyu/<CODE>.txt  (pdftotext -table output)  and
                   eduhk/scores.txt   (pdftotext -table output).
"""
import argparse
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

POLYU_CODES = """JS3000 JS3003 JS3004 JS3005 JS3006 JS3007 JS3008 JS3030 JS3050
JS3060 JS3070 JS3080 JS3130 JS3140 JS3150 JS3160 JS3170 JS3180 JS3211 JS3214
JS3220 JS3223 JS3236 JS3237 JS3240 JS3242 JS3243 JS3250 JS3255 JS3290 JS3310
JS3320 JS3337 JS3375 JS3478 JS3569 JS3612 JS3624 JS3636 JS3648 JS3739 JS3741
JS3789 JS3791 JS3868 JS3923 JS3997""".split()

# Category A subject name (as printed by PolyU) -> engine subject code.
POLYU_A = {
    'Biology': ['BIO'],
    'Business, Accounting and Financial Studies': ['BAFS'],
    'Business, Accounting and Financial Studies (Accounting)': ['BAFS'],
    'Business, Accounting and Financial Studies (Business Management)': ['BAFS'],
    'Chemistry': ['CHEM'],
    'Chinese History': ['CHIST'],
    'Chinese Language': ['CHI'],
    'Chinese Literature': ['CLIT'],
    'Combined Science: Biology + Chemistry': ['CS'],
    'Combined Science: Biology + Physics': ['CS'],
    'Combined Science: Physics + Chemistry': ['CS'],
    'Design and Applied Technology': ['DAT'],
    'Economics': ['ECON'],
    'English Language': ['ENG'],
    'Ethics and Religious Studies': ['ERS'],
    'Geography': ['GEOG'],
    'Health Management and Social Care': ['HMSC'],
    'History': ['HIST'],
    'Information and Communication Technology': ['ICT'],
    'Integrated Science': ['SCI'],
    'Literature in English': ['ELIT'],
    'Mathematics': ['MATH'],
    'Mathematics (Extended part - Algebra and Calculus)': ['M2'],
    'Mathematics (Extended part - Calculus and Statistics)': ['M1'],
    'Music': ['MUSIC'],
    'Physical Education': ['PE'],
    'Physics': ['PHY'],
    'Technology and Living (Fashion, Clothing and Textiles)': ['TL'],
    'Technology and Living (Food Science and Technology)': ['TL'],
    'Tourism and Hospitality Studies': ['THS'],
    'Visual Arts': ['VA'],
}

# Category C rows. The bare "#" rows are the HKDSE language subjects themselves;
# the other rows are the alternative qualifications PolyU accepts for the same
# language (same weight, so they collapse onto one code).
POLYU_C = {
    'Japanese #': ['JAP'],
    'Japanese-Language Proficiency Test': ['JAP'],
    'Test of Proficiency in Korean II': ['KOR'],
    'French #': ['FRA'],
    'Adv Dip of French Lang Studies/Dip of French Lang Studies': ['FRA'],
    'German #': ['GER'],
    'Goethe-Certificate': ['GER'],
    'Spanish #': ['SPA'],
    'Diploma of Spanish as a Foreign Language': ['SPA'],
    'Urdu #': ['URD'],
    'Urdu (International)': ['URD'],
}
# HKDSE Hindi has no code in the app's Category C catalogue, so it is not mapped.
POLYU_C_IGNORED = {'Hindi #'}

ROW_RE = re.compile(r'^(.+?)\s{2,}(\d+)\s*$')

POLYU_SW_SRC = {
    'label': '理大 — Subject Weighting for 2026/27 Admission Exercise（課程個別 PDF）',
    'url': 'https://www.polyu.edu.hk/saso/docdrive/jupas/2026_JS3003_SW.pdf',
    'asOf': '2026-11-17',
    'note': '每項課程一份 PDF，檔名為 2026_<JUPAS CODE>_SW.pdf，記錄的 weightingUrl 指向該課程本身那份。'
            '檔案只列比重、不含分數。丙類（其他語言）一律 5。部分課程另列指定乙類（應用學習）科目的比重'
            '（5／7／10），但本工具未把個別 ApL 課程對應到科目代號，且現有記錄不把乙類計入分數 → 該科不計；'
            '（若該科在指定名單內，你的分數會被低估，這是已知限制。）',
}

EDUHK_SW_SRC = {
    'label': '教大 — EdUHK 2026 Admission Scores Reference for JUPAS Entrants（含科目比重）',
    'url': 'https://eduhk.hk/acadprog/downloads/EdUHK_admission_scores_2026.pdf',
    'asOf': '2026-10-28',
    'note': '取「For 2026 Entry」欄的科目比重（與本記錄貯存的分數同一年），最佳五科、七分制、'
            '不計公民與社會發展；個別科目乘以 x1.1／x1.2／x1.5／x1.6／x2 不等。'
            '該文件另有「for 2027 Entry」欄的修訂比重，未用於本記錄（差異見個別記錄的 notes）。'
            '乙類（應用學習）只對「指定科目」乘 1.5，本工具未對應個別應用學習課程 → 該科按 x1 計，'
            '若你的應用學習科在指定名單內，分數會被低估。',
}

# ---------------------------------------------------------------------------
# PolyU
# ---------------------------------------------------------------------------

def parse_polyu(txt):
    """Return (catA, catB, catC, title, exercise) read from one weighting PDF."""
    title = exercise = None
    catA, catB, catC = [], [], []
    sect = None
    for raw in txt.split('\n'):
        line = raw.replace('\r', '').rstrip()
        s = line.strip()
        if not s:
            continue
        if s.startswith('Programme Title:'):
            title = s.split(':', 1)[1].strip()
            continue
        if s.startswith('Category A:'):
            sect = catA
            continue
        if s.startswith('Category B:'):
            sect = catB
            continue
        if s.startswith('Category C:'):
            sect = catC
            continue
        if s.startswith('JUPAS Code') or s.startswith('Subject Name'):
            m = re.search(r'(\d{4}/\d{2}) Admission Exercise', s)
            if m:
                exercise = m.group(1)
            continue
        if s.startswith('*') or s.startswith('#'):
            continue
        m = ROW_RE.match(s)
        if m and sect is not None:
            sect.append((m.group(1).strip(), int(m.group(2))))
    return catA, catB, catC, title, exercise


def build_polyu(src):
    got, problems = {}, {}
    for code in POLYU_CODES:
        path = os.path.join(src, 'polyu', code + '.txt')
        if not os.path.exists(path):
            problems[code] = 'no 2026/27 weighting PDF published (404 on both hosts)'
            continue
        txt = io.open(path, encoding='utf-8', errors='replace').read()
        catA, catB, catC, title, exercise = parse_polyu(txt)
        if not catA:
            problems[code] = 'no Category A table in the PDF'
            continue
        if exercise != '2026/27':
            problems[code] = 'PDF is for the %s exercise, not 2026/27' % exercise
            continue
        bad = [(n, w) for n, w in catA if w not in (5, 7, 10)]
        if bad:
            problems[code] = 'weight outside the published set 5/7/10: %r' % (bad,)
            continue
        unmapped = [n for n, _ in catA if n not in POLYU_A]
        if unmapped:
            problems[code] = 'unmapped Category A subject(s): %r' % (unmapped,)
            continue
        d = dict((n, w) for n, w in catA)
        short = [c for c in ('Chinese Language', 'English Language') if d.get(c, 0) < 7]
        if short:
            problems[code] = '%s printed below 7' % ', '.join(short)
            continue
        # Every printed weight for each engine code. A code can carry more than
        # one weight when it merges several printed subjects: the three Combined
        # Science pairs, the two Technology and Living strands, and the Category C
        # award names. Where they disagree the profile does not record which one
        # the student took, so the LOWEST printed weight is used and the record
        # says so - the score is then a lower bound, never an overstatement.
        variants = {}
        for name, w in catA:
            for sub in POLYU_A[name]:
                variants.setdefault(sub, []).append((name, w))
        weights = dict((sub, min(w for _, w in vs)) for sub, vs in variants.items())
        collapsed = dict((sub, vs) for sub, vs in variants.items()
                         if len(set(w for _, w in vs)) > 1)
        conflict = None
        for name, w in catC:
            if name in POLYU_C_IGNORED:
                continue
            if name not in POLYU_C:
                conflict = 'unmapped Category C subject: %r' % name
                break
            if w not in (5, 7, 10):
                conflict = 'Category C weight outside 5/7/10: %r' % ((name, w),)
                break
            for sub in POLYU_C[name]:
                weights[sub] = w
        if conflict:
            problems[code] = conflict
            continue
        got[code] = {'weights': weights, 'catB': catB, 'title': title, 'collapsed': collapsed}
    return got, problems


def weight_rows(weights, default):
    """Group subject codes by printed weight, heaviest first."""
    groups = {}
    for sub, w in weights.items():
        groups.setdefault(w, []).append(sub)
    rows = [{'w': w, 'subjects': sorted(groups[w])} for w in sorted(groups, reverse=True)]
    seen = set()
    for r in rows:
        assert r['w'] != 0, 'a subject was left at weight 0'
        for s in r['subjects']:
            assert s not in seen, 'subject %s appears twice' % s
            seen.add(s)
    return rows

# ---------------------------------------------------------------------------
# EdUHK
# ---------------------------------------------------------------------------

# Programme -> the lines of the "For 2026 Entry / HKDSE Subjects with Heavier
# Subject Weighting" cell, exactly as printed. Kept verbatim so the parser can
# prove it has consumed the PDF's token stream one-for-one; anything it cannot
# turn into a per-subject multiplier (the "best one subject of" rows) is refused.
EDUHK_ROWS = {
    'JS8001': ['Music (x1.5)', 'Specified ApL subject(s) (x1.5)'],
    'JS8002': ['Visual Arts (x1.5)', 'Specified ApL subject(s) (x1.5)'],
    'JS8003': ['Chinese Language (x1.5)', 'English Language (x1.5)',
               'Chinese Literature (x1.5)', 'ICT (x1.5)'],
    'JS8004': ['English Language (x1.5)', 'ICT (x1.5)', 'Literature in English (x1.5)'],
    'JS8005': ['Chinese History (x1.5)', 'History (x1.5)'],
    'JS8006': ['Chinese Language (x1.5)', 'English Language (x1.5)',
               'Specified ApL subject(s) (x1.5)'],
    'JS8007': ['The best one subject of', 'BAFS (Accounting/ Business',
               'Management), Economics or', 'Specified ApL subject(s) (x1.5)'],
    'JS8008': ['Math, M1/M2 (x1.5)', 'ICT (x1.5)', 'Biology, Chemistry, Physics (x1.5)',
               'Combined Science (x1.5)', 'Integrated Science (x1.5)',
               'Specified ApL subject(s) (x1.5)'],
    'JS8009': ['Math, M1/M2 (x1.5)', 'Physics (x1.5)', 'Specified ApL subject(s) (x1.5)'],
    'JS8010': ['Physical Education (x1.5)'],
    'JS8011': ['Chemistry (x1.5)', 'Biology (x1.5)', 'Physics (x1.2)',
               'Math, M1/M2 (x1.1)', 'Geography (x1.1)'],
    'JS8012': ['English (x1.5)', 'Geography (x1.5)'],
    'JS8013': ['The best one subject of', 'Chinese History, Economics,',
               'Geography, History or', 'Specified ApL subject(s) (x1.5)'],
    'JS8651': ['(No subject weighting)'],
    'JS8663': ['Chinese Language (x1.5)', 'English Language (x1.5)'],
    'JS8674': ['Chinese Language (x1.5)', 'Chinese Literature (x1.5)', 'ICT (x1.5)'],
    'JS8675': ['English Language (x1.5)', 'ICT (x1.5)', 'Literature in English (x1.5)'],
    'JS8685': ['Music (x1.5)', 'Specified ApL subject(s) (x1.5)'],
    'JS8686': ['Visual Arts (x1.5)', 'Specified ApL subject(s) (x1.5)'],
    'JS8687': ['Chinese Language (x1.5)', 'English Language (x1.5)',
               'Chinese History (x1.5)', 'DAT (x1.5)', 'History (x1.5)',
               'Visual Arts (x1.5)', 'Specified ApL subject(s) (x1.5)'],
    'JS8688': ['(No subject weighting)'],
    'JS8702': ['Biology, Chemistry (x1.6)', 'Geography (x1.2)', 'Math, M1/M2 (x1.2)',
               'Physics (x1.2)'],
    'JS8714': ['Math, M1/M2 (x1.5)', 'Biology, Chemistry, Physics (x1.5)',
               'DAT, ICT (x1.5)', 'Combined Science (x1.5)', 'Integrated Science (x1.5)',
               'Specified ApL subject(s) (x1.5)'],
    'JS8726': ['Biology (x2)', 'Physical Education (x2)', 'English Language (x1.5)',
               'Math, M1/M2 (x1.5)', 'DAT, ICT (x1.5)', 'Specified ApL subject(s) (x1.5)'],
    'JS8727': ['Chinese Language (x1.5)', 'English Language (x1.5)'],
    'JS8507': ['Chinese Language (x1.5)', 'English Language (x1.5)',
               'Specified ApL subject(s) (x1.5)'],
}

# The 2027-entry column revises these two; the record keeps the 2026 weighting
# (it matches the stored 2026 scores) and prints the difference.
EDUHK_2027_REVISIONS = {
    'JS8012': '教大另列 2027 年入學修訂比重：地理由 x1.5 改為 x1.75（該欄參考分數 LQ 26.5／中位數 27.5）。'
              '本記錄以 2026 年比重對應 2026 年分數。',
    'JS8702': '教大另列 2027 年入學修訂比重：物理 x1.2→x1.6、數學及 M1/M2 x1.2→x1.4'
              '（參考分數 LQ 26.4／中位數 26.6）。本記錄以 2026 年比重對應 2026 年分數。',
}

EDUHK_NAME_TO_CODE = {
    'Music': ['MUSIC'],
    'Visual Arts': ['VA'],
    'Chinese Language': ['CHI'],
    'English Language': ['ENG'],
    'English': ['ENG'],
    'Chinese Literature': ['CLIT'],
    'Chinese History': ['CHIST'],
    'History': ['HIST'],
    'ICT': ['ICT'],
    'DAT': ['DAT'],
    'DAT, ICT': ['DAT', 'ICT'],
    'Geography': ['GEOG'],
    'Economics': ['ECON'],
    'Physics': ['PHY'],
    'Chemistry': ['CHEM'],
    'Biology': ['BIO'],
    'Biology, Chemistry': ['BIO', 'CHEM'],
    'Biology, Chemistry, Physics': ['BIO', 'CHEM', 'PHY'],
    'Combined Science': ['CS'],
    'Integrated Science': ['SCI'],
    'Physical Education': ['PE'],
    'Math, M1/M2': ['MATH', 'M1', 'M2'],
    'Literature in English': ['ELIT'],
    'BAFS (Accounting/ Business': ['BAFS'],
    'Specified ApL subject(s)': [],
}

# Why a programme is left comparable-less, in the student's terms.
EDUHK_REFUSAL = {
    'JS8007': '未加入科目比重：教大寫「The best one subject of 企業、會計與財務概論、經濟 或 指定應用學習科目'
              '（x1.5）」—— 那是「清單中最好的一科」乘 1.5，不是逐科乘大；本工具以科目為準，無法表達 → '
              '仍只顯示數字，不作比較。',
    'JS8013': '未加入科目比重：教大寫「The best one subject of 中史、經濟、地理、歷史 或 指定應用學習科目'
              '（x1.5）」—— 那是「清單中最好的一科」乘 1.5，不是逐科乘大；本工具以科目為準，無法表達 → '
              '仍只顯示數字，不作比較。',
}

SEG_RE = re.compile(r'^(.*?)\(x([\d.]+)\)$')


def eduhk_stream(src):
    """Every weight-cell line of the four pages, in printed order."""
    path = os.path.join(src, 'eduhk', 'scores.txt')
    raw = io.open(path, encoding='latin-1').read().replace('\r', '')
    stream = []
    for page in raw.split('\f'):
        lines = [l for l in page.split('\n') if l.strip()]
        hdr = [l for l in lines if 'Programme Title' in l and 'Remarks' in l]
        if not hdr:
            continue
        hdr = hdr[0]
        w26 = hdr.index('HKDSE Subjects with Heavier')
        stop = hdr.index('(with weightings)')
        start = max(i for i, l in enumerate(lines) if 'Admission Score Calculation' in l) + 1
        for l in lines[start:]:
            if l.strip().startswith('Note:') or 'Page ' in l:
                break
            seg = l[w26:stop].strip()
            if seg:
                stream.append(seg)
    return stream


def build_eduhk(src):
    stream = eduhk_stream(src)
    expected = []
    for code in EDUHK_ROWS:
        expected.extend(EDUHK_ROWS[code])
    if stream != expected:
        i = 0
        for k in range(max(len(stream), len(expected))):
            a = stream[k] if k < len(stream) else '<end>'
            b = expected[k] if k < len(expected) else '<end>'
            if a != b:
                i = k
                break
        raise SystemExit('EDUHK weight-cell stream disagrees with the transcribed table '
                         'at #%d: pdf=%r transcribed=%r' % (i, stream[i] if i < len(stream) else None,
                                                            expected[i] if i < len(expected) else None))
    got, refused = {}, {}
    for code, segs in EDUHK_ROWS.items():
        if segs == ['(No subject weighting)']:
            got[code] = {'weights': {}}
            continue
        entries = []
        unrepresentable = False
        for seg in segs:
            m = SEG_RE.match(seg)
            if not m:
                unrepresentable = True
                continue
            name, mult = m.group(1).strip(), float(m.group(2))
            if name not in EDUHK_NAME_TO_CODE:
                raise SystemExit('%s: unmapped EdUHK subject %r' % (code, name))
            entries.append((name, mult))
        if unrepresentable:
            refused[code] = ('"the best one subject of" a list of subjects - not a per-subject '
                             'multiplier, so a student holding two of the listed subjects would be '
                             'overstated')
            continue
        weights = {}
        for name, mult in entries:
            for sub in EDUHK_NAME_TO_CODE[name]:
                if sub in weights and weights[sub] != mult:
                    raise SystemExit('%s: conflicting multipliers for %s' % (code, sub))
                weights[sub] = mult
        got[code] = {'weights': weights}
    return got, refused


# ---------------------------------------------------------------------------
# Emit
# ---------------------------------------------------------------------------

VARIANT_LABEL = {'CS': '組合科學', 'TL': '科技與生活'}

POLYU_FILE = os.path.join(ROOT, 'js', 'data', 'programmes-2027-polyu.js')
EDUHK_FILE = os.path.join(ROOT, 'js', 'data', 'programmes-2027-eduhk.js')


def patch(path, updater, src_key, src_obj):
    src = io.open(path, encoding='utf-8').read()
    counts = {'changed': 0}

    def repl(mo):
        rec = json.loads(mo.group(1))
        if updater(rec):
            counts['changed'] += 1
            return 'FRESH.push(%s);' % json.dumps(rec, ensure_ascii=False)
        return mo.group(0)

    src = re.sub(r'FRESH\.push\((\{.*?\})\);', repl, src)
    anchor = '  root.JUPAS_SOURCES.HOKYAU_2026 = root.JUPAS_SOURCES.HOKYAU_2026 || SRC;'
    if anchor not in src:
        raise SystemExit('source registration not found in ' + path)
    if ('  root.JUPAS_SOURCES.%s = {' % src_key) in src:
        # The source block is already there: re-running must not append it again.
        io.open(path, 'w', encoding='utf-8', newline='').write(src)
        return counts['changed']
    src = src.replace(anchor, anchor + '\n  root.JUPAS_SOURCES.%s = %s;'
                      % (src_key, json.dumps(src_obj, ensure_ascii=False)))
    io.open(path, 'w', encoding='utf-8', newline='\n').write(src)
    return counts['changed']


# Notes this script owns. Re-running it replaces them instead of piling up.
OWN_NOTES = re.compile('科目比重|第 6 科加分|的比重按所考組合|的比重按選修範疇|'
                       '教大另列 2027|教大公布此課程為|未加入科目比重')


def strip_weight_note(rec):
    return [n for n in (rec.get('notes') or []) if not OWN_NOTES.search(n)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='directory holding polyu/*.txt and eduhk/scores.txt')
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()

    polyu, polyu_bad = build_polyu(args.src)
    eduhk, eduhk_bad = build_eduhk(args.src)

    print('PolyU: %d of %d programmes have a published 2026/27 weighting table'
          % (len(polyu), len(POLYU_CODES)))
    for code, why in sorted(polyu_bad.items()):
        print('  NOT SCORED  %s  %s' % (code, why))
    print('EdUHK: %d of %d programmes have a printed weighting'
          % (len(eduhk), len(EDUHK_ROWS)))
    for code, why in sorted(eduhk_bad.items()):
        print('  NOT SCORED  %s  %s' % (code, why))

    # Weight sanity: the institutions only ever print these values.
    for code, d in polyu.items():
        for sub, w in d['weights'].items():
            assert w in (5, 7, 10), (code, sub, w)
    for code, d in eduhk.items():
        for sub, w in d['weights'].items():
            assert w in (1.1, 1.2, 1.5, 1.6, 2.0), (code, sub, w)

    def up_polyu(rec):
        code = rec['code']
        sc = rec['scoring']
        if code not in polyu:
            if code in polyu_bad:
                notes = strip_weight_note(rec)
                notes.insert(0, '未加入科目比重：%s → 仍只顯示數字，不作比較。' % polyu_bad[code])
                rec['notes'] = notes
                return True
            return False
        six = bool((sc.get('formula') or {}).get('sixthBonus'))
        sc['weights'] = weight_rows(polyu[code]['weights'], 5)
        sc['defaultWeight'] = 5
        sc['referenceUsable'] = True
        f = sc['formula']
        f['type'] = 'best_n_plus_bonus' if six else 'best_n'
        if six:
            sc['sixthBonusRate'] = 0.1
            sc['bonusMinLevel'] = 3
        notes = ['科目比重按理大官方課程 PDF「Subject Weighting for 2026/27 Admission Exercise」'
                 '逐科抄錄（5／7／10），故可與院校公布的分數比較。']
        if six:
            notes.append('此課程計入第 6 科加分：理大公布為第 6 科（3 級或以上）加權分數的 10%。')
        # A weighting table is not a score: JS3000 has weights but no published figure.
        status = 'verified' if rec.get('scores') else 'partial'
        for sub, variants in sorted(polyu[code]['collapsed'].items()):
            seen = []
            for name, w in variants:
                label = name.split(': ')[-1].split('(')[-1].rstrip(')')
                if (label, w) not in seen:
                    seen.append((label, w))
            printed = '、'.join('%s %d' % (l, w) for l, w in seen)
            notes.append('「%s」的比重按所考組合而異（%s）；本工具只知科目、不知組合，'
                         '故按最低的 %d 計 → 若你考的是另一組合，實際分數會更高（此為下限）。'
                         % (VARIANT_LABEL.get(sub, sub), printed, polyu[code]['weights'][sub]))
            status = 'partial'
        notes.extend(strip_weight_note(rec))
        rec['notes'] = notes
        rec['weightingSourceKey'] = 'POLYU_SW_2026'
        rec['weightingUrl'] = ('https://www.polyu.edu.hk/saso/docdrive/jupas/2026_%s_SW.pdf' % code)
        rec['status'] = status
        return True

    def up_eduhk(rec):
        code = rec['code']
        sc = rec['scoring']
        if code in eduhk_bad:
            notes = strip_weight_note(rec)
            notes.insert(0, EDUHK_REFUSAL[code])
            rec['notes'] = notes
            return True
        if code not in eduhk:
            return False
        d = eduhk[code]
        sc['weights'] = weight_rows(d['weights'], 1)
        sc['defaultWeight'] = 1
        sc['referenceUsable'] = True
        sc['formula']['type'] = 'best_n'
        notes = strip_weight_note(rec)
        if d['weights']:
            notes.insert(0, '科目比重按教大官方《2026 Admission Scores Reference》抄錄'
                            '（最佳五科、七分制、不計公民與社會發展；個別科目乘 x1.1／x1.2／x1.5／x1.6／x2）。')
        else:
            notes.insert(0, '教大公布此課程為「(No subject weighting)」→ 以未加權最佳五科計分，可直接比較。')
        if code in EDUHK_2027_REVISIONS:
            notes.insert(1, EDUHK_2027_REVISIONS[code])
        rec['notes'] = notes
        rec['weightingSourceKey'] = 'EDUHK_SW_2026'
        rec['weightingUrl'] = EDUHK_SW_SRC['url']
        rec['status'] = 'verified'
        return True

    if not args.write:
        print('\n(dry run - nothing written)')
        return 0
    print('\nPolyU records updated: %d' % patch(POLYU_FILE, up_polyu, 'POLYU_SW_2026', POLYU_SW_SRC))
    print('EdUHK records updated: %d' % patch(EDUHK_FILE, up_eduhk, 'EDUHK_SW_2026', EDUHK_SW_SRC))
    return 0


if __name__ == '__main__':
    sys.exit(main())
