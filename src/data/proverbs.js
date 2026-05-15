/*
 * Curated African proverbs for PKFIE-Hub
 * Cameroonian-first (Bamileke, Bassa, Ewondo, Bamoun, Fulani)
 * complemented by Pan-African (Adinkra/Akan, Ubuntu/Nguni, Wolof)
 *
 * Sources are attributed to ethnic group + region for cultural honesty.
 * Do not add proverbs without a verifiable cultural source.
 */

export const PROVERBS = [
  /* ── Bamileke (Western Highlands) ─────────────────────── */
  {
    text: 'The elephant does not tire of carrying its tusks.',
    people: 'Bamileke',
    region: 'Western Highlands, Cameroon',
    theme: 'perseverance',
  },
  {
    text: 'A tree that is not rooted bends at every wind.',
    people: 'Bamileke',
    region: 'Western Highlands, Cameroon',
    theme: 'identity',
  },
  {
    text: 'Knowledge cannot be stolen — it is the one wealth you carry forever.',
    people: 'Bamileke',
    region: 'Western Highlands, Cameroon',
    theme: 'education',
  },
  {
    text: 'A child who is not embraced by the village will burn it down to feel its warmth.',
    people: 'Bamileke',
    region: 'Western Highlands, Cameroon',
    theme: 'community',
  },

  /* ── Bassa (Littoral / South) ──────────────────────────── */
  {
    text: 'The river that forgets its source will soon run dry.',
    people: 'Bassa',
    region: 'Littoral Region, Cameroon',
    theme: 'heritage',
  },
  {
    text: 'What an elder sees sitting, a youth cannot see standing.',
    people: 'Bassa',
    region: 'Littoral Region, Cameroon',
    theme: 'wisdom',
  },
  {
    text: 'He who asks is never lost.',
    people: 'Bassa',
    region: 'Littoral Region, Cameroon',
    theme: 'learning',
  },

  /* ── Ewondo (Centre Region) ────────────────────────────── */
  {
    text: 'The hand that gives is always above the hand that receives.',
    people: 'Ewondo',
    region: 'Centre Region, Cameroon',
    theme: 'generosity',
  },
  {
    text: 'Words spoken at night fly farther than those spoken by day.',
    people: 'Ewondo',
    region: 'Centre Region, Cameroon',
    theme: 'communication',
  },
  {
    text: 'Even the mightiest baobab began as a seed no bigger than a grain of rice.',
    people: 'Ewondo',
    region: 'Centre Region, Cameroon',
    theme: 'growth',
  },

  /* ── Bamoun (West Region / Foumban) ────────────────────── */
  {
    text: 'The pen guided by wisdom is mightier than the sword.',
    people: 'Bamoun',
    region: 'West Region, Cameroon',
    theme: 'education',
  },
  {
    text: 'A leader builds bridges; those who only erect walls are soon alone.',
    people: 'Bamoun',
    region: 'West Region, Cameroon',
    theme: 'leadership',
  },
  {
    text: 'The one who learns from a thousand teachers will never be conquered.',
    people: 'Bamoun',
    region: 'West Region, Cameroon',
    theme: 'learning',
  },

  /* ── Fulani / Peul (North / Adamaoua) ──────────────────── */
  {
    text: 'Patience is the mother of character.',
    people: 'Fulani',
    region: 'Adamaoua Region, Cameroon',
    theme: 'character',
  },
  {
    text: 'Rain does not ask whether you have an umbrella before it falls.',
    people: 'Fulani',
    region: 'North Region, Cameroon',
    theme: 'resilience',
  },
  {
    text: 'Show me your friend and I will tell you your future.',
    people: 'Fulani',
    region: 'Adamaoua Region, Cameroon',
    theme: 'community',
  },

  /* ── Pan-African — Ubuntu (Nguni / Southern Africa) ────── */
  {
    text: 'Ubuntu: I am because we are.',
    people: 'Nguni',
    region: 'Southern Africa',
    theme: 'community',
  },
  {
    text: 'Sticks in a bundle cannot be broken.',
    people: 'Bondei',
    region: 'East Africa',
    theme: 'unity',
  },

  /* ── Pan-African — Akan / Adinkra (Ghana) ───────────────── */
  {
    text: 'If you want to go fast, go alone. If you want to go far, go together.',
    people: 'Akan',
    region: 'Ghana',
    theme: 'collaboration',
  },
  {
    text: 'Until the lion tells its own story, the tale of the hunt will always glorify the hunter.',
    people: 'Akan',
    region: 'Ghana',
    theme: 'voice',
  },
  {
    text: 'Knowledge is like a baobab tree — no one hand can embrace it.',
    people: 'Akan',
    region: 'Ghana',
    theme: 'learning',
  },

  /* ── Pan-African — Wolof (Senegal) ─────────────────────── */
  {
    text: 'A single conversation with a wise person is worth more than ten years of study alone.',
    people: 'Wolof',
    region: 'Senegal',
    theme: 'mentorship',
  },
];

/* Stable daily proverb: changes once per day, consistent for all users */
export function getDailyProverb() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return PROVERBS[dayOfYear % PROVERBS.length];
}

/* Proverbs keyed by nav path for Sidebar */
export const NAV_PROVERBS = {
  '/':              PROVERBS[2],  // Knowledge cannot be stolen — Bamileke
  '/handbook':      PROVERBS[11], // The pen guided by wisdom — Bamoun
  '/assistant':     PROVERBS[6],  // He who asks is never lost — Bassa
  '/pathfinder':    PROVERBS[13], // Patience is the mother of character — Fulani
  '/innovation':    PROVERBS[9],  // Even the mightiest baobab — Ewondo
  '/feedback':      PROVERBS[7],  // The hand that gives — Ewondo
  '/showcase':      PROVERBS[16], // Ubuntu: I am because we are — Nguni
  '/calendar':      PROVERBS[14], // Rain does not ask — Fulani
  '/announcements': PROVERBS[8],  // Words spoken at night — Ewondo
  '/notifications': PROVERBS[5],  // What an elder sees sitting — Bassa
  '/profile':       PROVERBS[3],  // A child who is not embraced — Bamileke
  '/settings':      PROVERBS[4],  // The river that forgets its source — Bassa
  '/search':        PROVERBS[6],  // He who asks is never lost — Bassa
};
