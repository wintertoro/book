import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import ScannerPanel from './components/ScannerPanel'
import './App.css'

type BookOrigin = 'scan' | 'manual'

type Book = {
  id: string
  title: string
  authors: string[]
  isbn?: string
  coverUrl?: string
  origin: BookOrigin
  addedAt: string
}

type Notification = {
  type: 'info' | 'success' | 'error'
  text: string
}

const STORAGE_KEY = 'bookshelf-scanner/books'

const normalizeIsbn = (value: string) => value.replace(/[^\dX]/gi, '')

const loadBooks = (): Book[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((entry) => ({
        ...entry,
        authors: Array.isArray(entry.authors) ? entry.authors : [],
      }))
      .filter((entry) => typeof entry?.title === 'string')
  } catch (error) {
    console.error('Unable to read saved books', error)
    return []
  }
}

const saveBooks = (books: Book[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
}

const fetchBookMetadata = async (isbn: string) => {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Open Library request failed')
  }
  const data = await response.json()
  const entry = data[`ISBN:${isbn}`]
  if (!entry) {
    throw new Error('No metadata found')
  }

  const authors = Array.isArray(entry.authors) ? entry.authors.map((author: { name?: string }) => author.name).filter(Boolean) : []
  const coverUrl = entry.cover?.large ?? entry.cover?.medium ?? entry.cover?.small

  return {
    title: entry.title ?? `ISBN ${isbn}`,
    authors,
    coverUrl,
  }
}

const createManualBook = (title: string, authors: string[], isbn?: string): Book => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
  title: title.trim(),
  authors,
  isbn,
  origin: 'manual',
  addedAt: new Date().toISOString(),
})

function App() {
  const [books, setBooks] = useState<Book[]>(() => loadBooks())
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isFetchingBook, setIsFetchingBook] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [manualForm, setManualForm] = useState({ title: '', authors: '', isbn: '' })

  useEffect(() => {
    saveBooks(books)
  }, [books])

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(null), 4000)
    return () => clearTimeout(timer)
  }, [notification])

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books
    const term = searchTerm.toLowerCase()
    const isbnTerm = normalizeIsbn(searchTerm)
    return books.filter((book) => {
      const inTitle = book.title.toLowerCase().includes(term)
      const inAuthors = book.authors.join(' ').toLowerCase().includes(term)
      const inIsbn = isbnTerm && book.isbn?.includes(isbnTerm)
      return inTitle || inAuthors || inIsbn
    })
  }, [books, searchTerm])

  const showNotification = useCallback((next: Notification) => setNotification(next), [])

  const addBook = useCallback((book: Book) => {
    setBooks((prev) => [book, ...prev])
  }, [])

  const handleScanResult = useCallback(
    async (rawValue: string) => {
      const isbn = normalizeIsbn(rawValue)
      if (!isbn) {
        showNotification({ type: 'error', text: 'The barcode did not include a valid ISBN.' })
        return
      }

      setScannerOpen(false)
      if (books.some((book) => book.isbn === isbn)) {
        showNotification({ type: 'info', text: 'This book is already in your catalog.' })
        return
      }

      setIsFetchingBook(true)
      try {
        const metadata = await fetchBookMetadata(isbn)
        addBook({
          id: isbn,
          isbn,
          title: metadata.title,
          authors: metadata.authors ?? [],
          coverUrl: metadata.coverUrl,
          origin: 'scan',
          addedAt: new Date().toISOString(),
        })
        showNotification({ type: 'success', text: `Added “${metadata.title}”.` })
      } catch (error) {
        console.warn('Falling back to ISBN only', error)
        addBook({
          id: isbn,
          isbn,
          title: `ISBN ${isbn}`,
          authors: [],
          origin: 'scan',
          addedAt: new Date().toISOString(),
        })
        showNotification({ type: 'info', text: 'Saved the ISBN, but metadata was not available.' })
      } finally {
        setIsFetchingBook(false)
      }
    },
    [books, addBook, showNotification],
  )

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!manualForm.title.trim()) {
      showNotification({ type: 'error', text: 'Please include a title before saving.' })
      return
    }
    const isbn = manualForm.isbn ? normalizeIsbn(manualForm.isbn) : undefined
    if (isbn && books.some((book) => book.isbn === isbn)) {
      showNotification({ type: 'info', text: 'A book with this ISBN already exists.' })
      return
    }

    const authors = manualForm.authors
      .split(',')
      .map((author) => author.trim())
      .filter(Boolean)

    const newBook = createManualBook(manualForm.title, authors, isbn)
    addBook(newBook)
    setManualForm({ title: '', authors: '', isbn: '' })
    showNotification({ type: 'success', text: `Added “${newBook.title}”.` })
  }

  const removeBook = (id: string) => {
    setBooks((prev) => prev.filter((book) => book.id !== id))
  }

  const exportBooks = () => {
    if (!books.length) return
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'bookshelf-catalog.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const newestBook = books[0]
  const catalogCount = books.length

  return (
    <div className="app-shell">
      <ScannerPanel open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleScanResult} />

      <header className="hero">
        <div>
          <p className="eyebrow">Bookshelf catalog</p>
          <h1>Scan and remember every book you own</h1>
          <p className="lede">
            Use your camera to capture ISBN barcodes and automatically fetch titles, authors, and covers. Back up the catalog locally
            and export it whenever you need.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={() => setScannerOpen(true)} type="button">
            Open scanner
          </button>
          <button className="secondary" onClick={exportBooks} disabled={!catalogCount}>
            Export JSON
          </button>
        </div>
      </header>

      {notification && <div className={`alert ${notification.type}`}>{notification.text}</div>}
      {isFetchingBook && <div className="inline-status">Looking up book details…</div>}

      {newestBook && (
        <section className="last-added">
          <p className="eyebrow">Latest addition</p>
          <div className="last-added-card">
            {newestBook.coverUrl ? (
              <img src={newestBook.coverUrl} alt={`${newestBook.title} cover`} />
            ) : (
              <div className="cover-placeholder">No cover</div>
            )}
            <div>
              <h2>{newestBook.title}</h2>
              <p>{newestBook.authors.length ? newestBook.authors.join(', ') : 'Unknown author'}</p>
              <p className="book-meta">
                {newestBook.isbn && <span>ISBN {newestBook.isbn}</span>}
                <span>Added {new Date(newestBook.addedAt).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid">
        <article className="panel">
          <h2>Add a book manually</h2>
          <p className="panel-lede">Perfect for older books without barcodes or when you already know the details.</p>
          <form className="form" onSubmit={handleManualSubmit}>
            <label>
              Title
              <input required name="title" value={manualForm.title} onChange={(event) => setManualForm((prev) => ({ ...prev, title: event.target.value }))} />
            </label>
            <label>
              Authors
              <input
                name="authors"
                placeholder="Comma-separated list"
                value={manualForm.authors}
                onChange={(event) => setManualForm((prev) => ({ ...prev, authors: event.target.value }))}
              />
            </label>
            <label>
              ISBN (optional)
              <input
                name="isbn"
                inputMode="numeric"
                pattern="[0-9Xx-]*"
                placeholder="978..."
                value={manualForm.isbn}
                onChange={(event) => setManualForm((prev) => ({ ...prev, isbn: event.target.value }))}
              />
            </label>
            <button className="primary" type="submit">
              Save book
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>
                Your catalog <span className="pill">{catalogCount}</span>
              </h2>
              <p className="panel-lede">Search by title, author, or ISBN.</p>
            </div>
            <input placeholder="Search…" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>

          {filteredBooks.length ? (
            <ul className="book-list">
              {filteredBooks.map((book) => (
                <li key={book.id} className="book-card">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" aria-hidden="true" />
                  ) : (
                    <div className="cover-placeholder">No cover</div>
                  )}
                  <div>
                    <h3>{book.title}</h3>
                    <p>{book.authors.length ? book.authors.join(', ') : 'Unknown author'}</p>
                    <p className="book-meta">
                      {book.isbn && <span>ISBN {book.isbn}</span>}
                      <span>{book.origin === 'scan' ? 'Scanned' : 'Manual'} • {new Date(book.addedAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <button className="ghost" type="button" onClick={() => removeBook(book.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <p>No books match “{searchTerm}”.</p>
              <button className="ghost" type="button" onClick={() => setSearchTerm('')}>
                Clear search
              </button>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

export default App
