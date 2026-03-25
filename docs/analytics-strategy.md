# crossport.cc アクセス分析方針

## 1. 方針

- Google Analytics 等の外部ツールは使わず、**Vercel Analytics + Search Console** で軽量に運用する
- 予約コンバージョンは API の構造化ログで把握する（追加ライブラリ不要）
- プライバシー重視: Cookie 不使用（Vercel Analytics はプライバシーフレンドリー）

## 2. 現在の実装状況

| コンポーネント | バージョン / 状態 | 対象ファイル |
|---|---|---|
| `@vercel/analytics` | v2.0.1 | `src/main.js` で `inject()` 呼び出し |
| 予約成功ログ | 構造化 JSON | `api/book.js` で `booking_success` イベント出力 |
| Google Search Console | 設定済み | `crossport.cc` / `crossport.site` / `xmo.jp` の 3 プロパティ |
| Vercel Speed Insights | 未導入 | 今後の検討事項 |

### 2.1 Vercel Analytics

`src/main.js` の先頭で全ページ共通に読み込み:

```js
import { inject } from "@vercel/analytics";
inject();
```

index.html / book.html のページビュー・リファラーが自動計測される。Vercel ダッシュボードで有効化済み（2026-03-15）。

### 2.2 予約コンバージョンログ

`api/book.js` で予約成功時に構造化ログを出力:

```js
console.log(JSON.stringify({
  event: "booking_success",
  facility: booking.facility,
  date: booking.date,
  timestamp: new Date().toISOString(),
}));
```

Vercel Functions の Runtime Logs で `booking_success` でフィルタ可能。

### 2.3 Search Console

| プロパティ | 用途 |
|---|---|
| `crossport.cc` | 本番サイトの検索パフォーマンス監視 |
| `crossport.site` | 旧ドメインからの Change of Address 実行済み |
| `xmo.jp` | 旧ドメインからの Change of Address 実行済み |

## 3. 計測対象と確認方法

| 目的 | ツール | 確認場所 |
|---|---|---|
| PV・リファラー | Vercel Analytics | Vercel ダッシュボード > Analytics タブ |
| 検索クエリ・CTR | Search Console | パフォーマンスレポート |
| 予約コンバージョン | Vercel Functions ログ | Vercel ダッシュボード > Functions > Runtime Logs |
| サイトパフォーマンス | Vercel Speed Insights | （未導入・検討中） |
| インデックス状況 | Search Console | カバレッジレポート / URL 検査 |

## 4. 今後の検討事項

- **`@vercel/speed-insights` の導入**: Core Web Vitals の計測。導入は `npm install @vercel/speed-insights` + `inject()` のみ
- **カスタムイベントの追加**: 施設カードクリック、CTA ボタンクリック等を `track()` で送信
- **月次レビュー運用**: PV 推移・検索流入・予約数の定期確認フローの策定
- **Resend Webhook**: メール送信のバウンス・開封率を Resend ダッシュボードで監視
