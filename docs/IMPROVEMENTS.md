# Paws Below improvement roadmap

This roadmap combines player feedback with a review of the current game, tests, and documentation. The game should remain cozy and approachable for young children: forgiving controls, clear feedback, short sessions, and no lives, punishing timers, or hard failure states.

**Reviewed:** August 2026
**Status key:** Complete · In progress · Planned

## What is already working

The following foundation work is complete and protected by automated tests:

- Responsive full-viewport layout, including wide landscape phones and safe-area-aware controls.
- Follow-touch movement with an optional virtual joystick.
- Forgiving, swept-path collectible pickup.
- Platform-appropriate prompts, recorded animal sounds, treasure-direction reveals, persistent objectives, and progress-aware guidance.
- Data-driven dog and bunny selection, underground and farm maps, animal-specific goals, collect-then-return completion, and per-animal best scores.
- Lazy-loaded WebP atlases, separate PWA shell/runtime caches, navigation-only offline fallback, and explicit update prompts.

## Priority guide

- **P0 — Foundation:** visible correctness, usability, or regression risk.
- **P1 — Gameplay:** clearer, richer, or more replayable sessions.
- **P2 — Scale and polish:** maintainability, accessibility, performance, and content-production improvements.

## P0 — Foundation

### 1. Fill modern landscape screens without side bars — Complete

The game now fills the dynamic viewport rather than forcing a 16:9 canvas. A centered safe rectangle keeps important UI readable while wide devices reveal more horizontal world space. Menu scenes respond to resize events, gameplay zoom is height-led, and touch controls account for safe-area insets.

**Regression coverage**

- Test 16:9, 19.5:9, and 20:9 landscape viewports.
- Confirm the canvas fills the viewport, sprites are not stretched, HUD content stays visible, and pointer coordinates remain aligned after resizing.

### 2. Direct touch movement with an optional joystick — Complete

Profiles can choose **Follow touch** or **Joystick**. Follow touch steers toward a held pointer, supports dragging and simultaneous action-button input, ignores touches that begin on UI, and stops on release or interruption. Keyboard controls remain unchanged.

**Future extension:** Tap-to-walk should only be considered after robust pathfinding exists; it must not silently route through lava or remove the purpose of Jump.

### 3. Broader collectible and treat pickup — Complete

Collectibles use a forgiving pickup radius plus swept-path checks, so a fast animal cannot skip through an item between frames. Visual and logical pickup ranges should remain consistent, and walls must still prevent collecting through solid geometry.

**Regression coverage**

- Pickup just inside and just outside the intended radius.
- High-speed movement across a collectible.
- Collection count and best-score updates occur exactly once.

### 4. Make the environment renderer consistent — In progress

The 2.5D presentation still has the highest visible polish gap. Floor diamonds, upright props, actors, lighting, and square textures do not yet feel like one coherent projection, and certain tile combinations can expose awkward overlaps.

**First implementation package completed**

- Added shared ground-contact depth helpers and named ground, world, and UI layers; floor surfaces remain below every actor while walls and props sort by ground contact.
- Actors now change depth from their ground position rather than using a fixed depth.
- Walls remain solid and unchanged; when a connected section occludes the animal, a synchronized translucent animal overlay preserves readability without wall transparency seams.
- Farm fences now derive their orientation, midpoint, and depth anchor from the two boundary cells they replace. Both diagonal wall directions use the same asset with placement-specific flipping, and the complete two-cell span is reserved so corn cannot overlap the fence or shift the apparent row alignment.
- Boundary walls and fences share the same half-cell ground-contact line on both isometric axes. Transparent fence spans receive clipped, textured ground foundations on only the wall-facing half of their two covered cells, avoiding exposed partial tiles without pushing the fence ahead of its corn row. Internal wall cells retain centered collision placement over complete themed ground foundations. Cozy-light visibility shades opaque floor surfaces and tints environment sprites instead of fading every tile independently, preventing the scene background from reopening divergent seams.
- Player collision now checks a nine-point ground footprint rather than only the rounded center position. Perimeter and internal walls therefore stop the complete animal footprint, including along the lower map edges and diagonal corners.
- Crossings now define a standing height: the animal and shadow rest on top of rocks and hay bales, and directional input can turn the animal before the next jump.
- Walls, stepping stones, collectibles, effects, decor, and exit elements use the same ordering model.
- Removed duplicate rendering of blocked underground cells.
- Included underground decor in the lighting visibility set.
- Added unit tests for layer ordering and browser regression fixtures showing the animal both behind and in front of a blocked tile.

**Second implementation package completed**

- Extracted floor, obstacle, wall, landmark, decor, and home drawing into `EnvironmentRenderer`.
- Moved semantic decor and landmark placements into each world's render profile.
- Defined one projection contract for tile dimensions, world origin, sprite ground anchors, display sizes, and collision footprints.
- Replaced repeated pixel-lift calculations with normalized asset anchors, retaining native atlas proportions.
- Added build/startup validation for bounds, IDs, overlaps, jump paths, reachability, render references, atlas frames, anchors, and footprints.
- Validation found and corrected two burrow decorations that occupied the same cells as food.
- Expanded underground and farm browser fixtures to cover crossings, blocked cells, homes, asset anchors, farm rows, and both animals near tall props.

**Next renderer work**

1. Review landmark placement and light masks at every supported aspect ratio.
2. Replace an atlas frame only when fixture review identifies a concrete perspective, clipping, or transparency defect.
3. Move visibility masking into a dirty-state lighting controller after profiling its current per-frame cost.

**Acceptance criteria**

- Animals pass naturally in front of and behind walls and tall props.
- Every blocked cell is drawn once and collision agrees with its visible footprint.
- No missing, clipped, or unexpectedly stretched tile appears in either map.
- Ground-contact ordering remains correct while jumping; visual lift must not change the actor's ground depth.
- Renderer fixtures are deterministic and useful for screenshot comparison.

### 5. Keep prompts accurate for the active input — Complete

Prompts use keyboard language on keyboard-first devices and touch/action language when touch controls are active. Copy should continue to come from semantic actions rather than scene-specific key strings.

### 6. Clarify the objective and power-ups — In progress

The HUD now shows the current goal, collected/required totals, and return-home progress. The next step is to make temporary abilities equally legible.

**Next work**

- Give each power-up a clear name, icon, remaining duration, and first-use explanation.
- Explain whether a power affects speed, pickup reach, digging, or hazards.
- Keep explanations brief and pause gameplay only when a first-use card genuinely helps.

### 7. Make the animal sound useful — Complete

Bark/honk feedback uses recorded audio and can reveal treasure direction when relevant. Preserve a cooldown and avoid requiring sound for progression; visual feedback must carry the same information.

### 8. Improve navigation and recovery — In progress

Progress-aware hints already guide players toward remaining objectives or home. Further assistance should be optional and should reduce frustration without turning the game into an arrow-following exercise.

**Next work**

- Add a guidance strength setting: off, gentle hints, or stronger route hints.
- Detect extended lack of progress before increasing hint strength.
- If route arrows are added, generate them from actual walkable paths and clear them after meaningful progress.

## P1 — Gameplay and content

### 9. Add new animal choices: pony and kitten — Planned

Pony and kitten should be complete choices, not simple sprite swaps. Each needs a readable silhouette, movement/idle/action animations, a distinctive sound, a home, suitable treats, and a goal sentence that uses the same shared game rules as existing animals.

**Implementation direction**

1. Extend the existing data-driven animal definitions rather than adding animal checks to scenes.
2. Add assets through the lazy-loading registry so only the selected animal's atlas and audio load for a run.
3. Use common movement and collision values initially; tune only when playtesting shows the larger pony silhouette needs different visual offsets.
4. Give pony an appropriate mane-customization anchor and kitten collar/accessory anchors as the first proof of the cosmetic system below.
5. Add selection, persistence, results, asset-loading, and representative map screenshot tests for both animals.

**Acceptance criteria**

- Pony and kitten can complete every map and all shared actions.
- Their sound, prompts, home, treats, HUD portrait, and results text are correct.
- Selection and best scores persist independently.
- No new animal requires branching logic in `MazeScene`.

### 10. Add customizable colors and extras — In progress

Let players personalize animals and home spaces with accessible color choices and extras such as collars, houses, and pony manes. Keep this playful and simple; the roadmap does not assume purchases or a complex inventory economy.

**Foundation completed**

- Profiles now contain a versioned appearance record for each animal with a palette, named cosmetic slots, and home style.
- Existing saves migrate to independent defaults without losing scores, discoveries, controls, or accessibility settings.
- Appearance identifiers are sanitized and valid future cosmetic slots survive save/load.

The selection/preview UI, layered sprite attachments, palettes, and actual cosmetic artwork remain future work.

**Implementation direction**

- Store a small versioned `appearance` object per animal: palette plus named cosmetic slots.
- Render cosmetics as layered attachments with data-defined anchors. Do not create a full duplicate animation atlas for every combination.
- Start with one palette slot and one accessory slot per animal, then validate layering during all animations.
- Provide a live preview, a clear **None** option, and high-contrast palette choices that remain distinguishable for common color-vision differences.
- Treat houses as a world/home variation, separate from body attachments.
- Migrate existing profiles to defaults without clearing scores.

**Acceptance criteria**

- Choices persist and appear in selection, gameplay, and results where appropriate.
- Accessories remain attached during movement, digging, jumping, and idle animation.
- No selection changes collision size or gameplay advantage.
- The menu is usable by touch and keyboard and has sensible screen-reader labels.

### 11. Expand map options — Planned

Add maps one at a time, with a distinct visual identity and one understandable gameplay twist rather than many simultaneous mechanics. Good candidates include a beach/cove, garden, snowy yard, or woodland trail.

**Implementation direction**

- Keep map definitions declarative and validate bounds, blocked cells, spawn/home positions, collectibles, treasure candidates, and reachable routes at build time.
- Reuse shared hazards and interactions before inventing map-only systems.
- Give each map a representative renderer fixture and a complete-run browser test.
- Load only the chosen world atlas and map-specific audio.
- Make map selection show its objective and a visual preview before starting.

**Acceptance criteria**

- Every animal can complete every map.
- Required items and home are reachable in every supported variant.
- Dynamic HUD/results totals come from level data, never copied constants.
- Adding a map requires data and assets, not edits scattered across scene logic.

### 12. Add a safe way to reset scores — Complete

Players need a deliberate way to clear best scores without deleting unrelated preferences or accidentally losing everything.

The Settings screen now centralizes sound, lighting, touch-control, and movement preferences. **Reset best scores** requires an explicit confirmation, offers Cancel, clears both aggregate and per-animal scores, and preserves discoveries, badges, controls, and appearance data. Unit and browser tests cover migration, cancellation, confirmation, persistence, and field preservation.

**Recommended experience**

- Add **Reset best scores** in Settings, separate from **Reset all progress** if full reset is ever offered.
- Show a confirmation naming exactly what will be removed and offer Cancel as the safe default.
- Reset every currently stored aggregate and per-animal score while preserving controls, accessibility settings, appearance choices, and discoveries. Future per-map score records should join the same reset operation.
- Confirm completion with a short message; do not reload the page unexpectedly.

**Acceptance criteria**

- Cancel changes nothing.
- Confirm removes every best-score entry and only those entries.
- The change persists after reload and handles profiles created by older versions.
- Unit and browser tests cover both cancel and confirm paths.

### 13. Make buried pirate treasure rare and available in every map — Planned

Pirate treasure should feel like a surprising bonus, not a guaranteed underground-map task. Every map needs valid dig candidates, but only some runs should contain the special treasure.

**Recommended rules**

- Choose treasure eligibility once when a run is created and persist the run seed so reloading cannot repeatedly reroll it.
- Start with an understandable rarity, such as roughly one treasure run in eight, then tune from playtest data.
- Use a gentle pity rule after several eligible runs without treasure so children are not locked out by bad luck.
- Pick only reachable, non-overlapping dig locations defined or validated by each map.
- Keep ordinary map completion independent of finding treasure.
- Celebrate discovery and record it in a collection page without gambling-like language or paid rerolls.

**Acceptance criteria**

- Treasure can appear in every map and never appears outside a valid dig location.
- A run's result is stable across pause, reload, and resume.
- Rare treasure does not block the normal goal or best-score update.
- Deterministic seeded tests cover present, absent, pity, and every-map cases.

### 14. Make maps dynamic without overcomplicating them — Planned

Use curated, seeded variation instead of fully procedural mazes. Small changes provide replay value while keeping navigation readable and renderer/test complexity under control.

**First scope**

- Select among authored collectible, dig-spot, and decor sets.
- Toggle one or two prevalidated passage or hazard modules per map.
- Vary optional landmark placement and ambient details without moving the home or changing the core objective.
- Derive a stable seed at run creation and store it for resume/replay diagnostics.
- Validate reachability and minimum path widths for every allowed combination in unit tests.

**Guardrails**

- Do not generate arbitrary walls at runtime.
- Do not randomize tutorial-critical layouts.
- Cap the number of simultaneous variants and make each combination reproducible from its seed.
- Prefer variations a child can notice over invisible numerical randomness.

**Acceptance criteria**

- Consecutive runs can feel different while retaining the map's identity.
- Every generated combination is completable and has deterministic totals.
- A failed visual or gameplay test reports the seed needed to reproduce it.
- Variation logic lives outside `MazeScene` and uses validated level data.

### 15. Add more replayable goals — In progress

The game now supports collect-then-return goals and data-driven animal objectives. After map variety is established, add optional low-pressure variations such as finding a favorite item, helping another animal, or completing a route without using a hint.

Avoid mandatory timers and precision challenges. Reward exploration, and keep the primary completion path obvious.

### 16. Improve lighting and landmark visibility — In progress

Underground decor now participates in visibility masking, but the complete lighting language still needs a pass.

**Next work**

- Keep the animal, objective items, home, and current hint legible at all times.
- Make lava and exits read as intentional light sources where appropriate.
- Update masks only when the camera/player/light state changes rather than rebuilding expensive geometry every frame.
- Verify landmarks at wide and narrow landscape ratios.

### 17. Accessibility and comfort options — Planned

Add separate music and effects volume, mute, reduced motion, optional screen shake, high-contrast UI, and guidance strength. Recorded audio should never be the only signal. Respect the platform reduced-motion preference on first launch while allowing an explicit profile override.

## P2 — Scale, performance, and maintenance

### 18. Keep one authoritative level format — Complete

TypeScript world definitions are authoritative, and the unused `mapKey`/legacy JSON-map path has been removed. Content validation now checks dimensions, rectangles, coordinates, overlaps, IDs, atlas frames, render metadata, jump paths, level goals, and reachability. It reports the affected world/level and coordinate, runs in the build, and is asserted again at application startup. Dynamic variants must pass through the same validator when Package 4 introduces them.

### 19. Split `MazeScene` into focused systems — In progress

`EnvironmentRenderer` now owns floor, obstacle, wall, landmark, decor, and home rendering. `MazeScene` still owns orchestration, actor and interactive-object rendering, input, movement, collection, power-ups, hints, lighting updates, audio, UI, and transitions. Continue extracting pure helpers first, then small stateful components with explicit lifecycle methods.

**Suggested sequence**

1. Environment/tile renderer using the new projection and depth helpers. **Complete.**
2. Input controller that merges keyboard, follow-touch, joystick, and actions.
3. Objective/collection controller.
4. HUD and guidance presenter.
5. Lighting controller with dirty-state updates.

Keep `MazeScene` as the coordinator. Avoid a large framework rewrite.

### 20. Continue asset and runtime performance work — In progress

Canonical WebP atlases and selected-animal/world lazy loading are complete. Remaining work should be measured before optimization.

**Next work**

- Profile frame time and texture memory on a representative low-end phone.
- Replace per-frame visibility or allocation work with dirty flags where measurements justify it.
- Consider smaller UI/audio payloads and long-term caching for hashed assets.
- Track initial shell size, selected-run asset size, and time-to-play in CI or release checks.

### 21. PWA caching and update safety — Complete

The service worker separates shell and runtime caches, falls back to HTML only for navigation, and exposes ready updates instead of forcing a mid-session refresh. Retain production-host offline tests and verify that missing assets return a real error rather than the app shell.

### 22. Keep documentation and tests current — In progress

Documentation should describe the current architecture and controls, while tests should focus on behavior rather than obsolete implementation details.

**Maintenance policy**

- Delete superseded assets and references when their replacement is established in the same change.
- Keep README structure and asset-loading notes synchronized with the source tree.
- Prefer unit tests for pure layout, pickup, guidance, level validation, and rendering-order rules.
- Use browser tests for one representative flow per animal/map plus viewport, touch, PWA, and renderer fixtures.
- Store screenshots only as intentional test artifacts or reviewed baselines, not ad hoc repository clutter.
- Remove tests that only assert stale source strings when a behavioral assertion is practical.

### 23. Broaden release and real-device test coverage — In progress

The automated suite protects core rules and representative rendering, but deployment testing exposed an important gap: portrait and landscape were tested as separate browser launches, not as an orientation change during one active session. The orientation guard now has unit coverage and a portrait → landscape → portrait browser regression test.

**Next coverage targets**

- Complete all four current animal/map combinations in browser tests, including goal completion, results, best-score persistence, and returning to the title.
- Exercise resize and orientation changes during menus, gameplay, pause, and installed-PWA use rather than only at startup.
- Test both Follow Touch and Joystick with simultaneous action-button input on physical Android hardware.
- Add an installed-PWA release check covering first install, offline relaunch, a missing asset, and accepting an available update.
- Review intentional screenshot fixtures at two brightness settings and representative 16:9, wide-phone, and tablet viewports.
- Record frame time, texture memory, time-to-play, battery/heat observations, device/browser version, and any failing fixture seed during release testing.
- Add keyboard-only and basic screen-reader passes for menus and settings as those interfaces expand.

**Acceptance criteria**

- A release checklist records at least one physical phone and one desktop browser.
- Every animal/map combination can finish without console errors or unreachable objectives.
- Rotation never leaves the guard, canvas, HUD, camera, or touch controls in stale dimensions.
- Offline/update tests run against a production build and deployed service-worker scope.
- Visual and performance regressions have reproducible viewport, device, and game-state details.

## Recommended delivery order

### Package 1 — Renderer correctness (complete)

- Shared ground-contact depth and named layer helpers.
- Consistent world/UI depth usage.
- Duplicate blocked-tile fix.
- Lighting registration for decor.
- Unit and browser regression fixtures.

### Package 2 — Renderer extraction and asset contract (complete)

- Projection metadata and renderer modules.
- Representative visual fixture matrix.
- Normalized wall, floor, landmark, home, and crossing anchors and corrected conflicting placements.
- Level/atlas validation.

### Release validation checkpoint (current)

- Deploy the feature branch or release candidate.
- Complete the real-device and installed-PWA checks in improvement 23.
- Fix release-blocking renderer, orientation, input, persistence, and performance findings before adding Package 3 animal or cosmetic artwork.

### Package 3 — Personalization and animals (in progress)

- Versioned appearance/profile foundation. **Complete.**
- Confirmed score-only reset flow. **Complete.**
- Minimal layered cosmetic rendering and selection UI.
- Pony and kitten using the same data-driven contract.

### Package 4 — Map variety

- One new map.
- Seeded curated variants and reachability validation.
- Rare cross-map pirate treasure.

### Package 5 — Comfort and maintainability

- Accessibility/comfort controls.
- Remaining `MazeScene` extraction.
- Measured mobile performance improvements.

Each package should be independently releasable and leave the game in a tested, playable state.
