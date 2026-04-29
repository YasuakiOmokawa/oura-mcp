---
"@yasuakiomokawa/oura-mcp": minor
---

`configure` ウィザードを再入力負担なく回せるよう改善。

- 保存済み Client ID / Callback port を Step 1 でプリフィルし、Enter だけで確定可能に。Client Secret は Enter で「現在値を保持」、新しい値を打つと差し替え。
- 完了後に `npx skills add YasuakiOmokawa/oura-mcp` で oura-api-skill (API リファレンス + recipes) を入れる手順を案内。
- `--force` フラグで保存済み config / tokens を消してゼロから設定し直すモードを追加。`npx @yasuakiomokawa/oura-mcp configure --force` で起動。

参考実装: `freee/freee-mcp` の cli ウィザード。
