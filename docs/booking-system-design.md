# CROSSPORT MSZ 施設予約システム 設計方針

## 1. Overview

CROSSPORT MSZ のウェブサイトに Google Calendar と連動した施設予約機能を実装する。
ユーザーはブラウザ上で空き状況を確認し、フォームから予約・キャンセルまで完結できる。

## 2. Architecture

```
                     ┌─────────────────────────┐
                     │        ブラウザ           │
                     │  book.html / cancel.html  │
                     └────────┬────────┬────────┘
                              │        │
                     静的ファイル    API リクエスト
                              │        │
                     ┌────────▼────────▼────────┐
                     │        Vercel             │
                     │  CDN (HTML/CSS/JS)        │
                     │  Serverless Functions      │
                     │  /api/*                   │
                     └────────┬────────┬────────┘
                              │        │
                              ▼        ▼
                 ┌────────────────┐  ┌──────────┐
                 │ Google Calendar │  │  Resend  │
                 │   REST API     │  │  (Email) │
                 └────────────────┘  └──────────┘
```

### 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| フロントエンド | Vite + Tailwind CSS + vanilla JS | 現行維持、フレームワーク不使用 |
| バックエンド | Vercel Serverless Functions (Node.js) | `/api/` 配下 |
| カレンダー | Google Calendar REST API | `fetch()` 直接呼び出し |
| 認証 | `google-auth-library` | サービスアカウント JWT |
| メール | Resend | 3,000通/月無料 |
| データベース | なし | Google Calendar が唯一のデータソース |

### googleapis を使わない理由

| | `googleapis` | REST API + `fetch` |
|---|---|---|
| バンドルサイズ | ~35 MB | ~1 MB (`google-auth-library` のみ) |
| コールドスタート | 2-3秒 | <500ms |
| 開発体験 | 型補完・自動補完あり | URL・ペイロード手書き |
| 採用理由 | - | **コールドスタート高速化を優先** |

`google-auth-library` で JWT アクセストークンを取得し、Calendar REST API を `fetch()` で直接呼び出す。
トークンはモジュールスコープでキャッシュし、ウォームスタート時の再認証を回避する。

## 3. Scope

### 予約対象（3施設）

| 施設 | 予約方式 | スロット |
|---|---|---|
| Event Space | Google Calendar 連動予約 | 1時間単位 |
| Meeting Room | Google Calendar 連動予約 | 1時間単位 |
| Solo Booth | Google Calendar 連動予約 | 1時間単位 |

### 対象外（2施設 - 従来通り）

| 施設 | 連絡方法 | 理由 |
|---|---|---|
| Rent-a-car | 電話 (`tel:`) | 車両状況の確認が必要、定型スロット不適 |
| Consultation | メール (`mailto:`) | 自由形式の相談、スロット予約に馴染まない |

### 機能一覧

- 空き状況のリアルタイム表示（Google Calendar freebusy API）
- フォームからの予約送信 → Google Calendar イベント自動作成
- 予約確認メール送信（Resend）
- メール内リンクからのキャンセル

## 4. Google Calendar 構成

### カレンダー

予約対象の3施設にそれぞれ専用カレンダーを作成する。

| 施設 | カレンダー名 | 環境変数 |
|---|---|---|
| Event Hall | `CROSSPORT - Event Hall` | `GCAL_ID_EVENT_HALL` |
| Meeting Room | `CROSSPORT - Meeting Room` | `GCAL_ID_MEETING_ROOM` |
| Solo Booth | `CROSSPORT - Solo Booth` | `GCAL_ID_SOLO_BOOTH` |

### 認証方式

**Google Cloud サービスアカウント** を使用する（OAuth 不要）。

1. Google Cloud Console でプロジェクト作成
2. Calendar API を有効化
3. サービスアカウントを作成し、JSON キーをダウンロード
4. 各カレンダーの共有設定でサービスアカウントのメールに「変更権限」を付与
5. JSON キーを Vercel 環境変数 `GOOGLE_SERVICE_ACCOUNT_KEY` に設定

### イベント形式

```
タイトル:   [施設名] 予約 - {お客様名}
説明:
  お名前: {name}
  メール: {email}
  電話:   {phone}
  利用目的: {purpose}
  人数:   {guests}名

拡張プロパティ (private):
  cancelToken: "{HMAC トークン}"
  customerEmail: "{email}"
  facilityId: "{facility-slug}"

タイムゾーン: Asia/Tokyo
```

拡張プロパティは Google Calendar UI には表示されないが、API 経由で読み書き可能。
キャンセルトークンをここに保存することで、外部 DB なしでトークン検証を実現する。

### タイムゾーン

`Asia/Tokyo` 固定。日本は夏時間（DST）を採用していないため、オフセット `+09:00` は不変。

## 5. API 設計

すべてのエンドポイントは `/api/` 配下に Vercel Serverless Functions として配置する。

### `GET /api/availability`

空き状況を取得する。

**リクエスト**
```
GET /api/availability?facility=meeting-room&date=2026-03-15
```

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `facility` | string | Yes | `event-space`, `meeting-room`, `solo-booth` のいずれか |
| `date` | string | Yes | `YYYY-MM-DD` 形式。今日〜90日後まで |

**レスポンス (200)**
```json
{
  "facility": "meeting-room",
  "date": "2026-03-15",
  "timezone": "Asia/Tokyo",
  "operatingHours": { "open": "09:00", "close": "18:00" },
  "slots": [
    { "start": "09:00", "end": "10:00", "available": true },
    { "start": "10:00", "end": "11:00", "available": false },
    { "start": "11:00", "end": "12:00", "available": true },
    { "start": "12:00", "end": "13:00", "available": true },
    { "start": "13:00", "end": "14:00", "available": true },
    { "start": "14:00", "end": "15:00", "available": false },
    { "start": "15:00", "end": "16:00", "available": true },
    { "start": "16:00", "end": "17:00", "available": true },
    { "start": "17:00", "end": "18:00", "available": true }
  ]
}
```

**実装**
1. `facility` を許可リストで検証
2. `date` を Asia/Tokyo で `timeMin` / `timeMax` に変換（`timeMin` は当日 00:00、`timeMax` は翌日 00:00 の排他的）
3. Calendar REST API `POST https://www.googleapis.com/calendar/v3/freeBusy` を呼び出し
4. 09:00-18:00 を1時間スロットに分割し、busy 区間と照合

**エラー**
| ステータス | 条件 |
|---|---|
| 400 | 不正な facility / date |
| 500 | Calendar API エラー（詳細は非公開） |

---

### `POST /api/book`

予約を作成する。

**リクエスト**
```json
{
  "facility": "meeting-room",
  "date": "2026-03-15",
  "startTime": "09:00",
  "endTime": "10:00",
  "name": "田中一郎",
  "email": "tanaka@example.com",
  "phone": "090-1234-5678",
  "purpose": "チームミーティング",
  "guests": 4
}
```

| フィールド | 型 | 必須 | バリデーション |
|---|---|---|---|
| `facility` | string | Yes | 許可リスト |
| `date` | string | Yes | `YYYY-MM-DD`、今日〜90日後 |
| `startTime` | string | Yes | `HH:MM`、09:00-17:00 |
| `endTime` | string | Yes | `HH:MM`、startTime + 1h |
| `name` | string | Yes | 1-100文字 |
| `email` | string | Yes | メールアドレス形式 |
| `phone` | string | Yes | 日本の電話番号形式 |
| `purpose` | string | No | 最大500文字 |
| `guests` | number | Yes | 1〜施設最大人数 |

**実装**
1. 全フィールドをサーバー側でバリデーション
2. freebusy で空き再確認（ファストパスとしての早期リジェクト。**最終的な排他は eventId 一意制約で担保**）
3. スロットが埋まっていれば 409 を返却
4. イベント ID をサーバー側で決定的に生成する  
   `booking:{facility}:{date}:{startTime}-{endTime}` を SHA-256 で短縮した値を `eventId` とする
5. Calendar REST API `POST /calendars/{calendarId}/events?conferenceDataVersion=0` を `eventId` 指定付きで呼び出す
6. Google Calendar が `409 Conflict` を返した場合は、同一スロットの先行予約が存在するとみなし 409 を返却
7. キャンセルトークン生成: `HMAC-SHA256(eventId + ":" + email, CANCEL_SECRET)`
8. `extendedProperties.private` を **イベント作成時のペイロードに含めて** 保存する
9. 確認メール送信に失敗した場合は、作成済みイベントを削除して 500 を返却（補償トランザクション）

**競合制御の考え方**

- `freebusy` の事前確認だけではレースを防げないため、最終的な排他は Google Calendar 側の `eventId` 一意制約に委ねる
- 同一施設・同一日付・同一時間帯に対しては常に同じ `eventId` を生成することで、同時リクエストでも **1件だけ成功** させる
- これにより、作成後に `events.list` を再走査して双方を削除してしまう対称レースを回避する

**レスポンス (201)**
```json
{
  "success": true,
  "booking": {
    "id": "google_event_id",
    "facility": "meeting-room",
    "facilityName": "Meeting Room",
    "date": "2026-03-15",
    "startTime": "09:00",
    "endTime": "10:00"
  }
}
```

**エラー**
| ステータス | 条件 |
|---|---|
| 400 | バリデーションエラー（フィールド別メッセージ付き） |
| 409 | 指定スロットが既に予約済み |
| 500 | 内部エラー |

---

### `GET /api/booking`

予約詳細を取得する。`cancel.html` の初期表示で利用する。

**リクエスト**
```
GET /api/booking?id=google_event_id&facility=meeting-room&token=hmac_hex_string
```

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | string | Yes | Google Calendar の event ID |
| `facility` | string | Yes | `event-space`, `meeting-room`, `solo-booth` のいずれか |
| `token` | string | Yes | メール記載のキャンセルトークン |

**実装**
1. `facility` と `id` を検証
2. `GET /calendars/{calendarId}/events/{eventId}` でイベント取得
3. 拡張プロパティの `facilityId` を確認し、`cancelToken` は `crypto.timingSafeEqual()` で検証
4. 一致すればキャンセル確認画面に必要な最小情報のみ返却

**レスポンス (200)**
```json
{
  "booking": {
    "id": "google_event_id",
    "facility": "meeting-room",
    "facilityName": "Meeting Room",
    "date": "2026-03-15",
    "startTime": "09:00",
    "endTime": "10:00",
    "name": "田中一郎"
  }
}
```

**エラー**
| ステータス | 条件 |
|---|---|
| 400 | パラメータ不正 |
| 403 | トークン不一致 |
| 404 | 予約が見つからない |
| 500 | 内部エラー |

---

### `POST /api/cancel`

予約をキャンセルする。

**リクエスト**
```json
{
  "bookingId": "google_event_id",
  "facility": "meeting-room",
  "token": "hmac_hex_string"
}
```

**実装**
1. `GET /calendars/{calendarId}/events/{eventId}` でイベント取得
2. 拡張プロパティの `facilityId` とリクエスト `facility` を突合
3. 拡張プロパティの `cancelToken` と送信トークンを timing-safe 比較
4. 一致すれば `DELETE /calendars/{calendarId}/events/{eventId}`

**レスポンス (200)**
```json
{
  "success": true,
  "message": "予約をキャンセルしました"
}
```

**エラー**
| ステータス | 条件 |
|---|---|
| 400 | パラメータ不足 |
| 403 | トークン不一致 |
| 404 | 予約が見つからない（既にキャンセル済み等） |
| 500 | 内部エラー |

## 6. ファイル構成

```
crossport-site/
├── api/
│   ├── availability.js            # GET /api/availability
│   ├── booking.js                 # GET /api/booking
│   ├── book.js                    # POST /api/book
│   ├── cancel.js                  # POST /api/cancel
│   └── _lib/
│       ├── google-calendar.js     # REST API クライアント (fetch + google-auth-library)
│       ├── validate.js            # 入力バリデーション
│       ├── facilities-config.js   # 3施設の設定 + カレンダーID対応
│       └── email-templates.js     # HTML メールテンプレート
├── book.html                      # 改修: 3施設は予約UI、2施設は従来tel/mailto
├── cancel.html                    # 新規: キャンセル確認ページ
├── src/
│   ├── booking.js                 # 新規: 予約ページ JS モジュール
│   ├── cancel.js                  # 新規: キャンセルページ JS モジュール
│   ├── main.js                    # 条件付き動的 import 追加
│   └── style.css                  # フォーム・スロットグリッド用 CSS 追加
├── vercel.json                    # Vercel 設定
├── vite.config.js                 # base: "/" に変更、cancel.html エントリ追加
└── docs/
    └── booking-system-design.md   # 本ドキュメント
```

### `api/_lib/google-calendar.js` 実装方針

```js
const { GoogleAuth } = require('google-auth-library');

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

// モジュールスコープでキャッシュ（ウォームスタート高速化）
let cachedClient = null;

class CalendarApiError extends Error {
  constructor(status, body) {
    super(`Calendar API ${status}: ${body}`);
    this.name = 'CalendarApiError';
    this.status = status;
    this.body = body;
  }
}

async function calendarFetch(path, options = {}) {
  try {
    if (!cachedClient) cachedClient = await auth.getClient();
    const { token } = await cachedClient.getAccessToken();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3${path}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new CalendarApiError(res.status, error);
    }
    return res.json();
  } catch (error) {
    cachedClient = null;
    throw error;
  }
}

module.exports = { calendarFetch, CalendarApiError };
```

`book.js` では `CalendarApiError` の `status === 409` を正常系の競合として扱い、
それ以外の 4xx / 5xx は内部エラーまたは upstream 障害として処理する。

### `api/book.js` 実装上の注意

- `extendedProperties.private` は `events.insert` の段階で設定し、作成後 `patch` に依存しない
- メール送信失敗時は `events.delete` を実行して予約をロールバックする
- `409 Conflict` はバリデーションエラーではなく、ユーザーに「直前に埋まりました」と表示する想定

## 7. フロントエンド変更

### book.html の UI フロー

```
┌──────────────────────────────────────────┐
│ BOOK  /  予約・お問い合わせ               │
├──────────────────────────────────────────┤
│                                          │
│  [Event Space]  [Meeting Room]  [Solo]   │  ← カード1-3: クリックで予約フォーム展開
│   本日空きあり    次の空き: 14:00  空きあり │
│                                          │
│  [Rent-a-car]   [Consultation]           │  ← カード4-5: 従来通り tel/mailto
│   ☎ 050-5211..   ✉ crossport@..         │
│                                          │
├──────────────────────────────────────────┤
│ ▼ 予約フォーム（カードクリック後に展開）    │
│                                          │
│  施設: Meeting Room                      │
│                                          │
│  日付: [  2026-03-15  ]  ← input[date]  │
│                                          │
│  時間:                                   │
│  [09:00] [10:00] [11:00] [12:00]        │
│  [13:00] [14:00] [15:00] [16:00]        │
│  [17:00]                                 │
│   ■ 選択中  □ 空き  ▒ 予約済み            │
│                                          │
│  お名前:   [________________]            │
│  メール:   [________________]            │
│  電話番号: [________________]            │
│  利用目的: [________________]            │
│  人数:     [__]                          │
│                                          │
│  [ 予約する ]  ← bg-seaweed-green        │
│                                          │
└──────────────────────────────────────────┘
```

### 状態遷移

1. **初期表示**: 5枚のカード。カード1-3は「本日空きあり / 次の空き: XX:XX」を表示
2. **カード選択**: カード1-3をクリックすると下部に予約フォームが展開（スクロール）
3. **日付選択**: `<input type="date">` で日付を選択すると `/api/availability` を呼び出し
4. **ローディング**: スロットグリッドにスケルトンアニメーション表示
5. **スロット表示**: 空き=白黒ブルータリスト / 埋まり=opacity-30 disabled
6. **スロット選択**: クリックでハイライト（bg-basalt-black text-white）
7. **フォーム入力**: 名前・メール・電話・目的・人数
8. **送信中**: ボタンにスピナー、全入力を disabled
9. **成功**: フォームが確認パネルに切り替わり（黒背景・白文字・予約詳細）
10. **競合 (409)**: エラーメッセージ表示、スロットを自動リフレッシュ
11. **エラー**: 赤枠エラーバナー「予約に失敗しました。再度お試しください。」

### cancel.html

```
URL: cancel.html#id=EVENT_ID&facility=meeting-room&token=HMAC_HEX

┌──────────────────────────────────────────┐
│ CROSSPORT MSZ                            │
├──────────────────────────────────────────┤
│                                          │
│  予約キャンセル                            │
│                                          │
│  施設:     Meeting Room                  │
│  日時:     2026-03-15 09:00 - 10:00      │
│                                          │
│  [ 予約をキャンセルする ]  ← 赤系ボタン    │
│                                          │
│  ↓ キャンセル完了後                        │
│                                          │
│  ✓ キャンセルが完了しました                │
│  新しい予約は book.html からどうぞ         │
│                                          │
└──────────────────────────────────────────┘
```

ハッシュフラグメントを使うことで、トークンが通常の HTTP リクエスト URL や Referer に乗るのを避ける。
`src/cancel.js` は `location.hash` を解析し、`GET /api/booking` で詳細取得後に確認 UI を描画する。

## 8. セキュリティ

### キャンセルトークン

```
生成: HMAC-SHA256(eventId + ":" + email, CANCEL_SECRET)
検証: crypto.timingSafeEqual() でタイミング攻撃を防止
```

HMAC ベースのため、eventId と email から決定的に再生成可能。
外部 DB 不要で、Google Calendar の拡張プロパティに保存した値と比較する。

`CANCEL_SECRET` は Vercel 環境変数に設定し、クライアントには公開しない。

### キャンセルリンクの扱い

- キャンセルリンクのトークンは query string ではなく URL フラグメント (`#...`) に載せる
- フラグメントはサーバーへ送信されないため、アクセスログや Referer への露出を減らせる
- フラグメントを読むのは `cancel.html` 上の JavaScript のみとし、API 送信時に明示的に JSON / query parameter へ載せ替える

### レート制限

| エンドポイント | 制限 |
|---|---|
| `GET /api/availability` | 60 req/min/IP |
| `GET /api/booking` | 30 req/min/IP |
| `POST /api/book` | 5 req/min/IP |
| `POST /api/cancel` | 10 req/min/IP |

v1 ではインメモリ（`Map` + スライディングウィンドウ）で実装。
Vercel のサーバーレスはインスタンスごとに独立するため厳密ではないが、
壱岐島のコワーキングスペースのトラフィック規模では十分。
必要に応じて Upstash Redis に移行可能。

### 入力バリデーション（サーバー側）

| フィールド | ルール |
|---|---|
| `facility` | `event-space`, `meeting-room`, `solo-booth` のいずれか |
| `date` | 有効な日付、過去でない、90日以内 |
| `startTime` / `endTime` | `HH:MM` 形式、営業時間内、end > start |
| `name` | 1-100文字、トリム |
| `email` | メールアドレス形式 |
| `phone` | 日本の電話番号形式 |
| `purpose` | 任意、最大500文字、HTML サニタイズ |
| `guests` | 整数、1〜施設最大人数 |

### その他

- API レスポンスに内部情報（カレンダーID、スタックトレース等）を含めない
- POST リクエストは `Content-Type: application/json` を検証
- サービスアカウントキーはクライアントに公開しない
- Google Calendar の共有設定はサービスアカウントのみに限定

## 9. Vercel 移行手順

### Step 1: vite.config.js 更新

```js
// base: "/corssport-site/" → base: "/"
// cancel.html をエントリに追加
export default defineConfig({
  base: "/",
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        book: resolve(__dirname, "book.html"),
        cancel: resolve(__dirname, "cancel.html"),
      },
    },
  },
});
```

### Step 2: vercel.json 作成

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

### Step 3: 依存関係インストール

```bash
npm install google-auth-library resend
```

`googleapis` は使用しない。`google-auth-library` (~1 MB) のみ。

### Step 4: 環境変数設定（Vercel ダッシュボード）

```
GOOGLE_SERVICE_ACCOUNT_KEY   # サービスアカウント JSON（文字列化）
GCAL_ID_EVENT_HALL           # Event Hall カレンダー ID
GCAL_ID_MEETING_ROOM         # Meeting Room カレンダー ID
GCAL_ID_SOLO_BOOTH           # Solo Booth カレンダー ID
RESEND_API_KEY               # Resend API キー
RESEND_FROM_EMAIL            # 送信元アドレス（例: noreply@crossport.jp）
CANCEL_SECRET                # HMAC 用ランダム文字列（32文字以上）
SITE_URL                     # サイト URL（例: https://crossport.cc）
```

### Step 5: GitHub Pages ワークフロー無効化

`.github/workflows/deploy.yml` を削除または `on:` を `workflow_dispatch` のみに変更。

### Step 6: Vercel にデプロイ

Vercel ダッシュボードで GitHub リポジトリを接続。Vite を自動検出しビルド・デプロイ。

## 10. 実装フェーズ

| Phase | 内容 | 主な作業 |
|---|---|---|
| **1. 基盤構築** | Google Cloud + Vercel 移行 | GCP プロジェクト作成、サービスアカウント設定、カレンダー作成・共有、Vercel 接続、環境変数設定 |
| **2. 空き確認** | `/api/availability` | `google-calendar.js` 共通クライアント、`facilities-config.js`、freebusy → スロット変換 |
| **3. 予約・キャンセル** | `/api/book` + `/api/cancel` | バリデーション、イベント CRUD、HMAC トークン、Resend メール送信、メールテンプレート |
| **4. フロントエンド** | book.html + cancel.html | カード → ボタン化、日付・スロット選択UI、予約フォーム、キャンセルページ、`booking.js` / `cancel.js` |
| **5. テスト・デプロイ** | E2E 検証 | 全施設の予約フロー、競合テスト、レスポンシブ、本番デプロイ |

## 11. 確認メールテンプレート

```
件名: 【CROSSPORT MSZ】予約確認 - {施設名} / {日付} {時間}

本文:
━━━━━━━━━━━━━━━━━━━━━
CROSSPORT MSZ - 予約確認
━━━━━━━━━━━━━━━━━━━━━

{お客様名} 様

以下の内容でご予約を承りました。

施設:     {施設名}
日時:     {日付} {開始時間} - {終了時間}
人数:     {人数}名
利用目的:  {目的}

━━━━━━━━━━━━━━━━━━━━━

キャンセルをご希望の場合は以下のリンクから（第三者と共有しないでください）：
{キャンセル URL}

━━━━━━━━━━━━━━━━━━━━━

CROSSPORT MSZ
TEL: 050-5211-5434
MAIL: crossport@xmo.jp
```
