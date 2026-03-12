# Phase 2: 空き確認 API（/api/availability）

## 概要

Google Calendar の freeBusy API を使って施設の空き状況を1時間スロットで返す REST エンドポイントを実装する。

## タスク

### 共通モジュール

- [ ] `api/_lib/google-calendar.js` — REST API クライアント（`calendarFetch` + `CalendarApiError`）
- [ ] `api/_lib/facilities-config.js` — 3施設の設定（名称、カレンダーID 環境変数マッピング、最大人数、営業時間）
- [ ] `api/_lib/validate.js` — 入力バリデーション（facility 許可リスト、date 範囲チェック等）

### エンドポイント

- [ ] `api/availability.js` — `GET /api/availability?facility=xxx&date=YYYY-MM-DD`
- [ ] `facility` パラメータを許可リストで検証
- [ ] `date` を `Asia/Tokyo` で `timeMin` / `timeMax` に変換
- [ ] `POST freeBusy` API 呼び出し
- [ ] 09:00-18:00 を1時間スロットに分割し、busy 区間と照合
- [ ] レート制限: 60 req/min/IP

### テスト

- [ ] 正常系: 空きスロット取得
- [ ] 異常系: 不正な facility / date で 400
- [ ] 異常系: Calendar API エラーで 500（詳細非公開）

## 関連ファイル

- `api/availability.js`（新規）
- `api/_lib/google-calendar.js`（新規）
- `api/_lib/facilities-config.js`（新規）
- `api/_lib/validate.js`（新規）

## 参照

- `docs/booking-system-design.md` Section 5「`GET /api/availability`」
- `docs/booking-system-design.md` Section 6「`api/_lib/google-calendar.js` 実装方針」
