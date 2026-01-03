
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
const RANK_NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
const SUIT_NAMES = { HEARTS: 'Hearts', SPADES: 'Spades', DIAMONDS: 'Diamonds' };
const COLORS = { HEARTS: 'text-red-700', SPADES: 'text-stone-900', DIAMONDS: 'text-red-500' };

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
let currentShopCategory = 'Foods';
let audioCtx = null;
let chargeOscillator = null;
let chargeGain = null;

// Persistent Stats
let stats = {
    highestWin: 0,
    imperialHits: 0
};

function init() {
    setupCards();
    setupEventListeners();
    setupCursor();
    updateUI();
    renderShop();
    loadLeaderboard();
    
    // Auto-focus nickname input
    setTimeout(() => {
        const input = document.getElementById('nickname-input');
        if (input) input.focus();
    }, 500);
}

function handleNicknameEntry() {
    const input = document.getElementById('nickname-input');
    const overlay = document.getElementById('nickname-overlay');
    const gameCont = document.getElementById('game-container');
    const val = input.value.trim();

    if (val.length < 2) {
        input.classList.add('animate-shake');
        setTimeout(() => input.classList.remove('animate-shake'), 500);
        return;
    }

    playerName = val;
    document.getElementById('player-name-txt').innerText = playerName;
    
    // Cool Transition: Splash fades out & scales up, Game scales in & fades in
    overlay.classList.add('fade-out');
    
    setTimeout(() => {
        overlay.style.display = 'none';
        gameCont.style.display = 'flex';
        // Minor delay to trigger the scale transition
        setTimeout(() => {
            gameCont.classList.add('visible');
        }, 50);
    }, 800);

    // Initialize Audio
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    barkerTalk(`Greeting ${playerName} to the Imperial Table.`);
    playSound(880, 'square', 0.2);
}

function setupCards() {
    cards = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            cards.push({ id: `${suit}-${rank}`, suit, rank });
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
        btn.className = 'perya-card';
        btn.id = `card-${card.id}`;
        btn.setAttribute('data-label', card.rank + SYMBOLS[card.suit]);
        btn.onclick = (e) => { e.stopPropagation(); handleCardClick(card.id); };
        
        btn.onmouseenter = () => {
            if (!isDrawing) {
                const banner = document.getElementById('active-card-banner');
                const info = `${RANK_NAMES[card.rank]} OF ${SUIT_NAMES[card.suit]}`;
                if (banner) banner.innerText = info;
            }
        };

        btn.innerHTML = `
            <div class="absolute top-1 left-1 font-black ${COLORS[card.suit]} text-[10px] pointer-events-none tracking-tighter z-20">${card.rank}</div>
            <div class="card-symbol-glow ${COLORS[card.suit]} text-3xl pointer-events-none select-none z-20">${SYMBOLS[card.suit]}</div>
            <div class="absolute bottom-1 right-1 font-black rotate-180 ${COLORS[card.suit]} text-[10px] pointer-events-none tracking-tighter z-20">${card.rank}</div>
        `;
        grid.appendChild(btn);
    });

    const ballLayer = document.getElementById('ball-layer');
    if (ballLayer) {
        ballLayer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const shadowCont = document.createElement('div');
            shadowCont.id = `shadow-container-${i}`;
            shadowCont.className = 'shadow-container';
            shadowCont.innerHTML = `<div class="ball-shadow"></div>`;
            const ballCont = document.createElement('div');
            ballCont.id = `ball-container-${i}`;
            ballCont.className = 'ball-container';
            ballCont.innerHTML = `<div class="selection-ball"></div>`;
            ballLayer.appendChild(shadowCont);
            ballLayer.appendChild(ballCont);
        }
    }
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const items = SHOP_DATA[currentShopCategory];
    grid.innerHTML = items.map(item => `
        <div class="glass-pane p-4 rounded-xl text-center cursor-pointer hover:border-amber-500 transition-all hover:scale-105 flex flex-col items-center justify-between min-h-[140px]" onclick="buyItem('${item.name}', ${item.price}, '${item.icon}')" data-label="Buy ${item.name}">
            <div class="text-4xl mb-2">${item.icon}</div>
            <div class="text-white font-black text-[9px] uppercase leading-tight px-1">${item.name}</div>
            <div class="text-amber-500 text-[11px] font-black mt-2 bg-amber-500/10 px-2 py-1 rounded-lg w-full">🪙 ${item.price}</div>
        </div>
    `).join('');
}

function loadLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;
    
    let leaders = JSON.parse(localStorage.getItem('perya_leaderboard')) || [
        { name: "SULTAN_OF_SPADES", win: 1500, hits: 25 },
        { name: "CARNIVAL_KING", win: 1200, hits: 18 },
        { name: "FIESTA_QUEEN", win: 900, hits: 12 },
        { name: "LUCKY_JUAN", win: 600, hits: 8 },
        { name: "KWEK_KWEK_MASTER", win: 400, hits: 5 }
    ];

    // Update current player session data in the global pool if they exist
    const currentPlayerIdx = leaders.findIndex(l => l.name === playerName);
    if (currentPlayerIdx !== -1) {
        leaders[currentPlayerIdx].win = Math.max(leaders[currentPlayerIdx].win, stats.highestWin);
        leaders[currentPlayerIdx].hits = Math.max(leaders[currentPlayerIdx].hits, stats.imperialHits);
    } else if (stats.highestWin > 0 || stats.imperialHits > 0) {
        leaders.push({ name: playerName, win: stats.highestWin, hits: stats.imperialHits });
    }

    // Sort by Highest Win, then by Imperial Hits
    leaders.sort((a, b) => b.win - a.win || b.hits - a.hits);
    leaders = leaders.slice(0, 10); // Keep Top 10
    
    localStorage.setItem('perya_leaderboard', JSON.stringify(leaders));

    body.innerHTML = leaders.map((l, i) => `
        <tr class="leaderboard-row ${l.name === playerName ? 'bg-amber-500/10 text-amber-300' : 'text-white/80'}">
            <td class="py-4 px-4 font-black">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </td>
            <td class="py-4 px-4 font-bold tracking-widest">${l.name}</td>
            <td class="py-4 px-4 text-amber-500 font-black">🪙 ${l.win.toLocaleString()}</td>
            <td class="py-4 px-4 font-black text-rose-400">${l.hits}</td>
        </tr>
    `).join('');
}

function updateStats(payout, matches) {
    if (payout > stats.highestWin) stats.highestWin = payout;
    if (matches >= 3) stats.imperialHits++;
    
    // Periodically update localStorage to ensure the player's best record is kept
    loadLeaderboard();
}

function setupEventListeners() {
    const nicknameInput = document.getElementById('nickname-input');
    const enterBtn = document.getElementById('enter-game-btn');
    const introLeaderboardBtn = document.getElementById('intro-leaderboard-btn');

    if (enterBtn) enterBtn.onclick = handleNicknameEntry;
    if (introLeaderboardBtn) {
        introLeaderboardBtn.onclick = () => {
            document.getElementById('leaderboard-modal').style.display = 'flex';
            loadLeaderboard();
        };
    }
    
    if (nicknameInput) {
        nicknameInput.onkeydown = (e) => { 
            if (e.code === 'Enter') handleNicknameEntry(); 
        };
    }

    document.querySelectorAll('#bet-amount-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isDrawing) return;
            betAmountPerCard = parseInt(btn.dataset.amount || '10');
            document.querySelectorAll('#bet-amount-selector button').forEach(b => {
                b.className = 'w-12 h-12 rounded-xl bg-stone-900 text-amber-500 border border-amber-500/30 font-black text-xs hover:bg-stone-800 transition-colors';
            });
            btn.className = 'w-12 h-12 rounded-xl bg-amber-500 text-stone-900 font-black text-xs active shadow-lg scale-110 transition-transform';
            playSound(440, 'sine', 0.1);
        });
    });

    document.getElementById('refill-btn').onclick = () => { document.getElementById('payment-modal').style.display = 'flex'; };
    document.getElementById('rules-toggle-btn').onclick = () => { document.getElementById('rules-modal').style.display = 'flex'; };
    document.getElementById('shop-toggle-btn').onclick = () => { document.getElementById('shop-modal').style.display = 'flex'; renderShop(); };
    document.getElementById('leaderboard-toggle-btn').onclick = () => { document.getElementById('leaderboard-modal').style.display = 'flex'; loadLeaderboard(); };
    document.getElementById('fullscreen-btn').onclick = toggleFullScreen;

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => btn.closest('.modal').style.display = 'none';
    });

    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.onclick = () => {
            currentShopCategory = btn.dataset.shopCat;
            document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderShop();
            playSound(660, 'sine', 0.05);
        };
    });

    document.querySelectorAll('.vault-pack').forEach(pack => {
        pack.onclick = () => {
            selectedPack = { tokens: parseInt(pack.dataset.tokens || '0') };
            document.querySelectorAll('.vault-pack').forEach(p => p.classList.remove('border-amber-500', 'bg-amber-500/10'));
            pack.classList.add('border-amber-500', 'bg-amber-500/10');
            playSound(660);
            validateRefill();
        };
    });

    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.onclick = () => {
            selectedPaymentMethod = btn.dataset.method;
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            playSound(550);
            validateRefill();
        }
    });

    document.getElementById('complete-purchase').onclick = () => {
        balanceTokens += (selectedPack?.tokens || 0);
        hasToppedUp = true;
        updateUI();
        document.getElementById('payment-modal').style.display = 'none';
        barkerTalk(`Deposit complete! Majesty ${playerName}, Tokens added.`);
        playSound(880, 'square', 0.5);
    };

    const drawBtn = document.getElementById('draw-btn');
    if (drawBtn) drawBtn.addEventListener('mousedown', startCharging);
    window.addEventListener('mouseup', stopCharging);
    
    window.addEventListener('keydown', (e) => { 
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            startCharging(); 
        }
    });
    window.addEventListener('keyup', (e) => { 
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            stopCharging(); 
        }
    });

    window.addEventListener('buy-item', (e) => {
        const { name, price } = e.detail;
        if (balanceTokens >= price) {
            balanceTokens -= price;
            updateUI();
            barkerTalk(`An excellent choice, Majesty! ${name} is yours.`);
            playSound(880, 'square', 0.5);
            alert(`You acquired: ${name}!`);
        } else {
            playSound(110, 'sawtooth', 0.5);
            alert("Insufficient tokens!");
        }
    });
}

function validateRefill() {
    const completeBtn = document.getElementById('complete-purchase');
    if (selectedPack && selectedPaymentMethod) {
        completeBtn.disabled = false;
        completeBtn.classList.remove('opacity-50');
    } else {
        completeBtn.disabled = true;
        completeBtn.classList.add('opacity-50');
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => { console.error(err.message); });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function handleCardClick(id) {
    if (isDrawing) return;
    const idx = currentBets.indexOf(id);
    if (idx !== -1) currentBets.splice(idx, 1);
    else if (currentBets.length < MAX_BETS) currentBets.push(id);
    document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('bet-loss'));
    updateUI();
    playSound(idx !== -1 ? 330 : 660, 'sine', 0.05);
}

function updateUI() {
    const balEl = document.getElementById('balance-txt'); if (balEl) balEl.innerText = balanceTokens.toLocaleString();
    const countEl = document.getElementById('bet-count-txt'); if (countEl) countEl.innerText = `${currentBets.length} / ${MAX_BETS}`;
    const drawBtn = document.getElementById('draw-btn');
    const isLocked = !hasToppedUp;
    if (drawBtn) {
        drawBtn.disabled = isDrawing || currentBets.length === 0 || balanceTokens < (currentBets.length * betAmountPerCard) || isLocked;
        drawBtn.innerText = isLocked ? "DEPOSIT REQUIRED" : (isDrawing ? "DROPPING..." : "HOLD SPACE");
    }
    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        if (el) el.classList.toggle('selected', currentBets.includes(c.id));
    });
}

function startCharging() {
    if (isDrawing || currentBets.length === 0 || isCharging || !hasToppedUp) return;
    if (balanceTokens < (currentBets.length * betAmountPerCard)) return;
    isCharging = true; chargePower = 0; chargeDirection = 1;
    document.getElementById('draw-btn').classList.add('power-pulse');
    if (audioCtx) {
        chargeOscillator = audioCtx.createOscillator();
        chargeGain = audioCtx.createGain();
        chargeOscillator.type = 'sawtooth';
        chargeOscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
        chargeGain.gain.setValueAtTime(0, audioCtx.currentTime);
        chargeGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.1);
        chargeOscillator.connect(chargeGain); chargeGain.connect(audioCtx.destination);
        chargeOscillator.start();
    }
    chargeLoop();
}

function chargeLoop() {
    if (!isCharging) return;
    chargePower += 1.8 * chargeDirection;
    if (chargePower >= 100) { chargePower = 100; chargeDirection = -1; }
    if (chargePower <= 0) { chargePower = 0; chargeDirection = 1; }
    document.getElementById('power-fill').style.width = `${chargePower}%`;
    if (chargeOscillator) chargeOscillator.frequency.setTargetAtTime(120 + (chargePower * 5), audioCtx.currentTime, 0.05);
    chargeAnimId = requestAnimationFrame(chargeLoop);
}

function stopCharging() {
    if (!isCharging) return;
    isCharging = false;
    cancelAnimationFrame(chargeAnimId);
    if (chargeOscillator) {
        chargeGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
        setTimeout(() => { chargeOscillator.stop(); chargeOscillator.disconnect(); }, 100);
    }
    handleLaunch();
    document.getElementById('power-fill').style.width = '0%';
}

function handleLaunch() {
    isDrawing = true; activeBallsFinished = 0; winningIndices = [];
    balanceTokens -= currentBets.length * betAmountPerCard; updateUI();
    const gridEl = document.getElementById('card-grid');
    for (let i = 0; i < 3; i++) {
        const ballCont = document.getElementById(`ball-container-${i}`);
        const shadowCont = document.getElementById(`shadow-container-${i}`);
        if (ballCont && shadowCont) {
            ballCont.style.display = 'block'; 
            shadowCont.style.display = 'block';
            const totalBounces = Math.floor(Math.random() * 13) + 3;
            const finalTargetIdx = Math.floor(Math.random() * cards.length);
            animateBallJourney(i, ballCont, shadowCont, gridEl, totalBounces, finalTargetIdx);
        }
    }
}

function animateBallJourney(ballIdx, ballEl, shadowEl, gridEl, remainingBounces, finalIdx) {
    const targetIdx = remainingBounces > 1 ? Math.floor(Math.random() * cards.length) : finalIdx;
    const targetCard = document.getElementById(`card-${cards[targetIdx].id}`);
    let tx = targetCard.offsetLeft + gridEl.offsetLeft + (targetCard.offsetWidth / 2) - 10;
    let ty = targetCard.offsetTop + gridEl.offsetTop + (targetCard.offsetHeight / 2) - 10;
    if (remainingBounces === 1) { tx += (Math.random() - 0.5) * 12; ty += (Math.random() - 0.5) * 12; }
    const jumpDuration = 200 + Math.random() * 300;
    const jumpHeight = remainingBounces > 1 ? (40 + Math.random() * 80) : 0;
    if (ballEl.style.display === 'block' && !ballEl.getAttribute('data-active')) {
        ballEl.setAttribute('data-active', 'true');
        ballEl.style.transform = `translate(${tx}px, -600px) translateZ(200px)`;
    }
    shadowEl.style.transition = `transform ${jumpDuration}ms cubic-bezier(0.1, 0, 0.5, 1), opacity ${jumpDuration}ms ease-in`;
    shadowEl.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
    shadowEl.style.opacity = '0.5';
    const anim = ballEl.animate([
        { transform: ballEl.style.transform },
        { transform: `translate(${tx}px, ${ty}px) translateZ(${jumpHeight}px)`, offset: 0.5 },
        { transform: `translate(${tx}px, ${ty}px) translateZ(0px)` }
    ], { duration: jumpDuration, easing: 'linear' });
    anim.onfinish = () => {
        playSound(180 + (ballIdx * 80) + (remainingBounces * 15), 'triangle', 0.12);
        ballEl.style.transform = `translate(${tx}px, ${ty}px) translateZ(0px)`;
        if (remainingBounces > 1) {
            setTimeout(() => animateBallJourney(ballIdx, ballEl, shadowEl, gridEl, remainingBounces - 1, finalIdx), 40);
        } else {
            winningIndices.push(finalIdx);
            activeBallsFinished++;
            ballEl.classList.add('bouncing'); shadowEl.classList.add('bouncing');
            ballEl.removeAttribute('data-active');
            if (activeBallsFinished === 3) finalize();
        }
    };
}

function finalize() {
    let totalMatches = 0;
    const hitMap = {};
    winningIndices.forEach(winIdx => {
        const winId = cards[winIdx].id;
        hitMap[winId] = (hitMap[winId] || 0) + 1;
        if (currentBets.includes(winId)) totalMatches++;
    });
    
    // Imperial Payout multipliers
    let multiplier = totalMatches === 1 ? 2 : totalMatches === 2 ? 3 : totalMatches >= 3 ? 6 : 0;
    const payout = multiplier * betAmountPerCard;
    balanceTokens += payout;
    
    // Track stats
    updateStats(payout, totalMatches);
    updateUI();
    
    setTimeout(() => {
        const groupedWinningIds = [...new Set(winningIndices)];
        document.getElementById('results-area').innerHTML = groupedWinningIds.map(idx => {
            const hits = hitMap[cards[idx].id];
            return `<div class="relative group">
                <div class="w-12 h-16 perya-card flex flex-col items-center justify-center border border-amber-500/40 shadow-xl transition-all !animation-none">
                    <span class="${COLORS[cards[idx].suit]} text-[9px] font-black z-20">${cards[idx].rank}</span>
                    <span class="${COLORS[cards[idx].suit]} text-2xl card-symbol-glow z-20">${SYMBOLS[cards[idx].suit]}</span>
                </div>
                ${hits > 1 ? `<div class="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-amber-400 shadow-lg z-50 animate-bounce">x${hits}</div>` : ''}
            </div>`;
        }).join('');
        
        isDrawing = false;
        if (totalMatches > 0) {
            barkerTalk(`Majesty ${playerName}! You claimed ${payout} Tokens!`);
            initConfetti(); playSound(880, 'square', 0.4);
        } else {
            barkerTalk("No luck! The crystals have spoken. Try again?");
            playSound(150, 'sawtooth', 0.5);
            currentBets.forEach(betId => document.getElementById(`card-${betId}`)?.classList.add('bet-loss'));
        }
    }, 1000);
}

async function barkerTalk(ctx) {
    if (!process.env.API_KEY) return;
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `The game dealer is speaking. Max 8 words. Context: ${ctx}`,
            config: { systemInstruction: "Enthusiastic carnival barker addressing a royal player.", temperature: 1.0 }
        });
        if (res.text) document.getElementById('dealer-msg').innerText = `"${res.text.trim()}"`;
    } catch (e) {
        document.getElementById('dealer-msg').innerText = `"Step right up! Your fortune awaits!"`;
    }
}

function playSound(f = 440, t = 'sine', d = 0.1) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(0.04, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
}

function setupCursor() {
    const cursor = document.getElementById('custom-cursor');
    const label = document.getElementById('cursor-label');
    let mx = 0, my = 0, cx = 0, cy = 0;
    const update = () => {
        cx += (mx - cx) * 0.15; cy += (my - cy) * 0.15;
        cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(update);
    };
    window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        const target = e.target;
        cursor.classList.toggle('hovering-table', !!target.closest('#table-surface'));
        cursor.classList.toggle('hovering-btn', !!target.closest('button, .vault-pack, .payment-btn'));
        cursor.classList.toggle('hovering-text', target.tagName === 'INPUT');
        
        const lbl = target.closest('[data-label]')?.getAttribute('data-label') || (target.closest('#table-surface') ? "Royal Table" : "Exploring...");
        label.innerText = lbl;
    });
    window.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    window.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
    requestAnimationFrame(update);
}

function initConfetti() {
    for (let i = 0; i < 25; i++) {
        const c = document.createElement('div');
        c.className = 'fixed pointer-events-none z-[10000] w-2 h-2 rounded-sm';
        c.style.left = Math.random() * 100 + 'vw'; c.style.top = '-20px';
        c.style.backgroundColor = ['#ef4444', '#fbbf24', '#fff', '#34d399'][Math.floor(Math.random() * 4)];
        document.body.appendChild(c);
        c.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(110vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }], { duration: 2000 }).onfinish = () => c.remove();
    }
}

init();
