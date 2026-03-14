# crossport.site から crossport.cc への SEO 移行チェックリスト

`crossport.site` から `crossport.cc` へ本番ドメインを移行する際に、検索評価とインデックスを落とさないための確認項目です。

## 1. リダイレクト

- [ ] `crossport.site` の各 URL から対応する `crossport.cc` の URL へ `301` リダイレクトを設定した
- [ ] トップページだけでなく、`/book.html` など個別ページも `1対1` で遷移する
- [ ] `http` から `https` へのリダイレクトも整理されている
- [ ] `www` ありなしの正規化方針が決まっており、最終到達先は `https://crossport.cc` に統一されている

## 2. 新ドメイン側の正規化

- [ ] `https://crossport.cc/` に `canonical` が設定されている
- [ ] `og:url` が `https://crossport.cc/` になっている
- [ ] 構造化データ内の `url` が `https://crossport.cc/` になっている
- [ ] `SITE_URL` が `https://crossport.cc` に設定されている
- [ ] 予約確認メール内のキャンセルリンクが `https://crossport.cc/cancel.html#...` になっている

## 3. Search Console

- [ ] `crossport.site` と `crossport.cc` の両方を Search Console で所有権確認した
- [ ] `crossport.site` プロパティから `Change of Address` を実行した
- [ ] `https://crossport.cc/sitemap.xml` を Search Console に送信した
- [ ] `URL 検査` で `https://crossport.cc/` を確認し、`Google が選択した正規 URL` が `https://crossport.cc/` になっている

## 4. インデックス制御

- [ ] トップページ `/` はインデックス対象のままにしている
- [ ] `book.html` は `noindex,follow` になっている
- [ ] `cancel.html` は `noindex,follow` になっている
- [ ] `admin-manual.html` は `noindex,nofollow` になっている
- [ ] `sitemap.xml` にはインデックス対象の URL のみを載せている

## 5. 技術ファイル

- [ ] `robots.txt` が `https://crossport.cc/robots.txt` で取得できる
- [ ] `sitemap.xml` が `https://crossport.cc/sitemap.xml` で取得できる
- [ ] `robots.txt` から `Sitemap: https://crossport.cc/sitemap.xml` が参照されている

## 6. 外部サービス

- [ ] Vercel の本番ドメイン設定が `crossport.cc` になっている
- [ ] Resend の送信元ドメイン設定が `crossport.cc` と整合している
- [ ] Google Calendar 連携、予約確認メール、キャンセル導線が新ドメインで正常動作する

## 7. 公開後の確認

- [ ] `crossport.site` へアクセスすると新ドメインへ即時遷移する
- [ ] `crossport.cc` のトップが正しく表示される
- [ ] `crossport.cc/book.html` で予約フォームが開く
- [ ] 予約確認メールが届く
- [ ] メール内キャンセルリンクから `crossport.cc/cancel.html` が開く
- [ ] キャンセルが正常に完了する

## 8. 公開後 1〜4 週間の監視

- [ ] Search Console の `ページ` レポートでトップページがインデックスされている
- [ ] `book.html` と `cancel.html` が `noindex` による除外として表示されている
- [ ] Search Console の `検索パフォーマンス` でブランド名や関連語の表示回数が落ちすぎていない
- [ ] 旧ドメイン `crossport.site` のリダイレクトを少なくとも 1 年は維持する計画になっている

## 9. 推奨の補足対応

- [ ] 専用の OG 画像を用意し、`og:image` と `twitter:image` を favicon から差し替える
- [ ] 主要な外部リンク、SNS プロフィール、Google ビジネス プロフィール、各種掲載先の URL を `crossport.cc` に更新する
- [ ] アナリティクスや広告ツールを使っている場合、新ドメインで計測できていることを確認する

## 備考

- ドメイン移行直後は一時的に順位や表示回数が揺れることがある
- 旧ドメインをすぐ停止すると評価継承に不利なので、`301` を長めに維持する
