# Phase 4: フロントエンド（book.html 改修 + cancel.html 新規）

## 概要

book.html を予約フォーム付きに改修し、cancel.html をキャンセル確認ページとして新規作成する。

## タスク

### book.html 改修

- [ ] カード1-3（Event Space, Meeting Room, Solo Booth）をクリック可能に変更
- [ ] 初期表示で `/api/availability` を呼び出し、カードに「本日空きあり / 次の空き: XX:XX」を表示
- [ ] カード選択時に予約フォームを下部に展開（スムーズスクロール）
- [ ] `<input type="date">` で日付選択 → `/api/availability` 再取得
- [ ] スロットグリッド描画（空き=白黒ブルータリスト / 埋まり=opacity-30 disabled）
- [ ] ローディング中: スケルトンアニメーション
- [ ] フォーム入力: 名前・メール・電話・目的・人数
- [ ] バリデーション（クライアント側）
- [ ] 送信 → `POST /api/book` 呼び出し
- [ ] 送信中: ボタンスピナー + 全入力 disabled
- [ ] 成功: 確認パネル（黒背景・白文字・予約詳細）
- [ ] 409: エラーメッセージ + スロット自動リフレッシュ
- [ ] その他エラー: 赤枠エラーバナー

### cancel.html 新規作成

- [ ] `cancel.html` 作成（ヘッダー・フッター・フローティング CTA は book.html と同様）
- [ ] URL ハッシュフラグメント解析: `location.hash` → `id`, `facility`, `token` 抽出
- [ ] `GET /api/booking` で予約詳細取得 → 確認 UI 描画
- [ ] キャンセルボタン → `POST /api/cancel` 呼び出し
- [ ] 完了後: 「キャンセルが完了しました」+ book.html への導線

### JS モジュール

- [ ] `src/booking.js` — 予約ページ専用ロジック
- [ ] `src/cancel.js` — キャンセルページ専用ロジック
- [ ] `src/main.js` — 条件付き動的 import 追加（ページ判定）

### CSS

- [ ] `src/style.css` — フォーム・スロットグリッド用スタイル追加

### Vite 設定

- [ ] `vite.config.js` — `cancel.html` エントリ追加（Phase 1 で `base: "/"` 変更と合わせて）

## 関連ファイル

- `book.html`（改修）
- `cancel.html`（新規）
- `src/booking.js`（新規）
- `src/cancel.js`（新規）
- `src/main.js`（改修）
- `src/style.css`（改修）
- `vite.config.js`（改修）

## 参照

- `docs/booking-system-design.md` Section 7「フロントエンド変更」
