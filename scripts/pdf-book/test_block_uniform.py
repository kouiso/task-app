from __future__ import annotations
import html,re,unittest
from pathlib import Path
from code_wrap import PRE_FONT_PT,SHRINK_MIN_PT,wrap_code_in_html,unsafe_runs
from test_code_wrap import copied_code,pre,ts_syntax_errors,ts_emit
UNIT12=(Path(__file__).parent / 'fixture' / 'unit-12.txt').read_text(encoding='utf-8')
class BlockUniformTest(unittest.TestCase):
 def render(self,source:str,lang='typescript'):
  residuals=[];out=wrap_code_in_html(f'<pre class="language-{lang}"><code>{html.escape(source)}</code></pre>',residuals);return out,residuals
 def test_exact_unit12_uses_one_uniform_79_and_parses(self):
  out,res=self.render(UNIT12)
  self.assertFalse(res);self.assertEqual(out.count('cw-block-shrink'),1);self.assertEqual(re.findall(r'font-size:(\d+)%',out),['79']);self.assertEqual(unsafe_runs(out),[])
  copied=copied_code(out);self.assertEqual(ts_syntax_errors(copied),[])
  self.assertEqual(''.join(UNIT12.split()),''.join(copied.split()))
  comments=[line for line in UNIT12.splitlines() if line.lstrip().startswith('//')]
  self.assertEqual(len(comments),12)
  for line in comments:self.assertIn(line+'\n',copied+'\n')
 def test_mixed_required_percentages_choose_smallest_once(self):
  source='const a = "'+'a'*58+'";\nconst b = "'+'b'*65+'";\nconst shortLine = 1;'
  out,res=self.render(source)
  pcts=re.findall(r'font-size:(\d+)%',out);self.assertFalse(res);self.assertEqual(len(pcts),1);self.assertEqual(pcts,['85']);self.assertIn('cw-block-shrink',out);copied=copied_code(out);self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(copied),ts_emit(source))
 def test_short_block_is_unchanged(self):
  source='const a = 1;\nconst b = 2;';out,res=self.render(source);self.assertFalse(res);self.assertNotIn('cw-block-shrink',out);self.assertEqual(copied_code(out),source)
 def test_below_8pt_remains_fail_closed(self):
  source='const secret = "'+'x'*120+'";\nconst shortLine = 1;';out,res=self.render(source);self.assertTrue(res);pct=int(re.findall(r'font-size:(\d+)%',out)[0]);self.assertLess(PRE_FONT_PT*pct/100,SHRINK_MIN_PT)
 def test_runtime_and_asi_regex_boundaries_stay_equivalent(self):
  source=('function f(v: boolean) {\n  if (v) return /a{2,3}\\/b/.test("aa/b");\n  return false;\n}\n'
          'const message = `value=${f(true)}`;')
  out,res=self.render(source);self.assertFalse(res);copied=copied_code(out);self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(copied),ts_emit(source))
if __name__=='__main__':unittest.main()
