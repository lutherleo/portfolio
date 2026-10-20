# Owner to-do

Items the redesign can't finish without the site owner. Nothing here was
invented: until these arrive, the site either links to the missing file
(so the link checker flags it) or keeps the existing wording.

| # | What's needed | Where it's used | Status |
|---|---|---|---|
| 1 | **`resume.pdf`**: the real résumé, saved at the repo root | Nav "Résumé" button, hero "Résumé (PDF)", footer, About "Download CV" on every page | Missing. Every link to it is a 404 today; `npm run check:final` fails until it exists |
| 2 | **RaceFuzz outcome + repo**: any concrete result (bugs found, kernels or subsystems covered, throughput), and the repo URL if it's public | Home "Selected work" evidence line; RaceFuzz case page | The evidence line currently says only that you lead the project. The old "coverage: 94.2%" / "Race condition found!" terminal art was invented and has been removed |
| 3 | **Real publish dates for the 3 posts**: all three say "Jul 2026" | Home "Writing", blog list, post headers | Unchanged until you confirm the dates |
| 4 | **Outcome numbers for other projects**, where you have them (e.g. vulnerability scanner findings, CHIP-8 ROM compatibility) | Case-study pages | Only facts already on the site are used; the invented "CVE-2024-xxxx" and "PGD 90% / FGSM 88% / C&W 55%" art was removed |
