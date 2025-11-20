/**
 * Script to backfill genres for all existing books
 * Run with: npx tsx scripts/backfill-genres.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { backfillGenres } from '../lib/storage';

async function main() {
  console.log('Starting genre backfill for all users...\n');
  
  const dataDir = path.join(process.cwd(), 'data');
  const files = await fs.readdir(dataDir);
  
  // Find all books-*.json files
  const bookFiles = files.filter(f => f.startsWith('books-') && f.endsWith('.json'));
  
  if (bookFiles.length === 0) {
    console.log('No book files found in data directory');
    return;
  }
  
  // Extract user IDs from filenames
  const userIds = bookFiles.map(f => {
    const match = f.match(/^books-(.+)\.json$/);
    return match ? match[1] : null;
  }).filter((id): id is string => id !== null);
  
  console.log(`Found ${userIds.length} user(s) to process\n`);
  
  let totalUpdated = 0;
  let totalFailed = 0;
  
  for (const userId of userIds) {
    console.log(`\nProcessing books for user: ${userId}`);
    console.log('='.repeat(50));
    
    const result = await backfillGenres(userId);
    totalUpdated += result.updated;
    totalFailed += result.failed;
    
    console.log(`\nUser ${userId}: ${result.updated} updated, ${result.failed} failed`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Backfill complete!');
  console.log(`Total updated: ${totalUpdated} books`);
  console.log(`Total failed: ${totalFailed} books`);
  console.log('='.repeat(50));
}

main().catch(console.error);

