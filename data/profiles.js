// Fictional adult profiles, adapted from Coffee Meets Codex (Taipei Hack Day 3rd place, 2026-10-04).
// Music edition: every person keeps their Friend/Lover intentions + consent-first rules,
// but their "evidence" is now mixtape-flavored: anthem, ritual, sonic tags.
// All people and tracks are fictional. No real users, no copyrighted audio.
export const AS_OF = '2026-10-11';

export const profiles = [
  {
    id: 'demo-mika',
    displayName: 'Mika',
    ageLabel: 'Fictional adult · 28',
    location: 'Taipei · open to online',
    headline: 'Making room for little adventures.',
    introduction:
      'Part designer, part sidewalk explorer. My walks have soundtracks — tell me the last song that made you take the long way home.',
    intentions: ['friend', 'lover'],
    tags: ['City pop', 'Lo-fi walks', 'Bossa nova'],
    anthem: { title: 'Sidewalk Slow Spin', artist: 'Mika & The Leafy Lanes', vibe: 'mellow', bpm: 92 },
    ritual: { title: 'One new street a day', detail: 'A walking journal with a 3-song mini-mix per street.' },
    project: { title: 'The Sidewalk Club', detail: 'A tiny walking journal that turns a familiar neighborhood into a new adventure.' },
    opener: 'I liked the idea behind The Sidewalk Club. What song would you put on its first page?',
  },
  {
    id: 'demo-jules',
    displayName: 'Jules',
    ageLabel: 'Fictional adult · 30',
    location: 'Singapore · online & long-distance',
    headline: 'A little code. A lot of color.',
    introduction:
      'I build playful experiments for people who think they are not creative. Trade unfinished ideas with me, over a very finished mixtape.',
    intentions: ['friend', 'lover'],
    tags: ['Ambient modular', 'Generative art', 'Sunday demos'],
    anthem: { title: 'Small Joy Machine', artist: 'Jules Patchbay', vibe: 'dreamy', bpm: 100 },
    ritual: { title: 'Make something on Sundays', detail: 'Shares works-in-progress, never waits for perfect. Always with a drone underneath.' },
    project: { title: 'Small Joy Machine', detail: 'An interactive canvas that turns everyday sounds into colorful patterns.' },
    opener: 'Small Joy Machine sounds like my kind of noise. What everyday sound would you sample first?',
  },
  {
    id: 'demo-noah',
    displayName: 'Noah',
    ageLabel: 'Fictional adult · 32',
    location: 'Taipei · local & online',
    headline: 'Tools for things worth remembering.',
    introduction:
      'Developer, notebook collector, enthusiastic beginner at pottery. I like acoustic mornings and songs that leave room to think.',
    intentions: ['friend'],
    tags: ['Acoustic folk', 'Notebooks', 'Slow mornings'],
    anthem: { title: 'Good Things, Kept', artist: 'Noah Paperbound', vibe: 'warm', bpm: 84 },
    ritual: { title: 'The best café has no rush', detail: 'A shared table, a notebook, and one fingerpicked guitar loop.' },
    project: { title: 'Good Things, Kept', detail: 'A private collection of little notes, places and moments to return to.' },
    opener: 'Good Things, Kept feels like a song already. What moment would its chorus hold?',
  },
  {
    id: 'demo-robin',
    displayName: 'Robin',
    ageLabel: 'Fictional adult · 29',
    location: 'Taipei · local & online',
    headline: 'Always learning something by hand.',
    introduction:
      'I make helpful websites and occasionally unhelpful ceramics. Vinyl soul on slow weekends — curious about your project you cannot stop talking about.',
    intentions: ['lover'],
    tags: ['Vinyl soul', 'Slow weekends', 'Web experiments'],
    anthem: { title: 'Weekend Almanac', artist: 'Robin Claytone', vibe: 'groovy', bpm: 96 },
    ritual: { title: 'Curiosity over credentials', detail: 'Makes space for beginners. First dance is always a little off-beat.' },
    project: { title: 'Weekend Almanac', detail: 'A small collection of creative rituals to make weekends feel a little longer.' },
    opener: 'Weekend Almanac — which track would you put on Saturday morning, side A?',
  },
];

// Original, royalty-free demo catalog. Each "previewTone" is a WebAudio recipe
// (frequencies + pattern), so the web simulator can synthesize a preview
// without shipping any copyrighted audio.
export const tracks = [
  { id: 't-sidewalk', title: 'Sidewalk Slow Spin', artist: 'Mika & The Leafy Lanes', mood: 'mellow', bpm: 92, previewTone: [392, 440, 523.25] },
  { id: 't-joy', title: 'Small Joy Machine', artist: 'Jules Patchbay', mood: 'dreamy', bpm: 100, previewTone: [329.63, 392, 587.33] },
  { id: 't-kept', title: 'Good Things, Kept', artist: 'Noah Paperbound', mood: 'warm', bpm: 84, previewTone: [261.63, 329.63, 392] },
  { id: 't-almanac', title: 'Weekend Almanac', artist: 'Robin Claytone', mood: 'groovy', bpm: 96, previewTone: [349.23, 440, 493.88] },
  { id: 't-nightbus', title: 'Night Bus Window', artist: 'Tape Ferns', mood: 'mellow', bpm: 88, previewTone: [293.66, 349.23, 440] },
  { id: 't-sunday', title: 'Unfinished Sunday', artist: 'Patchbay Choir', mood: 'dreamy', bpm: 104, previewTone: [440, 523.25, 659.25] },
  { id: 't-paper', title: 'Paper Cup Waltz', artist: 'Noah Paperbound', mood: 'warm', bpm: 90, previewTone: [392, 493.88, 587.33] },
  { id: 't-clay', title: 'Clay & Chorus', artist: 'Robin Claytone', mood: 'groovy', bpm: 98, previewTone: [311.13, 392, 466.16] },
];

export function briefByIntention(intention) {
  const ids = intention === 'lover' ? ['demo-mika', 'demo-jules', 'demo-robin'] : ['demo-mika', 'demo-jules', 'demo-noah'];
  return ids.map((id) => profiles.find((p) => p.id === id));
}

export function explainMatch(profile, intention) {
  const shared = `${profile.displayName} turns curiosity into small, thoughtful projects. “${profile.project.title}” is a natural place to start — especially with “${profile.anthem.title}” on.`;
  const second =
    intention === 'friend'
      ? `Your interest in making things meets ${profile.tags[0].toLowerCase()} and ${profile.tags[1].toLowerCase()}. Something here to explore together.`
      : `You both chose Lover in this fictional scenario. ${profile.ritual.title} suggests a low-pressure first conversation.`;
  return {
    reasons: [shared, second],
    uncertainty: 'Shared music taste is a starting point. Chemistry, availability and real-world fit are still unknown.',
    opener: profile.opener,
  };
}

export function mixtapeFor(profile, intention) {
  const sameVibe = tracks.filter((t) => t.artist.includes(profile.displayName) || t.title === profile.anthem.title);
  const others = tracks.filter((t) => !sameVibe.includes(t)).slice(0, 2);
  const picks = [...sameVibe.slice(0, 1), ...others].slice(0, 3);
  return {
    title: `${intention === 'lover' ? 'Slow spark' : 'First hello'} mix for ${profile.displayName}`,
    note: `Opens with “${profile.anthem.title}”, then drifts ${profile.anthem.vibe}. Fictional tracks, synthesized preview — no copyrighted audio.`,
    tracks: picks,
  };
}
