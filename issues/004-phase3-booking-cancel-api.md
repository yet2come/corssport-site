# Phase 3: 予約・キャンセル API（/api/book + /api/booking + /api/cancel）

## 概要

予約作成、予約詳細取得、キャンセルの3エンドポイントを実装する。決定的 eventId による競合制御、HMAC キャンセルトークン、Resend メール送信を含む。

## タスク

### POST /api/book（予約作成）

- [ ] `api/book.js` 実装
- [ ] 全フィールドのサーバー側バリデーション（validate.js 使用）
- [ ] freebusy による早期リジェクト（ファストパス）
- [ ] 決定的 eventId 生成: `SHA-256(booking:{facility}:{date}:{startTime}-{endTime})` 短縮値
- [ ] `events.insert` に `eventId` 指定 + `extendedProperties.private` 同梱
- [ ] Google Calendar 409 Conflict → ユーザー向け 409 返却
- [ ] HMAC-SHA256 キャンセルトークン生成
- [ ] Resend で確認メール送信
- [ ] メール送信失敗 → イベント削除（補償トランザクション）
- [ ] レート制限: 5 req/min/IP

### GET /api/booking（予約詳細取得）

- [ ] `api/booking.js` 実装
- [ ] `events.get` でイベント取得
- [ ] `facilityId` 確認 + `cancelToken` を `crypto.timingSafeEqual()` で検証
- [ ] 最小情報のみ返却（id, facility, facilityName, date, startTime, endTime, name）
- [ ] レート制限: 30 req/min/IP

### POST /api/cancel（キャンセル）

- [ ] `api/cancel.js` 実装
- [ ] `events.get` → `cancelToken` timing-safe 比較 → `events.delete`
- [ ] レート制限: 10 req/min/IP

### メールテンプレート

- [ ] `api/_lib/email-templates.js` — 確認メール HTML テンプレート
- [ ] キャンセルリンク URL: `{SITE_URL}/cancel.html#id={eventId}&facility={facility}&token={token}`

### テスト

- [ ] 正常系: 予約作成 → メール送信 → 詳細取得 → キャンセル
- [ ] 競合系: 同一スロット同時予約で 409
- [ ] 異常系: トークン不一致で 403
- [ ] 異常系: 存在しない予約で 404

## 関連ファイル

- `api/book.js`（新規）
- `api/booking.js`（新規）
- `api/cancel.js`（新規）
- `api/_lib/email-templates.js`（新規）
- `api/_lib/validate.js`
- `api/_lib/google-calendar.js`
- `api/_lib/facilities-config.js`

## 参照

- `docs/booking-system-design.md` Section 5「`POST /api/book`」「`GET /api/booking`」「`POST /api/cancel`」
- `docs/booking-system-design.md` Section 6「`api/book.js` 実装上の注意」
- `docs/booking-system-design.md` Section 8「セキュリティ」
- `docs/booking-system-design.md` Section 11「確認メールテンプレート」
