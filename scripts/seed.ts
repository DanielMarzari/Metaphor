/**
 * Seed script: Downloads Hebrew (WLC) and Greek (SBLGNT) Bible texts
 * and populates the metaphor.db SQLite database with word-level data.
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

// --- Helpers for word fields ---

function stripNiqqud(text: string): string {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function toStrongs(lemma: string): string | null {
  if (/^\d/.test(lemma)) return 'H' + lemma.replace(/\s+/g, '');
  return null;
}

// --- Phase B: Parse and insert Hebrew OT ---

interface SegmentData {
  text: string;
  lemma: string;
  morph: string;
}

function parseWLCWord(w: any): SegmentData[] | null {
  const text = typeof w === 'string' ? w : (w['#text'] || '');
  if (!text) return null;
  const lemma = w['@_lemma'] || '';
  const morph = w['@_morph'] || '';

  // Split by '/' into individual segments (each becomes its own word row)
  const textParts = text.trim().split('/');
  const lemmaParts = lemma.split('/');
  const morphParts = morph.split('/');

  return textParts.map((t: string, i: number) => ({
    text: t,
    lemma: lemmaParts[i] || '',
    morph: morphParts[i] || '',
  }));
}

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
  const insertWord = db.prepare(
    'INSERT OR IGNORE INTO words (verse_id, word_order, word_group, text, lemma, morph, strongs, root_consonants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const otBooks = BOOKS.filter(b => b.wlcFile);
  let totalVerses = 0;
  let totalSegments = 0;

  const insertMany = db.transaction(() => {
    for (const book of otBooks) {
      const filePath = path.join(WLC_DIR, `${book.wlcFile}.xml`);
      const xml = fs.readFileSync(filePath, 'utf-8');
      const parsed = parser.parse(xml);

      const osisText = parsed.osis?.osisText;
      if (!osisText) {
        console.error(`  [error] Could not parse ${book.wlcFile}.xml`);
        continue;
      }

      let chapters = osisText.div?.chapter;
      if (!chapters) {
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
      let bookSegmentCount = 0;

      for (const chapter of chapters) {
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

          const wElements = verse.w;
          if (!wElements) continue;
          const wArr = Array.isArray(wElements) ? wElements : [wElements];

          // Parse all words into segment lists
          const wordSegments: SegmentData[][] = [];
          for (const w of wArr) {
            const segs = parseWLCWord(w);
            if (segs) wordSegments.push(segs);
          }

          if (wordSegments.length === 0) continue;

          const verseText = wordSegments.map(segs => segs.map(s => s.text).join('/')).join(' ');
          const result = insertVerse.run(book.id, chapterNum, verseNum, verseText);
          const verseId = result.lastInsertRowid as number;

          if (verseId) {
            let order = 1;
            for (let g = 0; g < wordSegments.length; g++) {
              const segs = wordSegments[g];
              for (const seg of segs) {
                insertWord.run(verseId, order, g + 1, seg.text, seg.lemma, seg.morph, toStrongs(seg.lemma), stripNiqqud(seg.text));
                order++;
                bookSegmentCount++;
              }
            }
          }

          bookVerseCount++;
        }
      }

      totalVerses += bookVerseCount;
      totalSegments += bookSegmentCount;
      console.log(`  ${book.name}: ${bookVerseCount} verses, ${bookSegmentCount} segments`);
    }
  });

  insertMany();
  console.log(`  Total Hebrew: ${totalVerses} verses, ${totalSegments} segments`);
}

// --- Phase C: Parse and insert Greek NT ---

function parseSBLGNT(db: Database.Database) {
  console.log('\n=== Parsing SBLGNT Greek texts ===');

  const insertVerse = db.prepare(
    'INSERT OR IGNORE INTO verses (book_id, chapter, verse, original_text) VALUES (?, ?, ?, ?)'
  );
  const insertWord = db.prepare(
    'INSERT OR IGNORE INTO words (verse_id, word_order, word_group, text, lemma, morph, strongs, root_consonants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const ntBooks = BOOKS.filter(b => b.sblgntBook);
  let totalVerses = 0;
  let totalWords = 0;

  const insertMany = db.transaction(() => {
    for (const book of ntBooks) {
      const files = fs.readdirSync(SBLGNT_DIR).filter(f => f.startsWith(book.sblgntBook!));
      if (files.length === 0) continue;

      const filePath = path.join(SBLGNT_DIR, files[0]);
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());

      interface GkWord { text: string; word: string; lemma: string; pos: string; parsing: string; }
      const verseWords = new Map<string, GkWord[]>();

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 7) continue;
        const ref = parts[0];
        const pos = parts[1];
        const parsing = parts[2];
        const text = parts[3];
        const word = parts[4];
        const lemma = parts[6];
        if (!verseWords.has(ref)) verseWords.set(ref, []);
        verseWords.get(ref)!.push({ text, word, lemma, pos, parsing });
      }

      let bookVerseCount = 0;
      let bookWordCount = 0;

      for (const [ref, words] of verseWords) {
        const chapterNum = parseInt(ref.substring(2, 4), 10);
        const verseNum = parseInt(ref.substring(4, 6), 10);

        const verseText = words.map(w => w.text).join(' ');
        if (!verseText) continue;

        const result = insertVerse.run(book.id, chapterNum, verseNum, verseText);
        const verseId = result.lastInsertRowid as number;

        if (verseId) {
          for (let i = 0; i < words.length; i++) {
            const w = words[i];
            const morph = `${w.pos}|${w.parsing}`;
            // Greek words are one segment each, word_group = word_order
            insertWord.run(verseId, i + 1, i + 1, w.text, w.lemma, morph, null, null);
            bookWordCount++;
          }
        }

        bookVerseCount++;
      }

      totalVerses += bookVerseCount;
      totalWords += bookWordCount;
      console.log(`  ${book.name}: ${bookVerseCount} verses, ${bookWordCount} words`);
    }
  });

  insertMany();
  console.log(`  Total Greek: ${totalVerses} verses, ${totalWords} words`);
}

// --- Main ---

async function main() {
  console.log('=== Metaphor Bible Seed Script ===');
  console.log(`Database: ${DB_PATH}`);

  const isExisting = fs.existsSync(DB_PATH);
  if (isExisting) {
    console.log('Existing database found — will preserve user data.');
  } else {
    console.log('No existing database — creating fresh.');
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('\n=== Initializing schema ===');
  initializeSchema(db);

  // --- Save old verse ID mapping for annotation re-linking ---
  interface OldVerseRef { book_id: number; chapter: number; verse: number; old_id: number }
  let oldVerseMap: OldVerseRef[] = [];

  if (isExisting) {
    console.log('\n=== Saving annotation verse references ===');
    // Find all verses that have annotations (verse_metaphors or annotation_words)
    const annotatedVerses = db.prepare(`
      SELECT DISTINCT v.id as old_id, v.book_id, v.chapter, v.verse
      FROM verses v
      WHERE v.id IN (SELECT verse_id FROM verse_metaphors)
         OR v.id IN (
           SELECT w.verse_id FROM words w
           JOIN annotation_words aw ON aw.word_id = w.id
         )
    `).all() as OldVerseRef[];
    oldVerseMap = annotatedVerses;
    console.log(`  Found ${oldVerseMap.length} verses with annotations to re-link.`);

    // Also check completed_verses
    const hasCompletedVersesTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='completed_verses'"
    ).get();
    let completedVerseRefs: OldVerseRef[] = [];
    if (hasCompletedVersesTable) {
      completedVerseRefs = db.prepare(`
        SELECT DISTINCT v.id as old_id, v.book_id, v.chapter, v.verse
        FROM verses v
        JOIN completed_verses cv ON cv.verse_id = v.id
      `).all() as OldVerseRef[];
      if (completedVerseRefs.length > 0) {
        // Merge into oldVerseMap (dedup)
        const existingIds = new Set(oldVerseMap.map(r => r.old_id));
        for (const ref of completedVerseRefs) {
          if (!existingIds.has(ref.old_id)) {
            oldVerseMap.push(ref);
          }
        }
        console.log(`  Found ${completedVerseRefs.length} completed verses to re-link.`);
      }
    }
  }

  // --- Disable FK checks during base data refresh ---
  db.pragma('foreign_keys = OFF');

  console.log('\n=== Clearing base data tables (preserving user data) ===');
  // Delete in correct order for FK constraints: words → verses → books
  // Also drop FTS table so it can be rebuilt
  const ftsExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='verses_fts'"
  ).get();
  if (ftsExists) {
    db.exec('DROP TABLE verses_fts');
    console.log('  Dropped verses_fts for rebuild.');
  }
  db.exec('DELETE FROM words');
  console.log('  Cleared words.');
  db.exec('DELETE FROM verses');
  console.log('  Cleared verses.');
  db.exec('DELETE FROM books');
  console.log('  Cleared books.');

  db.pragma('foreign_keys = ON');

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

  await downloadWLC();
  await downloadSBLGNT();

  parseWLC(db);
  parseSBLGNT(db);

  // --- Re-link annotations to new verse IDs ---
  if (oldVerseMap.length > 0) {
    console.log('\n=== Re-linking annotations to new verse IDs ===');
    const findNewVerse = db.prepare(
      'SELECT id FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?'
    );

    let relinked = 0;
    let orphaned = 0;

    const relinkTransaction = db.transaction(() => {
      const updateVM = db.prepare('UPDATE verse_metaphors SET verse_id = ? WHERE verse_id = ?');
      const updateCompletedVerses = db.prepare('UPDATE completed_verses SET verse_id = ? WHERE verse_id = ?');
      // Note: annotation_words reference word IDs which are regenerated on seed,
      // so old word_ids become orphaned. We clean those up after this transaction.

      for (const ref of oldVerseMap) {
        const newRow = findNewVerse.get(ref.book_id, ref.chapter, ref.verse) as { id: number } | undefined;
        if (newRow && newRow.id !== ref.old_id) {
          updateVM.run(newRow.id, ref.old_id);
          updateCompletedVerses.run(newRow.id, ref.old_id);
          relinked++;
        } else if (!newRow) {
          orphaned++;
        }
        // If newRow.id === ref.old_id, no update needed
      }
    });

    relinkTransaction();
    console.log(`  Re-linked ${relinked} verse references, ${orphaned} orphaned (verse no longer exists).`);

    // Clean up orphaned annotation_words (word_ids that no longer exist)
    const orphanedAW = db.prepare(`
      DELETE FROM annotation_words WHERE word_id NOT IN (SELECT id FROM words)
    `).run();
    if (orphanedAW.changes > 0) {
      console.log(`  Cleaned up ${orphanedAW.changes} orphaned annotation_words (word IDs changed).`);
    }
  }

  console.log('\n=== Building FTS5 index ===');
  initializeFts(db);

  // Print summary
  const verseCount = db.prepare('SELECT COUNT(*) as count FROM verses').get() as any;
  const segmentCount = db.prepare('SELECT COUNT(*) as count FROM words').get() as any;
  const otCount = db.prepare('SELECT COUNT(*) as count FROM verses v JOIN books b ON v.book_id = b.id WHERE b.testament = ?').get('OT') as any;
  const ntCount = db.prepare('SELECT COUNT(*) as count FROM verses v JOIN books b ON v.book_id = b.id WHERE b.testament = ?').get('NT') as any;
  const vmCount = db.prepare('SELECT COUNT(*) as count FROM verse_metaphors').get() as any;
  const metCount = db.prepare('SELECT COUNT(*) as count FROM metaphors').get() as any;

  console.log('\n=== Seed Complete ===');
  console.log(`  Total verses: ${verseCount.count}`);
  console.log(`  Total word segments: ${segmentCount.count}`);
  console.log(`  OT (Hebrew): ${otCount.count}`);
  console.log(`  NT (Greek): ${ntCount.count}`);
  console.log(`  Preserved metaphors: ${metCount.count}`);
  console.log(`  Preserved annotations: ${vmCount.count}`);
  console.log(`  Database size: ${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(1)} MB`);

  db.close();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
