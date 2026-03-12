# 施設予約システム 開発経緯と現状

## 目的

CROSSPORT MSZ サイトに対して、Google Calendar と連動した施設予約機能を追加する。
対象は以下の 3 施設。

- Event Space
- Meeting Room
- Solo Booth

以下の 2 施設は従来どおり電話・メール導線を維持する。

- Rent-a-car
- Consultation

## これまでの経緯

### 1. 設計方針の整理

`docs/booking-system-design.md` を作成し、以下の前提で設計した。

- Vercel 上で静的フロントエンド + Serverless Functions を動かす
- Google Calendar を唯一のデータソースとし、外部 DB は持たない
- サービスアカウント + Calendar REST API を利用する
- 予約確認メールは Resend で送信する
- キャンセルはメール内リンクから行う

### 2. 設計レビューで出た主な論点

初期設計のままでは、以下の問題があった。

- 予約競合時に双方が削除される対称レースが起こり得る
- `cancel.html` 表示に必要な予約詳細取得 API が欠けていた
- イベント作成後に `patch` でトークン保存するため、中途半端な予約が残り得る
- キャンセルトークンを query string に載せる設計は漏えい面で弱い

### 3. 設計ドキュメントの改善

レビューを受けて、設計文書を以下の方針に更新した。

- 最終排他は Google Calendar の `eventId` 一意制約で担保する
- `GET /api/booking` を追加し、キャンセル画面表示前に予約詳細を取得する
- `extendedProperties.private` は `events.insert` 時点で保存する
- キャンセルリンクは `cancel.html#...` 形式にして URL フラグメントで受け渡す
- `calendarFetch` は `CalendarApiError` を投げ、`409` を安全に分岐できるようにする

### 4. 実装開始

設計更新後、以下を実装した。

- API 共通ライブラリ
- 予約・空き確認・予約詳細取得・キャンセル API
- `book.html` の予約 UI
- `cancel.html` の新規作成
- Vite / Vercel 設定の更新
- `google-auth-library` / `resend` の依存追加

## 現在の実装状態

### 追加済みファイル

- `api/_lib/facilities-config.js`
- `api/_lib/security.js`
- `api/_lib/http.js`
- `api/_lib/rate-limit.js`
- `api/_lib/google-calendar.js`
- `api/_lib/validate.js`
- `api/_lib/email-templates.js`
- `api/_lib/calendar-slots.js`
- `api/availability.js`
- `api/booking.js`
- `api/book.js`
- `api/cancel.js`
- `cancel.html`
- `src/booking.js`
- `src/cancel.js`
- `vercel.json`

### 更新済みファイル

- `book.html`
- `src/main.js`
- `src/style.css`
- `vite.config.js`
- `package.json`
- `package-lock.json`
- `docs/booking-system-design.md`

### 実装済みの主要機能

#### フロントエンド

- `book.html` 上で 3 施設をクリックすると予約パネルを展開
- 当日空き状況をカード上に表示
- 日付選択後に `/api/availability` を呼び出してスロットを表示
- スロット選択後に予約フォームを送信
- 成功時は確認パネルへ切り替え
- `cancel.html` では URL フラグメントからトークンを取得し、予約詳細を表示してキャンセル実行

#### バックエンド

- `GET /api/availability`
  - Google Calendar `freeBusy` を叩いて 1 時間スロットへ変換
- `POST /api/book`
  - 入力バリデーション
  - `freeBusy` による事前確認
  - 決定的 `eventId` による競合制御
  - Google Calendar イベント作成
  - Resend で確認メール送信
  - メール送信失敗時の予約ロールバック
- `GET /api/booking`
  - キャンセル画面用の予約詳細取得
  - `crypto.timingSafeEqual()` によるトークン比較
- `POST /api/cancel`
  - トークン検証後に Google Calendar イベント削除

#### セキュリティ / 運用

- `CANCEL_SECRET` による HMAC トークン
- `calendarFetch` の `CalendarApiError` 化
- API ごとの簡易レート制限
- API レスポンスの JSON 化とエラーハンドリング整理

## ローカル確認結果

以下は実施済み。

- `npm install`
- `npm run build`
- `node -e "require('./api/availability'); require('./api/booking'); require('./api/book'); require('./api/cancel'); console.log('api-ok')"`

確認結果:

- フロントの production build は成功
- API ハンドラは依存解決込みでロード成功

## まだ未確認の点

実装は入っているが、以下はまだ外部サービス接続を通した実機確認をしていない。

- Google Calendar サービスアカウント認証
- カレンダー ID 設定の正当性
- Resend 送信元アドレスの検証
- 実際の予約作成
- 実際の確認メール受信
- メール内キャンセルリンク経由のキャンセル

## 必要な環境変数

- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `GCAL_ID_EVENT_SPACE`
- `GCAL_ID_MEETING_ROOM`
- `GCAL_ID_SOLO_BOOTH`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CANCEL_SECRET`
- `SITE_URL`

## 現時点の注意事項

### 1. eventId の粒度

現在の `eventId` は `facility + date + startTime + endTime` から決定的に作っている。
このため、同一施設・同一時間帯には常に 1 件しか予約できない前提。
現仕様には合っているが、将来的に「仮予約」「複数枠」「複数部屋」へ広げる場合は再設計が必要。

### 2. rate limit はインメモリ

現実装はサーバーレスインスタンスごとのメモリ上で制御している。
トラフィック規模的には当面許容だが、厳密な制御が必要になれば Redis 等へ移行する。

### 3. 実装とデザインの仕上げは未完

予約 UI は動作優先で実装している。
視覚面の微調整、文言調整、アクセシビリティ調整はまだ余地がある。

## 次にやるべきこと

1. Vercel に必要な環境変数を設定する
2. Google Calendar 側で対象 3 カレンダーを作成・共有する
3. Resend の送信元アドレスを有効化する
4. Preview / 本番環境で予約からキャンセルまで E2E で通す
5. 競合時メッセージ、入力エラー表示、成功画面文言を最終調整する

## 付記

作業中、リポジトリには `images/yuquinoxima.png` という未追跡ファイルが存在していた。
今回の予約機能実装とは無関係のため、そのまま残している。
