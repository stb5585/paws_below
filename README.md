# Paws Below

A cozy isometric browser game for young children. Choose Pip the puppy or Mochi the bunny, then pick the glowing Underground Burrow or the Sunny Farm Field. The burrow is a find-your-home adventure with lava crossings and lost household treasures; the farm is a food-collection quest with corn mazes, hay and fence jumps, and eight new farm finds.

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite. The game expands to the actual dynamic viewport without forcing desktop minimum dimensions onto phones, keeps menus and controls in a centered safe area, and prompts touch players to rotate portrait devices.

## Install on Android from GitHub

The repository includes an offline-capable Progressive Web App and a GitHub Pages deployment workflow.

1. Push the repository to GitHub on the `main` or `master` branch.
2. In **Repository Settings → Pages**, choose **GitHub Actions** as the source.
3. Wait for the **Deploy Paws Below to GitHub Pages** workflow to finish.
4. Open the Pages address on Android using Chrome and tap **Install App** on the title screen. If Chrome does not offer the prompt yet, use **⋮ → Add to Home screen**.

The installed game launches in landscape standalone mode. Its small menu shell is cached during installation, while the chosen animal and map are cached on demand. Offline navigation uses the cached application without disguising missing images or scripts as HTML, and a notice lets the player accept a ready update safely. A raw Git repository URL cannot itself run an Android app; the included Pages workflow turns that repository into the secure website Android installs.

## Controls

- Move: arrow keys/WASD, follow-touch steering (the mobile default), or the optional touch joystick
- Jump: Space or the paw button
- Dig: E or the bone button; Pip always performs the dig animation, even when there is no buried item nearby
- Bark/Honk: B or the animal button; Pip barks and Mochi honks. Near active treasure, three calls play and reveal a temporary direction arrow
- Pause: Escape or the pause button
- Settings: configure sound, lighting, touch controls, and movement style; best scores can be reset separately from treasures and preferences
- Touch controls: detected automatically on phones and hybrid laptops, or forced on/off from Settings and Pause
- Touch movement: switch between Follow Touch and Joystick from Settings or Pause
- Guidance: the HUD tracks the trip home and collection progress, with stronger contextual prompts and extra help if the animal stops making progress
- Power treats: named HUD cards show each active ability and countdown; the first pickup of each kind pauses for a short, one-time explanation

## Checks

```bash
npm test
npm run validate:content
npm run test:e2e
npm run build
```

The unit suite checks animals and map-specific goals, per-animal scores, appearance and power-tip migration, score-only reset behavior, powers, saves, treasure selection, map reachability, obstacle separation, crossing definitions, isometric depth ordering, and orientation-guard decisions. The Playwright suite checks the title → animal → map flow, first-use power explanations and countdowns, Settings confirmation/cancellation, both environments, desktop rendering, landscape touch input, same-session portrait/landscape transitions, atlas integrity, and representative behind/in-front renderer fixtures.

## Improvement roadmap

See [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) for the prioritized game, mobile-control, environment-rendering, accessibility, performance, testing, and documentation roadmap.

## Project structure

- `src/game/data` contains the authoritative animal, level, collectible, power, world, and treasure definitions.
- `src/game/rendering` contains the environment renderer and semantic atlas/ground-anchor contract.
- `src/game/systems` contains persistence, scoring, sound, treasure selection, layout, collection, guidance, and rendering helpers.
- `src/game/systems/assets.ts` owns deferred animal/map loading and shared atlas registration.
- `src/game/scenes` contains the title, Settings, animal selection, map selection, tutorial, loading, maze, power-tip, pause, return-home, collection, and results flows.
- `public/assets/pip-animations.webp` contains Pip's transparent, safely padded run, dig, jump, bark, and idle animation frames.
- `public/assets/title-animals.webp` is the two-animal burrow-and-farm title artwork.
- `public/assets/bunny-animations.webp` contains transparent, individually repacked run, dig, jump, honk, and idle frames with guarded edges that prevent sprite wrapping.
- `public/assets/rabbit-atlas.webp` contains alpha-cleaned rabbit objects repacked inside guarded frame cells.
- `public/assets/burrow-atlas.webp` contains the transparent isometric environment and collectible sprites in guarded frame cells.
- `public/assets/household-treasures.webp` contains eight transparent, guarded buried-item sprites.
- `public/assets/farm-atlas.webp` contains guarded grass, corn, barn, complete tractor, hay, fence, foods, treats, and farm landmarks.
- `public/assets/farm-treasures.webp` contains eight transparent, guarded farm-find sprites with open handles and gaps.
- `public/assets/paws-icon-1024.png` is the detailed Pip-and-Mochi launcher icon source, with 192px and 512px PWA variants.
- `public/assets/menu-burrow.webp` is the polished storybook background shared by the tutorial, collection, return-home, and results screens.
- `public/manifest.webmanifest` and `public/sw.js` make the built game installable and available offline after its first load.

Progress is stored only in the browser using the versioned `paws-below-profile-v1` local-storage record. There are no accounts, analytics, or network services.
