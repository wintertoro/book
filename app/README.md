# Bookshelf Scanner (React)

This Vite + TypeScript project powers a camera-based bookshelf catalog. Point your webcam at an ISBN barcode to automatically look up book details from Open Library, or add titles manually when scanning isn’t possible.

## Tech stack
- React 19 + TypeScript
- Vite 7 for dev/build
- `@zxing/browser` for barcode scanning
- Local storage for persistence (no backend required)

## Getting started
```bash
npm install
npm run dev
```

The dev server defaults to <http://localhost:5173>. Grant camera access when prompted. Every successful scan closes the overlay, fetches metadata from Open Library, and saves it locally.

## Available scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check and bundle the production app |
| `npm run preview` | Preview the production build |

## How it works
- `src/components/ScannerPanel.tsx` instantiates `BrowserMultiFormatReader`, throttles duplicate reads, and surfaces camera/device errors.
- `src/App.tsx` manages book state, localStorage persistence, manual entry, Open Library fetches, search, and export.
- Styling lives in `src/App.css` with some global resets in `src/index.css`.

## Environment + permissions
No API keys are needed. The browser will ask for camera permission the first time you open the scanner overlay. All catalog data stays in `localStorage`, so clear-site-data or private windows will remove the books list.
