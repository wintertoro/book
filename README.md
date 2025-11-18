# Book Library - OCR Book Catalog

A web application that uses OCR (Optical Character Recognition) to automatically catalog your physical book collection. Simply take photos of your books, and the app will extract book titles and create a searchable digital library.

## Features

- 🔐 **Google SSO**: Secure authentication with Google Sign-In
- 👤 **User-Specific Libraries**: Each user has their own private book collection
- 📸 **Photo Upload**: Take photos or upload images of your book collection
- 🔍 **OCR Processing**: Automatically extracts book titles from images using Tesseract.js with improved filtering
- 🚫 **Smart Deduplication**: Advanced fuzzy matching prevents duplicate entries when the same book appears in multiple photos
- ➕ **Manual Entry**: Add books manually if OCR doesn't capture them
- 📋 **Searchable Library**: View and search through your cataloged books
- 📥 **Export Functionality**: Export your library as CSV or JSON
- 🗑️ **Book Management**: Remove books from your library
- ⏳ **Progress Indicators**: Visual feedback during OCR processing

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun
- Google Cloud Console account (for OAuth setup)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (for development)
   - Copy the Client ID and Client Secret

3. Create a `.env.local` file in the root directory:
```bash
# Generate a secret key (run: openssl rand -base64 32)
AUTH_SECRET=your-generated-secret-key-here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# For production, set this to your domain
NEXTAUTH_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser
6. Sign in with your Google account to access your personal book library

## How to Use

1. **Add Books from Photo**: 
   - Click "Camera" to take a photo of your books, or "Choose File" to upload an existing image
   - Wait for OCR processing (10-30 seconds)
   - See which books were found and added to your library

2. **Add Books Manually**: 
   - Click "Add Manually" button
   - Enter the book title and click "Add"

3. **Browse Your Library**: 
   - Search through your cataloged books using the search bar
   - View book count and details

4. **Export Your Library**: 
   - Click "CSV" or "JSON" to download your library

5. **Manage Books**: 
   - Delete books by hovering over a book and clicking "Remove"

## Technical Details

- **Framework**: Next.js 16 with App Router
- **Authentication**: NextAuth.js v5 with Google OAuth provider
- **OCR Engine**: Tesseract.js
- **Storage**: JSON file-based storage (user-specific files stored in `/data/books-{userId}.json`)
- **Styling**: Tailwind CSS with modern minimalist design

## Notes

- **Authentication**: All routes are protected and require Google sign-in
- **User Data**: Each user's books are stored in separate files (`books-{userId}.json` and `wishlist-{userId}.json`)
- **OCR Accuracy**: Depends on image quality, lighting, and text clarity
- **Deduplication**: Uses advanced fuzzy matching with word overlap detection and Levenshtein distance to identify similar titles
- **OCR Filtering**: Automatically removes common artifacts like page numbers, dates, ISBNs, and metadata
- **Storage**: Book data is stored locally in the `data` directory (excluded from git)
- **Processing Time**: Varies based on image size and complexity (typically 10-30 seconds)

## Development

The app consists of:
- `app/page.tsx` - Main page component with library management
- `app/api/process-image/route.ts` - API endpoint for OCR processing with improved title extraction
- `app/api/books/route.ts` - API endpoint for book management (GET, POST, DELETE)
- `app/api/export/route.ts` - API endpoint for exporting books (CSV/JSON)
- `lib/storage.ts` - Book storage and advanced deduplication logic
- `components/PhotoUpload.tsx` - Photo upload component with progress indicator
- `components/BookList.tsx` - Book library display component with search
- `components/ManualBookEntry.tsx` - Manual book entry form component
