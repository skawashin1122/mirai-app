# GitHub Pages公開マニュアル（大学生向け）

## 1. このマニュアルでできること

- GitHubにあるWebアプリを無料で公開できる
- URLをそのまま提出物やポートフォリオに使える
- 白画面トラブルを自分で切り分けできる

対象例:

- Vite + React
- リポジトリ名: mirai-app
- 公開URL: https://ユーザー名.github.io/リポジトリ名/

---

## 2. 事前準備

1. GitHubアカウントを作成済み
2. Node.jsをインストール済み
3. ローカルでアプリが起動する
4. mainブランチにpushできる

---

## 3. 最重要ポイント（先に理解）

GitHub Pagesでは、プロジェクトページはサブパスで公開される。

- 公開先が https://yourname.github.io/mirai-app/ の場合
- Viteのbaseは /mirai-app/ にする

ここがズレると、CSS/JSの取得先が間違い、白画面になる。

---

## 4. Vite設定

vite.config.ts に base を設定する。

例:

base: '/mirai-app/'

注意:

- リポジトリ名を変えたら base も同じ名前に更新
- 末尾スラッシュを忘れない

---

## 5. GitHub Actionsで公開（推奨）

GitHub Pagesは「ビルド済みの dist」を公開する。
ソースそのもの（src/main.tsx）を公開しない。

流れ:

1. mainにpush
2. Actionsで build
3. dist をアップロード
4. GitHub Pagesへデプロイ

ポイント:

- Sourceは GitHub Actions を選ぶ
- 成功表示でも反映に少し時間差がある場合がある

---

## 6. 公開確認の手順

1. Actionsで最新実行が Success か確認
2. 公開URLにアクセス
3. ブラウザで強制再読み込み（Ctrl + F5）
4. 開発者ツールのConsoleとNetworkを見る

正常時の目安:

- /mirai-app/assets/... のJS/CSSが200で取れる
- 画面が描画される

---

## 7. よくあるエラーと対処

### 症状A: 真っ白

代表エラー:

- GET /src/main.tsx 404

原因:

- ビルド済みファイルではなく、開発用エントリを参照している

対処:

1. base設定を確認
2. GitHub PagesのSourceをGitHub Actionsに設定
3. 再デプロイを実行
4. Ctrl + F5で再確認

### 症状B: favicon.ico 404

原因:

- faviconが未配置

対処:

- 必要なら public/favicon.ico を追加
- 見た目だけの404で、アプリ表示自体には通常影響しない

### 症状C: Actionsは成功だが表示が古い

原因:

- 反映タイミングやキャッシュ

対処:

1. 再デプロイを1回実行
2. ブラウザでハードリロード
3. シークレットウィンドウで確認

---

## 8. 提出前チェックリスト

- URLが開ける
- スマホ表示でも崩れない
- Consoleに致命的エラーがない
- READMEに公開URLを記載した
- 最終コミットメッセージが分かりやすい

---

## 9. トラブル時の相談テンプレ

以下をコピペして共有すると、解決が速い。

- 公開URL:
- Actionsの実行名と結果:
- Consoleの先頭エラー:
- Networkで404のファイル名:
- 直前に変更した設定:

---

## 10. まとめ

- GitHub Pages公開で最重要なのは base と dist 配信
- 白画面は多くの場合、パス不一致か未ビルド配信
- 成功済みでも再デプロイ + ハードリロードで直ることがある

この3点を押さえれば、授業課題でも個人作品でも安定して公開できる。
