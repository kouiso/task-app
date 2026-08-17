.PHONY: zip-export zip-list zip-clean pdf-single pdf-all pdf-clean book-pdf book-pdf-one book-pdf-test book-pdf-verify book-pdf-clean

# ============================================
# 商品PDF生成（Vivliostyle・1日1冊の分冊）
# ============================================

# 全36本を組む（day 30本 + 目次・ロードマップ・付録4本）
book-pdf:
	@python3 scripts/pdf-book/build_pdf_book.py

# 1本だけ組む
# 使用例: make book-pdf-one FILE="material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md"
book-pdf-one:
ifndef FILE
	$(error FILE を指定してください。例: make book-pdf-one FILE="material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md")
endif
	@python3 scripts/pdf-book/build_pdf_book.py "$(FILE)"

# 検査の判定境界を固定する退行テスト（PDF も poppler も要らない）
book-pdf-test:
	@python3 scripts/pdf-book/test_check_pdf_book.py

# 出力が商品として出せる状態かを見る（空白ページ・書体・目次・コード欠け）
book-pdf-verify: book-pdf-test
	@python3 scripts/pdf-book/check_pdf_book.py

book-pdf-clean:
	rm -rf dist/pdf/ dist/.pdf-book-build/
	@echo "✅ 商品PDF削除完了"

# ============================================
# PDF生成（旧経路・当面併存）
# ============================================

# 単一MarkdownをPDF化
# 使用例: make pdf-single FILE=material/30days-curriculum/day01_開発環境を整える.md
# PDF自動で開く: make pdf-single FILE=... OPEN=1
pdf-single:
	@bash scripts/generate_pdf.sh single "$(FILE)" "$(OPEN)"

# 全DayをPDF化（OPEN=1で最後のファイルを開く）
pdf-all:
	@bash scripts/generate_pdf.sh all "$(OPEN)"

# PDF削除
pdf-clean:
	rm -rf material/pdf/
	@echo "✅ PDF削除完了"

# ============================================
# ZIP配布
# ============================================

# プレゼント配布用ZIP作成
# src/server/api/routers/project.ts は Day 09〜12 で受講生が自分で書く対象のため配布しない。
# 完成品の root.ts(project登録済み)をそのまま含めるとビルドが壊れるので、
# zip作成の間だけ Day 08 終了時点の root.ts(auth のみ)に差し替え、完了後に元へ戻す。
zip-export:
	mkdir -p dist
	rm -f dist/task-app.zip
	@if [ -f scripts/_server-base/root.ts ]; then \
		cp src/server/api/root.ts /tmp/task-app-root-ts-backup.ts; \
		cp scripts/_server-base/root.ts src/server/api/root.ts; \
	fi
	zip -r dist/task-app.zip . \
		-x@.gitignore \
		-x "node_modules/*" \
		-x ".git/*" \
		-x ".github/*" \
		-x ".claude/*" \
		-x "CLAUDE.md" \
		-x ".gemini/*" \
		-x ".devcontainer/*" \
		-x ".docker/schemaspy/*" \
		-x ".husky/*" \
		-x ".huskyrc" \
		-x ".vscode/*" \
		-x ".next/*" \
		-x "dist/*" \
		-x "e2e/*" \
		-x "playwright.config.ts" \
		-x "lint-staged.config.js" \
		-x "material/*" \
		-x "prompt/*" \
		-x "playwright-report/*" \
		-x "test-results/*" \
		-x "Makefile" \
		-x "renovate.json" \
		-x "edu-creator/*" \
		-x "edu-config.yaml" \
		-x "talk.md" \
		-x "src/server/api/routers/project.ts" \
		-x "scripts/_server-routers/project.ts" \
		|| { [ -f /tmp/task-app-root-ts-backup.ts ] && mv /tmp/task-app-root-ts-backup.ts src/server/api/root.ts; exit 1; }
	@if [ -f /tmp/task-app-root-ts-backup.ts ]; then \
		mv /tmp/task-app-root-ts-backup.ts src/server/api/root.ts; \
	fi
	zip -u dist/task-app.zip .env.example
	@echo ""
	@echo "============================================"
	@echo "dist/task-app.zip を作成しました"
	@echo "============================================"

# ZIP内容の確認
zip-list:
	@if [ -f dist/task-app.zip ]; then \
		unzip -l dist/task-app.zip; \
	else \
		echo "dist/task-app.zip が見つかりません"; \
		echo "make zip-export を実行してください"; \
	fi

# ZIP削除
zip-clean:
	rm -f dist/task-app.zip
	@echo "dist/task-app.zip を削除しました"
