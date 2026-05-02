---
'@yasuakiomokawa/oura-mcp': patch
---

Self-heal credential file permissions: on every load of `config.json` / `tokens.json`, verify the file is `0600` and its parent dir `0700`, and chmod with a warning log if not. Defends against accidental backups, restore-from-tar, or other processes leaving creds group/world readable.
