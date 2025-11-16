# Japanese Word Cloud (React + Vite)

ブラウザで日本語文章を貼り付けると Kuromoji.js で形態素解析し、SVG ベースのワードクラウドを生成するアプリです。`src/App.tsx` が UI 本体で、`src/lib/textProcessing.ts` が頻度計算、`src/hooks/useKuromojiTokenizer.ts` が辞書ロードを担当しています。

## Kuromoji の読み込み方法

最もシンプルで確実な構成にするため、CDN で配布されているブラウザ版 Kuromoji を動的に読み込んでいます。

- `src/hooks/useKuromojiTokenizer.ts` が初回レンダリング時に `<script src="https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js">` を自動で挿入し、`window.kuromoji` が利用可能になってからトークナイザーを構築します。
- 辞書ファイルも CDN（`https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/`）から取得するため、リポジトリに辞書を同梱する必要はありません。
- ネットワークに出られない環境で使う場合は、CDN 上の `dict/` とスクリプトをダウンロードし、`dicPath` やスクリプト URL を差し替えるだけで対応できます。

## 形態素解析で取得できる属性

kuromoji が返す `IpadicFeatures` には以下のようなフィールドが含まれます。`src/lib/textProcessing.ts` ではこの情報を元に品詞フィルタリングや基本形（`basic_form`）への正規化を行っています。

- `surface_form` / `basic_form`: 元の表記と辞書上の基本形。
- `pos`, `pos_detail_1`〜`pos_detail_3`: 名詞・動詞などの品詞と階層的な詳細分類。
- `conjugated_type`, `conjugated_form`: 活用の種類とその形。
- `reading`, `pronunciation`: カタカナ読み・発音（語により欠損あり）。
- そのほか `word_id`, `word_type`, `word_position` など辞書参照用のメタデータ。

これらの属性を活用することで、不要な品詞の除外や読み情報を利用した表記ゆれ吸収など、追加の可視化ロジックにも拡張しやすくなっています。

## 開発・ビルド

```bash
npm install
npm run dev   # Vite dev サーバー（辞書配信ヘッダーを忘れずに）
npm run build # 本番ビルド
```

`npm run dev` を使わず `npm run build` → 任意の静的サーバーで `dist/` を配信しても動作します。CDN アクセスが許可されている環境であれば追加設定は不要です。
