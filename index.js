
import { GoogleGenAI } from "@google/genai";

/**
 * BROWSER POLYFILL: Prevent crashes on standard GitHub Pages sites
 * that don't have Node.js globals injected.
 */
if (typeof window.process === 'undefined') {
    window.process = { env: { API_KEY: '' } };
}

// Initialize AI using the standard process.env.API_KEY requirement
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const RANK_NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
const SUIT_NAMES = { HEARTS: 'Hearts', SPADES: 'Spades', DIAMONDS: 'Diamonds' };
const COLORS = { HEARTS: 'text-red-600', SPADES: 'text-stone-900', DIAMONDS: 'text-red-500' };

const SHOP_DATA = [
    { name: 'Cotton Candy', price: 150, icon: '🍭' },
    { name: 'Balut', price: 300, icon: '🥚' },
    { name: 'Ice Scramble', price: 200, icon: '🍧' },
    { name: 'Golden Ace', price: 5000, icon: '👑' }
];

// State
let balanceTokens = 0;
let hasToppedUp = false;
let currentBets = [];
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;
let isCharging = false;
let chargePower = 0;
let chargeDirection = 1;
let chargeInterval = null;
let winningIndices = [];
let activeBallsFinished = 0;
let selectedPack = null;
let selectedPaymentMethod = null;
let audioCtx = null;

function init() {
    setupCards();
    setupEventListeners();
    setupCursor();
    updateUI();
    renderShop();
    barkerTalk("Greeting a newcomer to the Perya table.");
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
    const tooltip = document.getElementById('card-tooltip');
    if (!grid || !tooltip) return;
    grid.innerHTML = '';
    cards.forEach(card => {
        const btn = document.createElement('button');
        btn.className = 'perya-card aspect-[2.5/3.5] flex flex-col items-center justify-center relative';
        btn.id = `card-${card.id}`;
        btn.onclick = (e) => { e.stopPropagation(); handleCardClick(card.id); };
        
        btn.onmouseenter = () => {
            if (!isDrawing) {
                const banner = document.getElementById('active-card-banner');
                const info = `${RANK_NAMES[card.rank]} OF ${SUIT_NAMES[card.suit]}`;
                if (banner) banner.innerText = info;
                
                tooltip.innerText = info;
                tooltip.style.opacity = '1';
            }
        };

        btn.onmousemove = (e) => {
            if (!isDrawing) {
                tooltip.style.left = `${e.clientX + 15}px`;
                tooltip.style.top = `${e.clientY + 15}px`;
            }
        };

        btn.onmouseleave = () => {
            tooltip.style.opacity = '0';
        };

        btn.innerHTML = `
            <div class="absolute top-4 left-4 font-black ${COLORS[card.suit]} text-xs pointer-events-none">${card.rank}</div>
            <div class="text-6xl ${COLORS[card.suit]} pointer-events-none select-none">${SYMBOLS[card.suit]}</div>
            <div class="absolute bottom-4 right-4 font-black rotate-180 ${COLORS[card.suit]} text-xs pointer-events-none">${card.rank}</div>
        `;
        grid.appendChild(btn);
    });

    const ballLayer = document.getElementById('ball-layer');
    if (ballLayer) {
        ballLayer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const shadow = document.createElement('div'); shadow.id = `ball-shadow-${i}`; shadow.className = 'ball-shadow absolute w-8 h-8';
            const ball = document.createElement('div'); ball.id = `ball-${i}`; ball.className = 'selection-ball absolute w-8 h-8';
            ballLayer.appendChild(shadow); ballLayer.appendChild(ball);
        }
    }
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = SHOP_DATA.map(item => `
        <div class="glass-pane p-4 rounded-xl text-center cursor-pointer hover:border-amber-500" onclick="buyItem('${item.name}', ${item.price}, '${item.icon}')">
            <div class="text-4xl mb-2">${item.icon}</div>
            <div class="text-white font-bold text-[10px] uppercase truncate">${item.name}</div>
            <div class="text-amber-500 text-[11px] font-black mt-1">🪙 ${item.price.toLocaleString()}</div>
        </div>
    `).join('');
}

function setupEventListeners() {
    window.addEventListener('click', () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }, { once: true });

    document.querySelectorAll('#bet-amount-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isDrawing) return;
            betAmountPerCard = parseInt(btn.dataset.amount || '10');
            document.querySelectorAll('#bet-amount-selector button').forEach(b => {
                b.className = 'w-14 h-14 rounded-full bg-stone-800 text-amber-500 border border-amber-500/30 font-bold';
            });
            btn.className = 'w-14 h-14 rounded-full bg-amber-500 text-stone-900 font-bold active shadow-lg';
            playSound(440, 'sine', 0.1);
        });
    });

    document.getElementById('refill-btn').onclick = () => {
        const modal = document.getElementById('payment-modal');
        modal.style.display = 'flex';
        document.getElementById('payment-selection-view').style.display = 'block';
        document.getElementById('payment-scanning-view').style.display = 'none';
    };

    document.getElementById('rules-toggle-btn').onclick = () => {
        document.getElementById('rules-modal').style.display = 'flex';
    };

    document.getElementById('shop-toggle-btn').onclick = () => {
        document.getElementById('shop-modal').style.display = 'flex';
    };

    document.getElementById('fullscreen-btn').onclick = toggleFullScreen;

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => btn.closest('.modal').style.display = 'none';
    });

    document.querySelectorAll('.vault-pack').forEach(pack => {
        pack.onclick = () => {
            selectedPack = { tokens: parseInt(pack.dataset.tokens || '0') };
            document.querySelectorAll('.vault-pack').forEach(p => p.classList.remove('selected'));
            pack.classList.add('selected');
            updateTreasuryButton();
            playSound(660);
        };
    });

    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.onclick = () => {
            selectedPaymentMethod = btn.dataset.method || null;
            document.querySelectorAll('.payment-method-btn').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.1)');
            btn.style.borderColor = '#fbbf24';
            updateTreasuryButton();
            playSound(770);
        };
    });

    document.getElementById('complete-purchase').onclick = async () => {
        if (!selectedPack || !selectedPaymentMethod) return;
        document.getElementById('payment-selection-view').style.display = 'none';
        document.getElementById('payment-scanning-view').style.display = 'flex';
        const scanStatus = document.getElementById('scanning-status');
        scanStatus.innerText = "AUTHENTICATING...";
        await new Promise(r => setTimeout(r, 1500));
        scanStatus.innerText = "TRANSFERRING TOKENS...";
        await new Promise(r => setTimeout(r, 1500));
        finalizePurchase();
    };

    const drawBtn = document.getElementById('draw-btn');
    drawBtn.addEventListener('mousedown', startCharging);
    window.addEventListener('mouseup', stopCharging);
    window.addEventListener('keydown', (e) => { if (e.code === 'Space') startCharging(); });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') stopCharging(); });

    window.addEventListener('buy-item', (e) => {
        const { name, price } = e.detail;
        if (balanceTokens >= price) {
            balanceTokens -= price;
            updateUI();
            barkerTalk(`User bought ${name}. Looking sharp!`);
            playSound(880, 'square', 0.5);
            alert(`You acquired: ${name}!`);
        } else {
            playSound(110, 'sawtooth', 0.5);
            alert("Insufficient tokens for this Imperial Item!");
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const btn = document.getElementById('fullscreen-btn');
        if (document.fullscreenElement) {
            btn.innerText = '❐ Windowed';
        } else {
            btn.innerText = '⛶ Fullscreen';
        }
    });
}

function toggleFullScreen() {
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

function finalizePurchase() {
    balanceTokens += (selectedPack?.tokens || 0);
    hasToppedUp = true;
    updateUI();
    document.getElementById('payment-modal').style.display = 'none';
    barkerTalk("Treasury visit complete! Good luck at the table!");
    playSound(880, 'square', 0.5);
}

function updateTreasuryButton() {
    const btn = document.getElementById('complete-purchase');
    if (selectedPack && selectedPaymentMethod) {
        btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');
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
    document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('bet-loss'));
    chargeInterval = setInterval(() => {
        chargePower += 4 * chargeDirection;
        if (chargePower >= 100 || chargePower <= 0) chargeDirection *= -1;
        document.getElementById('power-fill').style.width = `${chargePower}%`;
        playSound(200 + (chargePower * 5), 'sine', 0.02);
    }, 30);
}

function stopCharging() {
    if (!isCharging) return;
    isCharging = false; clearInterval(chargeInterval);
    handleLaunch();
    document.getElementById('power-fill').style.width = '0%';
}

function handleLaunch() {
    isDrawing = true; activeBallsFinished = 0; winningIndices = [];
    balanceTokens -= currentBets.length * betAmountPerCard; updateUI();
    document.getElementById('results-area').innerHTML = '<span class="text-amber-500 animate-pulse font-black uppercase text-xs">Crystals Falling...</span>';
    const gridEl = document.getElementById('card-grid');

    for (let i = 0; i < 3; i++) {
        const ball = document.getElementById(`ball-${i}`);
        const shadow = document.getElementById(`ball-shadow-${i}`);
        ball.style.display = 'block'; shadow.style.display = 'block';
        const finalWinningIdx = Math.floor(Math.random() * cards.length);
        const targetCard = document.getElementById(`card-${cards[finalWinningIdx].id}`);
        
        const tx = targetCard.offsetLeft + gridEl.offsetLeft + (targetCard.offsetWidth / 2) - 16;
        const ty = targetCard.offsetTop + gridEl.offsetTop + (targetCard.offsetHeight / 2) - 16;
        
        ball.style.transition = 'transform 2s cubic-bezier(0.1, 0.9, 0.2, 1)';
        ball.style.transform = `translate(${tx}px, ${ty}px) translateZ(0px)`;
        shadow.style.transition = 'transform 2s linear, opacity 2s';
        shadow.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
        shadow.style.opacity = '1';

        setTimeout(() => {
            winningIndices.push(finalWinningIdx); activeBallsFinished++;
            playSound(500 + (i * 100), 'square', 0.1);
            if (activeBallsFinished === 3) finalize();
        }, 2100);
    }
}

function finalize() {
    let matches = 0;
    const winningIds = winningIndices.map(idx => cards[idx].id);
    
    winningIndices.forEach(idx => { if (currentBets.includes(cards[idx].id)) matches++; });
    
    currentBets.forEach(betId => {
        if (!winningIds.includes(betId)) {
            const el = document.getElementById(`card-${betId}`);
            if (el) el.classList.add('bet-loss');
        }
    });
    
    // NEW PAYOUT MATRIX: 1 Match (2x), 2 Matches (3x), 3 Matches (5x Triple Crown)
    let multiplier = 0;
    if (matches === 1) multiplier = 2;
    else if (matches === 2) multiplier = 3;
    else if (matches === 3) multiplier = 5;

    const payout = multiplier * betAmountPerCard;
    balanceTokens += payout; updateUI();
    
    document.getElementById('results-area').innerHTML = winningIndices.map(idx => `
        <div class="w-16 h-20 glass-pane rounded-xl flex flex-col items-center justify-center border-2 border-amber-500 shadow-xl">
            <span class="${COLORS[cards[idx].suit]} text-xs font-black">${cards[idx].rank}</span>
            <span class="${COLORS[cards[idx].suit]} text-3xl">${SYMBOLS[cards[idx].suit]}</span>
        </div>
    `).join('');

    isDrawing = false;
    if (matches > 0) {
        barkerTalk(`HUZZAH! A winning match! Claim your ${payout} Tokens.`);
        initConfetti();
        playSound(880, 'square', 0.3);
    } else {
        barkerTalk("Tough luck! The crystals have spoken.");
        playSound(150, 'sawtooth', 0.5);
    }
}

async function barkerTalk(ctx) {
    if (!process.env.API_KEY) return;
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `The game dealer is speaking. Max 10 words. Context: ${ctx}`,
            config: { systemInstruction: "Enthusiastic carnival barker.", temperature: 0.8 }
        });
        if (res.text) document.getElementById('dealer-msg').innerText = `"${res.text.trim()}"`;
    } catch (e) {
        document.getElementById('dealer-msg').innerText = `"Step right up! Your destiny awaits!"`;
    }
}

function playSound(f = 440, t = 'sine', d = 0.1) {
    if (!audioCtx) return;
    try {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
        g.gain.setValueAtTime(0.04, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d);
        o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
    } catch (e) {}
}

function setupCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;
    
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let velocityX = 0;
    let velocityY = 0;

    const LERP_FACTOR = 0.18; 
    const MAX_SKEW = 35; 
    const SKEW_INTENSITY = 0.5; 

    const updateCursor = () => {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;

        cursorX += dx * LERP_FACTOR;
        cursorY += dy * LERP_FACTOR;

        velocityX = dx * LERP_FACTOR;
        velocityY = dy * LERP_FACTOR;

        const angle = Math.atan2(velocityY, velocityX) * (180 / Math.PI);
        const distance = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        const stretch = Math.min(distance * SKEW_INTENSITY, MAX_SKEW);
        const scaleX = 1 + stretch / 100;
        const scaleY = 1 - stretch / 100;

        cursor.style.transform = `
            translate3d(${cursorX}px, ${cursorY}px, 0) 
            translate(-50%, -50%) 
            rotate(${angle}deg) 
            scale(${scaleX}, ${scaleY})
        `;

        requestAnimationFrame(updateCursor);
    };

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        const target = e.target;
        cursor.classList.toggle('hovering-table', !!target.closest('#table-surface'));
        cursor.classList.toggle('hovering-btn', !!target.closest('button, .perya-card, .vault-pack'));
    });

    window.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    window.addEventListener('mouseup', () => cursor.classList.remove('clicking'));

    requestAnimationFrame(updateCursor);
}

function initConfetti() {
    for (let i = 0; i < 30; i++) {
        const c = document.createElement('div');
        c.className = 'fixed pointer-events-none z-[10000] w-2 h-2 rounded-sm';
        c.style.left = Math.random() * 100 + 'vw'; c.style.top = '-20px';
        c.style.backgroundColor = ['#ef4444', '#fbbf24', '#fff', '#22c55e'][Math.floor(Math.random() * 4)];
        document.body.appendChild(c);
        c.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(110vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }], { duration: 3000 }).onfinish = () => c.remove();
    }
}

init();
