#!/usr/bin/env bash
targets=()
if [ "$SCOPE" != "all" ]; then
  # build_pdf_book.py:473 は引数0本やと全36冊にフォールバックする。
  # `mapfile < <(sort ...)` はプロセス置換の失敗を握り潰して 0 を返すので、
  # sort を先に走らせて状態を -e に見せ、空になった時は落とす
  sort -u "$RUNNER_TEMP/books.txt" > "$RUNNER_TEMP/books.sorted"
  while IFS= read -r target; do targets+=("$target"); done < "$RUNNER_TEMP/books.sorted"
  if [ "${#targets[@]}" -eq 0 ]; then
    echo "::error::組む対象が空や。選定の結果と食い違っとる"
    exit 1
  fi
fi
# 関数を `||` の左に置くと -e が本体全体で無効になる。分岐ごとに1コマンドだけ
# 置いて、関数の戻り値がそのコマンドの結果になるようにしとく
build() {
  if [ "$SCOPE" = "all" ]; then
    make book-pdf
  else
    # Makefile の book-pdf-one は FILE 1本ずつなので、冊数分だけ
    # インタプリタ起動と作業ディレクトリの作り直しが走る。まとめて1回で呼ぶ
    python3 scripts/pdf-book/build_pdf_book.py "${targets[@]}"
  fi
}
# mermaid と vivliostyle は npx 経由で毎回レジストリを引き、リトライを持たん。
# 回線の揺れで必須チェックが赤くなるのを防ぐ
build || { echo "::warning::組版に失敗したので1回だけやり直す"; build; }
