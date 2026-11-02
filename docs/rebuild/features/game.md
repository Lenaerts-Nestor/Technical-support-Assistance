# Feature spec: Game "Last Stand" (break-time mini game)

> As-built documentation. Source: `src/features/game/` (~6.7k lines, 12 test files), `tools/game-assets/prepare.py`, README section "Game".
> It must be rebuilt in the new project, but as an **optional, isolated module**.

## 1. Why it exists
A short, skill-based break between calls that clears the head. It has no work data, needs no network and must never slow the work pages.

## 2. Product rules
| ID | Rule |
|---|---|
| GM-R1 | Runs only while the page is open; **Enter** starts, **Esc** pauses, **New game** abandons the run and returns to hero choice. |
| GM-R2 | Chosen hero is remembered in the browser; nothing else is saved. This session's run list shows on the game-over screen and is not persisted. |
| GM-R3 | Three heroes with distinct kits (light/heavy/air/dash/guard). Only the guard hero has guard + parry (parry = no damage, stamina back, attacker left open). |
| GM-R4 | Five enemy types (imp, demon, lancer, archer, brute), introduced from rounds 1/1/2/3/4; per-round health and damage scaling; **elites** from round 6 (more health/damage/speed, double points). |
| GM-R5 | Heavy enemies have **poise**: light hits don't stagger until poise breaks, then extra damage. Every attack shows a warning marker and danger zone first. |
| GM-R6 | Level: wide view, three tiers of one-way ledges (jump up through, drop with S), camera rises with the player. Place changes every 5th round (3 biomes). |
| GM-R7 | Round cycle: defeat all → collect shards → light shrines → shards → **boss**. In shard/shrine rounds enemies keep coming until the objective is done. |
| GM-R8 | Clear = heal a third + full stamina + clear bonus + **flawless** bonus (no damage), then **pick 1 of 3 upgrades**; pick can be changed until the next round starts. Upgrades last the run; guard upgrades offered only to the guard hero. |
| GM-R9 | Kill **streak** multiplies points; being hit ends it. Endless. |
| GM-R10 | Bosses every 5th round: slam, enraged double waves below 50 % health, charge (wall hit = stunned), roar summons imps. |
| GM-R11 | Controls: A/D move, W/Space jump (hold = higher), S/↓ drop (+J in air = dive), Shift dash (i-frames, stamina), J light, K heavy, L guard. |

## 3. Architecture worth preserving
- **Pure simulation** (`sim.ts`, `rounds.ts`, `objectives.ts`, `heroes.ts`, `upgrades.ts`, `platforms`, `input.ts`) separate from **rendering** (`draw/*`) and the **page/UI** (`GamePage`, `HeroPicker`, `BreakScreen`).
  The sim has unit tests (`sim`, `boss`, `rounds`, `objectives`, `heroes`, `input`, `platforms`, `upgrades`) → port them first.
- **Data-driven tuning**: every number in `config.ts` / `pacing.ts`; hero moves timed to sprite frames in `spriteData.ts`; levels in `biomes.ts`; enemy looks in `enemyLooks.ts`.
- **Asset pipeline**: `tools/game-assets/prepare.py` converts purchased/free packs into renamed sheets (recolour, composite roll/lance, cut tile map). Keep the script, not the downloaded packs.

## 4. Rebuild recommendations
1. Ship as a **lazy-loaded plugin** (`import()`), its own folder/package, registered through the app's feature registry. Core must build and run without it.
2. Fixed-timestep simulation loop (deterministic) + render interpolation; seeded RNG so tests and "daily seed" are possible.
3. **Asset licensing**: README states the pack licences were *not checked*. Before the new repo is public: verify each pack's licence, keep a `CREDITS.md`, or switch to CC0 art. Do not commit paid/restricted packs.
4. Don't commit generated sheets without a manifest; commit the manifest + prepare script and fetch packs in a setup step if the licence forbids redistribution.
5. Pause automatically when the window loses focus; respect `prefers-reduced-motion` (screen shake/flash settings); remappable keys; gamepad later.
6. Optional ideas: personal best (local), daily seed, a "2-minute quick round" mode for short breaks, hero unlocks.
7. Keep it out of work metrics: no analytics inside the game.
