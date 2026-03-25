# crossport.site から crossport.cc への SEO 移行チェックリスト

`crossport.site` から `crossport.cc` へ本番ドメインを移行する際に、検索評価とインデックスを落とさないための確認項目です。

## 1. リダイレクト

- [x] `crossport.site` の各 URL から対応する `crossport.cc` の URL へ `301` リダイレクトを設定した — `vercel.json` redirects
- [x] トップページだけでなく、`/book.html` など個別ページも `1対1` で遷移する — `/:path(.*)` パターンで全パス対応
- [x] `http` から `https` へのリダイレクトも整理されている — Vercel が自動で HTTPS 強制（SSL Valid Configuration 確認済み）
- [x] `www` ありなしの正規化方針が決まっており、最終到達先は `https://crossport.cc` に統一されている — `www.crossport.cc`, `www.crossport.site` も `vercel.json` でリダイレクト
- [x] `xmo.jp` および `www.xmo.jp` から `https://crossport.cc` へ `301` リダイレクトを設定した — `vercel.json` redirects、Vercel Production 接続
- [x] `cpx.xmo.jp` から `https://crossport.cc` へ `301` リダイレクトを設定した — `vercel.json` redirects、Vercel ドメイン追加済み

## 2. 新ドメイン側の正規化

- [x] `https://crossport.cc/` に `canonical` が設定されている — `index.html:8`
- [x] `og:url` が `https://crossport.cc/` になっている — `index.html:13`
- [x] 構造化データ内の `url` が `https://crossport.cc/` になっている — `index.html` JSON-LD
- [x] `SITE_URL` が `https://crossport.cc` に設定されている — `api/book.js` で `ensureEnv("SITE_URL")` 参照
- [x] 予約確認メール内のキャンセルリンクが `https://crossport.cc/cancel.html#...` になっている — `api/_lib/email-templates.js` で `SITE_URL` ベース生成

## 3. Search Console

- [x] `crossport.site` と `crossport.cc` の両方を Search Console で所有権確認した
- [x] `crossport.site` プロパティから `Change of Address` を実行した — 検証合格・送信済み
- [x] `xmo.jp` プロパティから `Change of Address` を実行した — 検証合格・送信済み
- [x] `https://crossport.cc/sitemap.xml` を Search Console に送信した — 再送信済み（取得成功待ち）
- [x] `URL 検査` で `https://crossport.cc/` を確認し、`Google が選択した正規 URL` が `https://crossport.cc/` になっている — インデックス登録リクエスト済み

## 4. インデックス制御

- [x] トップページ `/` はインデックス対象のままにしている — `index.html` に robots メタなし（デフォルト index）
- [x] `book.html` は `noindex,follow` になっている — `book.html:8`
- [x] `cancel.html` は `noindex,follow` になっている — `cancel.html:8`
- [x] `admin-manual.html` は `noindex,nofollow` になっている — `admin-manual.html:8`
- [x] `sitemap.xml` にはインデックス対象の URL のみを載せている — `/` のみ記載

## 5. 技術ファイル

- [x] `robots.txt` が `https://crossport.cc/robots.txt` で取得できる — `public/robots.txt` 配置済み
- [x] `sitemap.xml` が `https://crossport.cc/sitemap.xml` で取得できる — `public/sitemap.xml` 配置済み
- [x] `robots.txt` から `Sitemap: https://crossport.cc/sitemap.xml` が参照されている — `public/robots.txt:4`

## 6. 外部サービス

- [x] Vercel の本番ドメイン設定が `crossport.cc` になっている — Production 環境に接続済み
- [x] Resend の送信元ドメイン設定が `crossport.cc` と整合している — 送信元は `xmo.jp` ドメインのため影響なし
- [x] Google Calendar 連携、予約確認メール、キャンセル導線が新ドメインで正常動作する — テスト予約で確認済み（SITE_URL typo 修正後）

## 7. 公開後の確認

- [x] `crossport.site` へアクセスすると新ドメインへ即時遷移する — 301 確認済み（`/` および `/book.html` パス対応）
- [x] `crossport.cc` のトップが正しく表示される — HTTP 200 確認済み
- [x] `crossport.cc/book.html` で予約フォームが開く — HTTP 200 確認済み
- [x] 予約確認メールが届く — テスト予約で確認済み
- [x] メール内キャンセルリンクから `crossport.cc/cancel.html` が開く — 確認済み
- [x] キャンセルが正常に完了する — 確認済み

## 8. 公開後 1〜4 週間の監視

- [ ] Search Console の `ページ` レポートでトップページがインデックスされている
- [ ] `book.html` と `cancel.html` が `noindex` による除外として表示されている
- [ ] Search Console の `検索パフォーマンス` でブランド名や関連語の表示回数が落ちすぎていない
- [ ] 旧ドメイン `crossport.site` のリダイレクトを少なくとも 1 年は維持する計画になっている

## 9. 推奨の補足対応

- [ ] 専用の OG 画像を用意し、`og:image` と `twitter:image` を favicon から差し替える
- [ ] 主要な外部リンク、SNS プロフィール、Google ビジネス プロフィール、各種掲載先の URL を `crossport.cc` に更新する
- [x] アナリティクスや広告ツールを使っている場合、新ドメインで計測できていることを確認する — Vercel Analytics 導入（`@vercel/analytics`）

## 備考

- ドメイン移行直後は一時的に順位や表示回数が揺れることがある
- 旧ドメインをすぐ停止すると評価継承に不利なので、`301` を長めに維持する
