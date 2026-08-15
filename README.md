# Paws Below

A cozy isometric browser game for young children. Play as Pip, a little white dog exploring an underground burrow, gathering snacks, digging up lost belongings, and safely hopping over lava stones on the way home.

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite. The game uses a 16:9 landscape canvas and prompts touch players to rotate portrait devices.

## Controls

- Move: arrow keys, WASD, or the touch joystick
- Jump: Space or the paw button
- Dig: E or the contextual bone button
- Bark: B or the dog button
- Pause: Escape or the pause button

## Checks

```bash
npm test
npm run test:e2e
npm run build
```

The unit suite checks scoring, powers, saves, treasure selection, map reachability, lava separation, and crossing definitions. The Playwright suite checks desktop rendering, landscape touch input, and the portrait orientation prompt.

## Project structure

- `src/game/data` contains reusable animal, level, collectible, power, map, and treasure definitions.
- `src/game/systems` contains persistence, scoring, sound, and treasure-selection logic.
- `src/game/scenes` contains the title, tutorial, maze, pause, return-home, collection, and results flows.
- `public/assets/burrow-map.json` is the isometric Tiled map metadata.
- `public/assets/title-burrow.png` is the original generated storybook title artwork.
- `public/assets/pip-animations-v2.png` contains Pip's run, dig, jump, bark, and idle animation frames.
- `public/assets/burrow-atlas-v2.png` contains the textured isometric environment and collectible sprites.

Progress is stored only in the browser using the versioned `paws-below-profile-v1` local-storage record. There are no accounts, analytics, or network services.
