---
"@yasuakiomokawa/oura-mcp": patch
---

`/simplify` レビューでの一括修正。

- exchangeCode に 10s timeout 追加
- OAuth callback timer の clearTimeout
- auth-manager で toTokenData 利用
- log level をモジュール init で cache
- tail-call only な async 除去
- 不要 Promise.resolve wrapper 削除
- buildEntry を defaultMcpEntry 集約
- ハードコード 127.0.0.1 を定数化
- What コメント整理
