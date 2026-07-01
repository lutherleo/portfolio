# Love Kush Pranu — Portfolio

Personal portfolio of a cybersecurity engineer (NYU Tandon MS '26, OSIRIS Lab Research Coordinator).

**Live:** https://lutherleo.github.io/portfolio/

## Stack

Vanilla HTML/CSS/JS — no build step, no frameworks. three.js (CDN) powers the hero scene; everything else is hand-rolled canvas and CSS.

## Pages

| Page | What's on it |
|---|---|
| `index.html` | Hero, about, featured projects (post-quantum channel, RaceFuzz, xv6, adversarial ML, CHIP-8, vuln scanner), OSIRIS research, experience, contact |
| `projects.html` | Full project grid with detail modals, including Chronos and Animus |
| `games.html` | Six canvas games: Packet Snake, Hex Breach, Firewall Breakout, Port Invaders, Logic Bomb Sweeper, Memory Leak |
| `blog.html` | Featured posts hosted in `posts/` + live feed from [Medium @lovekush.pranu](https://medium.com/@lovekush.pranu) |
| `interviews.html` | Video interview series |
| `hobbies.html` | Off-keyboard stuff |

## Shared code

- `site.js` — cursor, nav, mobile menu, scroll reveal, footer year (loaded on every page)
- `script.js` — home-page-only (preloader, three.js hero, contact clipboard)
- `games.js` — all game logic
- `projects.js` — project detail modal data + logic
- `posts/` — self-hosted blog articles
- `style.css` — single stylesheet, green terminal theme

## Run locally

```bash
python -m http.server 8080
# open http://localhost:8080
```

## Deploy

Pushing to `main` deploys via GitHub Pages (`.nojekyll` is required — keep it).

## TODO

- [ ] Add `resume.pdf` to the repo root — the "Download CV" button on the homepage points to it.
