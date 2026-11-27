import re,sys,glob
md=open(glob.glob(sys.argv[1]+'/material/30days-curriculum/day08_*.md')[0],encoding='utf-8').read().split('\n')
s=next(i for i,l in enumerate(md) if l.startswith('### `src/component/layout/app-layout.tsx`'))
e=next(i for i,l in enumerate(md) if i>s and l.startswith('### '))
out=[];inf=False
for l in md[s:e]:
    if l.startswith('```'): inf=not inf; continue
    if inf: out.append(l)
open(sys.argv[2],'w').write('\n'.join(out)+'\n')
