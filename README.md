# 投資対効果シミュレーター（ROI Simulator）

「よくある社内の悩み → 導入で時間削減 → 投資対効果の概算」を、その場で試算して見せるツール。
単体の自動見積もりデモとしても、各デモへの埋め込みパーツとしても使う。

## 起動

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ に出力
```

## 設計：3層構造

コピペで各デモに配ると**ロジック修正が過去のデモに反映されず腐る**ため、
「試算アプリは1個だけデプロイして、各デモはiframeで参照する」構成にしている。

```
src/
├─ lib/calc.ts        ← ① エンジン層：試算ロジック（UI非依存・全業界共通）
│                        仕様変更はここだけ。1箇所直せば全デモに即反映。
├─ data/presets/*.json ← ② プリセット層：業界ごとの数字と文言
│                        新業界を足す＝JSONを1個置くだけ（自動で読み込まれる）
├─ components/        ← ③ UI層
└─ lib/url.ts            URL同期・共有リンク・埋め込みタグ生成
```

## 新しい業界を追加する

`src/data/presets/` に JSON を1つ置くだけ。import不要（`import.meta.glob` で自動収集）。

```jsonc
{
  "id": "nursing",                    // URL: ?industry=nursing
  "name": "介護・医療",                // 業界セレクターの表示名
  "tag": "介護モデル｜従業員150名",
  "note": "【想定モデルによる試算】…", // フッターの但し書き
  "categories": [
    {
      "key": "field",                 // field | internal | dashboard の3つ
      "label": "現場・記録",
      "sub": "記録を簡略化する",
      "eyebrow": "よくある現場の悩み｜介護・記録",
      "title": "見出し\n（\\n で改行）",
      "lead": "悩みの説明文",
      "otherLabel": "その業界で一番効くレバー名（年間）",
      "otherHint": "補足",
      "summary": "締めの一文。**ここが強調** になる。",
      "defaults": {
        "people": 60, "cases": 20, "minutes": 25, "reduction": 75,
        "wage": 2800, "other": 2000000, "initial": 2500000, "monthly": 200000
      }
    }
    // internal / dashboard も同様に
  ]
}
```

**効果レバー（`otherLabel` / `other`）の使い分け**が肝。カテゴリごとに変える：

| カテゴリ | レバー | 語り方 |
|---|---|---|
| `field`（現場） | ミス・手戻り・事故の回避 | 工数だけだと弱い。「1回のやり直しのコスト」で語る |
| `internal`（内勤） | 工数削減 | 人数×件数×時給で素直に数字化できる |
| `dashboard`（管理） | 判断スピード・粗利改善 | 工数換算が弱いので「見えれば打ち手が早まる」で語る |

## 試算ロジック

```
月間削減時間   = 人数 × 件数 × 所要分 ÷ 60 × 削減率
月間効果額     = 月間削減時間 × 時給 + その他年間効果 ÷ 12
月間純効果     = 月間効果額 − 月額利用料      ← 月額は効果から先に引く
回収期間（月） = 初期費用 ÷ 月間純効果
3年累計利益    = 月間純効果 × 36 − 初期費用
```

## URL パラメータ

数字はすべてURLに載る。**商談でスライダーを動かした結果を、そのままリンクで送れる。**

| param | 意味 | 例 |
|---|---|---|
| `industry` | 業界ID | `construction` |
| `cat` | カテゴリ | `field` / `internal` / `dashboard` |
| `people` `cases` `min` `red` | 人数・件数・所要分・削減率 | `80` `20` `25` `75` |
| `wage` `other` `init` `mo` | 時給・その他効果・初期費用・月額 | `3500` `3000000` `3000000` `250000` |
| `embed` | `1` で埋め込みモード | ヘッダー・業界セレクターを隠す |

```
https://<your-app>.vercel.app/?industry=construction&cat=field&people=80&red=75
```

## 各デモへの埋め込み

Vite / Next.js / 素のHTML どれでも同じ2行。画面右下の「埋め込みタグをコピー」から取得できる。

```html
<iframe src="https://<your-app>.vercel.app/embed?industry=construction&cat=field&embed=1"
        style="width:100%;border:0;border-radius:14px" height="1180" loading="lazy"></iframe>
```

**高さ自動調整**（任意）。埋め込み側は親に高さを `postMessage` で通知する：

```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'roi-simulator:height') {
    document.querySelector('#roi-iframe').style.height = e.data.height + 'px'
  }
})
```

Next.js の場合も同じ。`<iframe>` をそのまま JSX に置くだけで、
`next/script` などの追加は不要。

## デプロイ（Vercel）

```bash
vercel        # プレビュー
vercel --prod # 本番
```

`vercel.json` で以下を設定済み：
- SPA rewrite（`/embed` を index.html に流す）
- `frame-ancestors *` （他ドメインのデモから iframe 埋め込みを許可）

> 埋め込み先を自社ドメインだけに絞りたくなったら、`vercel.json` の
> `frame-ancestors *` を `frame-ancestors https://*.vercel.app https://your-domain.com` に変更する。

## 注意

数字はすべて**想定モデル**。実データが取れたらプリセットの `defaults` を差し替える。
フッターの但し書き（`note`）は業界JSONごとに設定可能。
