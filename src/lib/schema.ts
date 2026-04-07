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

    CREATE TABLE IF NOT EXISTS metaphors (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      description TEXT,
      category    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verse_metaphors (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      verse_id            INTEGER NOT NULL REFERENCES verses(id),
      metaphor_id         INTEGER NOT NULL REFERENCES metaphors(id),
      source_domain       TEXT,
      target_domain       TEXT,
      notes               TEXT,
      confidence          TEXT NOT NULL DEFAULT 'draft'
                            CHECK(confidence IN ('draft','confirmed','disputed')),
      linguistic_evidence TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_vm_verse ON verse_metaphors(verse_id);
    CREATE INDEX IF NOT EXISTS idx_vm_metaphor ON verse_metaphors(metaphor_id);
    CREATE INDEX IF NOT EXISTS idx_vm_confidence ON verse_metaphors(confidence);
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
