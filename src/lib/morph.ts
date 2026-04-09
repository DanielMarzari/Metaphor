/**
 * Morphology code decoder for WLC Hebrew and MorphGNT Greek parsing codes.
 * Converts compact codes into human-readable descriptions.
 */

// --- Hebrew (WLC / OSHB) morph codes ---

const HEB_POS: Record<string, string> = {
  A: 'Adjective', C: 'Conjunction', D: 'Adverb', N: 'Noun',
  P: 'Pronoun', R: 'Preposition', S: 'Suffix', T: 'Particle', V: 'Verb',
};

const HEB_PARTICLE_TYPE: Record<string, string> = {
  a: 'Affirmation', d: 'Article', e: 'Exhortation', i: 'Interrogative',
  j: 'Interjection', m: 'Demonstrative', n: 'Negative', o: 'Direct Object Marker',
  r: 'Relative',
};

const HEB_VERB_STEM: Record<string, string> = {
  q: 'Qal', N: 'Niphal', p: 'Piel', P: 'Pual', h: 'Hiphil',
  H: 'Hophal', t: 'Hithpael', o: 'Polel', O: 'Polal', r: 'Hithpolel',
  m: 'Poel', M: 'Poal', k: 'Palel', K: 'Pulal', Q: 'Qal Passive',
  l: 'Pilpel', L: 'Polpal', f: 'Hithpalpel', D: 'Nithpael',
  j: 'Pealal', i: 'Pilel', u: 'Hothpaal', c: 'Tiphil', v: 'Hishtaphel',
  w: 'Nithpalel', y: 'Nithpoel', z: 'Hithpoel',
};

const HEB_VERB_TYPE: Record<string, string> = {
  p: 'Perfect', q: 'Sequential Perfect', i: 'Imperfect', w: 'Sequential Imperfect',
  h: 'Cohortative', j: 'Jussive', v: 'Imperative',
  r: 'Participle Active', s: 'Participle Passive',
  a: 'Infinitive Absolute', c: 'Infinitive Construct',
};

const HEB_PERSON: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };
const HEB_GENDER: Record<string, string> = { m: 'Masculine', f: 'Feminine', c: 'Common', b: 'Both' };
const HEB_NUMBER: Record<string, string> = { s: 'Singular', p: 'Plural', d: 'Dual' };
const HEB_STATE: Record<string, string> = { a: 'Absolute', c: 'Construct', d: 'Determined' };

const HEB_NOUN_TYPE: Record<string, string> = { c: 'Common', p: 'Proper' };
const HEB_ADJ_TYPE: Record<string, string> = { a: 'Adjective', c: 'Cardinal', g: 'Gentilic', o: 'Ordinal' };
const HEB_PRONOUN_TYPE: Record<string, string> = {
  d: 'Demonstrative', f: 'Indefinite', i: 'Interrogative', p: 'Personal', r: 'Relative',
};
const HEB_SUFFIX_TYPE: Record<string, string> = { d: 'Directional He', h: 'Paragogic He', n: 'Paragogic Nun', p: 'Pronominal' };

export function decodeHebrewMorph(morph: string): string {
  if (!morph) return '';
  // Strip leading 'H' or 'A' (language prefix)
  let code = morph;
  let lang = '';
  if (code.startsWith('H')) { lang = ''; code = code.slice(1); }
  else if (code.startsWith('A')) { lang = 'Aramaic '; code = code.slice(1); }

  const pos = code[0];
  const rest = code.slice(1);

  if (pos === 'V') {
    const stem = HEB_VERB_STEM[rest[0]] || rest[0];
    const type = HEB_VERB_TYPE[rest[1]] || rest[1];
    const person = HEB_PERSON[rest[2]] || '';
    const gender = HEB_GENDER[rest[3]] || '';
    const number = HEB_NUMBER[rest[4]] || '';
    const parts = [lang + 'Verb', stem, type, person, gender, number].filter(Boolean);
    return parts.join(' ');
  }

  if (pos === 'N') {
    const type = HEB_NOUN_TYPE[rest[0]] || '';
    const gender = HEB_GENDER[rest[1]] || '';
    const number = HEB_NUMBER[rest[2]] || '';
    const state = HEB_STATE[rest[3]] || '';
    const parts = [lang + 'Noun', type, gender, number, state].filter(Boolean);
    return parts.join(' ');
  }

  if (pos === 'A') {
    const type = HEB_ADJ_TYPE[rest[0]] || '';
    const gender = HEB_GENDER[rest[1]] || '';
    const number = HEB_NUMBER[rest[2]] || '';
    const state = HEB_STATE[rest[3]] || '';
    const parts = [lang + 'Adjective', type, gender, number, state].filter(Boolean);
    return parts.join(' ');
  }

  if (pos === 'P') {
    const type = HEB_PRONOUN_TYPE[rest[0]] || '';
    const person = HEB_PERSON[rest[1]] || '';
    const gender = HEB_GENDER[rest[2]] || '';
    const number = HEB_NUMBER[rest[3]] || '';
    const parts = [lang + 'Pronoun', type, person, gender, number].filter(Boolean);
    return parts.join(' ');
  }

  if (pos === 'S') {
    const type = HEB_SUFFIX_TYPE[rest[0]] || '';
    const person = HEB_PERSON[rest[1]] || '';
    const gender = HEB_GENDER[rest[2]] || '';
    const number = HEB_NUMBER[rest[3]] || '';
    const parts = [lang + 'Suffix', type, person, gender, number].filter(Boolean);
    return parts.join(' ');
  }

  if (pos === 'T') {
    const type = HEB_PARTICLE_TYPE[rest[0]] || '';
    return [lang + 'Particle', type].filter(Boolean).join(' ');
  }

  if (pos === 'R') return lang + 'Preposition';
  if (pos === 'C') return lang + 'Conjunction';
  if (pos === 'D') return lang + 'Adverb';

  return lang + (HEB_POS[pos] || morph);
}

// --- Greek (MorphGNT) morph codes ---

const GK_POS: Record<string, string> = {
  'N-': 'Noun', 'V-': 'Verb', 'RA': 'Article', 'C-': 'Conjunction',
  'RP': 'Personal Pronoun', 'RR': 'Relative Pronoun', 'RD': 'Demonstrative Pronoun',
  'RI': 'Interrogative Pronoun', 'RX': 'Indefinite Pronoun',
  'A-': 'Adjective', 'D-': 'Adverb', 'P-': 'Preposition',
  'X-': 'Particle', 'I-': 'Interjection',
};

const GK_TENSE: Record<string, string> = {
  P: 'Present', I: 'Imperfect', F: 'Future', A: 'Aorist',
  X: 'Perfect', Y: 'Pluperfect',
};

const GK_VOICE: Record<string, string> = {
  A: 'Active', M: 'Middle', P: 'Passive',
};

const GK_MOOD: Record<string, string> = {
  I: 'Indicative', D: 'Imperative', S: 'Subjunctive', O: 'Optative',
  N: 'Infinitive', P: 'Participle',
};

const GK_CASE: Record<string, string> = {
  N: 'Nominative', G: 'Genitive', D: 'Dative', A: 'Accusative', V: 'Vocative',
};

const GK_NUMBER: Record<string, string> = { S: 'Singular', P: 'Plural' };

const GK_GENDER: Record<string, string> = { M: 'Masculine', F: 'Feminine', N: 'Neuter' };

const GK_PERSON: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };

const GK_DEGREE: Record<string, string> = { C: 'Comparative', S: 'Superlative' };

export function decodeGreekMorph(pos: string, parsing: string): string {
  if (!pos) return '';
  const posName = GK_POS[pos] || pos;

  if (pos === 'V-' && parsing) {
    // parsing: person tense voice mood case number gender degree
    //          0      1     2     3    4    5      6      7
    const person = GK_PERSON[parsing[0]] || '';
    const tense = GK_TENSE[parsing[1]] || '';
    const voice = GK_VOICE[parsing[2]] || '';
    const mood = GK_MOOD[parsing[3]] || '';
    const caseVal = GK_CASE[parsing[4]] || '';
    const number = GK_NUMBER[parsing[5]] || '';
    const gender = GK_GENDER[parsing[6]] || '';
    // Participles have case/number/gender instead of person
    if (mood === 'Participle') {
      return ['Verb', tense, voice, mood, caseVal, number, gender].filter(Boolean).join(' ');
    }
    if (mood === 'Infinitive') {
      return ['Verb', tense, voice, mood].filter(Boolean).join(' ');
    }
    return ['Verb', tense, voice, mood, person, number].filter(Boolean).join(' ');
  }

  if (parsing) {
    const caseVal = GK_CASE[parsing[4]] || '';
    const number = GK_NUMBER[parsing[5]] || '';
    const gender = GK_GENDER[parsing[6]] || '';
    const degree = GK_DEGREE[parsing[7]] || '';
    const parts = [posName, caseVal, number, gender, degree].filter(Boolean);
    return parts.join(' ');
  }

  return posName;
}

/**
 * Decode a morph code from the segments JSON.
 * For Hebrew: morph is the full OSHB code (e.g., "HVqp3ms")
 * For Greek: morph is "POS|parsing" (e.g., "N-|----NSF-")
 */
export function decodeMorph(morph: string, language: 'hebrew' | 'greek'): string {
  if (!morph) return '';
  if (language === 'hebrew') return decodeHebrewMorph(morph);
  if (language === 'greek') {
    const [pos, parsing] = morph.split('|');
    return decodeGreekMorph(pos, parsing);
  }
  return morph;
}
