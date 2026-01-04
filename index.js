
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

function init() {
    setupCards();
    setupEventListeners();
    setupCursor();
    updateUI();
    renderShop();
    renderRegistryChips();
    loadLeaderboard();
    
    setTimeout(() => {
        const input = document.getElementById('nickname-input');
        if (input) input.focus();
    }, 500);
}

function handleNicknameEntry(explicitName = null) {
    const input = document.getElementById('nickname-input');
    const overlay = document.getElementById('nickname-overlay');
    const gameCont = document.getElementById('game-container');
    const val = explicitName || input.value.trim();
    
    if (val.length < 2) return;
    
    playerName = val;
    saveToRegistry(playerName); 
    
    document.getElementById('player-name-txt').innerText = playerName;
    overlay.classList.add('fade-out');
    
    setTimeout(() => {
        overlay.style.display = 'none';
        gameCont.style.display = 'flex';
        setTimeout(() => gameCont.classList.add('visible'), 50);
    }, 800);
    
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    barkerTalk(`Greeting Majesty ${playerName} to the table.`);
    playSound(880, 'square', 0.2);
}

function saveToRegistry(name) {
    let registry = JSON.parse(localStorage.getItem('perya_monarch_registry') || '[]');
    registry = registry.filter(n => n.toLowerCase() !== name.toLowerCase());
    registry.unshift(name);
    if (registry.length > 10) registry = registry.slice(0, 10);
    localStorage.setItem('perya_monarch_registry', JSON.stringify(registry));
}

function renderRegistryChips() {
    const container = document.getElementById('recent-players-chips');
    if (!container) return;
    
    const registry = JSON.parse(localStorage.getItem('perya_monarch_registry') || '[]');
    container.innerHTML = '';
    
    registry.forEach(name => {
        const chip = document.createElement('button');
        chip.className = 'registry-chip';
        chip.innerText = name;
        chip.onclick = () => {
            document.getElementById('nickname-input').value = name;
            handleNicknameEntry(name);
        };
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
            <div class="absolute top-2.5 left-2.5 font-black ${COLORS[card.suit]} text-[11px] pointer-events-none">${card.rank}</div>
            <div class="card-symbol-glow ${COLORS[card.suit]} text-5xl pointer-events-none">${SYMBOLS[card.suit]}</div>
            <div class="absolute bottom-2.5 right-2.5 font-black rotate-180 ${COLORS[card.suit]} text-[11px] pointer-events-none">${card.rank}</div>
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
    document.getElementById('balance-txt').innerText = balanceTokens.toLocaleString();
    document.getElementById('bet-count-txt').innerText = `${currentBets.length} / ${MAX_BETS}`;
    const drawBtn = document.getElementById('draw-btn');
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
    document.getElementById('draw-btn').classList.add('scale-95', 'brightness-110');
    chargeLoop();
}

function chargeLoop() {
    if (!isCharging) return;
    chargePower += 3 * chargeDirection;
    if (chargePower >= 100) { chargePower = 100; chargeDirection = -1; }
    if (chargePower <= 0) { chargePower = 0; chargeDirection = 1; }
    document.getElementById('power-fill').style.width = `${chargePower}%`;
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
    document.getElementById('draw-btn').classList.remove('scale-95', 'brightness-110');
    handleLaunch();
    document.getElementById('power-fill').style.width = '0%';
}

/**
 * Robust target coordinate calculation relative to the ball layer.
 * This ensures balls land perfectly even in Fullscreen or scaled layouts.
 */
function getTargetCoords(targetId) {
    const layer = document.getElementById('ball-layer');
    const card = document.getElementById(`card-${targetId}`);
    if (!layer || !card) return { x: 0, y: 0 };
    
    const layerRect = layer.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    
    // Scale-aware relative coordinates
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
        
        const startIdx = Math.floor(Math.random() * cards.length);
        const { x, y } = getTargetCoords(cards[startIdx].id);
        
        ball.style.transform = `translate(${x}px, ${y}px)`;
        shadow.style.transform = `translate(${x}px, ${y}px)`;
        ball.style.opacity = '1'; shadow.style.opacity = '1';
        
        const finalIdx = Math.floor(Math.random() * cards.length);
        const hops = 3 + Math.floor(Math.random() * 13);
        
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
        if (el) el.classList.add('winning-hit');
        if (currentBets.includes(card.id)) matches++;
        
        const pill = document.createElement('div');
        pill.className = 'winner-pill';
        pill.innerText = `👑 ${card.fullName}`;
        listContainer.appendChild(pill);
    });

    const mult = matches === 1 ? 2 : matches === 2 ? 3 : matches === 3 ? 6 : 0;
    const payout = mult * betAmountPerCard;
    balanceTokens += payout; updateUI();
    
    setTimeout(() => {
        if (matches > 0) { 
            barkerTalk(`Round ${currentRound} Complete! Majesty won ${payout} Tokens.`); 
            initConfetti(); 
            playSound(440, 'square', 0.5);
        } else {
            barkerTalk(`Luck shifts in Round ${currentRound}... try again!`);
        }
        
        // Render "NEXT ROUND" progression button
        const nextRoundBtn = document.createElement('button');
        nextRoundBtn.className = 'w-full py-3 mt-2 bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-all';
        nextRoundBtn.innerText = `PLAY AGAIN / START ROUND ${currentRound + 1}`;
        nextRoundBtn.onclick = () => {
            currentRound++;
            isDrawing = false;
            document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('winning-hit'));
            document.querySelectorAll('#ball-layer div').forEach(el => el.style.opacity = '0');
            listContainer.innerHTML = '';
            updateUI();
        };
        listContainer.appendChild(nextRoundBtn);
        
    }, 1200);
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
    let mx = 0, my = 0, cx = 0, cy = 0;
    const update = () => {
        cx += (mx - cx) * 0.4; cy += (my - cy) * 0.4;
        cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(update);
    };
    window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        const target = e.target;
        const isBtn = !!target.closest('button, .perya-card');
        cursor.classList.toggle('hovering-btn', isBtn);
        label.style.opacity = isBtn ? "1" : "0";
    });
    requestAnimationFrame(update);
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const items = SHOP_DATA[currentShopCategory];
    grid.innerHTML = items.map(item => `
        <div class="glass-pane p-4 rounded-xl text-center cursor-pointer hover:border-amber-500 transition-all flex flex-col items-center justify-between min-h-[140px]" onclick="buyItem('${item.name}', ${item.price})">
            <div class="text-4xl mb-2">${item.icon}</div>
            <div class="text-white font-black text-[9px] uppercase tracking-widest">${item.name}</div>
            <div class="text-amber-500 text-[11px] font-black mt-2">🪙 ${item.price}</div>
        </div>
    `).join('');
}

function loadLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    body.innerHTML = `
        <tr class="border-b border-white/5"><td class="py-4 px-4 font-black">1</td><td class="py-4 px-4 font-bold">EMPEROR_LUXE</td><td class="py-4 px-4 text-amber-500">🪙 12,500</td></tr>
        <tr class="border-b border-white/5"><td class="py-4 px-4 font-black">2</td><td class="py-4 px-4 font-bold">MONARCH_99</td><td class="py-4 px-4 text-amber-500">🪙 8,200</td></tr>
    `;
}

function setupEventListeners() {
    document.getElementById('enter-game-btn').onclick = () => handleNicknameEntry();
    document.getElementById('refill-btn').onclick = () => document.getElementById('payment-modal').style.display = 'flex';
    document.getElementById('leaderboard-toggle-btn').onclick = () => document.getElementById('leaderboard-modal').style.display = 'flex';
    document.getElementById('shop-toggle-btn').onclick = () => { document.getElementById('shop-modal').style.display = 'flex'; renderShop(); };
    document.getElementById('rules-toggle-btn').onclick = () => document.getElementById('rules-modal').style.display = 'flex';
    document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => btn.closest('.modal').style.display = 'none');
    
    document.getElementById('fullscreen-btn').onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const drawBtn = document.getElementById('draw-btn');
    drawBtn.onmousedown = startCharging;
    window.onmouseup = stopCharging;

    // Spacebar Listeners
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
            // Only trigger if not typing in the nickname input
            if (document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                startCharging();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            if (document.activeElement.tagName !== 'INPUT') {
                stopCharging();
            }
        }
    });

    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.onclick = () => {
            currentShopCategory = btn.dataset.shopCat;
            document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderShop();
        };
    });

    document.querySelectorAll('.vault-pack').forEach(pack => pack.onclick = () => {
        selectedPack = { tokens: parseInt(pack.dataset.tokens) };
        document.querySelectorAll('.vault-pack').forEach(p => p.classList.remove('active'));
        pack.classList.add('active');
        checkPaymentValidity();
    });

    document.querySelectorAll('.payment-btn').forEach(btn => btn.onclick = () => {
        selectedPaymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        checkPaymentValidity();
    });

    function checkPaymentValidity() {
        const btn = document.getElementById('complete-purchase');
        if (selectedPack && selectedPaymentMethod) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
        }
    }

    document.getElementById('complete-purchase').onclick = () => {
        balanceTokens += selectedPack.tokens; hasToppedUp = true;
        updateUI(); document.getElementById('payment-modal').style.display = 'none';
        playSound(880, 'square', 0.4);
    };
    
    window.addEventListener('buy-item', (e) => {
        const { name, price } = e.detail;
        if (balanceTokens >= price) {
            balanceTokens -= price; updateUI();
            barkerTalk(`Excellent choice! ${name} is yours.`);
            alert(`You bought: ${name}!`);
        } else {
            alert("Insufficient tokens!");
        }
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
        if (res.text) document.getElementById('dealer-msg').innerText = `"${res.text.trim()}"`;
    } catch (e) {}
}

function initConfetti() {
    for (let i = 0; i < 40; i++) {
        const c = document.createElement('div');
        c.className = 'fixed pointer-events-none z-[20000] w-2 h-2 rounded-sm';
        c.style.left = Math.random() * 100 + 'vw'; c.style.top = '-20px';
        c.style.backgroundColor = ['#fbbf24', '#ef4444', '#ffffff', '#ffd700'][Math.floor(Math.random() * 4)];
        document.body.appendChild(c);
        c.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(110vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }], { duration: 2000 }).onfinish = () => c.remove();
    }
}

init();
