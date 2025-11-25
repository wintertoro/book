import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// Use the default client which picks up env vars or default location
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "file:./dev.db" 
        }
    }
});

interface JsonBook {
// ... (rest is same)
  id: string;
  title: string;
  author?: string;
  genres?: string[];
  addedAt: string;
  coverUrl?: string;
  pageCount?: number;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  quotes?: any[];
  pagePhotos?: any[];
}

async function main() {
  const userId = 'dev-user-123'; // Default dev user
  const dataDir = path.join(process.cwd(), 'data');

  // 1. Create User if not exists
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: 'dev@example.com',
      name: 'Dev User',
    },
  });

  console.log('Migrating Library Books...');
  try {
    const booksPath = path.join(dataDir, `books-${userId}.json`);
    const booksData = await fs.readFile(booksPath, 'utf-8');
    const books = JSON.parse(booksData);

    for (const book of books as JsonBook[]) {
      // Check if book exists first
      const existing = await prisma.book.findUnique({ where: { id: book.id } });
      if (!existing) {
        await upsertBook(book, userId, false);
      }
    }
  } catch (e) {
    console.log('No library book file found or error reading:', e);
  }

  console.log('Migrating Wishlist Books...');
  try {
    const wishlistPath = path.join(dataDir, `wishlist-${userId}.json`);
    const wishlistData = await fs.readFile(wishlistPath, 'utf-8');
    const wishList = JSON.parse(wishlistData);

    for (const book of wishList as JsonBook[]) {
        const existing = await prisma.book.findUnique({ where: { id: book.id } });
        if (!existing) {
            await upsertBook(book, userId, true);
        }
    }
  } catch (e) {
    console.log('No wishlist file found or error reading:', e);
  }
}

async function upsertBook(book: JsonBook, userId: string, inWishlist: boolean) {
  // Create/Connect Genres
  const genreConnect = book.genres?.map(g => ({
    where: { name: g },
    create: { name: g }
  })) || [];

  // Insert Book
  const createdBook = await prisma.book.create({
    data: {
      id: book.id,
      title: book.title,
      author: book.author,
      userId: userId,
      inWishlist: inWishlist,
      status: inWishlist ? 'TBR' : 'TBR',
      addedAt: new Date(book.addedAt),
      genres: {
        connectOrCreate: genreConnect
      }
    }
  });

  console.log(`Migrated: ${book.title} (${inWishlist ? 'Wishlist' : 'Library'})`);

  // Migrate Quotes
  if (book.quotes && book.quotes.length > 0) {
    for (const quote of book.quotes) {
      await prisma.quote.create({
        data: {
          id: quote.id,
          text: quote.text,
          pageNumber: quote.pageNumber,
          createdAt: new Date(quote.createdAt || Date.now()),
          bookId: createdBook.id,
          userId: userId,
          pagePhotoId: quote.pagePhotoId
        }
      });
    }
    console.log(`  - Migrated ${book.quotes.length} quotes`);
  }
  
  // Migrate Page Photos
  if (book.pagePhotos && book.pagePhotos.length > 0) {
      for (const photo of book.pagePhotos) {
          await prisma.pagePhoto.create({
              data: {
                  id: photo.id,
                  url: photo.url,
                  pageNumber: photo.pageNumber,
                  createdAt: new Date(photo.createdAt || Date.now()),
                  bookId: createdBook.id
              }
          });
      }
      console.log(`  - Migrated ${book.pagePhotos.length} photos`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
