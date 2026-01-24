.PHONY: zip-export zip-list zip-clean pdf-single pdf-all pdf-clean

# ============================================
# PDF生成
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
zip-export:
	mkdir -p dist
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
		-x "talk.md"
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
