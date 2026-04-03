---
name: Node Version + npm Workaround
description: Node 22 breaks Next.js 15 edge runtime; use Node 20 binary for dev server
type: project
---

**Node 22 is incompatible with Next.js 15 edge runtime** — crashes on `@edge-runtime/primitives/load.js`.

NVM for Windows is broken — all version folders (v16, v18, v20) contain the same Node 22 binary.

**Solution: Downloaded real Node 20 binary**
- Location: `C:\Users\farza\.node20\node-v20.18.3-win-x64\`
- Start dev server with:
  ```bash
  cd "D:/Amira FinIQ/ale-build"
  PATH="/c/Users/farza/.node20/node-v20.18.3-win-x64:$PATH" \
    "/c/Users/farza/.node20/node-v20.18.3-win-x64/node.exe" \
    node_modules/next/dist/bin/next dev --port 3000
  ```
- npm install: use Node 20's bundled npm
  ```bash
  "/c/Users/farza/.node20/node-v20.18.3-win-x64/node.exe" \
    "/c/Users/farza/.node20/node-v20.18.3-win-x64/node_modules/npm/bin/npm-cli.js" install
  ```

**Why:** NVM overwrote all Node binaries with v22. Downloaded clean Node 20.18.3 to separate dir.
**How to apply:** Always use the Node 20 path for this project. PATH must include Node 20 dir so child processes also use it.
