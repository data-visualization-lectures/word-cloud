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

## 今後の拡張計画（Word Cloud ↔ Word Bubble）

ワードクラウドに加えて、背景に円（バブル）を描画するモードを追加する予定です。以下のような方針で実装を検討しています。

1. **モードの切り替え**: UI から `word cloud / word bubble` を選択できるようにし、React state で `viewMode` を管理。
2. **レイアウト計算**:
   - ワードクラウド: 既存の `d3-cloud` で位置・回転・フォントサイズを算出。
   - ワードバブル: `d3-force` や `d3.pack` を利用し、value に応じた半径の円が互いに重ならないように配置。
3. **アニメーション**: モード切替時は `d3-transition` によって `<g>` 要素の `transform`, `font-size`, `circle radius` 等を滑らかに補間する。円の背景色は `d3-scale-chromatic` で計算する。
4. **SVG 構造の統一**: `<g class="word">` の中に `<circle>` と `<text>` を常に描画し、モードに応じて見た目だけ切り替えることで、アニメーションや data join を簡単にする。
5. **SVG エクスポート**: bubble モードでも「SVGダウンロード」で同じ描画結果を得られるようにする。

この計画に沿って、今後 Word Bubble モードの追加を行います。
