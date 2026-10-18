#!/usr/bin/env bash
if [ "$SCOPE" = "all" ]; then
  make book-pdf-verify
else
  make book-pdf-test
  python3 scripts/pdf-book/check_pdf_book.py --allow-gaps
  python3 scripts/pdf-book/check_page_layout.py
  python3 scripts/pdf-book/verify_pdf_copy.py --allow-missing
fi
