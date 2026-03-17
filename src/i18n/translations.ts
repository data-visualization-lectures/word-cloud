export type Locale = 'ja' | 'en'

const translations = {
  // --- App.tsx ---
  'toast.projectLoaded': { ja: 'プロジェクト "{name}" を読み込みました', en: 'Loaded project "{name}"' },
  'toast.projectLoadFailed': { ja: 'プロジェクトの読み込みに失敗しました', en: 'Failed to load project' },
  'toast.generateFirst': { ja: '保存する前にワードクラウドを生成してください。', en: 'Please generate a word cloud before saving.' },
  'confirm.overwrite': { ja: 'プロジェクト "{name}" を上書き保存しますか？', en: 'Overwrite project "{name}"?' },
  'toast.saved': { ja: '保存しました', en: 'Saved' },
  'toast.savedNew': { ja: '新規プロジェクトとして保存しました', en: 'Saved as new project' },
  'toast.saveFailed': { ja: '保存に失敗しました', en: 'Failed to save' },
  'toast.saveError': { ja: '保存処理中にエラーが発生しました。', en: 'An error occurred while saving.' },
  'status.loadingDict': { ja: '形態素解析辞書を読み込み中です...', en: 'Loading morphological analysis dictionary...' },
  'status.pressGenerate': { ja: '生成ボタンを押してください。', en: 'Press the Generate button.' },
  'status.enterText': { ja: 'テキストを入力してください。', en: 'Please enter some text.' },
  'status.noWords': { ja: '抽出できる単語が見つかりません。', en: 'No words found.' },
  'header.loadProject': { ja: 'プロジェクトの読込', en: 'Load Project' },
  'header.saveProject': { ja: 'プロジェクトの保存', en: 'Save Project' },

  // --- ControlsPanel.tsx ---
  'controls.description': {
    ja: 'テキストを貼り付けて「生成ボタン」を押すと、形態素解析を行い Word Cloud / Word Bubble を生成します。',
    en: 'Paste text and press "Generate" to create a Word Cloud / Word Bubble using morphological analysis.',
  },
  'controls.textInput': { ja: 'テキスト入力', en: 'Text Input' },
  'controls.selectFile': { ja: 'ファイルを選択', en: 'Select File' },
  'controls.placeholder': { ja: '文章を入力してください', en: 'Enter your text here' },
  'controls.wordCount': { ja: '語数', en: 'Words' },
  'controls.generate': { ja: '生成する', en: 'Generate' },
  'controls.stopwords': { ja: 'ストップワード', en: 'Stop Words' },
  'controls.stopwordsHint': { ja: '改行またはカンマ区切りで入力。正規化して比較します。', en: 'Enter one per line or comma-separated.' },
  'controls.advancedSettings': { ja: '詳細設定', en: 'Advanced Settings' },
  'controls.maxWords': { ja: '最大語数', en: 'Max Words' },
  'controls.maxWordsHint': {
    ja: '{min}〜{max}語の範囲で調整できます（{step}語刻み）。',
    en: 'Adjust between {min} and {max} words (step: {step}).',
  },
  'controls.maxWordsRange': {
    ja: '{min}〜{max}の範囲で入力してください。',
    en: 'Enter a value between {min} and {max}.',
  },
  'controls.enterValue': { ja: '値を入力してください。', en: 'Please enter a value.' },
  'controls.enterNumber': { ja: '数値で入力してください。', en: 'Please enter a number.' },
  'controls.fontSize': { ja: 'フォントサイズ', en: 'Font Size' },
  'controls.fontSizeHint': {
    ja: '{min}〜{max}pt のあいだで、最小と最大は 4pt 以上離す必要があります。',
    en: 'Between {min} and {max}pt. Min and max must be at least 4pt apart.',
  },
  'controls.rangeSeparator': { ja: '〜', en: '–' },
  'controls.debug': { ja: 'デバッグ表示', en: 'Debug Display' },
  'controls.boundingBoxes': { ja: 'バウンディングボックス', en: 'Bounding Boxes' },
  'controls.layout': { ja: 'レイアウト', en: 'Layout' },
  'controls.archimedean': { ja: 'アーキメディアン', en: 'Archimedean' },
  'controls.rectangular': { ja: '矩形', en: 'Rectangular' },
  'controls.rotation': { ja: '回転', en: 'Rotation' },
  'controls.rotationNone': { ja: '回転なし', en: 'No rotation' },
  'controls.rotationLight': { ja: '軽め（-30°〜30°）', en: 'Light (-30° to 30°)' },
  'controls.rotationWide': { ja: 'ランダム（-60°〜60°）', en: 'Random (-60° to 60°)' },
  'controls.wordSpacing': { ja: '単語間隔', en: 'Word Spacing' },
  'controls.wordSpacingHint': {
    ja: '{min}〜{max}px の範囲でスライダーまたは直接入力できます。',
    en: 'Use slider or type a value between {min} and {max}px.',
  },
  'controls.fileReadError': { ja: 'ファイルの読み込みに失敗しました。', en: 'Failed to read file.' },

  // --- WordCloudPreview.tsx ---
  'preview.wordCount': { ja: '表示語数', en: 'Displayed words' },
  'preview.ariaLabel': { ja: '日本語ワードクラウド', en: 'Word Cloud' },
  'preview.calculating': { ja: 'レイアウトを計算しています...', en: 'Calculating layout...' },
  'preview.noWordsDetail': { ja: '抽出できる単語が見つかりません。設定を確認してください。', en: 'No words found. Check your settings.' },
  'preview.downloadFailed': { ja: '画像の生成に失敗しました。', en: 'Failed to generate image.' },
  'colorRule.frequency': { ja: '頻度ベース', en: 'By Frequency' },
  'colorRule.pos': { ja: '品詞ベース', en: 'By Part of Speech' },
  'colorRule.scheme': { ja: '単語ベース', en: 'By Word' },

  // --- ProjectListModal.tsx ---
  'projectList.title': { ja: 'プロジェクトを開く', en: 'Open Project' },
  'projectList.loading': { ja: '読み込み中...', en: 'Loading...' },
  'projectList.error': { ja: 'プロジェクト一覧の取得に失敗しました。', en: 'Failed to load project list.' },
  'projectList.empty': { ja: '保存されたプロジェクトはありません。', en: 'No saved projects.' },
  'projectList.delete': { ja: '削除', en: 'Delete' },
  'projectList.deleteConfirm': { ja: '削除?', en: 'Delete?' },
  'projectList.deleteFailed': { ja: '削除に失敗しました。', en: 'Failed to delete.' },

  // --- SaveProjectModal.tsx ---
  'saveModal.title': { ja: 'プロジェクトを保存', en: 'Save Project' },
  'saveModal.nameLabel': { ja: 'プロジェクト名', en: 'Project Name' },
  'saveModal.namePlaceholder': { ja: 'プロジェクト名を入力', en: 'Enter project name' },
  'saveModal.cancel': { ja: 'キャンセル', en: 'Cancel' },
  'saveModal.save': { ja: '保存', en: 'Save' },
  'saveModal.saving': { ja: '保存中...', en: 'Saving...' },
  'saveModal.saveFailed': { ja: '保存に失敗しました。', en: 'Failed to save.' },

  // --- useKuromojiTokenizer.ts ---
  'kuromoji.scriptFailed': { ja: 'kuromojiスクリプトの読み込みに失敗しました。', en: 'Failed to load kuromoji script.' },
  'kuromoji.scriptNotLoaded': { ja: 'kuromojiのスクリプトが読み込まれていません。', en: 'Kuromoji script not loaded.' },
  'kuromoji.dictFailed': { ja: '辞書の読み込みに失敗しました。', en: 'Failed to load dictionary.' },
  'kuromoji.loadFailed': { ja: 'kuromojiの読み込みに失敗しました。', en: 'Failed to load kuromoji.' },

  // --- constants/colors.ts ---
  'color.vivid': { ja: 'ビビッド', en: 'Vivid' },
  'color.sunset': { ja: 'サンセット', en: 'Sunset' },
  'color.forest': { ja: 'フォレスト', en: 'Forest' },
  'color.mono': { ja: 'モノトーン', en: 'Monotone' },

  // --- constants/aspectRatios.ts ---
  'aspect.square': { ja: '正方形 (1:1)', en: 'Square (1:1)' },
  'aspect.portrait': { ja: '縦長 (3:4)', en: 'Portrait (3:4)' },
  'aspect.landscape': { ja: '横長 (16:9)', en: 'Landscape (16:9)' },

  // --- Sample text ---
  'sampleText': {
    ja: `生成AIやデータビジュアライゼーションへの注目が高まるなか、テキストデータを素早く把握する手法としてワードクラウドが再評価されています。文章全体を一読しても掴みにくい特徴語が、サイズや色で視覚的に浮かび上がることで、メッセージの核や語彙の偏りを即座に把握できます。

ユーザーローカルのようなWebサービスでは、テキストを貼り付けるだけでリアルタイムに可視化でき、ストップワードの調整やレイアウト変更にも対応しています。本プロジェクトでは、日本語文章を前提に、SVGベースで高解像度に出力できるワードクラウドツールをReactで実装し、レポートやスライドに組み込みやすい形で提供することを目指します。`,
    en: `As interest in generative AI and data visualization grows, word clouds are being re-evaluated as a quick way to grasp text data. Characteristic words that are hard to catch when reading an entire document stand out visually through size and color, enabling instant comprehension of a message's core and vocabulary distribution.

This project implements a React-based word cloud tool that generates high-resolution SVG output from Japanese text using morphological analysis, designed for easy embedding in reports and presentations.`,
  },
} as const

export type TranslationKey = keyof typeof translations
export default translations
