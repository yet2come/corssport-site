# CROSSPORT MSZ Website

壱岐島のコワーキングスペース「CROSSPORT MSZ」のウェブサイト。

## Tech Stack

- **Vite** 7.3.1 — ビルドツール・開発サーバー
- **Tailwind CSS** 4.2.1 — `@tailwindcss/vite` プラグイン、`@theme` ディレクティブでカスタムテーマ定義
- **Vanilla JS** — フレームワーク不使用
- **Material Symbols Outlined** — アイコン

## Project Structure

- `index.html` — ランディングページ（ABOUT, SERVICES, ACCESS セクション）
- `book.html` — 予約・お問い合わせページ（5施設カード）
- `src/main.js` — 共通 JS（モバイルメニュー、スクロールアニメーション、Floating CTA、ナビハイライト）
- `src/style.css` — グローバル CSS（Tailwind import、カスタムテーマ、ユーティリティ）
- `docs/` — 設計ドキュメント

## Design System

カスタムカラー（`src/style.css` の `@theme` で定義）:
- `basalt-black` (#1A1A1D) — メインテキスト・背景
- `concrete-mid` (#B0BEC5) — サブカラー
- `concrete-dark` (#424242)
- `seaweed-green` (#00aaff) — アクセントカラー
- `stark-white` (#FFFFFF)

フォント:
- `Noto Sans JP` — 本文・日本語
- `Outfit` — 英語見出し・ブランドタイトル
- `Space Grotesk` — 補助

デザインスタイル: ブルータリスト（太ボーダー、ドットグリッド背景、大型タイポグラフィ）

## Commands

- `npm run dev` — 開発サーバー起動（port 5173）
- `npm run build` — プロダクションビルド → `dist/`
- `npm run preview` — ビルド結果プレビュー

## Build & Deploy

- **現在**: GitHub Pages（`.github/workflows/deploy.yml`）
- **移行予定**: Vercel（`docs/booking-system-design.md` 参照）
- Vite base path: `/corssport-site/`（GitHub Pages 用、Vercel 移行時に `/` へ変更）
- Multi-page 構成: `vite.config.js` の `build.rollupOptions.input` で定義

## Conventions

- 言語: HTML/CSS/JS のみ（TypeScript・フレームワーク不使用）
- パッケージタイプ: `commonjs`（package.json `"type": "commonjs"`）
- CSS: Tailwind ユーティリティクラス優先、カスタムクラスは `src/style.css` に定義
- アニメーション: IntersectionObserver による `.fade-in-up` → `.visible` パターン
- ナビゲーション: 日本語ラベル（場所、サービス、アクセス、予約）
- レスポンシブ: モバイルファースト（`sm:`, `md:`, `lg:` ブレークポイント）
