// =========== SANDSLIDE — Config ===========

// ===== BUILD =====
// Unique build id. Bumped in lockstep with the module cache-buster
// (`?v=...` in imports). Affects cache-busting only.
export const BUILD = '20260707s';

// Forced tutorial re-run. The tutorial replays for every player whose saved
// tutorialBuild != FORCE_TUTORIAL_BUILD. Bump MANUALLY only when you want to
// push an updated tutorial to everyone — ordinary releases leave it untouched.
export const FORCE_TUTORIAL_BUILD = '20260618a';

export const CONFIG = {
  build: BUILD,
  forceTutorialBuild: FORCE_TUTORIAL_BUILD,
  saveKey: 'egypt.v1',
  metaKey: 'egypt.v1.meta',   // separate key for streak/meta — survives a save reset
  langKey: 'egypt.lang',
  defaultLang: 'en',
};
