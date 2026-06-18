# EGYPT — Analytics

Provider: **AppMetrica** (via the native Capacitor layer on Android).

> Note: on some test devices events may not arrive due to a proxy on the
> device (not a code issue) — verify on a clean network before debugging code.

## Event taxonomy (draft)

| Event | When | Params |
|-------|------|--------|
| `app_open` | boot, after `load()` | `build`, `lang` |
| `run_start` | a run/level begins | `level` |
| `run_end` | a run ends | `level`, `score`, `result` |
| `setting_changed` | sound / lang toggled | `key`, `value` |

_Keep names `snake_case`, stable, and low-cardinality. Add rows as the game grows._
