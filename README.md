# Paws Below

A cozy isometric browser game for young children. Play as Pip, a little white dog exploring an underground burrow, gathering snacks, digging up lost belongings, and safely hopping over lava stones on the way home.

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite. The game uses a 16:9 landscape canvas and prompts touch players to rotate portrait devices.

## Install on Android from GitHub

The repository includes an offline-capable Progressive Web App and a GitHub Pages deployment workflow.

1. Push the repository to GitHub on the `main` or `master` branch.
2. In **Repository Settings → Pages**, choose **GitHub Actions** as the source.
3. Wait for the **Deploy Paws Below to GitHub Pages** workflow to finish.
4. Open the Pages address on Android using Chrome and tap **Install App** on the title screen. If Chrome does not offer the prompt yet, use **⋮ → Add to Home screen**.

The installed game launches in landscape standalone mode and caches its game assets after the first successful load. A raw Git repository URL cannot itself run an Android app; the included Pages workflow turns that repository into the secure website Android installs.

## Controls

- Move: arrow keys, WASD, or the touch joystick
- Jump: Space or the paw button
- Dig: E or the contextual bone button
- Bark: B or the dog button
- Pause: Escape or the pause button
- Touch controls: detected automatically on phones and hybrid laptops, or forced on/off from the title and pause menus

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
- `public/assets/household-treasures-v2.png` contains eight distinct illustrated buried-item sprites.
- `public/assets/menu-burrow-v2.png` is the polished storybook background shared by the tutorial, collection, return-home, and results screens.
- `public/manifest.webmanifest` and `public/sw.js` make the built game installable and available offline after its first load.

Progress is stored only in the browser using the versioned `paws-below-profile-v1` local-storage record. There are no accounts, analytics, or network services.
