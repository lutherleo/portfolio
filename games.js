/* ══════════════════════════════════════════════════
   games.js — the LKP arcade
   1. PACKET_SNAKE      2. HEX_BREACH
   3. FIREWALL_BREAKOUT 4. PORT_INVADERS
   5. LOGIC_BOMB_SWEEPER 6. MEMORY_LEAK
══════════════════════════════════════════════════ */
'use strict';

const GREEN = '#22c55e', GREEN2 = '#4ade80', RED = '#f87171',
      AMBER = '#fbbf24', ORANGE = '#fb923c', DIM = '#0d130d', DARK = '#0a0f0a';

/* True while the player is typing in any text field (e.g. Hex Breach input) */
function typingInField() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

function idleScreen(ctx, W, H, title, hint) {
  ctx.fillStyle = DIM;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = GREEN;
  ctx.shadowBlur = 20; ctx.shadowColor = GREEN;
  ctx.font = 'bold 18px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, H / 2 - 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(34,197,94,0.5)';
  ctx.font = '11px "JetBrains Mono"';
  ctx.fillText(hint, W / 2, H / 2 + 16);
}

function pauseOverlay(ctx, W, H) {
  ctx.fillStyle = 'rgba(10,15,10,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = GREEN;
  ctx.shadowBlur = 20; ctx.shadowColor = GREEN;
  ctx.font = 'bold 18px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(34,197,94,0.4)';
  ctx.font = '11px "JetBrains Mono"';
  ctx.fillText('PRESS ⏸ OR P TO RESUME', W / 2, H / 2 + 22);
}

/* ════════════════════════════════════════════════════
   GAME 1 — PACKET SNAKE
════════════════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('snakeCanvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const COLS=20, ROWS=20, CELL=20;
  const scoreEl   = document.getElementById('snakeScore');
  const hiEl      = document.getElementById('snakeHi');
  const btn       = document.getElementById('snakeBtn');
  const pauseBtn  = document.getElementById('snakePauseBtn');

  const FOODS = ['0xDE','0xAD','0xBE','0xEF','0xFF','0x00','SYN','ACK','RST','PKT','UDP','TCP','DNS','ARP','HEX','OVF'];
  const GRID_C = 'rgba(34,197,94,0.05)';

  let snake, dir, nextDir, food, foodLabel, score, hi, speed, loop, state, paused;
  hi = parseInt(localStorage.getItem('snakeHS') || 0);
  hiEl.textContent = hi;

  function init() {
    snake   = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir     = {x:1,y:0};
    nextDir = {x:1,y:0};
    score   = 0;
    speed   = 140;
    paused  = false;
    scoreEl.textContent = 0;
    state   = 'playing';
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    spawnFood();
    clearInterval(loop);
    loop = setInterval(tick, speed);
  }

  function spawnFood() {
    let pos;
    do { pos={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}; }
    while (snake.some(s=>s.x===pos.x&&s.y===pos.y));
    food = pos;
    foodLabel = FOODS[Math.floor(Math.random()*FOODS.length)];
  }

  function tick() {
    dir = nextDir;
    const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
    if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)) {
      return gameOver();
    }
    snake.unshift(head);
    if (head.x===food.x&&head.y===food.y) {
      score++;
      scoreEl.textContent = score;
      if (score > hi) { hi = score; hiEl.textContent = hi; localStorage.setItem('snakeHS',hi); }
      spawnFood();
      if (score % 5 === 0) { clearInterval(loop); speed = Math.max(60, speed-10); loop = setInterval(tick, speed); }
    } else {
      snake.pop();
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = DIM;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = GRID_C;
    ctx.lineWidth = 0.5;
    for(let c=0;c<COLS;c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,canvas.height);ctx.stroke();}
    for(let r=0;r<ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(canvas.width,r*CELL);ctx.stroke();}
    snake.forEach((s,i)=>{
      const alpha = 1 - i/snake.length*0.6;
      ctx.fillStyle = i===0 ? GREEN : `rgba(34,197,94,${alpha})`;
      ctx.shadowBlur = i===0 ? 12 : 0;
      ctx.shadowColor = GREEN;
      ctx.fillRect(s.x*CELL+1,s.y*CELL+1,CELL-2,CELL-2);
      ctx.shadowBlur = 0;
    });
    ctx.fillStyle = DARK;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 16; ctx.shadowColor = GREEN;
    ctx.fillRect(food.x*CELL+2,food.y*CELL+2,CELL-4,CELL-4);
    ctx.strokeRect(food.x*CELL+2,food.y*CELL+2,CELL-4,CELL-4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = GREEN;
    ctx.font = '5px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(foodLabel, food.x*CELL+CELL/2, food.y*CELL+CELL/2+2);
  }

  function togglePause() {
    if (state !== 'playing' && state !== 'paused') return;
    paused = !paused;
    if (paused) {
      clearInterval(loop);
      state = 'paused';
      pauseBtn.textContent = '▶';
      ctx.fillStyle = 'rgba(10,15,10,0.75)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = GREEN;
      ctx.shadowBlur = 20; ctx.shadowColor = GREEN;
      ctx.font = 'bold 18px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(34,197,94,0.4)';
      ctx.font = '11px "JetBrains Mono"';
      ctx.fillText('PRESS ⏸ OR P TO RESUME', canvas.width/2, canvas.height/2+22);
    } else {
      state = 'playing';
      pauseBtn.textContent = '⏸';
      loop = setInterval(tick, speed);
    }
  }

  function gameOver() {
    clearInterval(loop);
    state = 'dead';
    paused = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = '⏸';
    btn.textContent = 'RESTART';
    idleScreen(ctx, canvas.width, canvas.height, 'GAME OVER', 'PRESS START');
    if (score > 0) {
      ctx.fillStyle='rgba(34,197,94,0.35)';
      ctx.font='10px "JetBrains Mono"';
      ctx.fillText(`SCORE: ${score}`, canvas.width/2, canvas.height/2+36);
    }
  }

  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key) && state==='playing') e.preventDefault();
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (state !== 'playing') return;
    const map = {ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},
                  w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0}};
    const nd = map[e.key];
    if (nd && !(nd.x===-dir.x && nd.y===-dir.y)) nextDir = nd;
  });

  pauseBtn.addEventListener('click', togglePause);

  function dDir(nd) { if(state==='playing'&&!(nd.x===-dir.x&&nd.y===-dir.y)) nextDir=nd; }
  document.getElementById('dUp').addEventListener('click',    ()=>dDir({x:0,y:-1}));
  document.getElementById('dDown').addEventListener('click',  ()=>dDir({x:0,y:1}));
  document.getElementById('dLeft').addEventListener('click',  ()=>dDir({x:-1,y:0}));
  document.getElementById('dRight').addEventListener('click', ()=>dDir({x:1,y:0}));
  document.getElementById('dCenter').addEventListener('click',()=>{ if(state!=='playing') btn.click(); });

  let touchX=0,touchY=0;
  canvas.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;e.preventDefault();},{passive:false});
  canvas.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-touchX, dy=e.changedTouches[0].clientY-touchY;
    if(Math.abs(dx)>Math.abs(dy)) dDir(dx>0?{x:1,y:0}:{x:-1,y:0});
    else dDir(dy>0?{x:0,y:1}:{x:0,y:-1});
    e.preventDefault();
  },{passive:false});

  btn.addEventListener('click', ()=>{ btn.textContent='RESTART'; init(); });
  score = 0;
  idleScreen(ctx, canvas.width, canvas.height, 'PACKET_SNAKE', 'PRESS START');
})();

/* ════════════════════════════════════════════════════
   GAME 2 — HEX BREACH
════════════════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('hexCanvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const scoreEl= document.getElementById('hexScore');
  const livesEls= [document.getElementById('life1'),document.getElementById('life2'),document.getElementById('life3')];
  const btn    = document.getElementById('hexBtn');
  const pauseBtn = document.getElementById('hexPauseBtn');
  const input  = document.getElementById('hexInput');

  const W = canvas.width, H = canvas.height;
  const WORDS = [
    '0xDEAD','0xBEEF','0xFF00','0x1337','KERNEL','EXPLOIT','SYSCALL',
    'MALLOC','BUFFER','OVERFLOW','SHELLCODE','PAYLOAD','ROP_CHAIN','NOP_SLED',
    'HEAP','STACK','EBP','ESP','EIP','RAX','RBX','RDX','XOR','AND','OR',
    'SIGTERM','SIGKILL','FORK','EXEC','MMAP','PTRACE','SECCOMP','ASLR'
  ];

  let falling, lives, score, speed, spawnRate, loop, spawnLoop, state;

  function init() {
    falling   = [];
    lives     = 3;
    score     = 0;
    speed     = 0.5;
    spawnRate = 2200;
    state     = 'playing';
    scoreEl.textContent = 0;
    livesEls.forEach(l=>l.classList.remove('dead'));
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    clearInterval(loop);
    clearInterval(spawnLoop);
    loop      = setInterval(()=>{tick();draw();}, 40);
    spawnLoop = setInterval(spawnWord, spawnRate);
    input.value = '';
    input.focus();
    spawnWord();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      clearInterval(loop);
      clearInterval(spawnLoop);
      pauseBtn.textContent = '▶';
      pauseOverlay(ctx, W, H);
    } else if (state === 'paused') {
      state = 'playing';
      pauseBtn.textContent = '⏸';
      loop      = setInterval(()=>{tick();draw();}, 40);
      spawnLoop = setInterval(spawnWord, spawnRate);
      input.focus();
    }
  }
  pauseBtn.addEventListener('click', togglePause);
  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if ((e.key === 'p' || e.key === 'P') && state !== 'dead' && state !== undefined) togglePause();
  });

  function spawnWord() {
    if(state!=='playing') return;
    const w = WORDS[Math.floor(Math.random()*WORDS.length)];
    const x = 20 + Math.random()*(W-160);
    falling.push({word:w, x, y:-20, speed: speed + Math.random()*0.3, hit:false, flashTime:0});
  }

  function tick() {
    falling.forEach(f=>{ if(!f.hit) f.y += f.speed; });
    falling.filter(f=>!f.hit&&f.y>H+20).forEach(()=>{
      lives--;
      if(lives<0)lives=0;
      livesEls[lives] && livesEls[lives].classList.add('dead');
      if(lives===0) gameOver();
    });
    falling = falling.filter(f=>!(f.y>H+20&&!f.hit)&&!(f.hit&&f.flashTime<=0));
    falling.forEach(f=>{ if(f.hit) f.flashTime-=40; });
  }

  function draw() {
    ctx.fillStyle = DARK;
    ctx.fillRect(0,0,W,H);
    for(let y=0;y<H;y+=4){
      ctx.fillStyle='rgba(0,0,0,0.15)';
      ctx.fillRect(0,y,W,2);
    }
    ctx.fillStyle='rgba(248,113,113,0.06)';
    ctx.fillRect(0,H-24,W,24);
    ctx.strokeStyle='rgba(248,113,113,0.3)';
    ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,H-24);ctx.lineTo(W,H-24);ctx.stroke();
    ctx.fillStyle='rgba(248,113,113,0.4)';
    ctx.font='8px "JetBrains Mono"';
    ctx.textAlign='left';
    ctx.fillText('KERNEL SPACE — DO NOT LET PAYLOADS REACH HERE',8,H-8);

    falling.forEach(f=>{
      const t = f.hit ? f.flashTime/300 : 1;
      if(f.hit){
        ctx.fillStyle=`rgba(34,197,94,${t*0.9})`;
        ctx.shadowBlur=20*t; ctx.shadowColor=GREEN;
      } else {
        const danger = Math.min(1,(f.y/(H-24)));
        const r=Math.floor(34+(248-34)*danger), g=Math.floor(197+(113-197)*danger), b=Math.floor(94*(1-danger));
        ctx.fillStyle=`rgb(${r},${g},${b})`;
        ctx.shadowBlur=8; ctx.shadowColor=`rgb(${r},${g},${b})`;
      }
      ctx.font=`bold 13px "JetBrains Mono"`;
      ctx.textAlign='left';
      ctx.fillText(f.word, f.x, f.y);
      ctx.shadowBlur=0;
    });

    const typed = input.value.toUpperCase();
    if(typed && state==='playing'){
      ctx.fillStyle='rgba(34,197,94,0.25)';
      ctx.font='13px "JetBrains Mono"';
      ctx.textAlign='center';
      ctx.fillText('> '+typed, W/2, H-36);
    }
  }

  function checkInput() {
    if(state!=='playing') return;
    const typed = input.value.trim().toUpperCase();
    const hit = falling.find(f=>!f.hit && f.word.toUpperCase()===typed);
    if(hit){
      hit.hit=true; hit.flashTime=300;
      score++;
      scoreEl.textContent=score;
      input.value='';
      if(score%5===0){
        speed=Math.min(2.5,speed+0.15);
        spawnRate=Math.max(800,spawnRate-150);
        clearInterval(spawnLoop);
        spawnLoop=setInterval(spawnWord,spawnRate);
      }
    }
  }

  function gameOver() {
    state='dead';
    clearInterval(loop);
    clearInterval(spawnLoop);
    btn.textContent='RESTART';
    pauseBtn.disabled = true;
    pauseBtn.textContent = '⏸';
    ctx.fillStyle=DARK; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=RED; ctx.shadowBlur=20; ctx.shadowColor=RED;
    ctx.font='bold 20px "JetBrains Mono"';
    ctx.textAlign='center';
    ctx.fillText('KERNEL BREACHED',W/2,H/2-20);
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(248,113,113,0.5)';
    ctx.font='12px "JetBrains Mono"';
    ctx.fillText(`PAYLOADS NEUTRALIZED: ${score}`, W/2, H/2+10);
    ctx.fillStyle='rgba(34,197,94,0.4)';
    ctx.fillText('PRESS RESTART',W/2,H/2+35);
  }

  input.addEventListener('input', checkInput);
  btn.addEventListener('click',()=>{ btn.textContent='RESTART'; init(); });
  idleScreen(ctx, W, H, 'HEX_BREACH', 'PRESS START · TYPE CODES TO NEUTRALIZE');
})();

/* ════════════════════════════════════════════════════
   GAME 3 — FIREWALL BREAKOUT
════════════════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('breakCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const scoreEl = document.getElementById('breakScore');
  const hiEl    = document.getElementById('breakHi');
  const btn     = document.getElementById('breakBtn');
  const pauseBtn = document.getElementById('breakPauseBtn');

  const COLS = 8, ROWS = 5, B_W = (W - 36) / COLS, B_H = 14, TOP = 34;
  const ROW_LABELS = ['DROP', 'DENY', 'RST', 'FILTER', 'ALLOW'];

  let paddle, ball, bricks, score, hi, lives, level, state, raf;
  hi = parseInt(localStorage.getItem('breakHS') || 0);
  hiEl.textContent = hi;

  const keys = {};
  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if (state === 'playing' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) e.preventDefault();
    keys[e.key] = true;
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  function buildBricks() {
    bricks = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        bricks.push({ x: 18 + c * B_W, y: TOP + r * (B_H + 6), r, alive: true });
  }

  function resetBall() {
    ball = { x: W / 2, y: H - 60, dx: (Math.random() > 0.5 ? 1 : -1) * (2 + level * 0.4), dy: -(2.6 + level * 0.4), rad: 5 };
  }

  function init() {
    paddle = { w: 70, h: 8, x: W / 2 - 35 };
    score = 0; lives = 3; level = 1;
    scoreEl.textContent = 0;
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    buildBricks();
    resetBall();
    state = 'playing';
    cancelAnimationFrame(raf);
    loop();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      cancelAnimationFrame(raf);
      pauseBtn.textContent = '▶';
      pauseOverlay(ctx, W, H);
    } else if (state === 'paused') {
      state = 'playing';
      pauseBtn.textContent = '⏸';
      loop();
    }
  }
  pauseBtn.addEventListener('click', togglePause);
  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if (e.key === 'p' || e.key === 'P') togglePause();
  });

  function movePaddleTo(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (W / rect.width);
    paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
  }
  canvas.addEventListener('mousemove', e => { if (state === 'playing') movePaddleTo(e.clientX); });
  canvas.addEventListener('touchmove', e => {
    if (state === 'playing') { movePaddleTo(e.touches[0].clientX); e.preventDefault(); }
  }, { passive: false });

  function tick() {
    if (keys['ArrowLeft'])  paddle.x = Math.max(0, paddle.x - 5.5);
    if (keys['ArrowRight']) paddle.x = Math.min(W - paddle.w, paddle.x + 5.5);

    ball.x += ball.dx; ball.y += ball.dy;
    if (ball.x < ball.rad || ball.x > W - ball.rad) ball.dx *= -1;
    if (ball.y < ball.rad) ball.dy *= -1;

    // paddle
    if (ball.dy > 0 && ball.y + ball.rad >= H - 18 && ball.y + ball.rad <= H - 6 &&
        ball.x >= paddle.x - ball.rad && ball.x <= paddle.x + paddle.w + ball.rad) {
      const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      const speed = Math.hypot(ball.dx, ball.dy);
      const angle = hitPos * (Math.PI / 3);
      ball.dx = speed * Math.sin(angle);
      ball.dy = -Math.abs(speed * Math.cos(angle));
    }

    // bricks
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x > b.x - ball.rad && ball.x < b.x + B_W - 4 + ball.rad &&
          ball.y > b.y - ball.rad && ball.y < b.y + B_H + ball.rad) {
        b.alive = false;
        score += 10;
        scoreEl.textContent = score;
        if (score > hi) { hi = score; hiEl.textContent = hi; localStorage.setItem('breakHS', hi); }
        const fromSide = ball.x < b.x || ball.x > b.x + B_W - 4;
        if (fromSide) ball.dx *= -1; else ball.dy *= -1;
        break;
      }
    }

    if (bricks.every(b => !b.alive)) {
      level++;
      buildBricks();
      resetBall();
    }

    if (ball.y > H + 10) {
      lives--;
      if (lives <= 0) return gameOver();
      resetBall();
    }
  }

  function draw() {
    ctx.fillStyle = DIM;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(34,197,94,0.35)';
    ctx.font = '9px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillText(`FIREWALL v${level}.0`, 10, 16);
    ctx.textAlign = 'right';
    ctx.fillText('LIVES ' + '●'.repeat(lives) + '○'.repeat(Math.max(0, 3 - lives)), W - 10, 16);

    bricks.forEach(b => {
      if (!b.alive) return;
      const alpha = 0.85 - b.r * 0.13;
      ctx.fillStyle = `rgba(34,197,94,${alpha})`;
      ctx.fillRect(b.x, b.y, B_W - 4, B_H);
      ctx.fillStyle = 'rgba(10,15,10,0.8)';
      ctx.font = '6px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(ROW_LABELS[b.r], b.x + (B_W - 4) / 2, b.y + B_H / 2 + 2);
    });

    ctx.fillStyle = GREEN;
    ctx.shadowBlur = 12; ctx.shadowColor = GREEN;
    ctx.fillRect(paddle.x, H - 16, paddle.w, paddle.h);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.rad, 0, Math.PI * 2);
    ctx.fillStyle = GREEN2;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function loop() {
    if (state !== 'playing') return;
    tick();
    if (state === 'playing') draw();
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    state = 'dead';
    cancelAnimationFrame(raf);
    btn.textContent = 'RESTART';
    pauseBtn.disabled = true;
    pauseBtn.textContent = '⏸';
    idleScreen(ctx, W, H, 'FIREWALL DOWN', 'PRESS START');
    ctx.fillStyle = 'rgba(34,197,94,0.35)';
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillText(`SCORE: ${score}`, W / 2, H / 2 + 36);
  }

  btn.addEventListener('click', () => { btn.textContent = 'RESTART'; init(); });
  idleScreen(ctx, W, H, 'FIREWALL_BREAKOUT', 'MOUSE / ← → TO DEFLECT');
})();

/* ════════════════════════════════════════════════════
   GAME 4 — PORT INVADERS
════════════════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('invCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const scoreEl = document.getElementById('invScore');
  const hiEl    = document.getElementById('invHi');
  const btn     = document.getElementById('invBtn');
  const pauseBtn = document.getElementById('invPauseBtn');

  const NAMES = ['BOT', 'C2', 'RCE', 'XSS', 'SQL', 'WORM'];
  const COLS = 6, ROWS = 3;

  let ship, invaders, shots, bombs, dirX, score, hi, lives, wave, state, raf, lastShot;
  hi = parseInt(localStorage.getItem('invHS') || 0);
  hiEl.textContent = hi;

  const keys = {};
  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if (state === 'playing' && ['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if (state === 'playing' && e.key === ' ') fire();
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  // on-screen controls
  const L = document.getElementById('invLeft'), R = document.getElementById('invRight'), F = document.getElementById('invFire');
  [[L,'ArrowLeft'],[R,'ArrowRight']].forEach(([el,k]) => {
    if (!el) return;
    ['pointerdown','touchstart'].forEach(ev => el.addEventListener(ev, e => { keys[k] = true; e.preventDefault(); }, {passive:false}));
    ['pointerup','pointerleave','touchend'].forEach(ev => el.addEventListener(ev, () => { keys[k] = false; }));
  });
  if (F) F.addEventListener('click', () => { if (state === 'playing') fire(); });

  function buildWave() {
    invaders = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        invaders.push({ x: 34 + c * 56, y: 42 + r * 30, name: NAMES[(r * COLS + c) % NAMES.length], alive: true });
    dirX = 0.4 + wave * 0.12;
  }

  function init() {
    ship = { x: W / 2, w: 26 };
    shots = []; bombs = [];
    score = 0; lives = 3; wave = 1; lastShot = 0;
    scoreEl.textContent = 0;
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    buildWave();
    state = 'playing';
    cancelAnimationFrame(raf);
    loop();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      cancelAnimationFrame(raf);
      pauseBtn.textContent = '▶';
      pauseOverlay(ctx, W, H);
    } else if (state === 'paused') {
      state = 'playing';
      pauseBtn.textContent = '⏸';
      loop();
    }
  }
  pauseBtn.addEventListener('click', togglePause);
  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if (e.key === 'p' || e.key === 'P') togglePause();
  });

  function fire() {
    const now = Date.now();
    if (now - lastShot < 320) return;
    lastShot = now;
    shots.push({ x: ship.x, y: H - 34 });
  }

  function tick() {
    if (keys['ArrowLeft'])  ship.x = Math.max(16, ship.x - 4);
    if (keys['ArrowRight']) ship.x = Math.min(W - 16, ship.x + 4);

    // invader block movement
    const alive = invaders.filter(i => i.alive);
    if (!alive.length) { wave++; buildWave(); bombs = []; return; }
    const minX = Math.min(...alive.map(i => i.x)), maxX = Math.max(...alive.map(i => i.x));
    if (minX < 22 && dirX < 0 || maxX > W - 22 && dirX > 0) {
      dirX *= -1;
      invaders.forEach(i => { i.y += 12; });
    }
    invaders.forEach(i => { i.x += dirX; });

    // invaders drop bombs
    if (Math.random() < 0.012 + wave * 0.004) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      bombs.push({ x: shooter.x, y: shooter.y + 8 });
    }

    // move projectiles
    shots.forEach(s => { s.y -= 6; });
    bombs.forEach(b => { b.y += 2.2 + wave * 0.25; });
    shots = shots.filter(s => s.y > -10);
    bombs = bombs.filter(b => b.y < H + 10);

    // shot hits invader
    shots.forEach(s => {
      const hit = invaders.find(i => i.alive && Math.abs(i.x - s.x) < 18 && Math.abs(i.y - s.y) < 12);
      if (hit) {
        hit.alive = false;
        s.y = -99;
        score += 10;
        scoreEl.textContent = score;
        if (score > hi) { hi = score; hiEl.textContent = hi; localStorage.setItem('invHS', hi); }
      }
    });

    // bomb hits ship
    bombs.forEach(b => {
      if (b.y > H - 34 && Math.abs(b.x - ship.x) < ship.w / 2 + 4) {
        b.y = H + 99;
        lives--;
        if (lives <= 0) gameOver();
      }
    });

    // invaders reach the bottom
    if (alive.some(i => i.y > H - 46)) gameOver();
  }

  function draw() {
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, y, W, 2);
    }

    ctx.fillStyle = 'rgba(34,197,94,0.35)';
    ctx.font = '9px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillText(`WAVE ${wave}`, 10, 16);
    ctx.textAlign = 'right';
    ctx.fillText('LIVES ' + '●'.repeat(Math.max(0, lives)) + '○'.repeat(Math.max(0, 3 - lives)), W - 10, 16);

    invaders.forEach(i => {
      if (!i.alive) return;
      const danger = Math.min(1, (i.y - 40) / (H - 90));
      ctx.fillStyle = danger > 0.6 ? RED : danger > 0.3 ? AMBER : GREEN;
      ctx.shadowBlur = 6; ctx.shadowColor = ctx.fillStyle;
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(i.name, i.x, i.y);
      ctx.shadowBlur = 0;
    });

    ctx.fillStyle = GREEN2;
    shots.forEach(s => ctx.fillRect(s.x - 1, s.y - 6, 2, 6));
    ctx.fillStyle = RED;
    bombs.forEach(b => ctx.fillRect(b.x - 1.5, b.y, 3, 6));

    // ship
    ctx.fillStyle = GREEN;
    ctx.shadowBlur = 14; ctx.shadowColor = GREEN;
    ctx.beginPath();
    ctx.moveTo(ship.x, H - 32);
    ctx.lineTo(ship.x - ship.w / 2, H - 14);
    ctx.lineTo(ship.x + ship.w / 2, H - 14);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function loop() {
    if (state !== 'playing') return;
    tick();
    if (state === 'playing') draw();
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    state = 'dead';
    cancelAnimationFrame(raf);
    btn.textContent = 'RESTART';
    pauseBtn.disabled = true;
    pauseBtn.textContent = '⏸';
    ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = RED; ctx.shadowBlur = 20; ctx.shadowColor = RED;
    ctx.font = 'bold 20px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('PERIMETER BREACHED', W / 2, H / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(248,113,113,0.5)';
    ctx.font = '12px "JetBrains Mono"';
    ctx.fillText(`THREATS NEUTRALIZED: ${score / 10}`, W / 2, H / 2 + 10);
    ctx.fillStyle = 'rgba(34,197,94,0.4)';
    ctx.fillText('PRESS RESTART', W / 2, H / 2 + 35);
  }

  btn.addEventListener('click', () => { btn.textContent = 'RESTART'; init(); });
  idleScreen(ctx, W, H, 'PORT_INVADERS', '← → MOVE · SPACE FIRES');
})();

/* ════════════════════════════════════════════════════
   GAME 5 — LOGIC BOMB SWEEPER
════════════════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('sweepCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const bombsEl = document.getElementById('sweepBombs');
  const bestEl  = document.getElementById('sweepBest');
  const btn     = document.getElementById('sweepBtn');
  const pauseBtn = document.getElementById('sweepPauseBtn');

  const N = 10, CELL = W / N, BOMBS = 14;
  const NUM_COLORS = ['', GREEN2, AMBER, ORANGE, RED, RED, RED, RED, RED];

  let grid, state, revealed, flags, firstClick, startT, timer, best;
  best = parseInt(localStorage.getItem('sweepBest') || 0);
  bestEl.textContent = best ? best + 's' : '—';

  function newGrid() {
    grid = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ bomb: false, rev: false, flag: false, n: 0 })));
    revealed = 0; flags = 0; firstClick = true;
    bombsEl.textContent = BOMBS;
  }

  function placeBombs(sr, sc) {
    let placed = 0;
    while (placed < BOMBS) {
      const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
      if (grid[r][c].bomb || (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1)) continue;
      grid[r][c].bomb = true; placed++;
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && grid[rr][cc].bomb) n++;
      }
      grid[r][c].n = n;
    }
  }

  function revealCell(r, c) {
    const cell = grid[r][c];
    if (cell.rev || cell.flag) return;
    cell.rev = true;
    revealed++;
    if (cell.bomb) return gameOver(false);
    if (cell.n === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) revealCell(rr, cc);
      }
    }
    if (revealed === N * N - BOMBS && state === 'playing') gameOver(true);
  }

  function cellAt(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);
    return { r: Math.floor(y / CELL), c: Math.floor(x / CELL) };
  }

  canvas.addEventListener('click', e => {
    if (state !== 'playing') return;
    const { r, c } = cellAt(e);
    if (r < 0 || r >= N || c < 0 || c >= N) return;
    if (firstClick) { placeBombs(r, c); firstClick = false; startT = Date.now(); timer = setInterval(draw, 1000); }
    revealCell(r, c);
    draw();
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (state !== 'playing' || firstClick) return;
    toggleFlag(cellAt(e));
  });

  // long-press flag on touch
  let pressTimer = null;
  canvas.addEventListener('touchstart', e => {
    if (state !== 'playing' || firstClick) return;
    const pos = cellAt(e);
    pressTimer = setTimeout(() => { toggleFlag(pos); pressTimer = null; }, 450);
  }, { passive: true });
  canvas.addEventListener('touchend', () => { if (pressTimer) clearTimeout(pressTimer); });
  canvas.addEventListener('touchmove', () => { if (pressTimer) clearTimeout(pressTimer); });

  function toggleFlag({ r, c }) {
    if (r < 0 || r >= N || c < 0 || c >= N) return;
    const cell = grid[r][c];
    if (cell.rev) return;
    cell.flag = !cell.flag;
    flags += cell.flag ? 1 : -1;
    bombsEl.textContent = Math.max(0, BOMBS - flags);
    draw();
  }

  function draw() {
    ctx.fillStyle = DIM;
    ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const cell = grid[r][c];
      const x = c * CELL, y = r * CELL;
      if (cell.rev) {
        ctx.fillStyle = cell.bomb ? 'rgba(248,113,113,0.25)' : 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        if (cell.bomb) {
          ctx.fillStyle = RED;
          ctx.font = `bold ${CELL * 0.45}px "JetBrains Mono"`;
          ctx.textAlign = 'center';
          ctx.fillText('✸', x + CELL / 2, y + CELL * 0.68);
        } else if (cell.n) {
          ctx.fillStyle = NUM_COLORS[cell.n];
          ctx.font = `bold ${CELL * 0.42}px "JetBrains Mono"`;
          ctx.textAlign = 'center';
          ctx.fillText(cell.n, x + CELL / 2, y + CELL * 0.66);
        }
      } else {
        ctx.fillStyle = 'rgba(34,197,94,0.07)';
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.strokeStyle = 'rgba(34,197,94,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
        if (cell.flag) {
          ctx.fillStyle = GREEN;
          ctx.font = `bold ${CELL * 0.42}px "JetBrains Mono"`;
          ctx.textAlign = 'center';
          ctx.fillText('⚑', x + CELL / 2, y + CELL * 0.66);
        }
      }
    }
    if (state === 'playing' && !firstClick) {
      const t = Math.floor((Date.now() - startT) / 1000);
      ctx.fillStyle = 'rgba(34,197,94,0.55)';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'right';
      ctx.fillText(t + 's', W - 6, 13);
    }
  }

  let pausedAt = 0;
  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      pauseBtn.textContent = '▶';
      if (!firstClick) { pausedAt = Date.now(); clearInterval(timer); }
      pauseOverlay(ctx, W, H);
    } else if (state === 'paused') {
      state = 'playing';
      pauseBtn.textContent = '⏸';
      if (!firstClick) { startT += Date.now() - pausedAt; timer = setInterval(draw, 1000); }
      draw();
    }
  }
  pauseBtn.addEventListener('click', togglePause);
  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if (e.key === 'p' || e.key === 'P') togglePause();
  });

  function gameOver(won) {
    state = 'dead';
    clearInterval(timer);
    btn.textContent = 'RESTART';
    pauseBtn.disabled = true;
    pauseBtn.textContent = '⏸';
    // reveal all bombs
    grid.flat().forEach(cell => { if (cell.bomb) cell.rev = true; });
    draw();
    const t = Math.floor((Date.now() - startT) / 1000);
    if (won && (best === 0 || t < best)) {
      best = t;
      localStorage.setItem('sweepBest', best);
      bestEl.textContent = best + 's';
    }
    ctx.fillStyle = 'rgba(10,15,10,0.78)';
    ctx.fillRect(0, H / 2 - 42, W, 84);
    ctx.fillStyle = won ? GREEN : RED;
    ctx.shadowBlur = 20; ctx.shadowColor = ctx.fillStyle;
    ctx.font = 'bold 19px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(won ? 'MEMORY CLEARED' : 'LOGIC BOMB DETONATED', W / 2, H / 2 - 6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,216,200,0.6)';
    ctx.font = '11px "JetBrains Mono"';
    ctx.fillText(won ? `CLEARED IN ${t}s` : 'PRESS RESTART', W / 2, H / 2 + 20);
  }

  btn.addEventListener('click', () => {
    btn.textContent = 'RESTART';
    clearInterval(timer);
    newGrid();
    state = 'playing';
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    draw();
  });

  newGrid();
  state = 'idle';
  idleScreen(ctx, W, H, 'LOGIC_BOMB_SWEEPER', 'CLICK REVEAL · RIGHT-CLICK / HOLD FLAGS');
})();

/* ════════════════════════════════════════════════════
   GAME 6 — MEMORY LEAK (Simon)
════════════════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('memCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const roundEl = document.getElementById('memRound');
  const bestEl  = document.getElementById('memBest');
  const btn     = document.getElementById('memBtn');
  const pauseBtn = document.getElementById('memPauseBtn');

  const PADS = [
    { label: '0x00', freq: 220 },
    { label: '0x1F', freq: 294 },
    { label: '0xA4', freq: 392 },
    { label: '0xFF', freq: 523 },
  ];
  const GAP = 10, PW = (W - GAP * 3) / 2, PH = (H - GAP * 3) / 2;
  const rects = PADS.map((p, i) => ({
    ...p,
    x: GAP + (i % 2) * (PW + GAP),
    y: GAP + Math.floor(i / 2) * (PH + GAP),
  }));

  let seq, idx, state, best, lit;   // lit: index of currently flashing pad
  best = parseInt(localStorage.getItem('memBest') || 0);
  bestEl.textContent = best || '—';

  let audio = null;
  function beep(freq, ms) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + ms / 1000);
    } catch {}
  }

  function draw() {
    ctx.fillStyle = DIM;
    ctx.fillRect(0, 0, W, H);
    rects.forEach((p, i) => {
      const on = lit === i;
      ctx.fillStyle = on ? GREEN : 'rgba(34,197,94,0.1)';
      ctx.shadowBlur = on ? 26 : 0;
      ctx.shadowColor = GREEN;
      ctx.fillRect(p.x, p.y, PW, PH);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? GREEN2 : 'rgba(34,197,94,0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x, p.y, PW, PH);
      ctx.fillStyle = on ? DARK : 'rgba(34,197,94,0.65)';
      ctx.font = 'bold 16px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x + PW / 2, p.y + PH / 2 + 6);
    });
    if (state === 'showing') {
      ctx.fillStyle = 'rgba(200,216,200,0.5)';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('WATCH THE HEAP…', W / 2, H - 4);
    } else if (state === 'input') {
      ctx.fillStyle = 'rgba(34,197,94,0.55)';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('YOUR TURN — REPEAT THE SEQUENCE', W / 2, H - 4);
    }
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function showSequence() {
    state = 'showing';
    draw();
    await sleep(600);
    const dt = Math.max(220, 520 - seq.length * 25);
    for (const s of seq) {
      lit = s; beep(PADS[s].freq, dt * 0.7); draw();
      await sleep(dt);
      lit = -1; draw();
      await sleep(140);
    }
    idx = 0;
    state = 'input';
    draw();
  }

  function nextRound() {
    seq.push(Math.floor(Math.random() * 4));
    roundEl.textContent = seq.length;
    showSequence();
  }

  canvas.addEventListener('pointerdown', async e => {
    if (state !== 'input') return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const i = rects.findIndex(p => x >= p.x && x <= p.x + PW && y >= p.y && y <= p.y + PH);
    if (i < 0) return;
    lit = i; beep(PADS[i].freq, 200); draw();
    setTimeout(() => { if (state === 'input') { lit = -1; draw(); } }, 200);

    if (i !== seq[idx]) return gameOver();
    idx++;
    if (idx === seq.length) {
      if (seq.length > best) {
        best = seq.length;
        localStorage.setItem('memBest', best);
        bestEl.textContent = best;
      }
      state = 'wait';
      await sleep(650);
      nextRound();
    }
  });

  function togglePause() {
    if (state === 'input') {
      state = 'paused';
      pauseBtn.textContent = '▶';
      pauseOverlay(ctx, W, H);
    } else if (state === 'paused') {
      state = 'input';
      pauseBtn.textContent = '⏸';
      draw();
    }
  }
  pauseBtn.addEventListener('click', togglePause);
  document.addEventListener('keydown', e => {
    if (typingInField()) return;
    if (e.key === 'p' || e.key === 'P') togglePause();
  });

  function gameOver() {
    state = 'dead';
    btn.textContent = 'RESTART';
    pauseBtn.disabled = true;
    pauseBtn.textContent = '⏸';
    beep(110, 500);
    ctx.fillStyle = 'rgba(10,15,10,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = RED;
    ctx.shadowBlur = 20; ctx.shadowColor = RED;
    ctx.font = 'bold 20px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('SEGFAULT', W / 2, H / 2 - 14);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(248,113,113,0.55)';
    ctx.font = '11px "JetBrains Mono"';
    ctx.fillText(`HEAP CORRUPTED AT ROUND ${seq.length}`, W / 2, H / 2 + 12);
    ctx.fillStyle = 'rgba(34,197,94,0.4)';
    ctx.fillText('PRESS RESTART', W / 2, H / 2 + 34);
  }

  btn.addEventListener('click', () => {
    btn.textContent = 'RESTART';
    seq = []; idx = 0; lit = -1;
    roundEl.textContent = 0;
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    nextRound();
  });

  lit = -1;
  state = 'idle';
  idleScreen(ctx, W, H, 'MEMORY_LEAK', 'PRESS START · REPEAT THE PATTERN');
})();

/* ════════════════════════════════════════════════════
   GAME 7 — DOOM (js-dos, 1993 shareware episode)
════════════════════════════════════════════════════ */
(function() {
  const mount = document.getElementById('doomMount');
  if (!mount) return;
  const idle   = document.getElementById('doomIdle');
  const btn    = document.getElementById('doomBtn');
  const status = document.getElementById('doomStatus');

  const JSDOS_JS  = 'https://v8.js-dos.com/latest/js-dos.js';
  const JSDOS_CSS = 'https://v8.js-dos.com/latest/js-dos.css';
  // self-hosted shareware bundle (cdn.dos.zone blocks cross-origin fetches)
  const BUNDLE    = 'doom.jsdos';

  let booted = false;

  function loadAsset(tag, attrs) {
    return new Promise((res, rej) => {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      el.onload = res;
      el.onerror = rej;
      document.head.appendChild(el);
    });
  }

  btn.addEventListener('click', async () => {
    if (booted) return;
    booted = true;
    btn.disabled = true;
    btn.textContent = 'LOADING…';
    status.textContent = 'FETCHING WAD…';
    try {
      await Promise.all([
        loadAsset('script', { src: JSDOS_JS }),
        loadAsset('link', { rel: 'stylesheet', href: JSDOS_CSS })
      ]);
      if (typeof Dos !== 'function') throw new Error('js-dos failed to load');
      idle.remove();
      Dos(mount, { url: BUNDLE });
      status.textContent = 'RIP AND TEAR';
      btn.textContent = 'RUNNING';
    } catch (err) {
      booted = false;
      btn.disabled = false;
      btn.textContent = 'RETRY';
      status.textContent = 'LOAD FAILED — CHECK CONNECTION';
    }
  });
})();
