# Japanese Word Cloud (React + Vite)

ブラウザで日本語文章を貼り付けると Kuromoji.js で形態素解析し、SVG ベースのワードクラウドを生成するアプリです。`src/App.tsx` が UI 本体で、`src/lib/textProcessing.ts` が頻度計算、`src/hooks/useKuromojiTokenizer.ts` が辞書ロードを担当しています。

## Kuromoji の読み込み方法

最もシンプルで確実な構成にするため、CDN で配布されているブラウザ版 Kuromoji を動的に読み込んでいます。

- `src/hooks/useKuromojiTokenizer.ts` が初回レンダリング時に `<script src="https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js">` を自動で挿入し、`window.kuromoji` が利用可能になってからトークナイザーを構築します。
- 辞書ファイルも CDN（`https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/`）から取得するため、リポジトリに辞書を同梱する必要はありません。
- ネットワークに出られない環境で使う場合は、CDN 上の `dict/` とスクリプトをダウンロードし、`dicPath` やスクリプト URL を差し替えるだけで対応できます。

## 開発・ビルド

```bash
npm install
npm run dev   # Vite dev サーバー（辞書配信ヘッダーを忘れずに）
npm run build # 本番ビルド
```

`npm run dev` を使わず `npm run build` → 任意の静的サーバーで `dist/` を配信しても動作します。CDN アクセスが許可されている環境であれば追加設定は不要です。
