# 投資対効果シミュレーター（ROI Simulator）

「よくある社内の悩み → 導入で時間削減 → 投資対効果の概算」を、その場で試算して見せるツール。
単体の自動見積もりデモとしても、各デモへの埋め込みパーツとしても使う。

## 起動

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ に出力
```

## 設計：3層構造 + 切替軸

コピペで各デモに配ると**ロジック修正が過去のデモに反映されず腐る**ため、
「試算アプリは1個だけデプロイして、各デモはiframeで参照する」構成にしている。

```
src/
├─ lib/calc.ts        ← ① エンジン層：試算ロジック（UI非依存・全業界共通）
│                        仕様変更はここだけ。1箇所直せば全デモに即反映。
├─ lib/estimate.ts    ← ② 見積もり層：質問回答から開発費・月額のレンジを概算
├─ data/presets/*.json ← ③ プリセット層：業界ごとの数字と文言
│                        新業界を足す＝JSONを1個置くだけ（自動で読み込まれる）
├─ data/kits/*.json   ← ④ kit層：見積もり質問と係数（用途別に追加）
├─ lib/brand.ts       ← ⑤ ブランド層：社名・ロゴだけ（axeon / ideal）
├─ components/        ← ⑥ UI層
└─ lib/url.ts            URL同期・共有リンク・埋め込みタグ生成
```

### URL での切替（1アプリ）

```text
 ├── brand=axeon | ideal     … ロゴ・社名だけ
 ├── industry=...            … LP・業種ページで固定
 ├── kit=...                 … 何を作るか（必要なら固定）
 └── embed / ui              … ヘッダー出すか・親に任せるか
```

| 用途 | 例 |
|---|---|
| AXEON フル版 | `/?` または `/?brand=axeon` |
| ideal フル版 | `/?brand=ideal` |
| フル版を iframe（ヘッダーあり） | `/embed?brand=ideal&ui=full&embed=1` |
| LP・デモの薄い埋め込み | `/embed?kit=chatbot&industry=manufacturing&embed=1` |
| 顧客への送付 | `/?kit=chatbot&industry=construction` |

**kit / 送付URLの一覧:** [docs/kit-url-catalog.md](docs/kit-url-catalog.md)

ロゴ画像を使う場合は `public/brands/` に置き、`src/lib/brand.ts` の `logoSrc` を有効化する。
ビルド時デフォルトブランド: `VITE_DEFAULT_BRAND=ideal`

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
| `kit` | 見積キットID | `chatbot` / `report-auto` など |
| `brand` | 社名・ロゴ | `axeon`（省略可） / `ideal` |
| `embed` | `1` で埋め込みモード | 高さ postMessage。ヘッダーは `ui` 次第 |
| `ui` | `full` / `minimal` | embed 時のみ。`full` でヘッダー表示 |
| `from` | 流入元メモ | `lp-mfg` / `demo-x` |
| `people` `cases` `min` `red` | 人数・件数・所要分・削減率 | `80` `20` `25` `75` |
| `wage` `other` `init` `mo` | 時給・その他効果・初期費用・月額 | `3500` `3000000` `3000000` `250000` |

```
https://<your-app>.vercel.app/?industry=construction&cat=field&people=80&red=75
https://<your-app>.vercel.app/?brand=ideal
https://<your-app>.vercel.app/embed?kit=chatbot&industry=manufacturing&embed=1
```

## 各デモへの埋め込み

Vite / Next.js / 素のHTML どれでも同じ2行。画面右下の「埋め込みタグをコピー」から取得できる
（コピー時は **minimal**＝ヘッダーなし。フル版埋め込みは下の `ui=full` を使う）。

```html
<iframe src="https://<your-app>.vercel.app/embed?industry=construction&cat=field&kit=chatbot&embed=1"
        style="width:100%;border:0;border-radius:14px" height="1400" loading="lazy"></iframe>
```

自社サイトに **フル版＋社名** を埋め込む例:

```html
<iframe src="https://<your-app>.vercel.app/embed?brand=ideal&ui=full&embed=1"
        style="width:100%;border:0;border-radius:14px" height="1400" loading="lazy"></iframe>
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

---

# 概算見積もりエンジン（kit）

`?kit=chatbot` を付けると、ROIシミュレーターの前に**質問→概算レンジ**のステップが出る。
レンジの**上限**が自動的に「導入の初期費用／毎月の利用料」に入り、そのまま損益分岐グラフに繋がる。

```
デモ → iframe: /embed?kit=chatbot&industry=construction&from=demo-x
                 ↓ iframeの中で完結（デモ側は何も渡さない・何も受け取らない）
               ① 質問に答える
               ② 概算レンジ表示（例：450〜560万円）
               ③ 上限を初期費用に自動投入 → 回収グラフ
```

## ★ 最初にやること：人日の較正

**現在すべての人日・単価は 0（未設定）です。** このままでは金額は表示されません
（`calibrated=false` のガードが働き、`¥0` を客に見せる事故を防いでいます）。

`src/data/kits/*.json` の以下を、**過去案件の実績**で埋める：

| フィールド | 意味 | 埋め方 |
|---|---|---|
| `unitPrice` | 人日単価（円） | 20年エンジニア単価＋マージン |
| `baseDays` | デモ流用でも残る最低人日 | 接続・設定・納品など |
| `setupFee` | **土台利用料**（再利用資産の対価） | デモ資産の対価。環境構築費ではない |
| `questions[].options[].days` | 人日の**加算** | その選択肢を選んだら何日増えるか |
| `questions[].options[].factor` | 係数の**乗算** | 1.0 = 影響なし、1.2 = 2割増 |
| `questions[].options[].monthlyAdd` | 月額の**加算**（円） | SLA・運用サポートなど |
| `questions[].optional` | UI で追加回答枠に入れる | `true` なら基本4問の外 |
| `questions[].unansweredMode` | 未回答時の扱い | `range`（幅を広げる）/ `high`（重い方固定） |
| `monthly.infra` / `monthly.usage` | インフラ／AI従量の月額（円） | 実績 |
| `monthly.maintenanceRate` | 保守：開発費に対する年率 | 外注原価に合わせて調整 |
| `rangeSpread` | 全問回答時にも残す誤差 | 既定 `{low:0.85, high:1.25}` |

> 過去案件を3〜5件棚卸しして「あのLINE連携、実際は何日だったか」を入れるのが唯一の正解。
> ここが実績でないと、出てくる見積もりは体裁のいい嘘になる。

**下限（`devLow`）が赤字ラインを割らないか必ず確認すること。** 安く出る見積もりは自分の首を絞める。

## レンジの計算

```
回答済み → その選択肢で確定
未回答 + unansweredMode "range" → 最安／最高の両端（幅が広がる）
未回答 + unansweredMode "high"  → 重い方を両端に固定（安い見積事故を防ぐ）

人日Low  = (baseDays + Σ days_low) × Π factor_low
人日High = (baseDays + Σ days_high) × Π factor_high
開発費Low  = (人日Low  × unitPrice + setupFee) × rangeSpread.low
開発費High = (人日High × unitPrice + setupFee) × rangeSpread.high
月額 = infra + usage + Σ monthlyAdd + (開発費 × maintenanceRate ÷ 12)
```

**答えるほど幅が狭まるのは演出ではなく、実際に不確実性が減っているから。**
情シス審査・データ取り込みなど `unansweredMode: "high"` の項目は、未回答のあいだ安い側に倒れません。

ROIには常に**上限**が渡る。厳しい方の金額で回収が成立すれば、どう転んでも成立するため。

## 新しいデモ用の質問セットを足す

`src/data/kits/` に JSON を1個置くだけ（`chatbot.json` を複製して質問を差し替える）。

```jsonc
{
  "id": "shift-management",        // ?kit=shift-management
  "name": "シフト管理の自動化",
  "summary": "希望を集めて、シフト案を自動で作る",
  "unitPrice": 0, "setupFee": 0, "baseDays": 0,
  "monthly": { "infra": 0, "usage": 0, "maintenanceRate": 0.12 },
  "rangeSpread": { "low": 0.85, "high": 1.25 },
  "questions": [
    {
      "id": "staff",
      "label": "シフトに入る人は何人くらいですか？",
      "hint": "任意の補足",
      "options": [
        { "value": "s", "label": "〜20人", "factor": 1 },
        { "value": "l", "label": "21人以上", "factor": 1 }
      ]
    }
  ]
}
```

### 質問設計の鉄則

- **金額が動かない質問は入れない。** 答えても数字が変わらない質問は、離脱を生むだけ
- **3〜5問が上限。** それ以上は答えてもらえない
- **`days`（加算）と `factor`（乗算）を使い分ける**
  - 機能が増える＝`days`（ログイン機能、帳票の種類数）
  - 全体が重くなる＝`factor`（利用人数、既存システム連携、デザイン作り込み）
- **`factor` に 0 を入れない**（全部が消える）。影響なしは `1`

## リード情報としての活用

回答は `a_<質問id>` としてURLに載る（例：`?kit=chatbot&a_files=l&a_users=l&a_integration=many`）。
問い合わせフォームにこのURLを引き継げば、**初回コンタクト前に規模感が分かる。**

`?from=demo-xxx` を付けておくと、どのデモが問い合わせを生んでいるかを追える。
