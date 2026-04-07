/**
 * Seed script: Downloads Hebrew (WLC) and Greek (SBLGNT) Bible texts
 * and populates the metaphor.db SQLite database.
 *
 * Usage: npm run seed   (or: npx tsx scripts/seed.ts)
 */

import Database from 'better-sqlite3';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';
import { BOOKS, SBLGNT_TO_BOOK_ID } from './book-map';
import { initializeSchema, initializeFts } from '../src/lib/schema';

const DB_PATH = path.join(process.cwd(), 'metaphor.db');
const DATA_DIR = path.join(process.cwd(), 'data');
const WLC_DIR = path.join(DATA_DIR, 'wlc');
const SBLGNT_DIR = path.join(DATA_DIR, 'sblgnt');

// --- Helpers ---

async function download(url: string, dest: string): Promise<void> {
  if (fs.existsSync(dest)) {
    console.log(`  [cached] ${path.basename(dest)}`);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text, 'utf-8');
  console.log(`  [downloaded] ${path.basename(dest)}`);
}

function stripAccents(text: string): string {
  // Remove Hebrew cantillation marks (U+0591-U+05AF) but keep vowels (U+05B0-U+05BD, U+05BF, U+05C1-U+05C2, U+05C4-U+05C5, U+05C7)
  return text.replace(/[\u0591-\u05AF]/g, '');
}

// --- Phase A: Download raw data ---

async function downloadWLC() {
  console.log('\n=== Downloading WLC Hebrew texts ===');
  const otBooks = BOOKS.filter(b => b.wlcFile);
  for (const book of otBooks) {
    const url = `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${book.wlcFile}.xml`;
    const dest = path.join(WLC_DIR, `${book.wlcFile}.xml`);
    await download(url, dest);
  }
}

async function downloadSBLGNT() {
  console.log('\n=== Downloading SBLGNT Greek texts ===');
  const ntBooks = BOOKS.filter(b => b.sblgntBook);
  // Get the SBLGNT filenames from the repository listing
  const fileMap: Record<string, string> = {
    '61': '61-Mt-morphgnt.txt',  '62': '62-Mk-morphgnt.txt',
    '63': '63-Lk-morphgnt.txt',  '64': '64-Jn-morphgnt.txt',
    '65': '65-Ac-morphgnt.txt',  '66': '66-Ro-morphgnt.txt',
    '67': '67-1Co-morphgnt.txt', '68': '68-2Co-morphgnt.txt',
    '69': '69-Ga-morphgnt.txt',  '70': '70-Eph-morphgnt.txt',
    '71': '71-Php-morphgnt.txt', '72': '72-Col-morphgnt.txt',
    '73': '73-1Th-morphgnt.txt', '74': '74-2Th-morphgnt.txt',
    '75': '75-1Ti-morphgnt.txt', '76': '76-2Ti-morphgnt.txt',
    '77': '77-Tit-morphgnt.txt', '78': '78-Phm-morphgnt.txt',
    '79': '79-Heb-morphgnt.txt', '80': '80-Jas-morphgnt.txt',
    '81': '81-1Pe-morphgnt.txt', '82': '82-2Pe-morphgnt.txt',
    '83': '83-1Jn-morphgnt.txt', '84': '84-2Jn-morphgnt.txt',
    '85': '85-3Jn-morphgnt.txt', '86': '86-Jud-morphgnt.txt',
    '87': '87-Re-morphgnt.txt',
  };
  for (const book of ntBooks) {
    const filename = fileMap[book.sblgntBook!];
    const url = `https://raw.githubusercontent.com/morphgnt/sblgnt/master/${filename}`;
    const dest = path.join(SBLGNT_DIR, filename);
    await download(url, dest);
  }
}

// --- Phase B: Parse and insert Hebrew OT ---

function parseWLC(db: Database.Database) {
  console.log('\n=== Parsing WLC Hebrew texts ===');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['chapter', 'verse', 'w', 'seg'].includes(name),
    preserveOrder: false,
    trimValues: false,
  });

  const insertVerse = db.prepare(
    'INSERT OR IGNORE INTO verses (book_id, chapter, verse, original_text) VALUES (?, ?, ?, ?)'
  );

  const otBooks = BOOKS.filter(b => b.wlcFile);
  let totalVerses = 0;

  const insertMany = db.transaction(() => {
    for (const book of otBooks) {
      const filePath = path.join(WLC_DIR, `${book.wlcFile}.xml`);
      const xml = fs.readFileSync(filePath, 'utf-8');
      const parsed = parser.parse(xml);

      // Navigate: osis > osisText > div (book) > chapter[] > verse[]
      const osisText = parsed.osis?.osisText;
      if (!osisText) {
        console.error(`  [error] Could not parse ${book.wlcFile}.xml`);
        continue;
      }

      // The div can be at different levels depending on parser config
      let chapters = osisText.div?.chapter;
      if (!chapters) {
        // Try direct access
        const div = osisText.div;
        if (Array.isArray(div)) {
          chapters = div.flatMap((d: any) => d.chapter || []);
        } else {
          chapters = div?.chapter;
        }
      }
      if (!chapters) {
        console.error(`  [error] No chapters found in ${book.wlcFile}.xml`);
        continue;
      }

      if (!Array.isArray(chapters)) chapters = [chapters];
      let bookVerseCount = 0;

      for (const chapter of chapters) {
        // Get chapter number from osisID (e.g., "Gen.1")
        const chapterOsisID = chapter['@_osisID'] || '';
        const chapterNum = parseInt(chapterOsisID.split('.')[1], 10);
        if (!chapterNum) continue;

        let verses = chapter.verse;
        if (!verses) continue;
        if (!Array.isArray(verses)) verses = [verses];

        for (const verse of verses) {
          const osisID = verse['@_osisID'] || '';
          const verseNum = parseInt(osisID.split('.')[2], 10);
          if (!verseNum) continue;

          // Extract text from <w> elements
          const words: string[] = [];
          const wElements = verse.w;
          if (wElements) {
            const wArr = Array.isArray(wElements) ? wElements : [wElements];
            for (const w of wArr) {
              // The text content can be in #text or directly the value
              const text = typeof w === 'string' ? w : (w['#text'] || '');
              if (text) words.push(text.trim());
            }
          }

          // Also handle <seg> elements that appear between words (like maqqef, sof-pasuq)
          // These are already part of the word flow in OSIS
          const verseText = words.join(' ');
          if (verseText) {
            insertVerse.run(book.id, chapterNum, verseNum, verseText);
            bookVerseCount++;
          }
        }
      }

      totalVerses += bookVerseCount;
      console.log(`  ${book.name}: ${bookVerseCount} verses`);
    }
  });

  insertMany();
  console.log(`  Total Hebrew verses: ${totalVerses}`);
}

// --- Phase C: Parse and insert Greek NT ---

function parseSBLGNT(db: Database.Database) {
  console.log('\n=== Parsing SBLGNT Greek texts ===');

  const insertVerse = db.prepare(
    'INSERT OR IGNORE INTO verses (book_id, chapter, verse, original_text) VALUES (?, ?, ?, ?)'
  );

  const ntBooks = BOOKS.filter(b => b.sblgntBook);
  let totalVerses = 0;

  const insertMany = db.transaction(() => {
    for (const book of ntBooks) {
      const files = fs.readdirSync(SBLGNT_DIR).filter(f => f.startsWith(book.sblgntBook!));
      if (files.length === 0) continue;

      const filePath = path.join(SBLGNT_DIR, files[0]);
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());

      // Group words by verse reference
      const verseWords = new Map<string, string[]>();

      for (const line of lines) {
        // Format: BBCCVV POS morph text word normalized lemma
        // Columns are space-separated
        const parts = line.split(/\s+/);
        if (parts.length < 4) continue;

        const ref = parts[0];     // e.g., "010101"
        const text = parts[3];    // text with punctuation

        if (!verseWords.has(ref)) {
          verseWords.set(ref, []);
        }
        verseWords.get(ref)!.push(text);
      }

      let bookVerseCount = 0;

      for (const [ref, words] of verseWords) {
        // Parse reference: first 2 digits = book (within MorphGNT), next 2 = chapter, last 2 = verse
        const chapterNum = parseInt(ref.substring(2, 4), 10);
        const verseNum = parseInt(ref.substring(4, 6), 10);

        const verseText = words.join(' ');
        if (verseText) {
          insertVerse.run(book.id, chapterNum, verseNum, verseText);
          bookVerseCount++;
        }
      }

      totalVerses += bookVerseCount;
      console.log(`  ${book.name}: ${bookVerseCount} verses`);
    }
  });

  insertMany();
  console.log(`  Total Greek verses: ${totalVerses}`);
}

// --- Main ---

async function main() {
  console.log('=== Metaphor Bible Seed Script ===');
  console.log(`Database: ${DB_PATH}`);

  // Delete existing DB for clean seed
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Deleted existing database.');
  }

  // Create fresh database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  console.log('\n=== Initializing schema ===');
  initializeSchema(db);

  // Insert books
  console.log('\n=== Inserting books ===');
  const insertBook = db.prepare(
    'INSERT OR IGNORE INTO books (id, name, abbreviation, testament, language, book_order, chapter_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertBooks = db.transaction(() => {
    for (const book of BOOKS) {
      insertBook.run(book.id, book.name, book.abbreviation, book.testament, book.language, book.bookOrder, book.chapterCount);
    }
  });
  insertBooks();
  console.log(`  Inserted ${BOOKS.length} books`);

  // Download data
  await downloadWLC();
  await downloadSBLGNT();

  // Parse and insert
  parseWLC(db);
  parseSBLGNT(db);

  // Build FTS index
  console.log('\n=== Building FTS5 index ===');
  initializeFts(db);

  // Print summary
  const verseCount = db.prepare('SELECT COUNT(*) as count FROM verses').get() as any;
  const otCount = db.prepare('SELECT COUNT(*) as count FROM verses v JOIN books b ON v.book_id = b.id WHERE b.testament = ?').get('OT') as any;
  const ntCount = db.prepare('SELECT COUNT(*) as count FROM verses v JOIN books b ON v.book_id = b.id WHERE b.testament = ?').get('NT') as any;

  console.log('\n=== Seed Complete ===');
  console.log(`  Total verses: ${verseCount.count}`);
  console.log(`  OT (Hebrew): ${otCount.count}`);
  console.log(`  NT (Greek): ${ntCount.count}`);
  console.log(`  Database size: ${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(1)} MB`);

  db.close();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
