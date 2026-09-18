# Arham Electronics — ERP

A single-file, self-contained ERP web app for Arham Electronics (Products, Inventory, Sales, Purchases, Customers, Suppliers, Ledger, Payments, Expenses, Reports, Backup). Seeded with data imported from Arham Electronics' original stock and ledger files.

No backend, no build step — it's one HTML file (`index.html`) with everything inlined. Data is stored in each visitor's own browser (localStorage), so every person who opens the page has their own separate copy of the working data (all starting from the same imported dataset).

## Run it on GitHub Pages (free hosting, ~2 minutes)

1. Create a new repository on GitHub (e.g. `arham-erp`). Public or private both work with GitHub Pages (private repos need GitHub Pro/Team/Enterprise for Pages).
2. Upload `index.html` from this folder to the root of that repository.
   - Easiest way: on the repo page, click **Add file → Upload files**, drag in `index.html`, then **Commit changes**.
3. Go to the repo's **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Under **Branch**, choose `main` and folder `/ (root)`, then **Save**.
6. Wait 1–2 minutes. GitHub will show a link like:
   `https://<your-username>.github.io/arham-erp/`
   That's your live ERP — open it and log in as Admin/Manager/Staff.

## Running it locally instead (no GitHub needed)

Just double-click `index.html` — it opens directly in any modern browser (Chrome, Edge, Firefox). No server required.

## Important notes

- **Data lives per-browser.** If you open the GitHub Pages link on your phone and on your laptop, they will NOT share data automatically — each browser keeps its own copy in localStorage. Use **Backup → Download Backup** to export a snapshot and **Restore** to load it on another device.
- **This is a single-user prototype**, not a multi-user server-backed system. Anyone with the link can open the app, but their edits only save to their own browser, not to a shared database. If you need multiple staff members updating the same live data, that needs an actual backend (a real database + server) rather than GitHub Pages.
- The three original Arham Electronics files this app was built from are **not** included here and were never modified — only their data was copied into the app's starting dataset.
- To reset everything back to the originally imported data at any time, use **Backup → Reset to Imported Data** inside the app.
