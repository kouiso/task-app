# LP / メルマガ MVP

Issue #107 の販売チャネルMVPとして、TaskApp本体に公開LPを追加する。

## 公開URL

- アプリ内LP: `/lp`
- デプロイ後の想定URL: `https://<deployment-host>/lp`

## 外部サービス設定

| 用途 | 採用候補 | 設定値 |
| --- | --- | --- |
| 決済 | Stripe Payment Link | `NEXT_PUBLIC_LP_PURCHASE_URL` |
| メルマガ | Loops | `NEXT_PUBLIC_LP_NEWSLETTER_URL` |
| 価格 | MVP販売価格 | `¥10,000` |

`NEXT_PUBLIC_LP_PURCHASE_URL` を未設定の場合、購入ボタンはページ内の価格セクションへ遷移する。
`NEXT_PUBLIC_LP_NEWSLETTER_URL` を未設定の場合、登録フォームはページ内アンカーに送信される。

## LP掲載内容

- ヒーローコピー: `30日で動く task 管理アプリを作れる`
- TaskApp完成イメージ
- 30日分のDay別カリキュラムサマリ
- Before / After
- 価格と同梱物
- 購入ボタン
- メルマガ登録フォーム

## リリース確認

- `/lp` が未ログインでも表示できること
- Stripe Payment Linkを作成し、`NEXT_PUBLIC_LP_PURCHASE_URL` に設定すること
- LoopsフォームURLを作成し、`NEXT_PUBLIC_LP_NEWSLETTER_URL` に設定すること
- デプロイ環境でStripe checkoutのテスト購入を完了すること
- デプロイ環境でメルマガ登録の受信を確認すること
