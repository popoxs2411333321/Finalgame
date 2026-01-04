
import { GoogleGenAI } from "@google/genai";

if (typeof window.process === 'undefined') {
    window.process = { env: { API_KEY: '' } };
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const RANK_NAMES = { J: 'JACK', Q: 'QUEEN', K: 'KING', A: 'ACE' };
const SUIT_NAMES = { HEARTS: 'HEARTS', SPADES: 'SPADES', DIAMONDS: 'DIAMONDS' };
const COLORS = { HEARTS: 'suit-ruby', SPADES: 'suit-onyx', DIAMONDS: 'suit-ruby' };

const SHOP_DATA = {
    Foods: [
        { name: 'Adobo Bowl', price: 150, icon: '🥘' },
        { name: 'Lechon Plate', price: 300, icon: '🐖' },
        { name: 'Pancit Guisado', price: 200, icon: '🍝' },
        { name: 'Lumpia Bucket', price: 180, icon: '🌯' },
        { name: 'Kwek-Kwek', price: 50, icon: '🟠' },
        { name: 'Halo-Halo', price: 220, icon: '🍧' },
        { name: 'Bibingka', price: 120, icon: '🥞' },
        { name: 'Sisig Plate', price: 280, icon: '🍳' },
        { name: 'Isaw Skewer', price: 45, icon: '🍢' },
        { name: 'Sorbetes', price: 40, icon: '🍦' }
    ],
    Toys: [
        { name: 'Wooden Yo-Yo', price: 100, icon: '🪀' },
        { name: 'Stuffed Carabao', price: 450, icon: '🐃' },
        { name: 'Toy Jeepney', price: 500, icon: '🚌' },
        { name: 'Ring Toss', price: 150, icon: '⭕' },
        { name: 'Glow Stick', price: 70, icon: '✨' },
        { name: 'Small Kite', price: 200, icon: '🪁' },
        { name: 'Jackstones', price: 130, icon: '⭐' }
    ],
    Keychains: [
        { name: 'Mini Jeepney', price: 150, icon: '🚙' },
        { name: 'PH Flag', price: 100, icon: '🇵🇭' },
        { name: 'Tarsier Charm', price: 250, icon: '🐒' },
        { name: 'PH Heart', price: 120, icon: '❤️' },
        { name: 'Sand Bottle', price: 180, icon: '🧪' },
        { name: 'Master Badge', price: 1000, icon: '🎖️' },
        { name: 'Lucky Coin', price: 300, icon: '🧧' }
    ]
};

// State
let playerName = "Royal Guest";
let balanceTokens = 0;
let hasToppedUp = false;
let currentBets = [];
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;
let isCharging = false;
let chargePower = 0;
let chargeDirection = 1;
let chargeAnimId = null;
let winningIndices = [];
let activeBallsFinished = 0;
let selectedPack = null;
let selectedPaymentMethod = null;
let audioCtx = null;
let chargeOscillator = null;
let chargeGain = null;
let currentShopCategory = 'Foods';
let currentRound = 1;
let cinemaModeActive = false;

function init() {
    setupCards();
    setupEventListeners();
    setupCursor();
    setupFestiveAtmosphere();
    updateUI();
    renderShop();
    renderRegistryChips();
    loadLeaderboard();
    
    setTimeout(() => {
        const input = document.getElementById('nickname-input');
        if (input) input.focus();
    }, 500);
}

function setupFestiveAtmosphere() {
    const bannerCont = document.querySelector('.fiesta-banners');
    if (bannerCont) {
        bannerCont.innerHTML = '';
        const colors = ['#ef4444', '#fbbf24', '#3b82f6', '#10b981', '#f97316', '#a855f7'];
        for (let i = 0; i < 40; i++) {
            const flag = document.createElement('div');
            flag.className = 'flag';
            flag.style.setProperty('--color', colors[i % colors.length]);
            flag.style.setProperty('--delay', (0.5 + Math.random() * 1.5) + 's');
            bannerCont.appendChild(flag);
        }
    }

    const sparkleCont = document.getElementById('ambient-sparkles-container');
    if (sparkleCont) {
        sparkleCont.innerHTML = '';
        for (let i = 0; i < 50; i++) {
            createAmbientSparkle(sparkleCont);
        }
    }
}

function createAmbientSparkle(container) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    const size = 2 + Math.random() * 4;
    sparkle.style.width = size + 'px';
    sparkle.style.height = size + 'px';
    sparkle.style.left = Math.random() * 100 + 'vw';
    sparkle.style.top = '-10px';
    sparkle.style.setProperty('--duration', (5 + Math.random() * 10) + 's');
    sparkle.style.animationDelay = Math.random() * 10 + 's';
    sparkle.style.background = `rgba(251, 191, 36, ${0.2 + Math.random() * 0.5})`;
    container.appendChild(sparkle);
}

function generateQRSimulation() {
    const grid = document.getElementById('qr-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 144; i++) {
        const block = document.createElement('div');
        block.className = `qr-block ${Math.random() > 0.4 ? '' : 'empty'}`;
        const x = i % 12; const y = Math.floor(i / 12);
        if ((x < 3 && y < 3) || (x > 8 && y < 3) || (x < 3 && y > 8)) { block.className = 'qr-block'; }
        grid.appendChild(block);
    }
}

function handleNicknameEntry(explicitName = null) {
    const input = document.getElementById('nickname-input');
    const overlay = document.getElementById('nickname-overlay');
    const gameCont = document.getElementById('game-container');
    const val = (explicitName || input.value).trim();
    
    if (val.length < 2) return;
    
    playerName = val;
    
    const monarch = getMonarchData(playerName);
    if (monarch) {
        balanceTokens = monarch.tokens;
        hasToppedUp = balanceTokens > 0;
    } else {
        balanceTokens = 0;
        hasToppedUp = false;
    }
    
    saveToRegistry(playerName, balanceTokens); 
    
    const nameTxt = document.getElementById('player-name-txt');
    if(nameTxt) nameTxt.innerText = playerName;
    
    overlay.classList.add('fade-out');
    
    setTimeout(() => {
        overlay.style.display = 'none';
        gameCont.style.display = 'flex';
        setTimeout(() => gameCont.classList.add('visible'), 50);
        updateUI();
    }, 800);
    
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    barkerTalk(`Greeting Majesty ${playerName} to the table.`);
    playSound(880, 'square', 0.2);
}

function getMonarchData(name) {
    const registry = JSON.parse(localStorage.getItem('perya_monarch_registry') || '[]');
    return registry.find(n => n.name.toLowerCase() === name.toLowerCase());
}

function saveToRegistry(name, tokens) {
    let registry = JSON.parse(localStorage.getItem('perya_monarch_registry') || '[]');
    const idx = registry.findIndex(n => n.name.toLowerCase() === name.toLowerCase());
    
    if (idx !== -1) {
        registry[idx].tokens = tokens;
        registry[idx].lastSeen = new Date().toISOString();
    } else {
        registry.push({ name, tokens, lastSeen: new Date().toISOString() });
    }
    
    registry.sort((a, b) => b.tokens - a.tokens);
    localStorage.setItem('perya_monarch_registry', JSON.stringify(registry));
}

function renderRegistryChips() {
    const container = document.getElementById('recent-players-chips');
    if (!container) return;
    
    const registry = JSON.parse(localStorage.getItem('perya_monarch_registry') || '[]');
    container.innerHTML = '';
    
    const displayed = registry.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen)).slice(0, 8);
    
    displayed.forEach(monarch => {
        const chip = document.createElement('button');
        chip.className = 'registry-chip';
        chip.innerText = monarch.name;
        chip.onclick = () => handleNicknameEntry(monarch.name);
        container.appendChild(chip);
    });
}

function setupCards() {
    cards = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            cards.push({ 
                id: `${suit}-${rank}`, 
                suit, 
                rank,
                fullName: `${RANK_NAMES[rank]} OF ${SUIT_NAMES[suit]}`
            });
        });
    });
    renderCards();
}

function renderCards() {
    const grid = document.getElementById('card-grid');
    if (!grid) return;
    grid.innerHTML = '';
    cards.forEach(card => {
        const btn = document.createElement('button');
        btn.className = 'perya-card group';
        btn.id = `card-${card.id}`;
        btn.onclick = () => handleCardClick(card.id);
        btn.innerHTML = `
            <div class="card-ornate-corner corner-tl"></div><div class="card-ornate-corner corner-tr"></div>
            <div class="card-ornate-corner corner-bl"></div><div class="card-ornate-corner corner-br"></div>
            <div class="absolute top-3 left-4 font-black ${COLORS[card.suit]} text-[14px] pointer-events-none drop-shadow-lg">${card.rank}</div>
            <div class="text-6xl ${COLORS[card.suit]} pointer-events-none transition-transform group-hover:scale-110 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">${SYMBOLS[card.suit]}</div>
            <div class="absolute bottom-3 right-4 font-black rotate-180 ${COLORS[card.suit]} text-[14px] pointer-events-none drop-shadow-lg">${card.rank}</div>
        `;
        grid.appendChild(btn);
    });
    
    const ballLayer = document.getElementById('ball-layer');
    ballLayer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const shadow = document.createElement('div');
        shadow.id = `shadow-${i}`;
        shadow.className = 'absolute opacity-0 transition-opacity duration-300';
        shadow.style.width = '28px'; shadow.style.height = '28px';
        shadow.innerHTML = `<div class="w-full h-full bg-black/50 blur-lg rounded-full"></div>`;
        
        const ball = document.createElement('div');
        ball.id = `ball-${i}`;
        ball.className = 'absolute opacity-0 z-[1000] transition-opacity duration-300';
        ball.style.width = '26px'; ball.style.height = '26px';
        ball.innerHTML = `
            <div class="w-full h-full bg-gradient-to-br from-white via-yellow-200 to-amber-500 rounded-full 
            shadow-[0_0_20px_rgba(251,191,36,1),inset_0_4px_8px_rgba(255,255,255,1)] flex items-center justify-center">
                <div class="w-1/2 h-1/2 bg-white/30 rounded-full blur-[1px]"></div>
            </div>`;
        
        ballLayer.appendChild(shadow);
        ballLayer.appendChild(ball);
    }
}

function handleCardClick(id) {
    if (isDrawing) return;
    const idx = currentBets.indexOf(id);
    if (idx !== -1) currentBets.splice(idx, 1);
    else if (currentBets.length < MAX_BETS) currentBets.push(id);
    updateUI();
    playSound(idx !== -1 ? 300 : 700, 'sine', 0.08);
}

function updateUI() {
    const balEl = document.getElementById('balance-txt');
    if(balEl) balEl.innerText = balanceTokens.toLocaleString();
    
    const betCountEl = document.getElementById('bet-count-txt');
    if(betCountEl) betCountEl.innerText = `${currentBets.length} / ${MAX_BETS}`;
    
    const grid = document.getElementById('card-grid');
    if (grid) {
        grid.classList.toggle('max-bets', currentBets.length === MAX_BETS);
    }

    const drawBtn = document.getElementById('draw-btn');
    if(!drawBtn) return;
    const isLocked = !hasToppedUp;
    drawBtn.disabled = isDrawing || currentBets.length === 0 || balanceTokens < (currentBets.length * betAmountPerCard) || isLocked;
    
    let btnText = "HOLD SPACE";
    if (isLocked) btnText = "DEPOSIT FIRST";
    else if (isDrawing) btnText = "DROPPING...";
    else if (currentRound > 1) btnText = `ROUND ${currentRound}: HOLD SPACE`;
    
    drawBtn.innerText = btnText;
    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        if (el) el.classList.toggle('selected', currentBets.includes(c.id));
    });

    saveToRegistry(playerName, balanceTokens);
}

function startCharging() {
    if (isDrawing || currentBets.length === 0 || isCharging || !hasToppedUp) return;
    isCharging = true; chargePower = 0; chargeDirection = 1;
    if (audioCtx) {
        chargeOscillator = audioCtx.createOscillator();
        chargeGain = audioCtx.createGain();
        chargeOscillator.type = 'sawtooth';
        chargeOscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
        chargeGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
        chargeOscillator.connect(chargeGain);
        chargeGain.connect(audioCtx.destination);
        chargeOscillator.start();
    }
    const btn = document.getElementById('draw-btn');
    if(btn) btn.classList.add('scale-95', 'brightness-110');
    chargeLoop();
}

function chargeLoop() {
    if (!isCharging) return;
    chargePower += 3 * chargeDirection;
    if (chargePower >= 100) { chargePower = 100; chargeDirection = -1; }
    if (chargePower <= 0) { chargePower = 0; chargeDirection = 1; }
    const fill = document.getElementById('power-fill');
    if(fill) fill.style.width = `${chargePower}%`;
    if (chargeOscillator) {
        chargeOscillator.frequency.setTargetAtTime(120 + (chargePower * 5), audioCtx.currentTime, 0.04);
    }
    chargeAnimId = requestAnimationFrame(chargeLoop);
}

function stopCharging() {
    if (!isCharging) return;
    isCharging = false;
    cancelAnimationFrame(chargeAnimId);
    if (chargeOscillator) {
        chargeOscillator.stop(); chargeOscillator.disconnect();
        chargeOscillator = null;
    }
    const btn = document.getElementById('draw-btn');
    if(btn) btn.classList.remove('scale-95', 'brightness-110');
    handleLaunch();
    const fill = document.getElementById('power-fill');
    if(fill) fill.style.width = '0%';
}

function getTargetCoords(targetId) {
    const layer = document.getElementById('ball-layer');
    const card = document.getElementById(`card-${targetId}`);
    if (!layer || !card) return { x: 0, y: 0 };
    
    const layerRect = layer.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    
    return {
        x: (cardRect.left - layerRect.left) + (cardRect.width / 2) - 13,
        y: (cardRect.top - layerRect.top) + (cardRect.height / 2) - 13
    };
}

function handleLaunch() {
    isDrawing = true; activeBallsFinished = 0; winningIndices = [];
    document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('winning-hit'));
    document.getElementById('winning-cards-list').innerHTML = '';
    balanceTokens -= currentBets.length * betAmountPerCard; updateUI();

    for (let i = 0; i < 3; i++) {
        const ball = document.getElementById(`ball-${i}`);
        const shadow = document.getElementById(`shadow-${i}`);
        if(!ball || !shadow) continue;
        
        const startIdx = Math.floor(Math.random() * cards.length);
        const { x, y } = getTargetCoords(cards[startIdx].id);
        
        ball.getAnimations().forEach(anim => anim.cancel());
        shadow.getAnimations().forEach(anim => anim.cancel());
        
        ball.style.transform = `translate(${x}px, ${y}px)`;
        shadow.style.transform = `translate(${x}px, ${y}px)`;
        ball.style.opacity = '1'; shadow.style.opacity = '1';
        
        const finalIdx = Math.floor(Math.random() * cards.length);
        const hops = 4 + Math.floor(Math.random() * 8);
        
        setTimeout(() => {
            animateBall(i, ball, shadow, hops, finalIdx, hops, startIdx);
        }, i * 180);
    }
}

function animateBall(idx, ball, shadow, bouncesLeft, finalIdx, totalBounces, currentIdx) {
    const targetIdx = bouncesLeft > 0 ? Math.floor(Math.random() * cards.length) : finalIdx;
    const { x: tx, y: ty } = getTargetCoords(cards[targetIdx].id);
    
    const progress = 1 - (bouncesLeft / totalBounces);
    const speedVariation = 0.7 + (Math.random() * 0.6);
    const baseDuration = 160 - (chargePower / 3);
    const duration = (baseDuration + (progress * 260)) * speedVariation;
    
    const heightVariation = 0.9 + (Math.random() * 0.25);
    const initialJump = -100 - (chargePower / 2.2);
    const jumpHeight = bouncesLeft > 0 ? (initialJump * (1 - (progress * 0.92))) * heightVariation : 0;

    const currentPos = ball.style.transform;

    const ballAnim = ball.animate([
        { transform: currentPos, easing: 'ease-out' },
        { transform: `translate(${tx}px, ${ty + jumpHeight}px)`, offset: 0.5, easing: 'ease-in' },
        { transform: `translate(${tx}px, ${ty}px)` }
    ], { duration });

    ballAnim.onfinish = () => {
        playSound(220 + (bouncesLeft * 45), 'triangle', 0.04);
        ball.style.transform = `translate(${tx}px, ${ty}px)`;
        
        if (bouncesLeft > 0) {
            animateBall(idx, ball, shadow, bouncesLeft - 1, finalIdx, totalBounces, targetIdx);
        } else {
            winningIndices.push(finalIdx); 
            activeBallsFinished++;
            if (activeBallsFinished === 3) finalize();
        }
    };

    shadow.animate([
        { transform: shadow.style.transform, opacity: 0.3 },
        { transform: `translate(${tx}px, ${ty}px)`, opacity: 0.5 }
    ], { duration, easing: 'linear' });
    shadow.style.transform = `translate(${tx}px, ${ty}px)`;
}

function finalize() {
    let matches = 0;
    const listContainer = document.getElementById('winning-cards-list');
    listContainer.innerHTML = '';

    winningIndices.forEach(idx => {
        const card = cards[idx];
        const el = document.getElementById(`card-${card.id}`);
        if (el) {
            el.classList.add('winning-hit');
            if (currentBets.includes(card.id)) {
                matches++;
                spawnWinParticles(el);
                playSound(1200, 'sine', 0.15);
            }
        }
        
        const pill = document.createElement('div');
        pill.className = 'winner-pill flex justify-between items-center';
        pill.innerHTML = `<span>👑 ${card.fullName}</span><span class="${currentBets.includes(card.id) ? 'text-emerald-400 font-bold ml-2' : 'hidden'}">MATCH!</span>`;
        listContainer.appendChild(pill);
    });

    const mult = matches === 1 ? 2 : matches === 2 ? 3 : matches === 3 ? 6 : 0;
    const payout = mult * betAmountPerCard;
    balanceTokens += payout; updateUI();
    
    setTimeout(() => {
        if (matches > 0) { 
            barkerTalk(`Regal Jackpot! Majesty won ${payout} Tokens!`); 
            initConfetti(); 
            playSound(660, 'square', 0.6);
        } else {
            barkerTalk(`Luck shifts in Round ${currentRound}... try again!`);
        }
        
        const nextRoundBtn = document.createElement('button');
        nextRoundBtn.className = 'w-full py-3 mt-2 bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-all';
        nextRoundBtn.innerText = `NEXT ROUND`;
        nextRoundBtn.onclick = () => {
            currentRound++;
            isDrawing = false;
            currentBets = [];
            document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('winning-hit', 'selected'));
            for (let i = 0; i < 3; i++) {
                const b = document.getElementById(`ball-${i}`);
                const s = document.getElementById(`shadow-${i}`);
                if(b && s) { b.style.opacity = '0'; s.style.opacity = '0'; }
            }
            listContainer.innerHTML = '';
            updateUI();
        };
        listContainer.appendChild(nextRoundBtn);
    }, 1200);
}

function spawnWinParticles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    for (let i = 0; i < 20; i++) {
        const star = document.createElement('div');
        star.className = 'fixed pointer-events-none z-[1000] text-amber-400 text-xl font-bold';
        star.innerText = ['⭐', '✨', '👑'][Math.floor(Math.random() * 3)];
        star.style.left = centerX + 'px'; star.style.top = centerY + 'px';
        document.body.appendChild(star);
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 150;
        const tx = Math.cos(angle) * dist; const ty = Math.sin(angle) * dist;
        star.animate([{ transform: 'translate(-50%, -50%) scale(0) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1.5) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(0, .9, .57, 1)' }).onfinish = () => star.remove();
    }
}

function spawnShopParticles() {
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'fixed pointer-events-none z-[25000] text-2xl';
        p.innerHTML = ['🎁', '💎', '🎉', '🧧', '🌟'][Math.floor(Math.random() * 5)];
        p.style.left = '50%';
        p.style.top = '50%';
        document.body.appendChild(p);
        
        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 300;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        
        p.animate([
            { transform: 'translate(-50%, -50%) scale(0) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(2) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], { duration: 1500, easing: 'cubic-bezier(0, .9, .57, 1)' }).onfinish = () => p.remove();
    }
}

function playSound(f, t, d) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(0.04, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + d);
}

function setupCursor() {
    const cursor = document.getElementById('custom-cursor');
    const label = document.getElementById('cursor-label');
    if (!cursor) return;
    let mx = 0, my = 0, cx = 0, cy = 0;
    const update = () => { cx += (mx - cx) * 0.4; cy += (my - cy) * 0.4; cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`; requestAnimationFrame(update); };
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; const target = e.target; const isBtn = !!target.closest('button, .perya-card'); cursor.classList.toggle('hovering-btn', isBtn); if (label) label.style.opacity = isBtn ? "1" : "0"; });
    requestAnimationFrame(update);
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const items = SHOP_DATA[currentShopCategory];
    grid.innerHTML = items.map(item => `<div class="glass-pane p-4 rounded-xl text-center cursor-pointer hover:border-amber-500 transition-all flex flex-col items-center justify-between min-h-[140px]" onclick="buyItem('${item.name}', ${item.price}, '${item.icon}')"><div class="text-4xl mb-2">${item.icon}</div><div class="text-white font-black text-[9px] uppercase tracking-widest">${item.name}</div><div class="text-amber-500 text-[11px] font-black mt-2">🪙 ${item.price}</div></div>`).join('');
}

function loadLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;
    const registry = JSON.parse(localStorage.getItem('perya_monarch_registry') || '[]');
    registry.sort((a, b) => b.tokens - a.tokens);
    if (registry.length === 0) {
        body.innerHTML = '<tr><td colspan="3" class="py-10 text-center opacity-30 text-[10px] uppercase font-black">No Monarchs Registered Yet</td></tr>';
        return;
    }
    body.innerHTML = registry.slice(0, 10).map((player, idx) => `<tr class="border-b border-white/5 hover:bg-white/5 transition-colors"><td class="py-4 px-4 font-black text-amber-500">${idx + 1}</td><td class="py-4 px-4 font-bold uppercase tracking-widest text-[11px]">${player.name}</td><td class="py-4 px-4 font-black">🪙 ${player.tokens.toLocaleString()}</td></tr>`).join('');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function setupEventListeners() {
    const enterBtn = document.getElementById('enter-game-btn');
    if (enterBtn) enterBtn.onclick = () => handleNicknameEntry();
    
    const refillBtn = document.getElementById('refill-btn');
    if (refillBtn) refillBtn.onclick = () => { 
        document.getElementById('payment-modal').style.display = 'flex'; 
        document.getElementById('qr-simulation-area').style.display = 'none'; 
        generateQRSimulation(); 
    };
    
    const leaderboardBtn = document.getElementById('leaderboard-toggle-btn');
    if (leaderboardBtn) leaderboardBtn.onclick = () => { loadLeaderboard(); document.getElementById('leaderboard-modal').style.display = 'flex'; };
    
    const shopBtn = document.getElementById('shop-toggle-btn');
    if (shopBtn) shopBtn.onclick = () => { document.getElementById('shop-modal').style.display = 'flex'; renderShop(); };
    
    const rulesBtn = document.getElementById('rules-toggle-btn');
    if (rulesBtn) rulesBtn.onclick = () => document.getElementById('rules-modal').style.display = 'flex';
    
    const cinemaBtn = document.getElementById('cinema-mode-btn');
    if (cinemaBtn) {
        cinemaBtn.onclick = () => {
            cinemaModeActive = !cinemaModeActive;
            document.body.classList.toggle('cinema-mode', cinemaModeActive);
            cinemaBtn.innerText = `Cinema Mode: ${cinemaModeActive ? 'ON' : 'OFF'}`;
            cinemaBtn.classList.toggle('active', cinemaModeActive);
            playSound(440, 'sine', 0.1);
        };
    }

    const fsFrontBtn = document.getElementById('fullscreen-front-btn');
    if (fsFrontBtn) fsFrontBtn.onclick = toggleFullscreen;
    
    document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => btn.closest('.modal').style.display = 'none');
    
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.onclick = toggleFullscreen;

    const drawBtn = document.getElementById('draw-btn');
    if (drawBtn) { drawBtn.onmousedown = startCharging; window.onmouseup = stopCharging; }

    window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); startCharging(); } });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') stopCharging(); });

    document.querySelectorAll('.shop-tab-btn').forEach(btn => { btn.onclick = () => { currentShopCategory = btn.dataset.shopCat; document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderShop(); }; });

    document.querySelectorAll('.vault-pack').forEach(pack => pack.onclick = () => { selectedPack = { tokens: parseInt(pack.dataset.tokens) }; document.querySelectorAll('.vault-pack').forEach(p => p.classList.remove('active')); pack.classList.add('active'); checkPaymentValidity(); });

    document.querySelectorAll('.payment-btn').forEach(btn => btn.onclick = () => {
        selectedPaymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const qrArea = document.getElementById('qr-simulation-area');
        if (['Line Pay', 'Taiwan Pay'].includes(selectedPaymentMethod)) {
            qrArea.style.display = 'flex';
            document.getElementById('qr-method-name').innerText = selectedPaymentMethod;
            generateQRSimulation();
        } else { qrArea.style.display = 'none'; }
        checkPaymentValidity();
    });

    function checkPaymentValidity() { const btn = document.getElementById('complete-purchase'); if (selectedPack && selectedPaymentMethod && btn) { btn.disabled = false; btn.classList.remove('opacity-50'); } }

    const finalizeBtn = document.getElementById('complete-purchase');
    if (finalizeBtn) finalizeBtn.onclick = () => { balanceTokens += selectedPack.tokens; hasToppedUp = true; updateUI(); document.getElementById('payment-modal').style.display = 'none'; playSound(880, 'square', 0.4); barkerTalk(`Deposit complete! Your treasury grows, Majesty.`); };
    
    window.addEventListener('buy-item', (e) => {
        const { name, price, icon } = e.detail;
        if (balanceTokens >= price) {
            balanceTokens -= price; updateUI();
            barkerTalk(`Excellent choice! ${name} is yours.`);
            const ticket = document.getElementById('souvenir-ticket');
            document.getElementById('ticket-item-icon').innerText = icon || '🎁';
            document.getElementById('ticket-item-name').innerText = name;
            document.getElementById('ticket-player-name').innerText = playerName;
            ticket.classList.add('visible');
            spawnShopParticles();
            playSound(1200, 'sine', 0.5);
        } else { alert("Insufficient tokens! Visit the Imperial Treasury."); }
    });
}

async function barkerTalk(ctx) {
    if (!process.env.API_KEY) return;
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Game dealer speaking royal decree. Max 8 words. Context: ${ctx}`,
            config: { systemInstruction: "Enthusiastic royal carnival barker.", temperature: 1 }
        });
        if (res.text) { const msgEl = document.getElementById('dealer-msg'); if (msgEl) msgEl.innerText = `"${res.text.trim()}"`; }
    } catch (e) {}
}

function initConfetti() {
    for (let i = 0; i < 40; i++) {
        const c = document.createElement('div');
        c.className = 'fixed pointer-events-none z-[20000] w-2 h-2 rounded-sm';
        c.style.left = Math.random() * 100 + 'vw'; c.style.top = '-20px';
        c.style.backgroundColor = ['#fbbf24', '#ef4444', '#ffffff', '#ffd700', '#3b82f6', '#10b981'][Math.floor(Math.random() * 6)];
        document.body.appendChild(c);
        c.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(110vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }], { duration: 2000 }).onfinish = () => c.remove();
    }
}

init();
