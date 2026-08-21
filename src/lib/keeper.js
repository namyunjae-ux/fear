// Secret Keeper Keyphrase Generator & Storage Manager

const ADJECTIVES = [
  'silent', 'quiet', 'wandering', 'gentle', 'deep', 'hidden', 
  'midnight', 'ancient', 'velvet', 'serene', 'distant', 'patient',
  'luminous', 'humble', 'resilient', 'still', 'solitary', 'warm'
];

const NOUNS = [
  'ocean', 'ember', 'mountain', 'forest', 'river', 'shadow', 
  'meadow', 'star', 'valley', 'horizon', 'stone', 'breeze', 
  'lantern', 'sanctuary', 'harbor', 'voyage', 'echo', 'dawn'
];

const STORAGE_KEY_PHRASE = 'echoes_keeper_keyphrase_v1';
const STORAGE_KEY_NUMBER = 'echoes_keeper_number_v1';

export function generateNewKeeper() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100; // 100~999

  const keyphrase = `${adj}-${noun}-${Math.floor(Math.random() * 90) + 10}`;
  const keeperNumber = String(num);

  return { keyphrase, keeperNumber };
}

export function getOrCreateKeeper() {
  try {
    let keyphrase = localStorage.getItem(STORAGE_KEY_PHRASE);
    let keeperNumber = localStorage.getItem(STORAGE_KEY_NUMBER);

    if (!keyphrase || !keeperNumber) {
      const newKeeper = generateNewKeeper();
      keyphrase = newKeeper.keyphrase;
      keeperNumber = newKeeper.keeperNumber;
      localStorage.setItem(STORAGE_KEY_PHRASE, keyphrase);
      localStorage.setItem(STORAGE_KEY_NUMBER, keeperNumber);
    }

    return { keyphrase, keeperNumber };
  } catch (e) {
    return generateNewKeeper();
  }
}

export function restoreKeeperKey(newKeyphrase) {
  const clean = newKeyphrase.trim().toLowerCase();
  if (!clean) return null;

  // Derive stable keeper number from keyphrase hash
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const keeperNumber = String(Math.abs(hash % 900) + 100);

  try {
    localStorage.setItem(STORAGE_KEY_PHRASE, clean);
    localStorage.setItem(STORAGE_KEY_NUMBER, keeperNumber);
  } catch {}

  return { keyphrase: clean, keeperNumber };
}
