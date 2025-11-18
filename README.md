# Bookshelf Scanner

Scan the ISBN barcodes on your bookshelf, automatically fetch book details from Open Library, and keep a searchable catalog that lives right in your browser.

The React + Vite frontend lives in `app/` and ships with a camera-powered scanner, manual entry form, local persistence, and JSON export.

## Features
- **Live camera scanning** powered by `@zxing/browser`; throttled to avoid duplicate reads.
- **Automatic enrichment** via the Open Library Books API for titles, authors, and covers.
- **Manual entry** for older books without barcodes (with optional ISBN validation).
- **Search & export** so you can filter by title/author/ISBN and download your catalog as JSON.
- **Local persistence** using `localStorage`, keeping your shelves remembered between sessions.

## Quick start
```bash
cd app
npm install        # first run only
npm run dev        # start Vite on http://localhost:5173
```

Grant camera access when prompted, point the frame at a book’s ISBN barcode, and watch the entry appear. You can also fill out the manual form on the right to add books that don’t have scannable codes.

## Scripts
- `npm run dev` – Vite dev server with hot reload.
- `npm run build` – Type-check and create a production build (outputs to `app/dist`).
- `npm run preview` – Preview the production build locally.

## Committing your work
Inside `/workspace` you can capture the current changes with:

```bash
git add .
git commit -m "Add bookshelf scanner app"
```

(Feel free to pick any message you prefer.) After committing you can push to the remote as usual.