import unittest
import verify_pdf_copy as target

class FailureLocation(unittest.TestCase):
    def test_later_weak_prefix_does_not_hide_unsafe_break(self):
        block=target.CodeBlock('tsx', ('<p className="status">読み込み中...</p>',),1,'```')
        text='<p className="status">読\nみ込み中...</p>\n<p wrong="x">other</p>\n'
        result,count=target.find_block(block,text,0)
        self.assertFalse(result.ok)
        self.assertEqual(result.kind,'unsafe-break')
        self.assertEqual(count,1)
    def test_later_complete_candidate_still_passes(self):
        block=target.CodeBlock('tsx', ('<p className="status">読み込み中...</p>',),1,'```')
        text='<p wrong="x">other</p>\n'+block.lines[0]+'\n'
        result,count=target.find_block(block,text,0)
        self.assertTrue(result.ok)
        self.assertEqual(count,1)
    def test_missing_prefix_remains_rejected(self):
        block=target.CodeBlock('bash', ('npm audit --omit=dev',),1,'```')
        result,count=target.find_block(block,'nothing\n',0)
        self.assertFalse(result.ok)
        self.assertEqual(result.kind,'missing')
    def test_margin_contamination_remains_rejected(self):
        block=target.CodeBlock('bash',('npm ls next','npm audit --omit=dev'),1,'```')
        result,count=target.find_block(block,'npm ls next\nPage title7\nnpm audit --omit=dev\n',0)
        self.assertFalse(result.ok)

if __name__=='__main__': unittest.main()
