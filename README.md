# CineLedger

> Accounts for the silver screen.

A white-label accounting and bill-ledger web app for film productions.
© 2026 BrandEpic by Aang

---

## ⚠️ CRITICAL — folder structure must be exactly this

If you download files one-by-one from the artifact, **the `src/` folder will be flattened** and Vite will fail with `Failed to load url /src/main.jsx`. Use the provided `CineLedger.zip` and just unzip it — it preserves the exact layout below.

```
CineLedger/                          ← unzip here (your repo root)
├── index.html                       ← Vite entry
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── README.md
├── cine-ledger-apps-script.gs       ← Google Apps Script (deployed separately)
├── src/
│   ├── App.jsx                      ← the full app (~2700 lines)
│   ├── main.jsx                     ← React mount point
│   └── index.css                    ← Tailwind directives
└── .github/
    └── workflows/
        └── deploy.yml               ← GitHub Pages auto-deploy
```

To verify: open a terminal in your repo root and run `dir src` (Windows) or `ls src` (Mac/Linux). You **must** see `App.jsx`, `main.jsx`, and `index.css`. If they're missing, Vite cannot load the app.

---

## First-time setup

```bash
cd C:\Users\1234\Documents\GitHub\CineLedger
npm install
npm run dev
```

Opens at `http://localhost:5173/CineLedger/`.

> If you see `Failed to load url /src/main.jsx`, the folder structure is wrong. See the warning above.

---

## Apps Script (Drive backend)

The current deployment URL is hard-coded as the default in `src/App.jsx`:

```
https://script.google.com/macros/s/AKfycbyz8bfG08Tv5aZKJrpeuzyu65EFLm9v9quA2GJDqG7FBybD6KFTn6pvVbD8Eg7uT4IgSg/exec
```

If you ever rotate the Apps Script deployment, paste the new `/exec` URL into Settings → Apps Script Web App URL and click Save.

### Updating the Apps Script without changing the URL

1. Open <https://script.google.com>, find your CineLedger project.
2. Paste the contents of `cine-ledger-apps-script.gs` into `Code.gs`.
3. **Deploy → Manage deployments → ✏️ (edit) → Version: New version → Deploy.**
   The URL stays identical.

---

## Deploy to GitHub Pages

1. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Deploy CineLedger"
   git push origin main
   ```
2. On GitHub repo → **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Wait ~2 minutes for the workflow to finish, then visit:
   ```
   https://neurolooom-eng.github.io/CineLedger/
   ```

Every subsequent `git push origin main` redeploys automatically.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Failed to load url /src/main.jsx` | `src/` folder is missing or flattened | Unzip `CineLedger.zip` cleanly into a fresh folder; verify `src/main.jsx` exists |
| `'npm' is not recognized` | Node.js not installed | Install Node 20 LTS from <https://nodejs.org> |
| `Module not found: tailwindcss` | Forgot to run `npm install` | Run `npm install` from the repo root |
| Site loads at `/` but blank | Wrong `base` in `vite.config.js` | For GitHub Pages: `base: '/CineLedger/'`; for Vercel/root domain: `base: '/'` |
| Drive Sync "Failed to fetch" | Running in Claude artifact preview (sandbox blocks script.google.com) | Test from the deployed GitHub Pages site instead |
| Drive Sync still fails after deploy | Apps Script not deployed as "Anyone" access | Apps Script editor → Deploy → Manage → check "Who has access: Anyone" |
