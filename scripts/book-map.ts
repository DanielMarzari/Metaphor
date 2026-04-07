// Canonical 66-book Bible mapping
// wlcFile: filename in openscriptures/morphhb /wlc/ directory
// sblgntFile: filename in morphgnt/sblgnt directory (2-digit book code)

export interface BookInfo {
  id: number;
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  language: 'hebrew' | 'greek';
  bookOrder: number;
  chapterCount: number;
  wlcFile: string | null;       // e.g. "Gen" for Genesis.xml
  sblgntBook: string | null;    // e.g. "61" for Matthew in MorphGNT
}

export const BOOKS: BookInfo[] = [
  // Old Testament (Hebrew)
  { id: 1,  name: "Genesis",       abbreviation: "Gen",   testament: "OT", language: "hebrew", bookOrder: 1,  chapterCount: 50, wlcFile: "Gen",   sblgntBook: null },
  { id: 2,  name: "Exodus",        abbreviation: "Exod",  testament: "OT", language: "hebrew", bookOrder: 2,  chapterCount: 40, wlcFile: "Exod",  sblgntBook: null },
  { id: 3,  name: "Leviticus",     abbreviation: "Lev",   testament: "OT", language: "hebrew", bookOrder: 3,  chapterCount: 27, wlcFile: "Lev",   sblgntBook: null },
  { id: 4,  name: "Numbers",       abbreviation: "Num",   testament: "OT", language: "hebrew", bookOrder: 4,  chapterCount: 36, wlcFile: "Num",   sblgntBook: null },
  { id: 5,  name: "Deuteronomy",   abbreviation: "Deut",  testament: "OT", language: "hebrew", bookOrder: 5,  chapterCount: 34, wlcFile: "Deut",  sblgntBook: null },
  { id: 6,  name: "Joshua",        abbreviation: "Josh",  testament: "OT", language: "hebrew", bookOrder: 6,  chapterCount: 24, wlcFile: "Josh",  sblgntBook: null },
  { id: 7,  name: "Judges",        abbreviation: "Judg",  testament: "OT", language: "hebrew", bookOrder: 7,  chapterCount: 21, wlcFile: "Judg",  sblgntBook: null },
  { id: 8,  name: "Ruth",          abbreviation: "Ruth",  testament: "OT", language: "hebrew", bookOrder: 8,  chapterCount: 4,  wlcFile: "Ruth",  sblgntBook: null },
  { id: 9,  name: "1 Samuel",      abbreviation: "1Sam",  testament: "OT", language: "hebrew", bookOrder: 9,  chapterCount: 31, wlcFile: "1Sam",  sblgntBook: null },
  { id: 10, name: "2 Samuel",      abbreviation: "2Sam",  testament: "OT", language: "hebrew", bookOrder: 10, chapterCount: 24, wlcFile: "2Sam",  sblgntBook: null },
  { id: 11, name: "1 Kings",       abbreviation: "1Kgs",  testament: "OT", language: "hebrew", bookOrder: 11, chapterCount: 22, wlcFile: "1Kgs",  sblgntBook: null },
  { id: 12, name: "2 Kings",       abbreviation: "2Kgs",  testament: "OT", language: "hebrew", bookOrder: 12, chapterCount: 25, wlcFile: "2Kgs",  sblgntBook: null },
  { id: 13, name: "1 Chronicles",  abbreviation: "1Chr",  testament: "OT", language: "hebrew", bookOrder: 13, chapterCount: 29, wlcFile: "1Chr",  sblgntBook: null },
  { id: 14, name: "2 Chronicles",  abbreviation: "2Chr",  testament: "OT", language: "hebrew", bookOrder: 14, chapterCount: 36, wlcFile: "2Chr",  sblgntBook: null },
  { id: 15, name: "Ezra",          abbreviation: "Ezra",  testament: "OT", language: "hebrew", bookOrder: 15, chapterCount: 10, wlcFile: "Ezra",  sblgntBook: null },
  { id: 16, name: "Nehemiah",      abbreviation: "Neh",   testament: "OT", language: "hebrew", bookOrder: 16, chapterCount: 13, wlcFile: "Neh",   sblgntBook: null },
  { id: 17, name: "Esther",        abbreviation: "Esth",  testament: "OT", language: "hebrew", bookOrder: 17, chapterCount: 10, wlcFile: "Esth",  sblgntBook: null },
  { id: 18, name: "Job",           abbreviation: "Job",   testament: "OT", language: "hebrew", bookOrder: 18, chapterCount: 42, wlcFile: "Job",   sblgntBook: null },
  { id: 19, name: "Psalms",        abbreviation: "Ps",    testament: "OT", language: "hebrew", bookOrder: 19, chapterCount: 150, wlcFile: "Ps",   sblgntBook: null },
  { id: 20, name: "Proverbs",      abbreviation: "Prov",  testament: "OT", language: "hebrew", bookOrder: 20, chapterCount: 31, wlcFile: "Prov",  sblgntBook: null },
  { id: 21, name: "Ecclesiastes",  abbreviation: "Eccl",  testament: "OT", language: "hebrew", bookOrder: 21, chapterCount: 12, wlcFile: "Eccl",  sblgntBook: null },
  { id: 22, name: "Song of Solomon", abbreviation: "Song", testament: "OT", language: "hebrew", bookOrder: 22, chapterCount: 8, wlcFile: "Song",  sblgntBook: null },
  { id: 23, name: "Isaiah",        abbreviation: "Isa",   testament: "OT", language: "hebrew", bookOrder: 23, chapterCount: 66, wlcFile: "Isa",   sblgntBook: null },
  { id: 24, name: "Jeremiah",      abbreviation: "Jer",   testament: "OT", language: "hebrew", bookOrder: 24, chapterCount: 52, wlcFile: "Jer",   sblgntBook: null },
  { id: 25, name: "Lamentations",  abbreviation: "Lam",   testament: "OT", language: "hebrew", bookOrder: 25, chapterCount: 5,  wlcFile: "Lam",   sblgntBook: null },
  { id: 26, name: "Ezekiel",       abbreviation: "Ezek",  testament: "OT", language: "hebrew", bookOrder: 26, chapterCount: 48, wlcFile: "Ezek",  sblgntBook: null },
  { id: 27, name: "Daniel",        abbreviation: "Dan",   testament: "OT", language: "hebrew", bookOrder: 27, chapterCount: 12, wlcFile: "Dan",   sblgntBook: null },
  { id: 28, name: "Hosea",         abbreviation: "Hos",   testament: "OT", language: "hebrew", bookOrder: 28, chapterCount: 14, wlcFile: "Hos",   sblgntBook: null },
  { id: 29, name: "Joel",          abbreviation: "Joel",  testament: "OT", language: "hebrew", bookOrder: 29, chapterCount: 4,  wlcFile: "Joel",  sblgntBook: null },
  { id: 30, name: "Amos",          abbreviation: "Amos",  testament: "OT", language: "hebrew", bookOrder: 30, chapterCount: 9,  wlcFile: "Amos",  sblgntBook: null },
  { id: 31, name: "Obadiah",       abbreviation: "Obad",  testament: "OT", language: "hebrew", bookOrder: 31, chapterCount: 1,  wlcFile: "Obad",  sblgntBook: null },
  { id: 32, name: "Jonah",         abbreviation: "Jonah", testament: "OT", language: "hebrew", bookOrder: 32, chapterCount: 4,  wlcFile: "Jonah", sblgntBook: null },
  { id: 33, name: "Micah",         abbreviation: "Mic",   testament: "OT", language: "hebrew", bookOrder: 33, chapterCount: 7,  wlcFile: "Mic",   sblgntBook: null },
  { id: 34, name: "Nahum",         abbreviation: "Nah",   testament: "OT", language: "hebrew", bookOrder: 34, chapterCount: 3,  wlcFile: "Nah",   sblgntBook: null },
  { id: 35, name: "Habakkuk",      abbreviation: "Hab",   testament: "OT", language: "hebrew", bookOrder: 35, chapterCount: 3,  wlcFile: "Hab",   sblgntBook: null },
  { id: 36, name: "Zephaniah",     abbreviation: "Zeph",  testament: "OT", language: "hebrew", bookOrder: 36, chapterCount: 3,  wlcFile: "Zeph",  sblgntBook: null },
  { id: 37, name: "Haggai",        abbreviation: "Hag",   testament: "OT", language: "hebrew", bookOrder: 37, chapterCount: 2,  wlcFile: "Hag",   sblgntBook: null },
  { id: 38, name: "Zechariah",     abbreviation: "Zech",  testament: "OT", language: "hebrew", bookOrder: 38, chapterCount: 14, wlcFile: "Zech",  sblgntBook: null },
  { id: 39, name: "Malachi",       abbreviation: "Mal",   testament: "OT", language: "hebrew", bookOrder: 39, chapterCount: 3,  wlcFile: "Mal",   sblgntBook: null },

  // New Testament (Greek)
  { id: 40, name: "Matthew",       abbreviation: "Matt",  testament: "NT", language: "greek", bookOrder: 40, chapterCount: 28, wlcFile: null, sblgntBook: "61" },
  { id: 41, name: "Mark",          abbreviation: "Mark",  testament: "NT", language: "greek", bookOrder: 41, chapterCount: 16, wlcFile: null, sblgntBook: "62" },
  { id: 42, name: "Luke",          abbreviation: "Luke",  testament: "NT", language: "greek", bookOrder: 42, chapterCount: 24, wlcFile: null, sblgntBook: "63" },
  { id: 43, name: "John",          abbreviation: "John",  testament: "NT", language: "greek", bookOrder: 43, chapterCount: 21, wlcFile: null, sblgntBook: "64" },
  { id: 44, name: "Acts",          abbreviation: "Acts",  testament: "NT", language: "greek", bookOrder: 44, chapterCount: 28, wlcFile: null, sblgntBook: "65" },
  { id: 45, name: "Romans",        abbreviation: "Rom",   testament: "NT", language: "greek", bookOrder: 45, chapterCount: 16, wlcFile: null, sblgntBook: "66" },
  { id: 46, name: "1 Corinthians", abbreviation: "1Cor",  testament: "NT", language: "greek", bookOrder: 46, chapterCount: 16, wlcFile: null, sblgntBook: "67" },
  { id: 47, name: "2 Corinthians", abbreviation: "2Cor",  testament: "NT", language: "greek", bookOrder: 47, chapterCount: 13, wlcFile: null, sblgntBook: "68" },
  { id: 48, name: "Galatians",     abbreviation: "Gal",   testament: "NT", language: "greek", bookOrder: 48, chapterCount: 6,  wlcFile: null, sblgntBook: "69" },
  { id: 49, name: "Ephesians",     abbreviation: "Eph",   testament: "NT", language: "greek", bookOrder: 49, chapterCount: 6,  wlcFile: null, sblgntBook: "70" },
  { id: 50, name: "Philippians",   abbreviation: "Phil",  testament: "NT", language: "greek", bookOrder: 50, chapterCount: 4,  wlcFile: null, sblgntBook: "71" },
  { id: 51, name: "Colossians",    abbreviation: "Col",   testament: "NT", language: "greek", bookOrder: 51, chapterCount: 4,  wlcFile: null, sblgntBook: "72" },
  { id: 52, name: "1 Thessalonians", abbreviation: "1Thess", testament: "NT", language: "greek", bookOrder: 52, chapterCount: 5, wlcFile: null, sblgntBook: "73" },
  { id: 53, name: "2 Thessalonians", abbreviation: "2Thess", testament: "NT", language: "greek", bookOrder: 53, chapterCount: 3, wlcFile: null, sblgntBook: "74" },
  { id: 54, name: "1 Timothy",     abbreviation: "1Tim",  testament: "NT", language: "greek", bookOrder: 54, chapterCount: 6,  wlcFile: null, sblgntBook: "75" },
  { id: 55, name: "2 Timothy",     abbreviation: "2Tim",  testament: "NT", language: "greek", bookOrder: 55, chapterCount: 4,  wlcFile: null, sblgntBook: "76" },
  { id: 56, name: "Titus",         abbreviation: "Titus", testament: "NT", language: "greek", bookOrder: 56, chapterCount: 3,  wlcFile: null, sblgntBook: "77" },
  { id: 57, name: "Philemon",      abbreviation: "Phlm",  testament: "NT", language: "greek", bookOrder: 57, chapterCount: 1,  wlcFile: null, sblgntBook: "78" },
  { id: 58, name: "Hebrews",       abbreviation: "Heb",   testament: "NT", language: "greek", bookOrder: 58, chapterCount: 13, wlcFile: null, sblgntBook: "79" },
  { id: 59, name: "James",         abbreviation: "Jas",   testament: "NT", language: "greek", bookOrder: 59, chapterCount: 5,  wlcFile: null, sblgntBook: "80" },
  { id: 60, name: "1 Peter",       abbreviation: "1Pet",  testament: "NT", language: "greek", bookOrder: 60, chapterCount: 5,  wlcFile: null, sblgntBook: "81" },
  { id: 61, name: "2 Peter",       abbreviation: "2Pet",  testament: "NT", language: "greek", bookOrder: 61, chapterCount: 3,  wlcFile: null, sblgntBook: "82" },
  { id: 62, name: "1 John",        abbreviation: "1John", testament: "NT", language: "greek", bookOrder: 62, chapterCount: 5,  wlcFile: null, sblgntBook: "83" },
  { id: 63, name: "2 John",        abbreviation: "2John", testament: "NT", language: "greek", bookOrder: 63, chapterCount: 1,  wlcFile: null, sblgntBook: "84" },
  { id: 64, name: "3 John",        abbreviation: "3John", testament: "NT", language: "greek", bookOrder: 64, chapterCount: 1,  wlcFile: null, sblgntBook: "85" },
  { id: 65, name: "Jude",          abbreviation: "Jude",  testament: "NT", language: "greek", bookOrder: 65, chapterCount: 1,  wlcFile: null, sblgntBook: "86" },
  { id: 66, name: "Revelation",    abbreviation: "Rev",   testament: "NT", language: "greek", bookOrder: 66, chapterCount: 22, wlcFile: null, sblgntBook: "87" },
];

// Lookup helpers
export const BOOK_BY_ID = new Map(BOOKS.map(b => [b.id, b]));
export const BOOK_BY_ABBR = new Map(BOOKS.map(b => [b.abbreviation.toLowerCase(), b]));
export const BOOK_BY_NAME = new Map(BOOKS.map(b => [b.name.toLowerCase(), b]));

// MorphGNT book number to our book ID
export const SBLGNT_TO_BOOK_ID = new Map(
  BOOKS.filter(b => b.sblgntBook).map(b => [b.sblgntBook!, b.id])
);
