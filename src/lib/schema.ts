import type Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id            INTEGER PRIMARY KEY,
      name          TEXT NOT NULL,
      abbreviation  TEXT NOT NULL,
      testament     TEXT NOT NULL CHECK(testament IN ('OT','NT')),
      language      TEXT NOT NULL CHECK(language IN ('hebrew','greek')),
      book_order    INTEGER NOT NULL,
      chapter_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS verses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id       INTEGER NOT NULL REFERENCES books(id),
      chapter       INTEGER NOT NULL,
      verse         INTEGER NOT NULL,
      original_text TEXT NOT NULL,
      UNIQUE(book_id, chapter, verse)
    );

    CREATE INDEX IF NOT EXISTS idx_verses_book_chapter ON verses(book_id, chapter);

    CREATE TABLE IF NOT EXISTS words (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      verse_id    INTEGER NOT NULL REFERENCES verses(id),
      word_order  INTEGER NOT NULL,
      word_group  INTEGER NOT NULL,
      text        TEXT NOT NULL,
      lemma       TEXT,
      morph       TEXT,
      UNIQUE(verse_id, word_order)
    );

    CREATE INDEX IF NOT EXISTS idx_words_verse ON words(verse_id);

    CREATE TABLE IF NOT EXISTS metaphors (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL UNIQUE,
      description    TEXT,
      category       TEXT,
      metaphor_type  TEXT DEFAULT 'conceptual'
                       CHECK(metaphor_type IN ('conceptual','lexical')),
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verse_metaphors (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      verse_id            INTEGER NOT NULL REFERENCES verses(id),
      metaphor_id         INTEGER NOT NULL REFERENCES metaphors(id),
      source_domain       TEXT,
      target_domain       TEXT,
      mapping             TEXT,
      notes               TEXT,
      confidence          TEXT NOT NULL DEFAULT 'draft'
                            CHECK(confidence IN ('draft','provisional','confirmed','disputed')),
      linguistic_evidence TEXT,
      pseudocode      TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_vm_verse ON verse_metaphors(verse_id);
    CREATE INDEX IF NOT EXISTS idx_vm_metaphor ON verse_metaphors(metaphor_id);
    CREATE INDEX IF NOT EXISTS idx_vm_confidence ON verse_metaphors(confidence);

    CREATE TABLE IF NOT EXISTS annotation_words (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      annotation_id INTEGER NOT NULL REFERENCES verse_metaphors(id) ON DELETE CASCADE,
      word_id       INTEGER NOT NULL REFERENCES words(id),
      UNIQUE(annotation_id, word_id)
    );

    CREATE INDEX IF NOT EXISTS idx_aw_annotation ON annotation_words(annotation_id);
    CREATE INDEX IF NOT EXISTS idx_aw_word ON annotation_words(word_id);

    -- Domain class hierarchy (OOP-style inheritance)
    CREATE TABLE IF NOT EXISTS domain_classes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      parent_id   INTEGER REFERENCES domain_classes(id) ON DELETE SET NULL,
      description TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_dc_parent ON domain_classes(parent_id);

    -- Properties owned by a domain class (inherited by children at query time)
    CREATE TABLE IF NOT EXISTS domain_properties (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_class_id INTEGER NOT NULL REFERENCES domain_classes(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      description     TEXT,
      UNIQUE(domain_class_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_dp_class ON domain_properties(domain_class_id);

    -- Metaphor nesting (many-to-many parent/child)
    CREATE TABLE IF NOT EXISTS metaphor_nesting (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id   INTEGER NOT NULL REFERENCES metaphors(id) ON DELETE CASCADE,
      child_id    INTEGER NOT NULL REFERENCES metaphors(id) ON DELETE CASCADE,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      UNIQUE(parent_id, child_id),
      CHECK(parent_id != child_id)
    );

    CREATE INDEX IF NOT EXISTS idx_mn_parent ON metaphor_nesting(parent_id);
    CREATE INDEX IF NOT EXISTS idx_mn_child ON metaphor_nesting(child_id);

    -- Link metaphors to domain classes (source/target)
    CREATE TABLE IF NOT EXISTS metaphor_domains (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      metaphor_id           INTEGER NOT NULL REFERENCES metaphors(id) ON DELETE CASCADE,
      source_domain_id      INTEGER REFERENCES domain_classes(id) ON DELETE SET NULL,
      target_domain_id      INTEGER REFERENCES domain_classes(id) ON DELETE SET NULL,
      UNIQUE(metaphor_id)
    );

    -- Property mappings within a metaphor (e.g. HEAD → originRegion)
    CREATE TABLE IF NOT EXISTS property_mappings (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      metaphor_id         INTEGER NOT NULL REFERENCES metaphors(id) ON DELETE CASCADE,
      source_property_id  INTEGER REFERENCES domain_properties(id) ON DELETE CASCADE,
      target_property_id  INTEGER REFERENCES domain_properties(id) ON DELETE CASCADE,
      description         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_pm_metaphor ON property_mappings(metaphor_id);

    -- Project notes (general research notes, methodology, philosophy, todos)
    CREATE TABLE IF NOT EXISTS project_notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL DEFAULT '',
      note_type  TEXT NOT NULL DEFAULT 'general' CHECK(note_type IN ('general','methodology','philosophy','todo')),
      pinned     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Verse completion tracking
    CREATE TABLE IF NOT EXISTS completed_verses (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      verse_id  INTEGER NOT NULL UNIQUE REFERENCES verses(id),
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cv_verse ON completed_verses(verse_id);

    -- Word-level annotations (global, by lemma — multiple per lemma allowed)
    CREATE TABLE IF NOT EXISTS word_annotations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      lemma       TEXT NOT NULL,
      strongs     TEXT,
      language    TEXT NOT NULL CHECK(language IN ('hebrew','greek')),
      gloss       TEXT,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_wa_lemma ON word_annotations(lemma);
    CREATE INDEX IF NOT EXISTS idx_wa_strongs ON word_annotations(strongs);

    -- Word search indexes (lemma is always present)
    CREATE INDEX IF NOT EXISTS idx_words_lemma ON words(lemma);
  `);

  runMigrations(db);

  // Create indexes on migrated columns (must run AFTER migrations add them)
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_words_strongs ON words(strongs);
      CREATE INDEX IF NOT EXISTS idx_words_root ON words(root_consonants);
    `);
  } catch {
    // Columns may not exist yet on very first run before migration
  }
}

/**
 * Run schema migrations: add columns that may not exist in older databases.
 * Uses PRAGMA table_info to check before ALTER TABLE ADD COLUMN.
 */
function runMigrations(db: Database.Database) {
  const migrations: { table: string; column: string; definition: string }[] = [
    { table: 'verse_metaphors', column: 'pseudocode', definition: 'TEXT' },
    { table: 'verse_metaphors', column: 'mapping', definition: 'TEXT' },
    { table: 'verses', column: 'completed', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'words', column: 'strongs', definition: 'TEXT' },
    { table: 'words', column: 'root_consonants', definition: 'TEXT' },
    { table: 'word_annotations', column: 'metaphor_id', definition: 'INTEGER REFERENCES metaphors(id)' },
    { table: 'word_annotations', column: 'source_domain', definition: 'TEXT' },
    { table: 'word_annotations', column: 'target_domain', definition: 'TEXT' },
    { table: 'word_annotations', column: 'mapping', definition: 'TEXT' },
    { table: 'word_annotations', column: 'pseudocode', definition: 'TEXT' },
    { table: 'word_annotations', column: 'confidence', definition: "TEXT NOT NULL DEFAULT 'draft'" },
    { table: 'word_annotations', column: 'linguistic_evidence', definition: 'TEXT' },
  ];

  for (const m of migrations) {
    const columns = db.pragma(`table_info(${m.table})`) as { name: string }[];
    const exists = columns.some(c => c.name === m.column);
    if (!exists) {
      db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.definition}`);
      console.log(`  [migration] Added ${m.table}.${m.column}`);
    }
  }

  // Remove UNIQUE(lemma, language) from word_annotations (allow multiple annotations per lemma)
  try {
    const indexInfo = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='word_annotations'"
    ).get() as { sql: string } | undefined;
    if (indexInfo?.sql?.includes('UNIQUE(lemma, language)') || indexInfo?.sql?.includes('UNIQUE(lemma,language)')) {
      console.log('  [migration] Removing UNIQUE constraint from word_annotations...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS word_annotations_new (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          lemma       TEXT NOT NULL,
          strongs     TEXT,
          language    TEXT NOT NULL CHECK(language IN ('hebrew','greek')),
          gloss       TEXT,
          notes       TEXT,
          metaphor_id INTEGER REFERENCES metaphors(id),
          source_domain TEXT,
          target_domain TEXT,
          mapping     TEXT,
          pseudocode  TEXT,
          confidence  TEXT NOT NULL DEFAULT 'draft',
          linguistic_evidence TEXT,
          created_at  TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO word_annotations_new (id, lemma, strongs, language, gloss, notes, metaphor_id, source_domain, target_domain, mapping, pseudocode, confidence, linguistic_evidence, created_at, updated_at)
          SELECT id, lemma, strongs, language, gloss, notes, metaphor_id, source_domain, target_domain, mapping, pseudocode, COALESCE(confidence, 'draft'), linguistic_evidence, created_at, updated_at FROM word_annotations;
        DROP TABLE word_annotations;
        ALTER TABLE word_annotations_new RENAME TO word_annotations;
        CREATE INDEX IF NOT EXISTS idx_wa_lemma ON word_annotations(lemma);
        CREATE INDEX IF NOT EXISTS idx_wa_strongs ON word_annotations(strongs);
      `);
      console.log('  [migration] word_annotations UNIQUE constraint removed.');
    }
  } catch (e) {
    console.log('  [migration] word_annotations UNIQUE migration skipped:', e);
  }

  populateWordFields(db);
}

/**
 * Populate strongs and root_consonants for existing words that lack them.
 * Runs after column migrations so the columns exist.
 */
function populateWordFields(db: Database.Database) {
  // Check if words table has the strongs column yet (it might not if schema was just created fresh)
  const wordCols = db.pragma('table_info(words)') as { name: string }[];
  if (!wordCols.some(c => c.name === 'strongs')) return;

  // Check if we need to populate (any words with NULL strongs and numeric lemma)
  const needsPopulate = db.prepare(
    "SELECT COUNT(*) as c FROM words WHERE strongs IS NULL AND lemma GLOB '[0-9]*'"
  ).get() as any;
  if (needsPopulate.c === 0) return;

  console.log('  [migration] Populating strongs and root_consonants...');

  // Populate strongs for Hebrew words with numeric lemmas
  db.exec(`
    UPDATE words SET strongs = 'H' || REPLACE(lemma, ' ', '')
    WHERE strongs IS NULL AND lemma GLOB '[0-9]*'
      AND verse_id IN (SELECT v.id FROM verses v JOIN books b ON v.book_id = b.id WHERE b.language = 'hebrew')
  `);

  // For root_consonants, we need JS to strip niqqud
  const hebrewWords = db.prepare(`
    SELECT w.id, w.text FROM words w
    JOIN verses v ON w.verse_id = v.id JOIN books b ON v.book_id = b.id
    WHERE b.language = 'hebrew' AND w.root_consonants IS NULL
  `).all() as { id: number; text: string }[];

  if (hebrewWords.length === 0) return;

  const updateRoot = db.prepare('UPDATE words SET root_consonants = ? WHERE id = ?');
  const stripNiqqud = (text: string) => text.replace(/[\u0591-\u05C7]/g, '');

  const batch = db.transaction(() => {
    for (const w of hebrewWords) {
      updateRoot.run(stripNiqqud(w.text), w.id);
    }
  });
  batch();
  console.log(`  [migration] Populated ${hebrewWords.length} root_consonants entries.`);
}

export function initializeFts(db: Database.Database) {
  // Check if FTS table already exists
  const exists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='verses_fts'"
  ).get();

  if (!exists) {
    db.exec(`
      CREATE VIRTUAL TABLE verses_fts USING fts5(
        original_text,
        content=verses,
        content_rowid=id
      );

      INSERT INTO verses_fts(rowid, original_text)
      SELECT id, original_text FROM verses;
    `);
  }
}
