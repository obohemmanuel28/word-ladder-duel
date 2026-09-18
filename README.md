# Word Ladder Duel

Turn a start word into a target word, one letter at a time — every step must be a real word.

## Play

Open [`index.html`](index.html) in a browser. No build step or server required.

- **Solo** — race against the daily or a random puzzle.
- **Duel (pass & play)** — two players take turns on the same puzzle; fewest moves (ties broken by time) wins.

### Controls

| Action | Description |
| --- | --- |
| Enter a word | Type a 4-letter word that differs from the last one by exactly one letter, then submit. |
| Undo | Remove the last word from your chain. |
| Hint | Reveals the next word on a shortest path to the target. |
| Give Up | Reveals the full solution path. |

Daily puzzles are seeded by date, so everyone gets the same puzzle on a given day. Streaks and best scores are saved locally in your browser (`localStorage`).

## Files

- [`index.html`](index.html) — markup and screens (setup, game, result).
- [`style.css`](style.css) — layout and theme.
- [`script.js`](script.js) — game logic: word graph (BFS), puzzle generation, turn/session state, rendering.
- [`dictionary.js`](dictionary.js) — the 4-letter word list used to build the word graph.
