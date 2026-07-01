/* ══════════════════════════════════════════════════
   projects.js — detail modal for the projects page
══════════════════════════════════════════════════ */
(() => {
  'use strict';

  const DETAILS = {
    pq: {
      cat: 'Post-Quantum Cryptography · NYU CS6903 · 2026',
      title: 'pq-secure-comm — Post-Quantum Secure Channel',
      body: [
        'A research-grade C implementation of a post-quantum-secure channel between two endpoints (Alice ↔ Bob), implemented twice with two different families of post-quantum primitives, then attacked and benchmarked under a unified test harness.',
        'Scheme A is the mainstream lattice stack: ML-KEM-768 (Kyber) for key encapsulation and ML-DSA-65 (Dilithium) for signatures. Scheme B deliberately avoids lattices entirely: HQC-192, a code-based KEM, paired with SLH-DSA-SHA2-192s (SPHINCS+), a hash-based signature scheme. Both run at NIST PQ security Category 3 and share the same symmetric layer — AES-256-GCM with HKDF-SHA256 key derivation.',
        'The point of building it twice: if structured lattices ever fall to cryptanalysis, everything deployed on Kyber+Dilithium falls together. Both backends sit behind a single pluggable pq_backend_t interface, selected at runtime — a working demonstration of what crypto-agility costs and buys you.'
      ],
      highlights: [
        'Two full PQ backends behind one C interface — switch with --backend A / --backend B',
        'Automated attack demos: replay, downgrade, and AEAD tampering — run as failing-build tests',
        'Docker benchmark harness comparing handshake latency, key/ciphertext/signature sizes',
        'Built on liboqs; reproducible with make build / make test / make benchmark'
      ],
      tags: ['C', 'liboqs', 'ML-KEM-768', 'ML-DSA-65', 'HQC-192', 'SPHINCS+', 'AES-256-GCM', 'HKDF', 'Docker'],
      links: [
        { label: 'View on GitHub ↗', href: 'https://github.com/lutherleo/Quantum-safe-Kyber-Crystals' },
        { label: 'Read the blog post →', href: 'posts/building-the-same-secure-channel-twice.html' }
      ]
    },

    racefuzz: {
      cat: 'Kernel Fuzzing · OSIRIS Lab · 2026',
      title: 'RaceFuzz — Semantic Kernel Fuzzer',
      body: [
        'RaceFuzz is the OSIRIS Lab research project I lead: a semantic fuzzing framework that hunts race conditions in the Linux kernel\'s network stack — the class of bug coverage-guided fuzzers are structurally worst at finding.',
        'A race condition is a property of an interleaving, not an input. The same syscall sequence may or may not trigger the bug depending on how the scheduler interleaves two CPUs. RaceFuzz attacks this with structured corpus generation that respects the socket lifecycle state machine, and concurrency-aware scheduling that pins candidate sequences to separate CPUs and deliberately perturbs their overlap to widen race windows.',
        'The network stack is the target because it is remotely reachable, deeply concurrent (softirqs, timers, and user threads all share socket state), and has a rich state machine that semantic generation can exploit.'
      ],
      highlights: [
        'Go-based corpus generator that understands socket lifecycle semantics',
        'Concurrency analysis and race-window widening instead of pure coverage feedback',
        'Interleaving capture for deterministic reproduction of found races',
        'Mentored as one of 9 active OSIRIS Lab research projects'
      ],
      tags: ['Go', 'C', 'Linux Kernel', 'TCP/IP', 'Race Conditions', 'Fuzzing', 'OSIRIS Lab'],
      links: [
        { label: 'GitHub Profile ↗', href: 'https://github.com/lutherleo' },
        { label: 'Read the blog post →', href: 'posts/fuzzing-kernel-race-conditions.html' }
      ]
    },

    xv6: {
      cat: 'Kernel Security · 2024–2025',
      title: 'xv6 OS Security Enhancements',
      body: [
        'Implemented kernel-level security mitigations in xv6, MIT\'s teaching operating system — turning a deliberately minimal kernel into a testbed for modern exploit mitigations.',
        'The work covers ASLR (randomizing user-space layout at exec time), W^X memory policies (no page both writable and executable), stack canaries with kernel-side verification, and strengthened process isolation. I also built custom system calls for security auditing, so the kernel can report its own mitigation state.',
        'Doing this in xv6 rather than Linux means every mitigation had to be built from first principles — page-table manipulation, trap-frame handling, and ELF loading included. The project grew out of the Lind sandbox research group at NYU.'
      ],
      highlights: [
        'ASLR, W^X, and stack canaries implemented from scratch in a minimal kernel',
        'Custom syscalls for querying and auditing mitigation state',
        'Memory-safety analysis of the resulting attack surface',
        'Companion work to NYU\'s Lind sandbox research'
      ],
      tags: ['C', 'xv6', 'ASLR', 'W^X', 'Stack Canaries', 'System Calls', 'RISC-V'],
      links: [{ label: 'View on GitHub ↗', href: 'https://github.com/lutherleo/xv6-OS' }]
    },

    advml: {
      cat: 'Adversarial ML · NYU Tandon · 2025',
      title: 'Adversarial Robustness in Deep Neural Networks',
      body: [
        'An empirical study of adversarial training, validating Madry et al. (2018): train MNIST classifiers against a Projected Gradient Descent (PGD) adversary and measure how robustness generalizes across attack families.',
        'The PGD-trained model held ~90% accuracy under PGD and FGSM attacks — but the more interesting result is where it failed: Carlini & Wagner (C&W) optimization-based attacks and distribution shifts both punched through, a concrete demonstration that robustness against one attack family is not robustness in general.',
        'A significant chunk of the work was engineering: re-engineering TensorFlow 1.x research code to 2.x so CleverHans and the Adversarial Robustness Toolbox (ART) could run in one reproducible pipeline.'
      ],
      highlights: [
        '~90% adversarial accuracy under PGD/FGSM after adversarial training',
        'Demonstrated C&W and distribution-shift weaknesses in PGD-trained models',
        'TensorFlow 1.x → 2.x migration of the full experimental stack',
        'Reproducible attack evaluation across CleverHans and ART'
      ],
      tags: ['Python', 'TensorFlow', 'CleverHans', 'ART', 'PGD', 'FGSM', 'C&W'],
      links: [{ label: 'View on GitHub ↗', href: 'https://github.com/lutherleo/MLClass' }]
    },

    chip8: {
      cat: 'Systems Programming · 2024',
      title: 'CHIP-8 Emulator in C',
      body: [
        'A fully functional CHIP-8 emulator written from scratch in C with SDL2 — all 35 opcodes, the classic 64×32 monochrome display, and cycle timing faithful enough to run the original ROM library.',
        'CHIP-8 is the canonical first emulator, but "simple" still means building a fetch-decode-execute loop, XOR-based sprite rendering with collision detection, delay and sound timers ticking at 60Hz independent of CPU speed, and a 16-key hexadecimal keypad mapped onto a modern keyboard.',
        'It runs Pong, Tetris, Space Invaders, and the rest of the classic ROM set. The emulator mindset — memory maps, registers, instruction semantics — is the same muscle used for reverse engineering and exploitation work.'
      ],
      highlights: [
        'All 35 CHIP-8 opcodes with correct flag semantics',
        'XOR sprite rendering with collision flag (the VF register)',
        '60Hz delay/sound timers decoupled from instruction rate',
        'SDL2 graphics, input, and audio'
      ],
      tags: ['C', 'SDL2', 'CPU Emulation', 'Memory Management', 'Bitwise Ops'],
      links: [{ label: 'View on GitHub ↗', href: 'https://github.com/lutherleo/CHIP-8_emulator' }]
    },

    vulnscan: {
      cat: 'Security Tooling · 2026',
      title: 'Vulnerability Scanner',
      body: [
        'A CLI tool for rapid triage of binaries and applications — the "first five minutes" scanner you run before deciding where to spend real analysis time.',
        'It checks for the boring-but-lethal basics: weak file permissions, outdated library versions with known CVE matches, stale binaries, and exploitation-relevant properties like available ROP gadgets. Output is prioritized by severity so a CTF player or an assessor can immediately see what is worth attacking.',
        'Designed around the workflow I actually use in CTFs and assessments: point it at a target, get a ranked list of weaknesses, go deep on the top one.'
      ],
      highlights: [
        'CVE matching against dependency and binary versions',
        'Permission and configuration weakness checks',
        'ROP gadget presence detection for exploitability triage',
        'Severity-ranked CLI output for fast decision-making'
      ],
      tags: ['Security Analysis', 'Binary Exploitation', 'CVE Detection', 'CLI'],
      links: [{ label: 'View on GitHub ↗', href: 'https://github.com/lutherleo/vulnerability-scanner' }]
    },

    chronos: {
      cat: 'Productivity · OSIRIS Lab · 2026',
      title: 'Chronos — Meeting Scheduler',
      body: [
        'Chronos is a scheduling and time-coordination app I built to solve a real, recurring problem: getting OSIRIS Lab\'s dev meetings scheduled across a dozen students with wildly different course loads and timezones.',
        'Everyone paints their availability onto a shared grid; Chronos finds the slots that actually work — the when2meet idea, rebuilt the way I wanted it: fast, dark, and without accounts or friction for the common case.',
        'Written in TypeScript end to end. In active use for OSIRIS dev meetings.'
      ],
      highlights: [
        'Shared availability grid with instant best-slot computation',
        'Zero-friction flow — no signup needed to respond',
        'Built for and battle-tested by OSIRIS Lab meetings',
        'TypeScript across the stack'
      ],
      tags: ['TypeScript', 'Scheduling', 'OSIRIS Lab'],
      links: [{ label: 'View on GitHub ↗', href: 'https://github.com/lutherleo/timefull' }]
    },

    animus: {
      cat: 'Research Operations · OSIRIS Lab · 2026',
      title: 'Animus — Project Management for a Research Lab',
      body: [
        'Animus is a project management solution I built for OSIRIS Lab, where I coordinate 9 concurrent research projects as Research Coordinator — kernel fuzzing, adversarial ML, embedded security, CTF tooling — each with its own lead, milestones, and rotating student team.',
        'Generic PM tools fight the way a research lab actually works: projects are long-lived and open-ended, contributors are students with semester schedules, and progress is measured in findings and prototypes rather than tickets closed. Animus is a single control plane shaped around that reality — projects, leads, milestones, and skill-level tracks (beginner → advanced) in one view.',
        'It is the operational backbone for how I run research coordination at the lab.'
      ],
      highlights: [
        'Tracks 9 concurrent research projects with leads and milestones',
        'Skill-level tracks matching students to appropriate projects',
        'Built around semester rhythms instead of sprint rhythms',
        'In use for OSIRIS Lab research coordination'
      ],
      tags: ['Project Management', 'Research Ops', 'OSIRIS Lab'],
      links: [{ label: 'OSIRIS Lab ↗', href: 'https://osiris.cyber.nyu.edu/' }]
    },

    lind: {
      cat: 'OS Security Research · NYU · 2025',
      title: 'Lind Sandbox — Rust Research',
      body: [
        'Contributor to Lind, NYU\'s OS-level sandboxing research project: a restricted POSIX environment that safely executes untrusted code by running it through WebAssembly.',
        'Lind\'s core idea is the "lock-in-pop" model — route all system interaction through a small, heavily-audited kernel interface subset, on the theory that commonly-used kernel paths are the well-tested ones. My work there is in Rust, on the runtime that enforces that boundary.',
        'The project directly informed my xv6 security work — both are about deciding exactly how much kernel surface untrusted code is allowed to reach.'
      ],
      highlights: [
        'Rust contributions to the lind-wasm runtime',
        'POSIX-subset interface for sandboxed execution',
        'WebAssembly as the isolation boundary for native code',
        'Part of NYU\'s systems security research group'
      ],
      tags: ['Rust', 'WebAssembly', 'POSIX', 'Sandboxing', 'NYU'],
      links: [{ label: 'View on GitHub ↗', href: 'https://github.com/lutherleo/lind-wasm' }]
    },

    csaw: {
      cat: 'CTF · OSIRIS Lab · 2025',
      title: 'CSAW CTF 2025 — Challenge Author & Infrastructure',
      body: [
        'CSAW is one of the world\'s largest student-run cybersecurity competitions, hosting thousands of players across dozens of global regions. For the 2025 qualifiers I wore two hats: challenge author and infrastructure/moderation.',
        'Authoring a challenge means owning every path to the flag — including the unintended ones. The design work is a difficulty curve, an adversarial review of your own assumptions, and playtesting by people who haven\'t seen the answer. It is threat modeling with a live-fire exercise at the end.',
        'On the infrastructure side: challenge hosting, platform maintenance, and moderation at scale, while thousands of players actively probe everything — including the infrastructure itself.'
      ],
      highlights: [
        'Authored a challenge played by thousands of competitors',
        'Co-ran qualifiers infrastructure with OSIRIS Lab',
        'Moderation and incident handling during live competition',
        'Also organized Hack@NYU at Microsoft NYC'
      ],
      tags: ['CTF', 'Challenge Design', 'Infrastructure', 'OSIRIS Lab', 'CSAW'],
      links: [
        { label: 'Read the blog post →', href: 'posts/writing-a-csaw-ctf-challenge.html' },
        { label: 'CSAW ↗', href: 'https://www.csaw.io/' }
      ]
    },

    otw: {
      cat: 'Wargames · 2024',
      title: 'OverTheWire Write-ups',
      body: [
        'Documented, reproducible write-ups for the OverTheWire Bandit and Natas wargame series — the classic on-ramps for Linux security and web exploitation fundamentals.',
        'Bandit covers the Linux side: privilege escalation patterns, SUID binaries, cron abuse, and the shell fluency that everything else in security stands on. Natas covers the web side: authentication bypasses, injection, insecure headers, and source-code archaeology.',
        'I keep these public because write-ups are how I learned — the methodology (what to try, why, and what the dead ends were) matters more than the final command.'
      ],
      highlights: [
        'Full methodology write-ups, not just solutions',
        'Linux privilege escalation and shell fundamentals (Bandit)',
        'Web exploitation fundamentals (Natas)',
        'Written as learning material for newcomers'
      ],
      tags: ['CTF', 'Bash', 'Web', 'Write-ups', 'Linux'],
      links: [
        { label: 'Bandit on GitHub ↗', href: 'https://github.com/lutherleo/Bandit' },
        { label: 'Natas on GitHub ↗', href: 'https://github.com/lutherleo/Natas' }
      ]
    }
  };

  const modal   = document.getElementById('projModal');
  const pmCat   = document.getElementById('pmCat');
  const pmTitle = document.getElementById('pmTitle');
  const pmBody  = document.getElementById('pmBody');
  const pmTags  = document.getElementById('pmTags');
  const pmActs  = document.getElementById('pmActions');
  if (!modal) return;

  let lastFocus = null;

  function open(key) {
    const d = DETAILS[key];
    if (!d) return;
    pmCat.textContent = d.cat;
    pmTitle.textContent = d.title;

    pmBody.textContent = '';
    d.body.forEach(t => {
      const p = document.createElement('p');
      p.textContent = t;
      pmBody.appendChild(p);
    });
    if (d.highlights && d.highlights.length) {
      const h = document.createElement('p');
      h.className = 'pm-h';
      h.textContent = 'Highlights';
      pmBody.appendChild(h);
      const ul = document.createElement('ul');
      ul.className = 'pm-list';
      d.highlights.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        ul.appendChild(li);
      });
      pmBody.appendChild(ul);
    }

    pmTags.textContent = '';
    d.tags.forEach(t => {
      const s = document.createElement('span');
      s.textContent = t;
      pmTags.appendChild(s);
    });

    pmActs.textContent = '';
    d.links.forEach(l => {
      const a = document.createElement('a');
      a.className = 'link-arrow';
      a.href = l.href;
      if (/^https?:/.test(l.href)) { a.target = '_blank'; a.rel = 'noopener'; }
      a.textContent = l.label;
      pmActs.appendChild(a);
    });

    lastFocus = document.activeElement;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    modal.querySelector('.pm-close').focus();
    modal.querySelector('.pm-panel').scrollTop = 0;
  }

  function close() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll('.proj-card[data-proj]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('a')) return; // let real links work
      open(card.dataset.proj);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target === card) open(card.dataset.proj);
    });
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
  });

  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
})();
