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
  `);
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
