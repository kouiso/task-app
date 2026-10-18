#!/usr/bin/env python3
"""Gate C 補助: 描画時に .notdef(tofu) になった文字を検出。
PyMuPDF get_texttrace で各文字の描画CIDを見て、CID==0(.notdef)を列挙。"""
import fitz, glob, os, json, sys

PDF_DIR = '/Users/devin/taskapp/source40/dist/pdf'
OUT = '/Users/devin/taskapp/glyph-notdef-audit.json'

def main():
    allrep = {}
    for pdf in sorted(glob.glob(os.path.join(PDF_DIR,'*.pdf'))):
        book = os.path.basename(pdf)
        doc = fitz.open(pdf)
        missing = {}  # codepoint -> {'pages':set,'fonts':set,'examples':[...]}
        err = []
        for pno in range(doc.page_count):
            try:
                tt = doc[pno].get_texttrace()
            except Exception as e:
                err.append((pno+1, str(e)[:80]))
                continue
            for span in tt:
                fn = span.get('font','?')
                for cent in span.get('chars', []):
                    cid, uni = cent[0], cent[1]
                    if cid == 0:  # .notdef rendered
                        if uni < 0 or uni == 0xffff:
                            ch = '?'
                            key = (0xffff, fn)
                        else:
                            ch = chr(uni)
                            key = (uni, fn)
                        m = missing.setdefault(key, {'pages':set(),'examples':[]})
                        m['pages'].add(pno+1)
                        if len(m['examples'])<10:
                            m['examples'].append((pno+1,ch))
        rep=[]
        for (cp,fn),m in sorted(missing.items()):
            rep.append({
                'codepoint': 'U+%04X'%cp,
                'char': chr(cp) if cp!=0xffff else '(non-unicode)',
                'font': fn,
                'pages': sorted(m['pages']),
                'examples': m['examples'],
            })
        allrep[book]={'pages':doc.page_count,'notdef':rep,'errors':err}
        doc.close()
        print(f"{book}: notdef_chars={sum(len(r['pages']) for r in rep)} unique={len(rep)}", file=sys.stderr)
    with open(OUT,'w') as f:
        json.dump(allrep,f,ensure_ascii=False,indent=1)
    print('\n=== notdefサマリ(描画時欠落のみ) ===')
    grand=0
    for book,r in allrep.items():
        for m in r['notdef']:
            grand+=len(m['pages'])
            print(f"{book} {m['codepoint']} '{m['char']}' font={m['font']} pages={m['pages'][:20]}{'...' if len(m['pages'])>20 else ''}")
    print(f"total_pages_with_notdef_char_entries={grand}")

main()
