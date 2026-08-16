# Paws Below improvement roadmap

This document combines player feedback with a code and documentation review. It is intended to guide future releases rather than prescribe one large rewrite.

The game should remain cozy and approachable for young children: no lives, punishing timers, or hard failure states. Improvements should favor clear feedback, forgiving interactions, short play sessions, and controls that work without reading long instructions.

**Implementation status (August 2026):** Release A's responsive layout, follow-touch/joystick choice, forgiving swept pickups, and platform-appropriate prompts are implemented. Recorded proximity barks, treasure-direction reveals, a persistent objective, and progress-aware navigation help from Release B are also implemented. Content work now includes a data-driven animal picker, Mochi the bunny, a collect-then-return goal, rabbit foods and pen artwork, per-animal best scores, dynamic results totals, offline caching for the new assets, and a persistent full-screen/windowed-view control. The environment-rendering overhaul and remaining roadmap work are still future work.

## Priority guide

- **P0 — Foundation:** Fixes a visible usability or presentation problem and should happen before adding substantial content.
- **P1 — Gameplay:** Makes the current run clearer, more satisfying, or more replayable.
- **P2 — Scale and polish:** Improves maintainability, performance, accessibility, and long-term content production.

## P0 — Foundation

### 1. Fill modern landscape screens without side bars

**Player problem**

The game is locked to a 1280×720, 16:9 canvas in both Phaser and CSS. Many phones use wider ratios such as 19.5:9 or 20:9, so `FIT` scaling leaves unused areas on both sides. Under the current iPhone landscape test viewport, roughly one fifth of the available width is not used by the game.

**Recommended experience**

- Fill the complete landscape viewport without stretching Pip or the environment.
- Treat the centered 1280×720 region as the safe content area.
- On wider screens, reveal more of the burrow to the left and right during play.
- Extend menu artwork into the extra area while keeping important text and buttons inside the safe region.
- Keep HUD and touch controls clear of notches, rounded corners, and browser safe-area insets.
- Preserve support for ordinary 16:9 desktop displays and narrower landscape tablets.

**Implementation direction**

1. Prototype `Phaser.Scale.EXPAND`. If it does not provide enough control over the world camera and fixed HUD, use `Phaser.Scale.RESIZE` with a capped internal rendering resolution.
2. Remove the CSS rule that independently forces the canvas to `aspect-ratio: 16 / 9` once Phaser owns the responsive layout.
3. Add a shared layout helper that exposes the viewport center, centered safe rectangle, safe insets, and UI anchors.
4. Re-layout each menu scene from the current fixed `(640, 360)` center when the scale manager emits a resize event.
5. Size menu backgrounds using cover behavior, but do not crop interactive content.
6. Keep the gameplay camera zoom based primarily on viewport height so wider devices see additional horizontal world space.
7. Convert CSS safe-area inset values into game coordinates before positioning touch controls.

**Acceptance criteria**

- No black or decorative-only bars at 16:9, 19.5:9, or 20:9 landscape ratios.
- Pip, tiles, and circular controls are not visibly stretched.
- All menu buttons and HUD elements remain visible at every supported ratio.
- Touch controls avoid simulated left and right safe areas.
- Pointer coordinates continue to align with rendered controls after rotation or resize.

**Likely files**

- `src/main.ts`
- `src/styles.css`
- `src/game/ui.ts`
- All files under `src/game/scenes`
- `tests/e2e/game.spec.ts`
- `playwright.config.ts`

### 2. Add direct touch movement and retain joystick movement as an option

**Player problem**

An on-screen joystick occupies a large part of the playfield and asks a young child to manipulate an indirect control. Touching or dragging toward the desired direction would be more immediate.

**Recommended experience**

Add a profile setting named **Touch movement** with these modes:

- **Follow touch** — recommended default on phones. Holding a finger on an open part of the playfield makes Pip move toward that finger. Dragging changes direction continuously, and releasing stops Pip.
- **Joystick** — retains the existing virtual stick for players who prefer it.

The first implementation should use hold-and-drag steering rather than tap-to-destination movement. A single tap that makes Pip navigate automatically would require pathfinding and special handling for walls, lava, stepping stones, digging spots, and the exit. It can be added later as a third **Tap to walk** mode once navigation is reliable.

**Interaction details**

- Ignore touches that begin on Jump, Dig, Bark, Pause, menus, or other UI.
- Calculate movement direction from Pip's screen position to the active pointer, not from a fixed joystick origin.
- Use a small dead zone around Pip so the dog does not jitter when the finger is close.
- Stop on pointer release, pointer cancellation, scene pause, loss of focus, or orientation change.
- Allow a second pointer to press an action button while the first pointer continues steering.
- Display a faint paw, ripple, or directional marker under the steering finger so the child understands the connection.
- Do not automatically jump into lava. A crossing should still require Jump unless a future assisted-control option explicitly changes this behavior.

**Implementation direction**

1. Separate the current `touchControls` visibility preference from a new movement-style preference, for example `touchMovement: 'follow' | 'joystick'`.
2. Add a profile migration rather than invalidating existing version-1 saves.
3. Convert the pointer-to-Pip vector into the same screen-space movement vector currently produced by the joystick.
4. Track the steering pointer independently from action-button pointers.
5. Keep keyboard controls unchanged.
6. Update the title, pause, and tutorial screens to show the selected touch movement style.

**Acceptance criteria**

- Holding to Pip's right moves Pip right on screen; dragging around Pip changes direction smoothly.
- Releasing the finger stops movement immediately.
- Jump, Dig, and Bark work concurrently with movement using multi-touch.
- Starting a touch on an action button never changes movement direction.
- Pausing or switching scenes cannot leave Pip moving.
- The movement-style choice persists across launches.
- Existing joystick behavior still passes its movement tests when selected.

**Likely files**

- `src/game/scenes/MazeScene.ts`
- `src/game/scenes/TitleScene.ts`
- `src/game/scenes/PauseScene.ts`
- `src/game/scenes/TutorialScene.ts`
- `src/game/systems/device.ts`
- `src/game/systems/profile.ts`
- `tests/device.test.ts`
- `tests/profile.test.ts`
- `tests/e2e/game.spec.ts`

### 3. Make collectible and treat pickup more forgiving

**Player problem**

Food and treats are currently collected only when Pip is within `0.62` grid units of their exact position. This can make Pip appear to touch an item without collecting it, especially during Zoomies or imprecise touch movement.

**Recommended experience**

- Pick up ordinary food within approximately `0.85–0.95` grid units.
- Pick up larger or more important treats within approximately `1.0–1.15` grid units.
- Add a short magnet-like motion toward Pip during the final fraction of a second instead of making the item disappear abruptly.
- Preserve the existing sound, score pulse, and power announcement.
- Never attract an item through a solid wall or across lava simply because its straight-line distance is small.

**Implementation direction**

1. Add an explicit `pickupRadius` to collectible definitions or define radii by collectible kind.
2. Check the segment traveled during the current frame as well as Pip's final position. This prevents a fast Zoomies frame from skipping over an item.
3. Before magnetizing an item, confirm that Pip and the item occupy the same connected floor area or that the short path does not cross a blocked/lava cell.
4. Animate the collectible container toward Pip, then mark it collected and award points exactly once.
5. Tune the visible sprite sizes and shadows so the visual footprint agrees with the collision radius.

**Acceptance criteria**

- An item collects when Pip's visible body overlaps or very nearly touches it.
- Zoomies cannot tunnel through a collectible without collecting it.
- Items on the opposite side of a wall or lava gap do not collect.
- Each item still awards points and power only once.
- Unit tests cover the radius boundary, high-speed segment crossing, and wall/lava separation.

**Likely files**

- `src/game/types.ts`
- `src/game/data/level.ts`
- `src/game/scenes/MazeScene.ts`
- `src/game/systems/runState.ts`
- `tests/runState.test.ts`
- A new collectible-interaction unit test module

### 4. Rework environment rendering and isometric depth

**Player problem**

The current 2.5D environment can feel clunky: floor art is layered over generated diamonds, large wall sprites overlap unpredictably, and some tiles or objects do not appear in the expected order. Pip and stepping stones use very high fixed depths, which means they can render in front of walls that should occlude them.

**Probable technical causes**

- Floor cells combine a generated isometric polygon with a square atlas frame, which can produce doubled edges and inconsistent visual weight.
- Pip uses a fixed depth of `7000`, and crossing stones use `6500`, instead of depths derived from their world Y position.
- Walls, blocks, decoration, lava, the exit, collectibles, and Pip do not all follow one depth policy.
- The 1254×1254 atlases are divided into a 4×4 grid at runtime. Because 1254 is not divisible by four, frame boundaries alternate between rounded pixel sizes. A real atlas manifest would make frame rectangles explicit and easier to validate.
- The Tiled map is loaded, but most visible geometry is generated from separate TypeScript rectangles and arrays, making it easy for rendering metadata and gameplay geometry to diverge.

**Recommended visual model**

- Use a single isometric tile footprint and projection convention everywhere.
- Give every world object a depth derived from its ground-contact Y coordinate, with only HUD and temporary effects using fixed high layers.
- Split tall environment art conceptually into ground, body, and canopy/foreground layers when Pip must pass behind part of it.
- Use dedicated corner, edge, wall-top, wall-side, lava-edge, and floor variants rather than enlarging one wall image to cover arbitrary rectangular blocks.
- Make lava boundaries and stepping-stone crossings read clearly without relying on incorrect foreground depth.
- Keep decorative animation subtle and ensure decoration obeys cave lighting.

**Implementation direction**

1. Define and document a depth formula such as `depth = groundY + layerOffset`.
2. Update Pip's depth every time its world position changes.
3. Give collectibles, dig spots, stones, walls, and decoration consistent offsets relative to the same formula.
4. Replace runtime grid slicing with a Phaser atlas JSON or spritesheet whose frame dimensions divide exactly.
5. Build a small rendering test room containing every floor edge, wall orientation, block size, lava edge, stepping stone, collectible, dig mound, decoration type, and Pip moving in front of and behind tall objects.
6. Decide whether Tiled or TypeScript is authoritative, then generate the other representation or remove it.
7. Add optional development overlays for grid coordinates, ground-contact points, collision cells, and calculated depth.
8. After correctness is established, add coherent shadows, edge transitions, and a restrained foreground layer to strengthen depth.

**Acceptance criteria**

- Pip correctly passes behind walls and tall decorations and in front of them when expected.
- No floor gaps, missing tiles, doubled diamonds, or one-pixel atlas seams are visible at supported zoom levels.
- Lava edges and crossing stones render in a stable order from every camera position.
- Collision and rendered tile boundaries agree.
- Every environment frame is shown in an automated or manually reviewed rendering fixture.
- Desktop and mobile screenshot baselines cover at least two camera positions and two brightness settings.

**Likely files and assets**

- `src/game/scenes/MazeScene.ts`
- `src/game/data/level.ts`
- `src/game/scenes/BootScene.ts`
- `public/assets/burrow-atlas-v2.png`
- `public/assets/burrow-map.json`
- A new atlas JSON and rendering-fixture scene/test

### 5. Show platform-appropriate contextual controls

**Player problem**

Touch players currently see prompts such as `SPACE JUMP` and `E DIG`. These instructions are correct for a keyboard but wrong on a phone and obscure part of the playfield.

**Recommended experience**

- On keyboard, retain concise `SPACE — JUMP` and `E — DIG` prompts.
- On touch, pulse or outline the relevant action button and optionally show `JUMP` or `DIG` without a keyboard key.
- Hide or strongly dim unavailable contextual buttons.
- Update prompts immediately when touch controls are forced on or off from Pause.

**Acceptance criteria**

- No keyboard key name appears while touch-only controls are active.
- The correct button visibly reacts when Pip approaches a crossing or dig spot.
- Prompts do not overlap device safe areas or the objective HUD.

## P1 — Gameplay clarity and depth

### 6. Clarify the objective and simplify the power HUD

**Player problem**

The run begins without a persistent objective, the score does not show collection totals, and three mostly empty power boxes consume the top of the screen. The tutorial says to try treats but does not explain what the powers do.

**Recommended experience**

- Show a compact objective such as `🏠 Find home`.
- Show useful progress such as food and treasure counts, not just points.
- Only show a power slot while that power is active.
- Use a shrinking bar or ring in addition to seconds, since young children may not read timers quickly.
- On the first pickup of each power, briefly pause or slow the action and explain its effect with one sentence and a picture.
- Record which explanations have been seen in the profile.

**Acceptance criteria**

- A new player can identify the main objective without reopening the tutorial.
- Zoomies, Glow, and Super Sniff each have understandable first-use feedback.
- The inactive HUD occupies substantially less screen space on mobile.

### 7. Give Bark a useful, playful function

**Player problem**

Bark has a tutorial card and a dedicated mobile button, but currently only plays an animation and sound. Players are likely to expect it to affect the world.

**Recommended options**

- Nearby dig mounds or collectibles briefly sparkle.
- An echo, firefly, or paw trail points toward home when the player is lost.
- Hidden cave animals answer with varied sounds.
- Special decorations react, supporting harmless discovery and humor.

The basic bark should remain unlimited and fun. If it reveals secrets, use a modest radius or short cooldown rather than a consumable resource.

**Acceptance criteria**

- Bark always produces immediate audiovisual feedback.
- At least one nearby world element can respond.
- Repeated barking does not create unbounded effects, audio nodes, or overlapping hints.

### 8. Improve navigation help without removing exploration

**Player problem**

The current hint appears only after 20 seconds without visiting a new cell or collecting something. A child wandering in the wrong direction through new cells can therefore remain lost without receiving help.

**Recommended experience**

- Track progress toward the exit and repeated movement through the same region, not just whether a cell is new.
- Offer a subtle objective arrow or occasional paw-print trail.
- Let Bark request a direction hint.
- Increase assistance gradually: subtle sparkle, then arrow, then a short visible trail.
- Provide a Pause option for `Hints: More / Normal / Off` if needed.

**Acceptance criteria**

- A player moving away from the objective for an extended period eventually receives help.
- Hints never direct Pip across an invalid wall or lava route.
- Experienced players can reduce or disable guidance.

### 9. Add replayable levels and goals

**Player problem**

There is currently one handcrafted burrow with one required outcome: reach the exit. Treasure randomization supports a few repeat runs, but the route and challenge remain the same.

**Recommended progression**

1. Add two or three short burrows before creating another large map.
2. Reuse the existing goal types for variations such as finding a small number of objects before going home.
3. Introduce different visual themes, crossing arrangements, and optional secret rooms.
4. Randomize selected collectible groups or passage states while preserving reachability.
5. Reward collection milestones with collars, doghouse decorations, animation variations, or storybook pages.
6. Keep completion possible without collecting everything and avoid punishing timers.

**Acceptance criteria**

- Level definitions select their own map, start, exit, collectibles, dig spots, and goal.
- Every generated or configured variant passes a reachability check.
- Results describe the active level's true collectible totals instead of hardcoded `/30`, `/6`, and `/4` values.

### 10. Make cave lighting visually consistent

**Player problem**

Floor and wall objects participate in distance-based darkness, while lava, some decorations, and the exit do not use the same visibility rules. This weakens the lighting effect and can expose distant landmarks unpredictably.

**Recommended experience**

- Define which objects are naturally emissive, such as lava, crystals, and lanterns.
- Dim all other world objects consistently.
- Give emissive objects local glow rather than full scene-independent brightness.
- Let discovered areas retain a faint readable silhouette.
- Keep the Full Brightness option as an accessibility feature.

**Acceptance criteria**

- Decorations and walls at the same distance have consistent visibility.
- Emissive objects remain visible for an intentional, documented reason.
- Glow and Super Sniff produce clearly different effects.

### 11. Improve audio, input, and accessibility options

**Recommended changes**

- Add separate music and effects volume controls instead of mute only.
- Consider short recorded or designed sounds for Bark, digging, lava, and footsteps while keeping download size modest.
- Add reduced-motion mode for pulsing, bobbing, camera flash, and large tween effects.
- Ensure important information is not communicated by color alone.
- Offer touch-control scale and opacity settings.
- Bundle the intended Fredoka font so text is consistent and available offline.
- Replace platform-dependent emoji used for essential controls with owned game icons.
- Provide accessible HTML equivalents or an overlay for major menus and controls where practical; canvas-only buttons are not exposed meaningfully to assistive technology.

**Acceptance criteria**

- Settings persist and can be changed from Pause.
- Reduced motion removes repeated decorative movement and strong flashes without disabling essential feedback.
- Core controls remain distinguishable in grayscale and under common color-vision simulations.

## P2 — Scale, performance, and maintainability

### 12. Establish one authoritative level format

**Problem**

`burrow-map.json` is loaded as a Tiled map, but rooms, blocks, lava, crossings, collectibles, and dig spots are mostly hardcoded separately in TypeScript. This duplication makes rendering errors and future level creation more likely.

**Recommended direction**

- Prefer Tiled as the authored source if non-programmers or visual editing will be important.
- Put object types and properties for spawn, exit, collectibles, powers, dig candidates, lava, crossings, and decoration in the map.
- Parse and validate that data into typed level definitions at load time.
- Alternatively, keep TypeScript authoritative and stop loading a map that is not used. Do not maintain two hand-edited versions.
- Add schema validation with actionable error messages.

**Acceptance criteria**

- Changing a level does not require editing corresponding coordinates in two places.
- Missing exits, invalid powers, overlapping floor/lava, and unreachable required objects fail validation.

### 13. Split `MazeScene` into focused systems

**Problem**

The main scene currently handles rendering, collisions, input, touch UI, keyboard UI, powers, collection, lighting, hints, scoring, digging, jumping, audio triggers, and completion. Adding more levels or control modes will make this increasingly difficult to test.

**Recommended boundaries**

- `PlayerController`: input, movement, jumping, and collision.
- `TouchController`: follow-touch and joystick strategies plus pointer ownership.
- `InteractionSystem`: food, treats, digging, Bark reactions, and exit checks.
- `VisibilitySystem`: discovery, lighting, Glow, and Super Sniff.
- `WorldRenderer`: tile/object creation and isometric depth.
- `GameHud`: objective, score, powers, prompts, and responsive anchors.
- `LevelLoader`: parsing, validation, and world definitions.

Keep Phaser-facing objects in scene-aware classes, but move deterministic rules into pure functions that unit tests can exercise without a browser.

### 14. Reduce per-frame work and initial download size

**Problem**

Visibility currently recalculates and writes alpha for hundreds of objects every frame. Boot also preloads roughly 9.8 MB of PNG artwork before showing the title, and the production JavaScript is approximately 1.25 MB before compression.

**Recommended changes**

- Update distance-based visibility only when Pip changes cells, a power changes, brightness changes, or at a capped 10–15 Hz.
- Skip alpha writes when the value has not materially changed.
- Cull or pool off-camera animated objects where profiling shows a benefit.
- Load title/menu assets first and defer gameplay atlases until Play is selected.
- Convert suitable RGB artwork to WebP or AVIF with a tested fallback if required.
- Trim transparent atlas space and use explicit atlas metadata.
- Separate Phaser/vendor code from game code for better browser caching; prioritize total transferred bytes and startup time over eliminating the build warning alone.
- Measure on a mid-range Android device with network and CPU throttling.

**Acceptance criteria**

- The title becomes interactive substantially sooner on a simulated slow mobile connection.
- No visible lighting stepping occurs after throttling updates.
- A repeat visit can reuse stable cached vendor and asset files.
- Memory and frame time remain stable during a complete run.

### 15. Make offline updates and failures safer

**Problem**

The service worker currently returns `index.html` when any same-origin GET request fails. If an image, script, or map is missing, the browser can receive HTML for that asset and report a misleading MIME or decoding error.

**Recommended changes**

- Use the HTML fallback only for navigation requests.
- Return a normal failure or explicit offline placeholder for missing assets.
- Document and automate cache-version updates.
- Show an unobtrusive “Update ready” action rather than changing a running game unexpectedly.
- Add a production-build offline test that loads once, disables the network, and starts a full run.

**Acceptance criteria**

- Offline navigation reaches the cached application shell.
- A missing image or JavaScript request never receives `index.html`.
- Updating the deployed app does not strand clients with incompatible old HTML and new assets.

### 16. Expand documentation and automated coverage

**Documentation additions**

- Supported browsers, orientations, target aspect ratios, and safe-area policy.
- Required Node and npm versions.
- A diagram of the scene flow and core systems.
- Instructions for adding a level, atlas frame, collectible, power, treasure, or menu.
- The authoritative level-data format and its validation rules.
- Save-schema migration policy.
- Service-worker cache and release procedure.
- Accessibility targets and intended player age range.
- Asset source, license, compression, and regeneration information.

**Test additions**

- Responsive layout tests at 16:9, 19.5:9, 20:9, and 4:3 landscape.
- Simulated notch/safe-area checks.
- Visual baselines for title, tutorial, gameplay, pause, results, full brightness, and cozy lighting.
- Follow-touch steering, joystick selection, and multi-touch action tests.
- Forgiving pickup-radius and high-speed pickup tests.
- Isometric depth and environment rendering fixtures.
- Level-schema and randomized-variant reachability tests.
- Production offline-start and update tests.

The current end-to-end canvas assertion should be strengthened: checking only that the canvas is no larger than the viewport allows side bars to pass unnoticed. Tests should assert the intended viewport coverage and safe content bounds explicitly.

## Suggested delivery order

### Release A — Mobile foundation

1. Responsive landscape canvas and safe-area layout.
2. Follow-touch movement with joystick toggle.
3. Broader, swept collectible pickup.
4. Platform-correct prompts.
5. Aspect-ratio and touch regression tests.

### Release B — Rendering and clarity

1. Isometric depth policy and rendering fixture.
2. Correct atlas metadata and missing/incorrect tile fixes.
3. Objective/progress HUD and first-use power explanations.
4. Consistent cave lighting.
5. Bark reactions and improved navigation help.

### Release C — Content and durability

1. Authoritative level format and scene-system split.
2. Additional short levels and goal types.
3. Collection rewards and replay variation.
4. Loading, asset, audio, accessibility, and PWA improvements.
5. Complete contributor and release documentation.

## Definition of success

The roadmap is succeeding when a young first-time player can launch the game on a modern phone, use the entire landscape screen, understand how to move and what to do without keyboard instructions, reliably pick up visibly touched items, read the environment's depth correctly, reach home with appropriately timed help, and want to replay for a meaningful new discovery.
