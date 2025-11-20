# 📚 Digital Library - AI-Powered Book Catalog

A sleek, modern web application that uses OCR (Optical Character Recognition) to automatically catalog your physical book collection. Simply take photos of your books, and the app will extract book titles and create a beautiful, searchable digital library.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

### 🔒 **Authentication & Privacy**
- Secure Google SSO authentication
- User-specific libraries with isolated data storage
- Protected routes requiring authentication

### 📸 **Smart Book Detection**
- Photo upload with camera or file selection
- Advanced OCR processing using Tesseract.js
- Intelligent title extraction with filtering of page numbers, ISBNs, and metadata
- Real-time progress indicators during processing

### 📖 **Library Management**
- **My Library**: Track books you own
- **Wish List**: Curate books you want to read
- Move books seamlessly between library and wish list
- One-click Amazon purchase links for wishlist items
- Smart deduplication with fuzzy matching

### 🎨 **Modern UI/UX**
- **Glassmorphism** design with backdrop blur effects
- **Dark mode** support with system preference detection
- Responsive layout optimized for mobile and desktop
- Smooth animations and micro-interactions
- Premium gradient text effects
- Hover-activated actions for clean interface

### 📥 **Data Management**
- Manual book entry for quick additions
- Review detected books before adding to library
- Export library as CSV or JSON
- Searchable book collections
- Delete or move books with ease

### 🔍 **Smart Features**
- Pending review system for OCR-detected titles
- Fuzzy matching prevents duplicate entries
- Progress feedback during image processing
- Toast notifications for user actions

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- **Google Cloud Console** account for OAuth setup

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd book-library
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up Google OAuth**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the **Google+ API**
   - Go to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://yourdomain.com/api/auth/callback/google`
   - Copy the **Client ID** and **Client Secret**

4. **Create environment variables**:

Create a `.env.local` file in the root directory:

```bash
# Generate a secret key (run: openssl rand -base64 32)
AUTH_SECRET=your-generated-secret-key-here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Base URL (update for production)
NEXTAUTH_URL=http://localhost:3000
```

5. **Run the development server**:
```bash
npm run dev
```

6. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000) and sign in with your Google account.

## 📖 How to Use

### Adding Books from Photos

1. Click the **camera icon** to take a photo or **Choose File** to upload an image
2. Wait for OCR processing (typically 10-30 seconds)
3. Review detected book titles in the pending review section
4. Choose to:
   - **Add to Library** for books you own
   - **Add to Wish List** for books you want
   - **Discard** if incorrectly detected

### Manual Book Entry

1. Click the **Add Manually** button
2. Enter the book title
3. Review and add to your library or wishlist

### Managing Your Collection

- **Search**: Use the search bar to find books quickly
- **Move Books**: Click the arrow icon to move between library and wishlist
- **Delete Books**: Hover over a book card and click the delete icon
- **Amazon Links**: Click the Amazon link on wishlist items to purchase

### Exporting Data

- Click **Export CSV** to download your library in spreadsheet format
- Use the API endpoint `/api/export?format=json` for JSON format

### Theme Toggle

- Click the **sun/moon icon** in the header to toggle between light and dark modes
- Theme preference is saved automatically

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19.2
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with custom design system
- **Theme**: Dark mode with glassmorphism effects

### Backend
- **Authentication**: NextAuth.js v5 with Google OAuth
- **OCR Engine**: Tesseract.js 6.0
- **Storage**: JSON file-based (user-specific files)
- **API**: Next.js API Routes

### Features
- Server-side rendering (SSR)
- Client-side interactivity
- Protected API routes
- Responsive design

## 📁 Project Structure

```
book-library/
├── app/
│   ├── api/
│   │   ├── auth/           # NextAuth.js configuration
│   │   ├── books/          # Library CRUD operations
│   │   ├── wishlist/       # Wishlist CRUD operations
│   │   ├── process-image/  # OCR processing endpoint
│   │   └── export/         # Data export endpoint
│   ├── globals.css         # Global styles with glassmorphism
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Main application page
├── components/
│   ├── AuthButton.tsx      # Google sign-in/out button
│   ├── BookList.tsx        # Library display with search
│   ├── WishList.tsx        # Wishlist display with Amazon links
│   ├── PhotoUpload.tsx     # Image upload with progress
│   ├── ManualBookEntry.tsx # Manual book input form
│   ├── ThemeToggle.tsx     # Dark/light mode toggle
│   └── ThemeProvider.tsx   # Theme context provider
├── lib/
│   └── storage.ts          # Book storage and deduplication
├── types/
│   └── book.ts             # TypeScript type definitions
├── data/                   # User book data (gitignored)
│   ├── books-{userId}.json
│   └── wishlist-{userId}.json
└── public/                 # Static assets
```

## 🔐 Data Storage

- **User Isolation**: Each user's data is stored in separate JSON files
- **File Format**: 
  - `data/books-{userId}.json` - User's library
  - `data/wishlist-{userId}.json` - User's wishlist
- **Privacy**: Data files are excluded from version control (`.gitignore`)
- **Persistence**: All changes are automatically saved to disk

## 🎯 Key Features Explained

### Smart Deduplication

The app uses advanced fuzzy matching to prevent duplicate entries:
- **Word Overlap Detection**: Compares common words between titles
- **Levenshtein Distance**: Measures similarity between strings
- **Threshold-based Matching**: Configurable similarity thresholds

### OCR Filtering

Automatically removes common artifacts:
- Page numbers and dates
- ISBNs and barcodes
- Publishing metadata
- Short strings (< 3 characters)
- Non-alphabetic content

### Theme System

- System preference detection on first load
- Persistent theme selection using localStorage
- Smooth transitions between modes
- Optimized color palettes for both themes

## 🚧 Development

### Running Tests
```bash
npm run lint
```

### Building for Production
```bash
npm run build
npm start
```

### Environment Variables
All required environment variables are documented in the setup section. Never commit `.env.local` to version control.

## 📝 Notes

- **OCR Accuracy**: Depends on image quality, lighting, and text clarity
- **Processing Time**: Varies by image size (typically 10-30 seconds)
- **Browser Support**: Modern browsers with ES2020+ support
- **Mobile Responsive**: Optimized for all screen sizes
- **Performance**: Client-side rendering for instant interactions

## 🔮 Future Enhancements

- [ ] Book cover images via Google Books API
- [ ] Advanced search and filtering
- [ ] Reading progress tracking
- [ ] Book ratings and reviews
- [ ] Collection sharing
- [ ] Cloud storage integration
- [ ] Mobile app (React Native)

## 📄 License

This project is private and not yet licensed.

## 🤝 Contributing

This is a personal project. Contributions are welcome via pull requests.

---

**Built with ❤️ using Next.js, React, and modern web technologies**
