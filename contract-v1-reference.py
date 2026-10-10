from pathlib import Path
import re,sys
mode=sys.argv[1]
root=Path('/home/kouiso/.codex/scratch/two-doc-semantic-fix-bc782896')
base=root/('baseline' if mode=='baseline' else 'candidate')
road=(base/'00-1_学びのロードマップ.md').read_text()
nxt=(base/'appendix_次のステップ.md').read_text()
blocks=re.findall(r'```bash\n(.*?)\n```',nxt,re.S)
bootstrap=next((b for b in blocks if 'create-next-app@15.5.24' in b),'')
checks={
 'roadmap says representative': '応用・復習する主な日' in road and 'すべての登場箇所を列挙した表ではありません' in road,
 'form teaching days covered': 'Day 06・10・14・16・18・20・25・29' in road,
 'mutation current lessons covered': 'Day 06・08・10・11・12・14-20・25・27-29' in road,
 'invalidate current lessons covered': 'Day 11・12・14-20・25・27-29' in road,
 'recovery shape neutral': '「つまずきポイント」の項目' in road and '「つまずきポイント」の表' not in road,
 'npm choice deterministic': '--use-npm' in bootstrap,
 'react runtime pinned': 'react@18.3.1 react-dom@18.3.1' in bootstrap,
 'react types pinned': '@types/react@18.3.29 @types/react-dom@18.3.7' in bootstrap,
 'superjson installed': 'superjson@2.2.6' in bootstrap,
 'manifest exact saves': bootstrap.count('--save-exact') >= 5,
 'version and compile checkpoints': 'npm ls next react react-dom' in bootstrap and 'npm run build' in bootstrap,
 'bootstrap bounded': '新しいアプリの土台だけ' in nxt and '認証フロー全体の動作確認ではありません' in nxt,
 'recovery command': "Cannot find module 'superjson'" in nxt and 'npm install --save-exact superjson@2.2.6' in nxt,
 'bash block bounded': bool(bootstrap) and len(bootstrap.splitlines()) <= 25,
 'chooser terms explained': all(x in nxt for x in ['i18n。表示言語','WebSocket（ブラウザとサーバー','WAI-ARIAで部品の役割','Zustand・Jotaiは','URLごとに対象を分けるREST','OWASP Top 10で','CSRFは本人の意図しない送信','Git Flowは開発用','GitHub Flowは短い作業']),
}
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL')+': '+name)
print(sum(checks.values()),'/',len(checks))
raise SystemExit(0 if all(checks.values()) else 1)
