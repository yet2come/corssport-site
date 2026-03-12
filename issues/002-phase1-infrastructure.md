# Phase 1: 基盤構築（Google Cloud + Vercel 移行）

## 概要

Google Calendar API と Vercel Serverless Functions の基盤を構築し、GitHub Pages から Vercel へ移行する。

## タスク

### Google Cloud

- [ ] GCP プロジェクト作成
- [ ] Calendar API を有効化
- [ ] サービスアカウント作成、JSON キーをダウンロード
- [ ] カレンダー3つ作成（`CROSSPORT - Event Space` / `Meeting Room` / `Solo Booth`）
- [ ] 各カレンダーの共有設定でサービスアカウントに「変更権限」を付与

### Vercel

- [ ] Vercel にリポジトリ接続（Vite 自動検出）
- [ ] `vercel.json` 作成（API ヘッダー設定）
- [ ] `vite.config.js` 更新: `base: "/"` + `cancel.html` エントリ追加
- [ ] 環境変数設定:
  - `GOOGLE_SERVICE_ACCOUNT_KEY`
  - `GCAL_ID_EVENT_SPACE`
  - `GCAL_ID_MEETING_ROOM`
  - `GCAL_ID_SOLO_BOOTH`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `CANCEL_SECRET`
  - `SITE_URL`

### 依存関係

- [ ] `npm install google-auth-library resend`

### GitHub Pages 無効化

- [ ] `.github/workflows/deploy.yml` を削除または `workflow_dispatch` のみに変更

## 関連ファイル

- `vite.config.js`
- `vercel.json`（新規作成）
- `.github/workflows/deploy.yml`
- `package.json`

## 参照

- `docs/booking-system-design.md` Section 9「Vercel 移行手順」
