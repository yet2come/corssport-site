# Phase 5a: デプロイ準備

## 概要

Vercel へ安全にデプロイする前提を整える。
本番前に必要な設定ファイル、環境変数テンプレート、不要な旧デプロイ経路の停止をまとめる。

## 今回追加した内容

- `.env.example` を追加
  - 必要な環境変数を一通り記載
  - `GOOGLE_SERVICE_ACCOUNT_KEY` は JSON 文字列の形で記載
- `scripts/check-deploy-env.mjs` を追加
  - 本番投入前に必須環境変数とプレースホルダ値を検査
  - `npm run deploy:check` で実行可能
- `.gitignore` を更新
  - `tmp/`, `test-results/`, `playwright-report/`, `.env*` を除外
- `.github/workflows/deploy.yml` を更新
  - GitHub Pages の自動デプロイを止め、`workflow_dispatch` のみへ変更

## 本番前チェックリスト

- [ ] Vercel プロジェクトを GitHub リポジトリへ接続
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` を Vercel に登録
- [ ] 3 施設分の Google Calendar ID を Vercel に登録
- [ ] `RESEND_API_KEY` を登録
- [ ] `RESEND_FROM_EMAIL` を検証済み送信元へ合わせる
- [ ] `CANCEL_SECRET` を十分長いランダム値へ差し替える
- [ ] `SITE_URL` を Preview / Production で正しい URL に設定する
- [ ] Google Calendar 側でサービスアカウントへ編集権限を付与
- [ ] Preview 環境で予約からキャンセルまで通し確認
- [ ] 競合時 409、無効トークン 403、メール送信失敗時ロールバックを確認
- [ ] `npm run deploy:check` が通ることを確認

## 補足

- 現在の Playwright テストは API モック前提で、見た目と画面遷移の確認用
- 本番接続確認には Preview 環境での手動 E2E がまだ必要
