from __future__ import annotations
import html,unittest,json,subprocess
from code_wrap import wrap_code_in_html,unsafe_runs
from inline_layout import annotate_inline_code,validate_annotated_html,InlineLayoutMarkupError
from test_code_wrap import copied_code,ts_syntax_errors,ts_emit

def tsx_runtime_value(source):
 script = """
const ts = require('typescript'), vm = require('node:vm');
const out = ts.transpileModule(process.argv[1], {
 reportDiagnostics: true,
 compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
});
if ((out.diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error)) throw Error('syntax diagnostics');
const jsx = (type, props) => ({type, props});
const context = {exports: {}, require: name => {
 if(name !== 'react/jsx-runtime') throw Error('unexpected require: '+name);
 return {jsx, jsxs: jsx};
}};
vm.createContext(context);
vm.runInContext(out.outputText + ';globalThis.actualValue=el.props.value;', context, {timeout:1000});
process.stdout.write(JSON.stringify(context.actualValue));
"""
 result=subprocess.run(['node','-e',script,source],text=True,capture_output=True,check=True)
 return json.loads(result.stdout)

class RegexQuoteGuardTest(unittest.TestCase):
 def render(self,source):
  residuals=[]
  result=wrap_code_in_html('<pre class="language-typescript"><code>'+html.escape(source)+'</code></pre>',residuals)
  return result,residuals
 def test_regex_quotes_cannot_invert_following_string_state(self):
  for regex in ['/"/g',"/'/g",'/`/g',"/[\"']/g",'/\\"/g']:
   with self.subTest(regex=regex):
    source='const quoteRe = '+regex+';\nconst message = "alpha beta gamma delta epsilon zeta eta theta iota kappa";\n'
    self.assertEqual(ts_syntax_errors(source),[])
    result,residuals=self.render(source);copied=copied_code(result)
    self.assertFalse(residuals);self.assertNotIn('cw-force',result);self.assertEqual(ts_syntax_errors(copied),[])
    self.assertEqual(ts_emit(source),ts_emit(copied));self.assertEqual(source,copied);self.assertEqual(unsafe_runs(result),[])
 def test_closing_literal_delimiters_cannot_introduce_line_break(self):
  for quote in ['"', "'", '`']:
   with self.subTest(quote=quote):
    source=quote+'123456789012345678901234567890123456789012345678901234567890 '+quote+';'
    result,res=self.render(source);copied=copied_code(result)
    self.assertFalse(res);self.assertEqual(copied,source);self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(copied),ts_emit(source))
 def test_ambiguous_regex_after_return_is_conservative(self):
  source='function f() { return /"/g; }\nconst message = "alpha beta gamma delta epsilon zeta eta theta iota kappa";\n'
  result,res=self.render(source);self.assertFalse(res);self.assertEqual(ts_syntax_errors(copied_code(result)),[]);self.assertEqual(ts_emit(source),ts_emit(copied_code(result)))
 def test_below_floor_after_quote_ambiguity_is_not_silent_success(self):
  source='const quoteRe = /"/g;\nconst message = "'+'x'*120+'";\n'
  result,res=self.render(source);self.assertTrue(res);self.assertNotIn('cw-force',result)
 def test_scaled_width_guard_accepts_boundary_and_rejects_overflow(self):
  def block(text,pct):return f'<pre><code><span class="cw-shrink cw-block-shrink" style="font-size:{pct}%">{text}</span></code></pre>'
  self.assertEqual(unsafe_runs(block('x'*80,70)),[]);self.assertTrue(unsafe_runs(block('x'*80,80)))
  self.assertEqual(unsafe_runs(block('あ'*40,70)),[]);self.assertTrue(unsafe_runs(block('あ'*40,80)))
  self.assertTrue(unsafe_runs(block('x',0)));self.assertTrue(unsafe_runs(block('x',101)))
 def test_noncanonical_uniform_wrapper_fails_independent_guard(self):
  for opening in ['<span class="cw-shrink cw-block-shrink" style="font-size: 80%">',
                  '<span class="cw-block-shrink cw-shrink" style="font-size:80%">',
                  '<span class="cw-shrink cw-block-shrink extra" style="font-size:80%">']:
   with self.subTest(opening=opening):
    self.assertTrue(unsafe_runs('<pre><code>'+opening+'x'*80+'</span></code></pre>'))
 def test_duplicate_uniform_wrapper_fails_independent_guard(self):
  x='<span class="cw-shrink cw-block-shrink" style="font-size:80%">x</span>'
  self.assertTrue(unsafe_runs('<pre><code>'+x+x+'</code></pre>'))
  noncanonical='<span class="cw-block-shrink cw-shrink" style="font-size:80%">x</span>'
  self.assertTrue(unsafe_runs('<pre><code>'+x+noncanonical+'</code></pre>'))
 def test_spaced_closing_span_cannot_bypass_uniformization(self):
  source='const message = "'+'x'*65+'";'
  markup='<pre class="language-typescript"><code><span class="token string">'+html.escape(source)+'</span ></code></pre>'
  res=[];wrap_code_in_html(markup,res);self.assertEqual(len(res),1)
 def test_regex_comment_markers_cannot_invert_following_string(self):
  for regex in [r'/\/*$/', r'/[/*]/']:
   source='const trimmed = path.replace('+regex+', "");\nconst message = "alpha beta gamma delta epsilon zeta eta theta iota kappa";\n'
   result,res=self.render(source);copied=copied_code(result)
   self.assertEqual(ts_syntax_errors(source),[]);self.assertNotIn('cw-force',result)
   self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(source),ts_emit(copied));self.assertEqual(source,copied)
 def test_regex_brace_cannot_change_template_value(self):
  source='const raw = "{";\n'+r'const label = `${raw.replace(/\{/g, "(")} alpha beta gamma delta epsilon zeta eta theta`;'+'\nconsole.log(JSON.stringify(label));\n'
  result,res=self.render(source);copied=copied_code(result)
  self.assertEqual(ts_syntax_errors(source),[]);self.assertNotIn('cw-force',result)
  self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(source),ts_emit(copied));self.assertEqual(source,copied)
  self.assertTrue(res);self.assertTrue(unsafe_runs(result))
 def test_independent_guard_rejects_below_floor_nested_and_orphan_shrink(self):
  def block(body):return '<pre><code>'+body+'</code></pre>'
  self.assertTrue(unsafe_runs(block('<span class="cw-shrink cw-block-shrink" style="font-size:40%">x</span>')))
  self.assertTrue(unsafe_runs(block('<span class="cw-shrink cw-block-shrink" style="font-size:80%"><span class="cw-shrink" style="font-size:80%">x</span></span>')))
  self.assertTrue(unsafe_runs(block('<span class="cw-shrink" style="font-size:80%">x</span>')))
 def test_regex_less_cannot_make_plain_classname_string_tolerant(self):
  source='const lt = /</g;\nconst className = "alpha beta gamma delta epsilon zeta eta theta iota kappa";\n'
  result,res=self.render(source);copied=copied_code(result)
  self.assertFalse(res);self.assertNotIn('cw-force',result);self.assertEqual(copied,source)
  self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(copied),ts_emit(source))
 def test_js_literal_line_continuation_does_not_escape_next_quote(self):
  source="const a = 'abc\\\n';\nconst b = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';\n"
  result,res=self.render(source);copied=copied_code(result)
  self.assertFalse(res);self.assertEqual(ts_syntax_errors(source),[]);self.assertEqual(ts_syntax_errors(copied),[])
  self.assertEqual(ts_emit(copied),ts_emit(source));self.assertIn("'alpha beta gamma delta epsilon zeta eta theta iota kappa'",copied)
 def test_template_interpolation_requires_adjacent_dollar_and_brace(self):
  for body in ['cost $ {alpha beta gamma delta epsilon zeta eta theta iota kappa lambda}', 'cost $\n{alpha beta gamma delta epsilon zeta eta theta iota kappa lambda}']:
   with self.subTest(body=body):
    source='const note = '+chr(96)+body+chr(96)+';\n';result,res=self.render(source);copied=copied_code(result)
    self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(copied),ts_emit(source))
    self.assertIn(chr(96)+body+chr(96),copied)
    if res:self.assertTrue(unsafe_runs(result))
 def test_jsx_attribute_backslash_is_raw_and_expression_string_is_not_raw(self):
  sources=['const el = <input placeholder="C:'+chr(92)+'" />;\nconst message = "alpha beta gamma delta epsilon zeta eta theta iota kappa";\n',
           'const el = <input value={"C:'+chr(92)*2+'"} />;\n']
  for source in sources:
   with self.subTest(source=source):
    res=[];result=wrap_code_in_html('<pre class="language-tsx"><code>'+html.escape(source)+'</code></pre>',res);copied=copied_code(result)
    self.assertEqual(ts_syntax_errors(source),[]);self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(copied),ts_emit(source))
    if res:self.assertTrue(unsafe_runs(result))
 def test_jsx_expression_named_classname_is_not_tolerant_attribute(self):
  source='const el = <input value={(() => { const className = "alpha beta gamma delta epsilon zeta eta theta iota kappa"; return className; })()} />;\n'
  res=[];result=wrap_code_in_html('<pre class="language-tsx"><code>'+html.escape(source)+'</code></pre>',res);copied=copied_code(result)
  self.assertEqual(ts_syntax_errors(source),[]);self.assertEqual(ts_syntax_errors(copied),[])
  self.assertEqual(tsx_runtime_value(copied),tsx_runtime_value(source))
  self.assertEqual(tsx_runtime_value(copied),'alpha beta gamma delta epsilon zeta eta theta iota kappa')
  self.assertIn('"alpha beta gamma delta epsilon zeta eta theta iota kappa"',copied)
  if res:self.assertTrue(unsafe_runs(result))

 def test_comparison_after_increment_assertion_or_comment_is_not_jsx(self):
  tail='\nconst message = "say '+chr(92)+chr(34)+'alpha beta gamma delta epsilon zeta eta theta iota'+chr(92)+chr(34)+' ok";\n'
  for prefix in ['while (attempt++ < limit) {}','while (attempt++<limit) {}','if (x! < y) {}','if (x!<y) {}','if (x/* comment */<y) {}']:
   with self.subTest(prefix=prefix):
    source=prefix+tail;result,res=self.render(source);copied=copied_code(result)
    self.assertEqual(ts_syntax_errors(source),[]);self.assertEqual(ts_syntax_errors(copied),[])
    self.assertEqual(ts_emit(copied),ts_emit(source));self.assertIn(tail.split("const message = ",1)[1].rstrip(),copied)
    if res:self.assertTrue(unsafe_runs(result))


 def test_comment_context_cannot_hide_jsx_and_invert_following_string(self):
  for comment in ['// see docs','// https://nextjs.org/docs/','/* note */']:
   with self.subTest(comment=comment):
    source="const el = (\n  "+comment+"\n  <p>Don't stop</p>\n);\nconst label = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';\n"
    res=[];result=wrap_code_in_html('<pre class="language-tsx"><code>'+html.escape(source)+'</code></pre>',res);copied=copied_code(result)
    self.assertEqual(ts_syntax_errors(source),[]);self.assertEqual(ts_syntax_errors(copied),[]);self.assertEqual(ts_emit(source),ts_emit(copied))
    self.assertIn("'alpha beta gamma delta epsilon zeta eta theta iota kappa'",copied)
    if res:self.assertTrue(unsafe_runs(result))

if __name__=='__main__':unittest.main()
