# cachedClient リセット範囲の最適化

## 概要

`api/_lib/google-calendar.js` の `calendarFetch` 関数で、すべてのエラー時に `cachedClient = null` をリセットしているが、`CalendarApiError`（API は正常応答したが 4xx/5xx）の場合は認証が成功しているためリセット不要。

## 現状

```js
} catch (error) {
  cachedClient = null;  // すべてのエラーでリセット
  throw error;
}
```

## 改善案

```js
} catch (error) {
  if (!(error instanceof CalendarApiError)) {
    cachedClient = null;  // ネットワーク/認証エラーのみリセット
  }
  throw error;
}
```

## 影響

- 動作上の問題はなし（不要な再認証が走るだけ）
- ウォームスタート時のパフォーマンスが若干改善（409 Conflict 後の次リクエストで再認証不要）

## 関連ファイル

- `api/_lib/google-calendar.js`

## タスク

- [ ] `calendarFetch` の catch ブロックで `CalendarApiError` 以外の場合のみリセットするよう修正

## 参照

- `docs/booking-system-design.md` Section 6「`api/_lib/google-calendar.js` 実装方針」
