# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dead or Alive** (deadoralive.today) is a Wordle-style daily celebrity guessing game. Players guess if 10 celebrities are dead or alive, with bonus rounds for guessing cause of death. Same 10 celebrities globally each day via seeded randomization.

Built as a static PWA with vanilla JavaScript - no build tools, no frameworks.

## Development Commands

```bash
# Start local server (any method works)
python3 -m http.server 9090

# Generate celebrity data from Wikidata
python3 scraper/scraper.py

# Generate daily challenge files (365 days)
python3 scraper/generate_daily.py

# Validate celebrity data
python3 scraper/validate.py
```

**Test specific dates:** Add `?date=YYYYMMDD` to URL (e.g., `http://localhost:9090/?date=20260120`)

## Architecture

### Core Modules (js/)

- **game.js** - Main game logic, state management, daily file loading via SHA-256 hash
- **ui.js** - DOM manipulation, screen transitions (loading → game → results)
- **storage.js** - LocalStorage persistence for game state, stats, play streaks
- **share.js** - Emoji grid generation for spoiler-free social sharing
- **seededRandom.js** - Mulberry32 PRNG for deterministic daily challenges

### Data Pipeline (scraper/)

1. `scraper.py` fetches from Wikidata SPARQL by profession categories
2. `generate_daily.py` creates hashed daily files: `data/days/{SHA256(salt+date)[:16]}.json`
3. Game loads only today's 10 celebrities (prevents cheating by inspecting full data)

### Key Patterns

- **Seeded randomization**: Date-based seed ensures same celebrities globally
- **Hashed filenames**: SHA-256 of (secret salt + YYYY-MM-DD) prevents guessing future days
- **Screen-based state**: UI transitions between loading/game/results/alreadyPlayed screens
- **Answer tracking**: Each answer records `{correct, actualStatus, hasBonus, bonusCorrect}`

## Data Structures

**Celebrity object:**
```javascript
{
  id: "Q173637",           // Wikidata ID
  name: "Ice Cube",
  imageUrl: "...",
  birthYear: 1969,
  deathYear: 2024,         // null if alive
  profession: "actor",
  professionDisplay: "Actor",
  causeOfDeath: "...",     // optional
  causeCategory: "heart"   // heart|cancer|accident|illness|violence|overdose
}
```

**LocalStorage keys:**
- `dailydeparted_gameState` - Current game progress
- `dailydeparted_results` - Today's completed results
- `dailydeparted_stats` - Play streaks, history

## Visual Design

Vintage newspaper aesthetic using CSS variables:
- Fonts: UnifrakturMaguntia (masthead), Playfair Display (headlines), Special Elite (body)
- Colors: Aged paper (#f5f0e6), ink (#1a1a1a), faded tones
- No colorful emojis - use monochrome symbols (♥, ✝, ⚡, ☤, ☠, ℞)
