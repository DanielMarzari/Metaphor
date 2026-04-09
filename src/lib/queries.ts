import { getDb } from './db';
import { initializeSchema, initializeFts } from './schema';

function ensureSchema() {
  const db = getDb();
  initializeSchema(db);
  return db;
}

// --- Books ---

export function getBooks() {
  const db = ensureSchema();
  return db.prepare('SELECT * FROM books ORDER BY book_order').all();
}

export function getBookByAbbreviation(abbr: string) {
  const db = ensureSchema();
  return db.prepare('SELECT * FROM books WHERE LOWER(abbreviation) = LOWER(?)').get(abbr);
}

// --- Verses ---

export function getVersesByChapter(bookId: number, chapter: number) {
  const db = ensureSchema();
  return db.prepare(
    `SELECT v.*, b.language, b.abbreviation, b.name as book_name
     FROM verses v JOIN books b ON v.book_id = b.id
     WHERE v.book_id = ? AND v.chapter = ?
     ORDER BY v.verse`
  ).all(bookId, chapter);
}

export function getVerseById(id: number) {
  const db = ensureSchema();
  return db.prepare(
    `SELECT v.*, b.language, b.abbreviation, b.name as book_name
     FROM verses v JOIN books b ON v.book_id = b.id
     WHERE v.id = ?`
  ).get(id);
}

export function searchVerses(query: string, limit = 50) {
  const db = ensureSchema();
  // Try LIKE search since FTS5 struggles with Hebrew pointed text
  return db.prepare(
    `SELECT v.id, v.book_id, v.chapter, v.verse, v.original_text,
            b.language, b.abbreviation, b.name as book_name
     FROM verses v JOIN books b ON v.book_id = b.id
     WHERE v.original_text LIKE ?
     ORDER BY b.book_order, v.chapter, v.verse
     LIMIT ?`
  ).all(`%${query}%`, limit);
}

// --- Metaphors ---

export function getMetaphors() {
  const db = ensureSchema();
  return db.prepare(
    `SELECT m.*, COUNT(vm.id) as usage_count
     FROM metaphors m
     LEFT JOIN verse_metaphors vm ON vm.metaphor_id = m.id
     GROUP BY m.id
     ORDER BY m.name`
  ).all();
}

export function getMetaphorById(id: number) {
  const db = ensureSchema();
  return db.prepare('SELECT * FROM metaphors WHERE id = ?').get(id);
}

export function createMetaphor(name: string, description?: string, category?: string) {
  const db = ensureSchema();
  return db.prepare(
    'INSERT INTO metaphors (name, description, category) VALUES (?, ?, ?)'
  ).run(name, description || null, category || null);
}

export function updateMetaphor(id: number, data: { name?: string; description?: string; category?: string }) {
  const db = ensureSchema();
  const sets: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  if (data.category !== undefined) { sets.push('category = ?'); values.push(data.category); }
  sets.push("updated_at = datetime('now')");
  values.push(id);
  return db.prepare(`UPDATE metaphors SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteMetaphor(id: number) {
  const db = ensureSchema();
  return db.prepare('DELETE FROM metaphors WHERE id = ?').run(id);
}

// --- Words ---

export function getWordsForVerse(verseId: number) {
  const db = ensureSchema();
  return db.prepare(
    'SELECT * FROM words WHERE verse_id = ? ORDER BY word_order'
  ).all(verseId);
}

export function getWordsForVerses(verseIds: number[]) {
  const db = ensureSchema();
  if (verseIds.length === 0) return [];
  const placeholders = verseIds.map(() => '?').join(',');
  return db.prepare(
    `SELECT * FROM words WHERE verse_id IN (${placeholders}) ORDER BY verse_id, word_order`
  ).all(...verseIds);
}

// --- Verse Metaphors (Annotations) ---

export function getAnnotationsForVerse(verseId: number) {
  const db = ensureSchema();
  const annotations = db.prepare(
    `SELECT vm.*, m.name as metaphor_name, m.category as metaphor_category
     FROM verse_metaphors vm
     JOIN metaphors m ON vm.metaphor_id = m.id
     WHERE vm.verse_id = ?
     ORDER BY vm.created_at DESC`
  ).all(verseId) as any[];

  // Attach word_ids for each annotation
  const getWordIds = db.prepare(
    'SELECT word_id FROM annotation_words WHERE annotation_id = ? ORDER BY word_id'
  );
  for (const a of annotations) {
    a.word_ids = (getWordIds.all(a.id) as any[]).map(r => r.word_id);
  }
  return annotations;
}

export function getAnnotationsForMetaphor(metaphorId: number) {
  const db = ensureSchema();
  const annotations = db.prepare(
    `SELECT vm.*, v.chapter, v.verse, v.original_text,
            b.abbreviation, b.name as book_name, b.language
     FROM verse_metaphors vm
     JOIN verses v ON vm.verse_id = v.id
     JOIN books b ON v.book_id = b.id
     WHERE vm.metaphor_id = ?
     ORDER BY b.book_order, v.chapter, v.verse`
  ).all(metaphorId) as any[];

  const getWordIds = db.prepare(
    'SELECT word_id FROM annotation_words WHERE annotation_id = ? ORDER BY word_id'
  );
  for (const a of annotations) {
    a.word_ids = (getWordIds.all(a.id) as any[]).map(r => r.word_id);
  }
  return annotations;
}

export function createAnnotation(data: {
  verse_id: number;
  metaphor_id: number;
  source_domain?: string;
  target_domain?: string;
  notes?: string;
  confidence?: string;
  linguistic_evidence?: string;
  word_ids?: number[];
}) {
  const db = ensureSchema();
  const result = db.prepare(
    `INSERT INTO verse_metaphors (verse_id, metaphor_id, source_domain, target_domain, notes, confidence, linguistic_evidence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.verse_id, data.metaphor_id,
    data.source_domain || null, data.target_domain || null,
    data.notes || null, data.confidence || 'draft',
    data.linguistic_evidence || null
  );

  // Link selected words
  if (data.word_ids && data.word_ids.length > 0) {
    const insertAW = db.prepare(
      'INSERT OR IGNORE INTO annotation_words (annotation_id, word_id) VALUES (?, ?)'
    );
    for (const wordId of data.word_ids) {
      insertAW.run(result.lastInsertRowid, wordId);
    }
  }

  return result;
}

export function updateAnnotation(id: number, data: {
  source_domain?: string;
  target_domain?: string;
  notes?: string;
  confidence?: string;
  linguistic_evidence?: string;
  metaphor_id?: number;
  word_ids?: number[];
}) {
  const db = ensureSchema();
  const sets: string[] = [];
  const values: any[] = [];
  if (data.metaphor_id !== undefined) { sets.push('metaphor_id = ?'); values.push(data.metaphor_id); }
  if (data.source_domain !== undefined) { sets.push('source_domain = ?'); values.push(data.source_domain); }
  if (data.target_domain !== undefined) { sets.push('target_domain = ?'); values.push(data.target_domain); }
  if (data.notes !== undefined) { sets.push('notes = ?'); values.push(data.notes); }
  if (data.confidence !== undefined) { sets.push('confidence = ?'); values.push(data.confidence); }
  if (data.linguistic_evidence !== undefined) { sets.push('linguistic_evidence = ?'); values.push(data.linguistic_evidence); }
  sets.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE verse_metaphors SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  // Update word links if provided
  if (data.word_ids !== undefined) {
    db.prepare('DELETE FROM annotation_words WHERE annotation_id = ?').run(id);
    if (data.word_ids.length > 0) {
      const insertAW = db.prepare(
        'INSERT OR IGNORE INTO annotation_words (annotation_id, word_id) VALUES (?, ?)'
      );
      for (const wordId of data.word_ids) {
        insertAW.run(id, wordId);
      }
    }
  }
}

export function deleteAnnotation(id: number) {
  const db = ensureSchema();
  // annotation_words cascade on delete, but be explicit
  db.prepare('DELETE FROM annotation_words WHERE annotation_id = ?').run(id);
  return db.prepare('DELETE FROM verse_metaphors WHERE id = ?').run(id);
}

// --- Stats ---

export function getDashboardStats() {
  const db = ensureSchema();
  const totalVerses = (db.prepare('SELECT COUNT(*) as count FROM verses').get() as any).count;
  const totalMetaphors = (db.prepare('SELECT COUNT(*) as count FROM metaphors').get() as any).count;
  const totalAnnotations = (db.prepare('SELECT COUNT(*) as count FROM verse_metaphors').get() as any).count;

  const byConfidence = db.prepare(
    'SELECT confidence, COUNT(*) as count FROM verse_metaphors GROUP BY confidence'
  ).all();

  const recentAnnotations = db.prepare(
    `SELECT vm.*, m.name as metaphor_name, v.chapter, v.verse,
            b.abbreviation, b.name as book_name
     FROM verse_metaphors vm
     JOIN metaphors m ON vm.metaphor_id = m.id
     JOIN verses v ON vm.verse_id = v.id
     JOIN books b ON v.book_id = b.id
     ORDER BY vm.updated_at DESC
     LIMIT 10`
  ).all();

  const topMetaphors = db.prepare(
    `SELECT m.id, m.name, COUNT(vm.id) as usage_count
     FROM metaphors m
     LEFT JOIN verse_metaphors vm ON vm.metaphor_id = m.id
     GROUP BY m.id
     ORDER BY usage_count DESC
     LIMIT 10`
  ).all();

  return { totalVerses, totalMetaphors, totalAnnotations, byConfidence, recentAnnotations, topMetaphors };
}

// --- Export ---

export function getExportData(filters?: { book_id?: number; metaphor_id?: number; confidence?: string }) {
  const db = ensureSchema();
  let where = '';
  const params: any[] = [];

  const conditions: string[] = [];
  if (filters?.book_id) { conditions.push('v.book_id = ?'); params.push(filters.book_id); }
  if (filters?.metaphor_id) { conditions.push('vm.metaphor_id = ?'); params.push(filters.metaphor_id); }
  if (filters?.confidence) { conditions.push('vm.confidence = ?'); params.push(filters.confidence); }
  if (conditions.length > 0) where = 'WHERE ' + conditions.join(' AND ');

  return db.prepare(
    `SELECT b.name as book, b.abbreviation, v.chapter, v.verse, v.original_text,
            m.name as metaphor, m.category, vm.source_domain, vm.target_domain,
            vm.notes, vm.confidence, vm.linguistic_evidence, vm.created_at, vm.updated_at
     FROM verse_metaphors vm
     JOIN verses v ON vm.verse_id = v.id
     JOIN books b ON v.book_id = b.id
     JOIN metaphors m ON vm.metaphor_id = m.id
     ${where}
     ORDER BY b.book_order, v.chapter, v.verse, m.name`
  ).all(...params);
}
