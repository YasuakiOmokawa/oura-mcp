---
'@yasuakiomokawa/oura-mcp': patch
---

Replace the unmaintained `prompts` package (last release in 2021) with `@inquirer/prompts` for the `configure` wizard. Functionally equivalent (same fields, same validation), but the prompt UI changes and the dep is now actively maintained. Also pins `tsconfig.compilerOptions.types: ["node"]` to make `@types/node` resolution explicit and not depend on `@types/prompts`'s incidental hoisting.
