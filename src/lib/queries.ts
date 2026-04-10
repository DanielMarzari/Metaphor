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

export function createMetaphor(name: string, description?: string, category?: string, metaphor_type?: string) {
  const db = ensureSchema();
  return db.prepare(
    'INSERT INTO metaphors (name, description, category, metaphor_type) VALUES (?, ?, ?, ?)'
  ).run(name, description || null, category || null, metaphor_type || 'conceptual');
}

export function updateMetaphor(id: number, data: { name?: string; description?: string; category?: string; metaphor_type?: string }) {
  const db = ensureSchema();
  const sets: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  if (data.category !== undefined) { sets.push('category = ?'); values.push(data.category); }
  if (data.metaphor_type !== undefined) { sets.push('metaphor_type = ?'); values.push(data.metaphor_type); }
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
  mapping?: string;
  notes?: string;
  confidence?: string;
  linguistic_evidence?: string;
  pseudocode?: string;
  word_ids?: number[];
}) {
  const db = ensureSchema();
  const result = db.prepare(
    `INSERT INTO verse_metaphors (verse_id, metaphor_id, source_domain, target_domain, mapping, notes, confidence, linguistic_evidence, pseudocode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.verse_id, data.metaphor_id,
    data.source_domain || null, data.target_domain || null,
    data.mapping || null,
    data.notes || null, data.confidence || 'draft',
    data.linguistic_evidence || null, data.pseudocode || null
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
  mapping?: string;
  notes?: string;
  confidence?: string;
  linguistic_evidence?: string;
  pseudocode?: string;
  metaphor_id?: number;
  word_ids?: number[];
}) {
  const db = ensureSchema();
  const sets: string[] = [];
  const values: any[] = [];
  if (data.metaphor_id !== undefined) { sets.push('metaphor_id = ?'); values.push(data.metaphor_id); }
  if (data.source_domain !== undefined) { sets.push('source_domain = ?'); values.push(data.source_domain); }
  if (data.target_domain !== undefined) { sets.push('target_domain = ?'); values.push(data.target_domain); }
  if (data.mapping !== undefined) { sets.push('mapping = ?'); values.push(data.mapping); }
  if (data.notes !== undefined) { sets.push('notes = ?'); values.push(data.notes); }
  if (data.confidence !== undefined) { sets.push('confidence = ?'); values.push(data.confidence); }
  if (data.linguistic_evidence !== undefined) { sets.push('linguistic_evidence = ?'); values.push(data.linguistic_evidence); }
  if (data.pseudocode !== undefined) { sets.push('pseudocode = ?'); values.push(data.pseudocode); }
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

// --- Domain Classes ---

export function getDomainClasses() {
  const db = ensureSchema();
  return db.prepare(
    `SELECT dc.*, p.name as parent_name,
            (SELECT COUNT(*) FROM domain_classes c WHERE c.parent_id = dc.id) as child_count,
            (SELECT COUNT(*) FROM domain_properties dp WHERE dp.domain_class_id = dc.id) as property_count
     FROM domain_classes dc
     LEFT JOIN domain_classes p ON dc.parent_id = p.id
     ORDER BY dc.name`
  ).all();
}

export function getDomainClassById(id: number) {
  const db = ensureSchema();
  return db.prepare(
    `SELECT dc.*, p.name as parent_name
     FROM domain_classes dc
     LEFT JOIN domain_classes p ON dc.parent_id = p.id
     WHERE dc.id = ?`
  ).get(id);
}

export function getDomainClassAncestors(id: number) {
  const db = ensureSchema();
  return db.prepare(
    `WITH RECURSIVE ancestors(id, name, parent_id, depth) AS (
       SELECT id, name, parent_id, 0 FROM domain_classes WHERE id = ?
       UNION ALL
       SELECT dc.id, dc.name, dc.parent_id, a.depth + 1
       FROM domain_classes dc JOIN ancestors a ON dc.id = a.parent_id
     )
     SELECT * FROM ancestors ORDER BY depth DESC`
  ).all(id);
}

export function getDomainClassChildren(id: number) {
  const db = ensureSchema();
  return db.prepare(
    'SELECT * FROM domain_classes WHERE parent_id = ? ORDER BY name'
  ).all(id);
}

export function createDomainClass(name: string, parentId?: number, description?: string) {
  const db = ensureSchema();
  return db.prepare(
    'INSERT INTO domain_classes (name, parent_id, description) VALUES (?, ?, ?)'
  ).run(name, parentId || null, description || null);
}

export function updateDomainClass(id: number, data: { name?: string; parent_id?: number | null; description?: string }) {
  const db = ensureSchema();
  const sets: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.parent_id !== undefined) { sets.push('parent_id = ?'); values.push(data.parent_id); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  sets.push("updated_at = datetime('now')");
  values.push(id);
  return db.prepare(`UPDATE domain_classes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteDomainClass(id: number) {
  const db = ensureSchema();
  return db.prepare('DELETE FROM domain_classes WHERE id = ?').run(id);
}

// --- Domain Properties ---

export function getDomainProperties(classId: number) {
  const db = ensureSchema();
  return db.prepare(
    'SELECT * FROM domain_properties WHERE domain_class_id = ? ORDER BY name'
  ).all(classId);
}

export function getInheritedProperties(classId: number) {
  const db = ensureSchema();
  return db.prepare(
    `WITH RECURSIVE ancestors(id, name, parent_id, depth) AS (
       SELECT id, name, parent_id, 0 FROM domain_classes WHERE id = ?
       UNION ALL
       SELECT dc.id, dc.name, dc.parent_id, a.depth + 1
       FROM domain_classes dc JOIN ancestors a ON dc.id = a.parent_id
     )
     SELECT dp.*, a.name as owner_class, a.id as owner_class_id, a.depth
     FROM ancestors a
     JOIN domain_properties dp ON dp.domain_class_id = a.id
     ORDER BY a.depth DESC, dp.name`
  ).all(classId);
}

export function createDomainProperty(classId: number, name: string, description?: string) {
  const db = ensureSchema();
  return db.prepare(
    'INSERT INTO domain_properties (domain_class_id, name, description) VALUES (?, ?, ?)'
  ).run(classId, name, description || null);
}

export function updateDomainProperty(id: number, data: { name?: string; description?: string }) {
  const db = ensureSchema();
  const sets: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  values.push(id);
  return db.prepare(`UPDATE domain_properties SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteDomainProperty(id: number) {
  const db = ensureSchema();
  return db.prepare('DELETE FROM domain_properties WHERE id = ?').run(id);
}

// --- Metaphor Nesting ---

export function getMetaphorChildren(parentId: number) {
  const db = ensureSchema();
  return db.prepare(
    `SELECT m.*, mn.sort_order, COUNT(vm.id) as usage_count
     FROM metaphor_nesting mn
     JOIN metaphors m ON mn.child_id = m.id
     LEFT JOIN verse_metaphors vm ON vm.metaphor_id = m.id
     WHERE mn.parent_id = ?
     GROUP BY m.id
     ORDER BY mn.sort_order, m.name`
  ).all(parentId);
}

export function getMetaphorParents(childId: number) {
  const db = ensureSchema();
  return db.prepare(
    `SELECT m.*
     FROM metaphor_nesting mn
     JOIN metaphors m ON mn.parent_id = m.id
     WHERE mn.child_id = ?
     ORDER BY m.name`
  ).all(childId);
}

export function addMetaphorNesting(parentId: number, childId: number, sortOrder = 0) {
  const db = ensureSchema();
  return db.prepare(
    'INSERT OR IGNORE INTO metaphor_nesting (parent_id, child_id, sort_order) VALUES (?, ?, ?)'
  ).run(parentId, childId, sortOrder);
}

export function removeMetaphorNesting(parentId: number, childId: number) {
  const db = ensureSchema();
  return db.prepare(
    'DELETE FROM metaphor_nesting WHERE parent_id = ? AND child_id = ?'
  ).run(parentId, childId);
}

// --- Metaphor Domains ---

export function getMetaphorDomains(metaphorId: number) {
  const db = ensureSchema();
  return db.prepare(
    `SELECT md.*,
            s.name as source_domain_name, t.name as target_domain_name
     FROM metaphor_domains md
     LEFT JOIN domain_classes s ON md.source_domain_id = s.id
     LEFT JOIN domain_classes t ON md.target_domain_id = t.id
     WHERE md.metaphor_id = ?`
  ).get(metaphorId);
}

export function setMetaphorDomains(metaphorId: number, sourceDomainId?: number, targetDomainId?: number) {
  const db = ensureSchema();
  const existing = db.prepare('SELECT id FROM metaphor_domains WHERE metaphor_id = ?').get(metaphorId);
  if (existing) {
    return db.prepare(
      'UPDATE metaphor_domains SET source_domain_id = ?, target_domain_id = ? WHERE metaphor_id = ?'
    ).run(sourceDomainId || null, targetDomainId || null, metaphorId);
  }
  return db.prepare(
    'INSERT INTO metaphor_domains (metaphor_id, source_domain_id, target_domain_id) VALUES (?, ?, ?)'
  ).run(metaphorId, sourceDomainId || null, targetDomainId || null);
}

// --- Property Mappings ---

export function getPropertyMappings(metaphorId: number) {
  const db = ensureSchema();
  return db.prepare(
    `SELECT pm.*,
            sp.name as source_property_name, tp.name as target_property_name,
            sc.name as source_class_name, tc.name as target_class_name
     FROM property_mappings pm
     LEFT JOIN domain_properties sp ON pm.source_property_id = sp.id
     LEFT JOIN domain_properties tp ON pm.target_property_id = tp.id
     LEFT JOIN domain_classes sc ON sp.domain_class_id = sc.id
     LEFT JOIN domain_classes tc ON tp.domain_class_id = tc.id
     WHERE pm.metaphor_id = ?`
  ).all(metaphorId);
}

export function createPropertyMapping(metaphorId: number, sourcePropId: number, targetPropId: number, description?: string) {
  const db = ensureSchema();
  return db.prepare(
    'INSERT INTO property_mappings (metaphor_id, source_property_id, target_property_id, description) VALUES (?, ?, ?, ?)'
  ).run(metaphorId, sourcePropId, targetPropId, description || null);
}

export function deletePropertyMapping(id: number) {
  const db = ensureSchema();
  return db.prepare('DELETE FROM property_mappings WHERE id = ?').run(id);
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
