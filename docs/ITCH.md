# itch.io — данные для формы «Create / Edit project»

Готовый набор полей для страницы игры на itch.io. Источник правды — код,
`manifest.webmanifest`, `docs/GAME_DESIGN.md`. Архив собирается командой
`python build-itch.py egypt-itch.zip`.

---

## Основные поля

| Поле формы | Значение |
|---|---|
| **Title** | `SANDSLIDE` |
| **Project URL** | `sandslide` (…itch.io/sandslide) |
| **Short description / tagline** | *One swipe. Slide the tomb, grab the gold, dodge the guardians.* |
| **Classification** | Game |
| **Kind of project** | HTML |
| **Release status** | In development (Prototype, v0.1) |
| **Pricing** | No payments (Free) |
| **Genre** (основной) | Puzzle |
| **Genre** (доп., если нужен) | Action / Arcade |

### Uploads
- Файл: **`egypt-itch.zip`** (собирается `python build-itch.py egypt-itch.zip`).
- Отметить галочку **«This file will be played in the browser»**.
- Точка входа: **`index.html`** (в корне архива — уже так).

### Embed options (для HTML-игры)
- **Viewport dimensions:** портрет, рекомендуется **`432 × 768`**
  (игра адаптивная — точный размер некритичен; поле центрируется).
  Внутренний рендер — `208 × 288` px, целочисленный апскейл, `pixelated`.
- **Orientation:** Portrait.
- ✅ **Mobile friendly** (тач-свайпы поддержаны).
- ✅ **Click to launch in fullscreen** (кнопка полноэкранного режима) — желательно.
- ⬜ Automatically start on page load — на выбор.
- **Background color:** `#0e0a06` (тема), фон канваса `#0a0603`.

---

## Tags (itch, до 10)

```
arcade, puzzle, pixel-art, maze, minimalist, singleplayer,
egypt, sliding-puzzle, html5, mobile
```

---

## Описание (Description) — RU

> **SANDSLIDE** — аркадный лабиринт «в один свайп». Мини-Анубис скользит по
> плитам гробницы до ближайшей стены: собирай золото, обходи патрулирующих
> мумий и доберись до саркофага-выхода. Мгновенное управление, короткие
> напряжённые забеги, «ещё один заход».
>
> **Как играть**
> - Свайп в любую из 4 сторон (или стрелки / WASD на десктопе) — герой
>   скользит по прямой до стены, собирая всё на пути.
> - Дойди от старта до саркофага. Золото — очки.
> - Столкновение с мумией = смерть. Даётся 3 жизни ♥, затем рестарт уровня.
>
> **В этой версии (v0.1)**
> - 3 уровня: **ANTECHAMBER**, **PILLAR HALLS**, **GUARDIAN CRYPT**.
> - Выбор уровня, комнаты + однопутевые коридоры-лабиринты.
> - Стражи-мумии в комнатах — их можно обойти.
> - Пиксель-арт без сглаживания, всё рисуется процедурно в коде.
> - Работает офлайн (PWA), портретная ориентация, звук можно выключить.

## Description — EN

> **SANDSLIDE** is a one-swipe arcade maze. A chibi Anubis slides across the
> tomb tiles until he hits a wall — grab the gold, weave around patrolling
> mummies, and reach the sarcophagus exit. Instant controls, short tense runs,
> "just one more go."
>
> **How to play**
> - Swipe in any of 4 directions (or Arrow keys / WASD on desktop) — the hero
>   slides in a straight line until a wall, collecting everything on the way.
> - Get from the start to the sarcophagus. Gold = score.
> - Touching a mummy is death. You have 3 lives ♥, then the level restarts.
>
> **This build (v0.1)**
> - 3 levels: **ANTECHAMBER**, **PILLAR HALLS**, **GUARDIAN CRYPT**.
> - Level select, rooms linked by single-path corridor mazes.
> - Mummy guardians live inside the rooms — you can slide around them.
> - Crisp pixel art, everything drawn procedurally in code.
> - Runs offline (PWA), portrait orientation, sound toggle.

---

## Controls (блок «Controls» / в описании)

- **Touch:** swipe up / down / left / right.
- **Desktop:** Arrow keys or WASD; Enter / Space to start.
- One swipe = one slide until a wall. No diagonals. Input mid-slide is buffered.

---

## Визуальные ассеты (нужно приложить вручную)

Их нет в репозитории — сделать скриншоты из игры:

| Ассет | Требование itch | Заметка |
|---|---|---|
| **Cover image** | 630 × 500 (мин.), показывается в списках | кадр с логотипом / игровым полем |
| **Screenshots** | 3–5 шт., портрет | title-экран, выбор уровня, игровой процесс, враг в комнате |
| **Icon** | есть `assets/icon.svg` | при желании отдать PNG-версию |

Цвета для обложки (палитра «Проклятие»): фон `#0c0406`, золото `#ffd21e`,
багровый контур `#d23a2a` / `#ff7a5c`, опасность `#ff4030`.

---

## Прочее

- **Community:** Comments (по желанию).
- **Visibility:** Draft → Restricted → Public.
- **Version / changelog:** v0.1.0 — 3 уровня, выбор уровня, стражи в комнатах.
- Билд-версия (cache-buster) синхронизирована: `CONFIG.build` == `?v=…` в импортах
  (см. `CLAUDE.md`).
