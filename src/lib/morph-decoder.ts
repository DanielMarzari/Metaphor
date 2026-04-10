// --- Morph decoder (shared, client-safe) ---

const HEB_VERB_STEM: Record<string, string> = {
  q: 'Qal', N: 'Niphal', p: 'Piel', P: 'Pual', h: 'Hiphil',
  H: 'Hophal', t: 'Hithpael', o: 'Polel', O: 'Polal', r: 'Hithpolel',
  m: 'Poel', M: 'Poal', k: 'Palel', K: 'Pulal', Q: 'Qal Passive',
  l: 'Pilpel', L: 'Polpal', f: 'Hithpalpel', D: 'Nithpael',
};
const HEB_VERB_TYPE: Record<string, string> = {
  p: 'Perf', q: 'Seq Perf', i: 'Impf', w: 'Seq Impf',
  h: 'Cohort', j: 'Juss', v: 'Impv',
  r: 'Ptcp Act', s: 'Ptcp Pass', a: 'Inf Abs', c: 'Inf Cst',
};
const HEB_PERSON: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };
const HEB_GENDER: Record<string, string> = { m: 'Masc', f: 'Fem', c: 'Com', b: 'Both' };
const HEB_NUMBER: Record<string, string> = { s: 'Sg', p: 'Pl', d: 'Du' };
const HEB_STATE: Record<string, string> = { a: 'Abs', c: 'Cst', d: 'Det' };
const HEB_NOUN_TYPE: Record<string, string> = { c: 'Common', p: 'Proper' };
const HEB_PARTICLE_TYPE: Record<string, string> = {
  a: 'Affirm', d: 'Article', e: 'Exhort', i: 'Interrog',
  j: 'Interj', m: 'Demonstr', n: 'Neg', o: 'Obj Marker', r: 'Relative',
};
const HEB_POS_SHORT: Record<string, string> = {
  A: 'Adj', C: 'Conj', D: 'Adv', N: 'Noun', P: 'Pron', R: 'Prep', S: 'Suf', T: 'Part', V: 'Verb',
};
const HEB_PRONOUN_TYPE: Record<string, string> = { d: 'Dem', f: 'Indef', i: 'Interrog', p: 'Pers', r: 'Rel' };
const HEB_SUFFIX_TYPE: Record<string, string> = { d: 'Dir He', h: 'Parag He', n: 'Parag Nun', p: 'Pronom' };

function decodeHebrew(morph: string): string {
  if (!morph) return '';
  let code = morph;
  let lang = '';
  if (code.startsWith('H')) code = code.slice(1);
  else if (code.startsWith('A')) { lang = 'Aram '; code = code.slice(1); }
  const pos = code[0];
  const rest = code.slice(1);
  if (pos === 'V') {
    return [lang + 'Verb', HEB_VERB_STEM[rest[0]] || rest[0], HEB_VERB_TYPE[rest[1]] || rest[1],
      HEB_PERSON[rest[2]] || '', HEB_GENDER[rest[3]] || '', HEB_NUMBER[rest[4]] || ''].filter(Boolean).join(' ');
  }
  if (pos === 'N') {
    return [lang + 'Noun', HEB_NOUN_TYPE[rest[0]] || '', HEB_GENDER[rest[1]] || '',
      HEB_NUMBER[rest[2]] || '', HEB_STATE[rest[3]] || ''].filter(Boolean).join(' ');
  }
  if (pos === 'T') return [lang + 'Part', HEB_PARTICLE_TYPE[rest[0]] || ''].filter(Boolean).join(' ');
  if (pos === 'P') return [lang + 'Pron', HEB_PRONOUN_TYPE[rest[0]] || '', HEB_PERSON[rest[1]] || '',
    HEB_GENDER[rest[2]] || '', HEB_NUMBER[rest[3]] || ''].filter(Boolean).join(' ');
  if (pos === 'S') return [lang + 'Suf', HEB_SUFFIX_TYPE[rest[0]] || '', HEB_PERSON[rest[1]] || '',
    HEB_GENDER[rest[2]] || '', HEB_NUMBER[rest[3]] || ''].filter(Boolean).join(' ');
  if (pos === 'A') return [lang + 'Adj', HEB_GENDER[rest[1]] || '', HEB_NUMBER[rest[2]] || '',
    HEB_STATE[rest[3]] || ''].filter(Boolean).join(' ');
  return lang + (HEB_POS_SHORT[pos] || morph);
}

const GK_POS: Record<string, string> = {
  'N-': 'Noun', 'V-': 'Verb', 'RA': 'Art', 'C-': 'Conj', 'RP': 'Pers Pron',
  'RR': 'Rel Pron', 'RD': 'Dem Pron', 'RI': 'Interrog Pron', 'RX': 'Indef Pron',
  'A-': 'Adj', 'D-': 'Adv', 'P-': 'Prep', 'X-': 'Part', 'I-': 'Interj',
};
const GK_TENSE: Record<string, string> = { P: 'Pres', I: 'Impf', F: 'Fut', A: 'Aor', X: 'Perf', Y: 'Plupf' };
const GK_VOICE: Record<string, string> = { A: 'Act', M: 'Mid', P: 'Pass' };
const GK_MOOD: Record<string, string> = { I: 'Ind', D: 'Impv', S: 'Subj', O: 'Opt', N: 'Inf', P: 'Ptcp' };
const GK_CASE: Record<string, string> = { N: 'Nom', G: 'Gen', D: 'Dat', A: 'Acc', V: 'Voc' };
const GK_NUMBER_MAP: Record<string, string> = { S: 'Sg', P: 'Pl' };
const GK_GENDER_MAP: Record<string, string> = { M: 'Masc', F: 'Fem', N: 'Neut' };

function decodeGreek(morph: string): string {
  if (!morph) return '';
  const [pos, parsing] = morph.split('|');
  const posName = GK_POS[pos] || pos;
  if (pos === 'V-' && parsing) {
    const mood = GK_MOOD[parsing[3]] || '';
    if (mood === 'Ptcp') return ['Verb', GK_TENSE[parsing[1]] || '', GK_VOICE[parsing[2]] || '', mood,
      GK_CASE[parsing[4]] || '', GK_NUMBER_MAP[parsing[5]] || '', GK_GENDER_MAP[parsing[6]] || ''].filter(Boolean).join(' ');
    if (mood === 'Inf') return ['Verb', GK_TENSE[parsing[1]] || '', GK_VOICE[parsing[2]] || '', mood].filter(Boolean).join(' ');
    return ['Verb', GK_TENSE[parsing[1]] || '', GK_VOICE[parsing[2]] || '', mood,
      HEB_PERSON[parsing[0]] || '', GK_NUMBER_MAP[parsing[5]] || ''].filter(Boolean).join(' ');
  }
  if (parsing) {
    return [posName, GK_CASE[parsing[4]] || '', GK_NUMBER_MAP[parsing[5]] || '',
      GK_GENDER_MAP[parsing[6]] || ''].filter(Boolean).join(' ');
  }
  return posName;
}

export function decodeMorph(morph: string, language: string): string {
  return language === 'hebrew' ? decodeHebrew(morph) : decodeGreek(morph);
}
