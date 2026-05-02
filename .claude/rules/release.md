---
paths: [".changeset/**", "CHANGELOG.md", "package.json", "skills/**"]
---

# リリースフロー（changesets 必須）

**ユーザーに見える変更（バグ fix / feature / breaking change）を含む PR を作る時は必ず changeset を同梱する。**
docs only / CI only / 内部リファクタは除外可（その場合も判断つかなければ作る）。

**skill 変更（`skills/**`）も changeset 対象**。npm package には同梱されないが、recipe / SKILL.md の改修は skill consumer にとって user-visible な挙動変化なので CHANGELOG に載せる。`@yasuakiomokawa/oura-mcp` の patch bump で運用する。

## 手順

1. 変更ブランチで `npx changeset` を実行（または `.changeset/<name>.md` を手書き）
   - `@yasuakiomokawa/oura-mcp` を選択
   - `patch` / `minor` / `major` を選択（0.x 期間中は breaking でも minor）
   - 変更概要を 1〜2 段落で書く
2. 生成された `.changeset/<name>.md` を一緒にコミット
3. PR を main に merge する → `changesets/action` が **"chore: release packages"** PR を自動作成（既存があれば更新）。中身は `npx changeset version` の出力（version bump + CHANGELOG + `.changeset/*.md` 消費）
4. その PR を merge する → `release.yml` が同コミット上で `npx changeset publish` を実行し、npm publish + GitHub Release + git tag を自動付与。続けて MCP Registry にも publish

`git tag` / `git push origin vX.Y.Z` の手動操作は不要。

## CHANGELOG.md フォーマット規約

- changesets-native 形式（`# @yasuakiomokawa/oura-mcp` → `## X.Y.Z` → `### Patch/Minor/Major Changes`）を維持する
- 手で intro paragraph や Keep a Changelog 形式の link references を入れない
  （`npx changeset version` の挿入位置が壊れて毎回手修正が必要になるため）

## changeset 本文の書き方

- **一行で端的に書く**（CHANGELOG / リリースノートで一覧された時に読みやすい）
- 詳しい背景・実装ノートは PR description / commit body 側に逃がす

## バージョニング

- `0.x.y`: breaking change を **minor バンプで許容**（npm 慣習）
- `1.x.y`: breaking change は major バンプ必須
