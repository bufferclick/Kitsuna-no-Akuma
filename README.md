# Kitsuna no Akuma

**Kitsuna no Akuma** is a complete, static, pixel-art 2D open-world action RPG. You are a wandering pactbearer joined to a hungry fox spirit. Build attributes, make permanent fox mutations, master seven pact arts, parry vicious enemies, and push from Ashenvale to Moonglass Sanctum.

> The game is an original fox-spirit RPG homage. It does not include Chain Saw Man art, audio, models, or other scraped assets. Its full visual world is custom Canvas pixel art and its combat audio is synthesized locally with Web Audio.

## What is playable

- Large four-region overworld: **Ashenvale Frontier**, **Whisperwood**, **Cinderfall Wilds**, and **Moonglass Sanctum**
- Seven usable arts: Sunder, **Kon**, Foxfire, Mirage Step, Moon Snare, Apex Howl, and Ninefold Bloom
- Real-time action combat: facing attacks, dash invulnerability, timed parries, crits, projectiles, status slows, boss fight
- Five enemy archetypes plus **Gloomfang Alpha** boss
- Eight hunt-log quests, NPC conversations, region discovery, shards, XP, leveling, and autosave
- Attribute system: Power, Agility, Resolve, Spirit, Fortune
- Six permanent Fox Devil mutations with level requirements
- Character, mutation, quest, atlas, field manual, and settings interfaces
- A cache-first offline app shell: game files are cached by the service worker after the first launch
- Desktop packaging recipe for a Windows NSIS installer

## Play locally

This is a zero-build static game. Any local static server works:

```bash
python3 -m http.server 8788
# then open http://localhost:8788
```

Or use the Cloudflare CLI:

```bash
npm install
npm run dev
```

### Controls

| Control | Action |
| --- | --- |
| `WASD` / arrow keys | Move |
| `J` | Sunder (basic blade strike) |
| `Q` | Kon — summon the fox head |
| `R` | Foxfire |
| `F` | Mirage Step |
| `C` | Moon Snare |
| `X` | Apex Howl |
| `V` | Ninefold Bloom |
| `Shift` | Dash |
| `Space` | Parry |
| `E` | Talk / advance dialogue |
| `Esc` | Close dialogue or a panel |

Combat arts unlock as the pactbearer levels. Hotbar buttons are also clickable. The game automatically stores one local save in `localStorage`.

## Deploy to Cloudflare Pages

The repository is already a Pages-ready static site. `wrangler.toml`, `_headers`, `_redirects`, `manifest.webmanifest`, and `sw.js` are included.

### Dashboard deployment

1. Push this repository to GitHub.
2. In **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
3. Select this repository.
4. For the framework preset, choose **None**.
5. Set the build command to **(leave blank)**.
6. Set the build output directory to **`.`**.
7. Deploy.

### Wrangler deployment

```bash
npm install
npm run deploy
```

The `name` in `wrangler.toml` is `kitsuna-no-akuma`; change it if that Pages project name is already used in your Cloudflare account. There are no secrets, Worker bindings, databases, or localhost API calls to configure.

> **Cloudflare cache note:** `_headers` makes `index.html` and `sw.js` revalidate while allowing the unchanging game shell to cache. Bump `CACHE` in `sw.js` whenever files in `SHELL` change so returning players receive the new version.

## Build the Windows installer

A Windows installer cannot be built in a browser/Cloudflare Pages deployment; it must be packaged on a Windows build machine (or Windows CI runner). The Electron wrapper lives in `desktop/main.cjs` and the NSIS installer configuration is in `package.json`.

```bash
npm install
npm run desktop:package
```

This creates an NSIS setup executable under `dist/`, named like:

```text
Kitsuna-no-Akuma-Setup-1.0.0.exe
```

`dist/` and `node_modules/` are intentionally ignored: they are generated release artifacts, not source files. Upload the generated `.exe` to GitHub Releases or another download host; Cloudflare Pages is intended for the browser edition.

For a repeatable installer build, `.github/workflows/windows-installer.yml` runs the same command on a Windows GitHub Actions runner. Use **Actions → Build Windows installer → Run workflow** to download the `.exe` as an artifact, or push a `v*` tag to attach it to a GitHub Release.

## Project map

```text
index.html             Game shell and interface structure
styles.css             Custom pixel-RPG interface and responsive styling
game.js                Overworld simulation, combat, quests, rendering, Web Audio
sw.js                  Cache-first install / asset shell
manifest.webmanifest   Installable web app metadata
assets/icon.svg        Original fox app icon
desktop/main.cjs       Electron desktop wrapper
wrangler.toml          Cloudflare Pages configuration
_headers               Cloudflare cache and browser security headers
```
