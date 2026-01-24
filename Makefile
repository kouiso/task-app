.PHONY: zip-export zip-list zip-clean pdf-single pdf-all pdf-clean

# ============================================
# PDF生成
# ============================================

# 単一MarkdownをPDF化（使用例: make pdf-single FILE=material/30days-curriculum/day01_開発環境を整える.md）
pdf-single:
	@if [ -z "$(FILE)" ]; then \
		echo "使用例: make pdf-single FILE=material/30days-curriculum/day01_開発環境を整える.md"; \
		exit 1; \
	fi
	@mkdir -p material/pdf
	@BASENAME=$$(basename "$(FILE)" .md); \
	echo "📄 変換中: $(FILE)"; \
	npx md-mermaid-to-pdf "$(FILE)" "material/pdf/$$BASENAME.pdf" \
		--stylesheet material/styles/tutorial.css; \
	echo "✅ 完了: material/pdf/$$BASENAME.pdf"

# 全DayをPDF化
pdf-all:
	@mkdir -p material/pdf
	@for file in material/30days-curriculum/day*.md; do \
		if [ -f "$$file" ]; then \
			echo "📄 変換中: $$file"; \
			npx md-mermaid-to-pdf "$$file" "material/pdf/$$(basename $$file .md).pdf" \
				--stylesheet material/styles/tutorial.css; \
		fi; \
	done
	@echo "✅ 全PDF生成完了: material/pdf/"
	@ls -lh material/pdf/

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
