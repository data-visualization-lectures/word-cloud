# Japanese Word Cloud (React + Vite)

ブラウザで日本語文章を貼り付けると Kuromoji.js で形態素解析し、SVG ベースのワードクラウド／ワードバブルを生成するアプリです。`src/App.tsx` が UI 本体で、`src/lib/textProcessing.ts` が頻度計算、`src/hooks/useKuromojiTokenizer.ts` が辞書ロードを担当しています。

主な機能:

- 複合名詞の結合、品詞フィルタ、ノイズ品詞の除外、基本形／表層形の切替
- 語リストからの除外・結合、クラウド上の語クリックでストップワード追加
- 頻度CSVの直接入力、レポート／プレゼン／ダークのスタイルプリセット
- ゴシック／明朝／丸ゴシック、頻度に応じたウェイトと連続配色、白／濃色／透明のキャンバス
- ワードバブルは circle packing。ラベルは円に収まるときだけ表示
- SVG / 高解像度PNG / CSV 書き出し、再配置、タイトルと出典

## Kuromoji の読み込み方法

現在は `public/vendor/kuromoji/` にスクリプトと辞書を同梱し、`src/hooks/useKuromojiTokenizer.ts` で `import.meta.env.BASE_URL` を考慮した相対パスから読み込んでいます。

- `public/vendor/kuromoji/kuromoji.js` と `public/vendor/kuromoji/dict/` は `node_modules/kuromoji` からコピーした成果物です。**依存バージョンを更新した際は、必ず同じ手順で再コピーしてコミットしてください。**（例：`cp node_modules/kuromoji/build/kuromoji.js public/vendor/kuromoji/` / `cp -R node_modules/kuromoji/dict public/vendor/kuromoji/`）
- こうすることで GitHub Pages / Netlify / Vercel などセルフホスト環境でも CDN 依存なしで動作します。
- 必要に応じて `withBasePath()` の引数（`vendor/kuromoji/...`）を書き換えることで別パスへの配置にも対応できます。
- Vite の dev/preview サーバーは `.gz` 辞書をそのまま配信するために `vite.config.ts` のカスタムプラグインで `Content-Encoding: identity` を設定しています。通常の静的ホスティングでも追加設定なしで同じ挙動になります。

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


http://localhost:5173/
http://localhost:5173/?auth_debug

## URL Parameters

アプリケーションは以下のURLパラメータをサポートしています。

- `projectId`: 指定されたUUIDのプロジェクトを自動的にサーバーから読み込み、表示します。
  - 例: `https://word-cloud.dataviz.jp/?projectId=a55cbec0-8338-4656-bf7f-a39dd4873518`
