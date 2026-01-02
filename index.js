
import { GoogleGenAI } from "@google/genai";

// --- Configuration ---
const INITIAL_BALANCE = 0; 
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const RANK_NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
const SUIT_NAMES = { HEARTS: 'Hearts', SPADES: 'Spades', DIAMONDS: 'Diamonds' };
const COLORS = { HEARTS: 'text-red-600', SPADES: 'text-stone-900', DIAMONDS: 'text-red-500' };

const SHOP_DATA = {
    foods: [
        { name: 'Cotton Candy', price: 150, icon: '🍭', rarity: 'common' },
        { name: 'Balut', price: 300, icon: '🥚', rarity: 'common' },
        { name: 'Grilled Corn', price: 100, icon: '🌽', rarity: 'common' },
        { name: 'Ice Scramble', price: 200, icon: '🍧', rarity: 'rare' },
        { name: 'Fishball Cup', price: 120, icon: '🍢', rarity: 'common' },
        { name: 'Ube Cake', price: 800, icon: '🍰', rarity: 'rare' }
    ],
    toys: [
        { name: 'Stuffed Bear', price: 1500, icon: '🧸', rarity: 'rare' },
        { name: 'Water Gun', price: 500, icon: '🔫', rarity: 'common' },
        { name: 'Bubble Wand', price: 250, icon: '🧼', rarity: 'common' },
        { name: 'Yo-Yo', price: 150, icon: '🪀', rarity: 'common' },
        { name: 'Clown Mask', price: 600, icon: '🤡', rarity: 'rare' },
        { name: 'Robot Pal', price: 3500, icon: '🤖', rarity: 'epic' }
    ],
    keychains: [
        { name: 'Lucky Heart', price: 1000, icon: '🔑', rarity: 'rare' },
        { name: 'Spade Charm', price: 1000, icon: '🗝️', rarity: 'rare' },
        { name: 'Diamond Coin', price: 1200, icon: '💎', rarity: 'rare' },
        { name: 'Golden Ace', price: 5000, icon: '👑', rarity: 'legendary' },
        { name: 'Tassel Charm', price: 400, icon: '🧶', rarity: 'common' }
    ],
    special: [
        { name: 'Imperial Mystery Ticket', price: 10000, icon: '🎫', rarity: 'legendary' },
        { name: 'Royal Scepter', price: 25000, icon: '🔱', rarity: 'legendary' },
        { name: 'Phoenix Crystal', price: 15000, icon: '🔮', rarity: 'epic' },
        { name: 'Golden Fiesta Ticket', price: 50000, icon: '🎟️', rarity: 'legendary' }
    ]
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- State ---
let balanceTokens = INITIAL_BALANCE;
let hasToppedUp = false; 
let currentBets = [];
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;
let audioCtx = null;
let isCharging = false;
let chargePower = 0;
let chargeDirection = 1;
let chargeInterval = null;
let winningIndices = [];
let activeBallsFinished = 0;
let selectedPack = null;
let selectedPaymentMethod = null;
let activeShopTab = 'foods';

// Audio Nodes
let chargingOscPitch = null;
let chargingOscBass = null;
let chargingGain = null;

// --- Init ---
function init() {
    setupCards();
    setupEventListeners();
    setupCursor();
    updateUI();
    initConfetti();
    renderShop();
    barkerTalk("Greeting a guest. Remind them the table requires a treasury deposit to activate.");
}

function setupCards() {
    cards = [];
    SUITS.forEach(suit => RANKS.forEach(rank => cards.push({ id: `${suit}-${rank}`, suit, rank })));
    renderCards();
}

function renderCards() {
    const grid = document.getElementById('card-grid');
    if (!grid) return;
    grid.innerHTML = '';
    cards.forEach(card => {
        const btn = document.createElement('button');
        btn.className = 'perya-card aspect-[2.5/3.5] flex flex-col items-center justify-center relative';
        btn.id = `card-${card.id}`;
        
        btn.onclick = (e) => {
            e.stopPropagation();
            handleCardClick(card.id);
        };
        
        btn.onmouseenter = () => {
            if(!isDrawing) {
                const banner = document.getElementById('active-card-banner');
                if (banner) banner.innerText = `${RANK_NAMES[card.rank]} OF ${SUIT_NAMES[card.suit]}`;
            }
        };

        btn.innerHTML = `
            <div class="absolute top-4 left-4 font-black ${COLORS[card.suit]} text-xs pointer-events-none drop-shadow-sm">${card.rank}</div>
            <div class="text-6xl ${COLORS[card.suit]} pointer-events-none drop-shadow-md select-none">${SYMBOLS[card.suit]}</div>
            <div class="absolute bottom-4 right-4 font-black rotate-180 ${COLORS[card.suit]} text-xs pointer-events-none drop-shadow-sm">${card.rank}</div>
        `;
        grid.appendChild(btn);
    });

    const ballLayer = document.getElementById('ball-layer');
    if (ballLayer) {
        ballLayer.innerHTML = '';
        for(let i=0; i<3; i++) {
            const shadow = document.createElement('div'); shadow.id = `ball-shadow-${i}`; shadow.className = 'ball-shadow';
            const ball = document.createElement('div'); ball.id = `ball-${i}`; ball.className = 'selection-ball';
            ballLayer.appendChild(shadow);
            ballLayer.appendChild(ball);
        }
    }
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const items = SHOP_DATA[activeShopTab];
    grid.innerHTML = items.map(item => `
        <div class="item-card p-4 rounded-xl text-center cursor-pointer ${item.rarity}" onclick="buyItem('${item.name}', ${item.price}, '${item.icon}', '${item.rarity}')">
            <div class="text-4xl mb-2 drop-shadow-lg">${item.icon}</div>
            <div class="text-white font-bold text-[10px] uppercase tracking-wider truncate">${item.name}</div>
            <div class="text-amber-500 text-[11px] font-black mt-1">🪙 ${item.price.toLocaleString()}</div>
            <div class="text-[8px] uppercase font-black opacity-40 mt-1 ${getRarityColor(item.rarity)}">${item.rarity}</div>
        </div>
    `).join('');

    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${activeShopTab}`);
    });
}

function getRarityColor(rarity) {
    switch(rarity) {
        case 'common': return 'text-slate-400';
        case 'rare': return 'text-blue-400';
        case 'epic': return 'text-purple-400';
        case 'legendary': return 'text-amber-400';
        default: return 'text-slate-400';
    }
}

function setupEventListeners() {
    const fullToggle = document.getElementById('fullscreen-toggle');
    if (fullToggle) {
        fullToggle.onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        };
    }

    document.querySelectorAll('#bet-amount-selector button').forEach(btn => {
        btn.onclick = () => {
            if(isDrawing) return;
            betAmountPerCard = parseInt(btn.dataset.amount);
            document.querySelectorAll('#bet-amount-selector button').forEach(b => b.className = 'w-14 h-14 rounded-full bg-stone-800 text-amber-500 border border-amber-500/30 font-bold');
            btn.className = 'w-14 h-14 rounded-full bg-amber-500 text-stone-900 font-bold active shadow-lg';
            playSound(520);
        };
    });

    const refillBtn = document.getElementById('refill-btn');
    if (refillBtn) {
        refillBtn.onclick = () => {
            document.getElementById('payment-modal').style.display = 'flex';
            document.getElementById('payment-selection-view').style.display = 'block';
            document.getElementById('payment-scanning-view').style.display = 'none';
        };
    }
    
    document.getElementById('rules-toggle-btn').onclick = () => document.getElementById('rules-modal').style.display = 'flex';
    document.getElementById('shop-toggle-btn').onclick = () => {
        document.getElementById('shop-modal').style.display = 'flex';
        renderShop();
    };
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => btn.closest('.modal').style.display = 'none';
    });

    document.getElementById('close-reveal').onclick = () => {
        document.getElementById('reveal-item-display').classList.remove('active');
        setTimeout(() => document.getElementById('purchase-reveal-modal').style.display = 'none', 500);
        playSound(440, 'sine', 0.1);
    };

    document.getElementById('close-confirmation').onclick = () => {
        document.getElementById('purchase-confirmation-modal').style.display = 'none';
        playSound(440, 'sine', 0.1);
    };

    document.querySelectorAll('.vault-pack').forEach(pack => {
        pack.onclick = () => {
            selectedPack = { tokens: parseInt(pack.dataset.tokens) };
            document.querySelectorAll('.vault-pack').forEach(p => p.classList.remove('border-amber-500', 'bg-amber-500/20'));
            pack.classList.add('border-amber-500', 'bg-amber-500/20');
            updateTreasuryButton();
            playSound(660);
        };
    });

    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.onclick = () => {
            selectedPaymentMethod = btn.dataset.method;
            document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateTreasuryButton();
            playSound(720, 'sine', 0.05);
        };
    });

    function updateTreasuryButton() {
        const confirmBtn = document.getElementById('complete-purchase');
        if (selectedPack && selectedPaymentMethod) {
            confirmBtn.disabled = false; confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            confirmBtn.innerText = `Proceed with ${selectedPaymentMethod.toUpperCase()}`;
        } else {
            confirmBtn.disabled = true; confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    document.getElementById('complete-purchase').onclick = async () => {
        if(!selectedPack || !selectedPaymentMethod) return;
        if (selectedPaymentMethod === 'cash') { processPayment(); return; }
        
        document.getElementById('payment-selection-view').style.display = 'none';
        document.getElementById('payment-scanning-view').style.display = 'flex';
        const scanStatus = document.getElementById('scanning-status');
        
        scanStatus.innerText = "ESTABLISHING SECURE HANDSHAKE..."; playSound(400, 'sine', 0.1);
        await new Promise(r => setTimeout(r, 1200));
        scanStatus.innerText = "WAITING FOR DEVICE RESPONSE..."; playSound(440, 'sine', 0.1);
        await new Promise(r => setTimeout(r, 2000));
        scanStatus.innerText = "SCAN SUCCESSFUL. VERIFYING..."; playSound(880, 'sine', 0.05);
        await new Promise(r => setTimeout(r, 1000));
        processPayment();
    };

    async function processPayment() {
        const acquired = selectedPack.tokens;
        balanceTokens += acquired; hasToppedUp = true; updateUI();
        
        // Populate and show confirmation modal
        document.getElementById('confirm-acquired-tokens').innerText = `🪙 ${acquired.toLocaleString()}`;
        document.getElementById('confirm-new-balance').innerText = `🪙 ${balanceTokens.toLocaleString()}`;
        
        document.getElementById('payment-modal').style.display = 'none';
        document.getElementById('purchase-confirmation-modal').style.display = 'flex';
        
        selectedPack = null; selectedPaymentMethod = null;
        document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
        
        barkerTalk("Treasury visit successful! The table is now live!");
        playSound(880, 'square'); initConfetti();
    }

    document.getElementById('cancel-scan').onclick = () => {
        document.getElementById('payment-selection-view').style.display = 'block';
        document.getElementById('payment-scanning-view').style.display = 'none';
    };

    window.addEventListener('buy-item', (e) => {
        const { name, price, icon, rarity } = e.detail;
        if (balanceTokens >= price) {
            balanceTokens -= price; updateUI();
            triggerPurchaseReveal(name, icon, rarity);
        } else {
            playSound(150, 'sawtooth', 0.4);
            alert("Insufficient tokens!");
        }
    });

    window.addEventListener('switch-tab', (e) => {
        activeShopTab = e.detail.category; renderShop(); playSound(440, 'sine', 0.05);
    });

    const drawBtn = document.getElementById('draw-btn');
    drawBtn.addEventListener('mousedown', () => startCharging());
    window.addEventListener('mouseup', () => stopCharging());
    window.addEventListener('keydown', (e) => { if(e.code === 'Space') startCharging(); });
    window.addEventListener('keyup', (e) => { if(e.code === 'Space') stopCharging(); });
}

async function triggerPurchaseReveal(name, icon, rarity) {
    const revealModal = document.getElementById('purchase-reveal-modal');
    const rarityTxt = document.getElementById('reveal-rarity-txt');
    const nameTxt = document.getElementById('reveal-name');
    const iconDisplay = document.getElementById('reveal-icon');
    const itemDisplay = document.getElementById('reveal-item-display');
    const spotlight = document.getElementById('reveal-spotlight');

    revealModal.style.display = 'flex'; itemDisplay.classList.remove('active');
    rarityTxt.innerText = `${rarity.toUpperCase()} ITEM`; nameTxt.innerText = name; iconDisplay.innerText = icon;

    let revealColor = '#94a3b8';
    switch(rarity) {
        case 'rare': revealColor = '#3b82f6'; break;
        case 'epic': revealColor = '#a855f7'; break;
        case 'legendary': revealColor = '#fbbf24'; break;
    }
    rarityTxt.style.color = revealColor;
    spotlight.style.background = `radial-gradient(circle at center, ${revealColor}33 0%, transparent 70%)`;

    playSound(200, 'square', 0.5); await new Promise(r => setTimeout(r, 400));
    playSound(400, 'sine', 0.1); await new Promise(r => setTimeout(r, 100));
    playSound(800, 'sine', 0.2);
    itemDisplay.classList.add('active');
    
    if (rarity === 'legendary') {
        playSound(1200, 'square', 0.6); initConfetti();
        barkerTalk(`THRILLING! You acquired the Legendary ${name}!`);
    } else {
        playSound(900, 'sine', 0.4);
        barkerTalk(`Exquisite choice! The ${name} is now yours.`);
    }
}

function handleCardClick(id) {
    if (isDrawing) return;
    const idx = currentBets.indexOf(id);
    if (idx !== -1) currentBets.splice(idx, 1);
    else if (currentBets.length < MAX_BETS) currentBets.push(id);
    playSound(idx !== -1 ? 440 : 660);
    updateUI();
}

function updateUI() {
    const balEl = document.getElementById('balance-txt'); if (balEl) balEl.innerText = balanceTokens.toLocaleString();
    const countEl = document.getElementById('bet-count-txt'); if (countEl) countEl.innerText = `${currentBets.length} / ${MAX_BETS}`;
    const drawBtn = document.getElementById('draw-btn'); const isLocked = !hasToppedUp;
    if (drawBtn) {
        drawBtn.disabled = isDrawing || currentBets.length === 0 || balanceTokens < (currentBets.length * betAmountPerCard) || isLocked;
        drawBtn.innerText = isLocked ? "VISIT TREASURY FIRST" : "HOLD SPACE";
    }
    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        if(el) el.classList.toggle('selected', currentBets.includes(c.id));
    });
}

function startCharging() {
    if (isDrawing || currentBets.length === 0 || isCharging || !hasToppedUp) return;
    if (balanceTokens < (currentBets.length * betAmountPerCard)) return;
    isCharging = true; chargePower = 0; chargeDirection = 1;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    chargingGain = audioCtx.createGain(); chargingGain.gain.setValueAtTime(0, audioCtx.currentTime);
    chargingGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.1);
    chargingGain.connect(audioCtx.destination);
    
    chargeInterval = setInterval(() => {
        chargePower += 4.2 * chargeDirection; if (chargePower >= 100 || chargePower <= 0) chargeDirection *= -1;
        document.getElementById('power-fill').style.width = `${chargePower}%`;
        if (Math.random() > 0.45) emitEnergyParticle();
    }, 30);
}

function stopCharging() {
    if (!isCharging) return;
    isCharging = false; clearInterval(chargeInterval);
    if (chargingGain) chargingGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    playSound(60, 'square', 0.3); handleLaunch(chargePower);
    document.getElementById('power-fill').style.width = '0%';
}

function handleLaunch(power) {
    isDrawing = true; activeBallsFinished = 0; winningIndices = [];
    balanceTokens -= currentBets.length * betAmountPerCard; updateUI();
    document.getElementById('results-area').innerHTML = '<span class="text-amber-500 animate-pulse font-black uppercase tracking-widest text-sm">Crystals Falling...</span>';
    const gridEl = document.getElementById('card-grid');

    for(let i=0; i<3; i++) {
        const ball = document.getElementById(`ball-${i}`);
        const shadow = document.getElementById(`ball-shadow-${i}`);
        ball.style.display = 'block'; shadow.style.display = 'block';
        const finalWinningIdx = Math.floor(Math.random() * cards.length);
        const targetCard = document.getElementById(`card-${cards[finalWinningIdx].id}`);
        const tx = targetCard.offsetLeft + gridEl.offsetLeft + (targetCard.offsetWidth/2) - 16;
        const ty = targetCard.offsetTop + gridEl.offsetTop + (targetCard.offsetHeight/2) - 16;
        
        ball.style.transition = 'transform 2s cubic-bezier(0.1, 0.9, 0.2, 1)';
        ball.style.transform = `translate(${tx}px, ${ty}px) translateZ(0px)`;
        shadow.style.transition = 'transform 2s linear, opacity 2s';
        shadow.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
        shadow.style.opacity = 1;

        setTimeout(() => {
            winningIndices.push(finalWinningIdx); activeBallsFinished++;
            if(activeBallsFinished === 3) finalize();
        }, 2100);
    }
}

function finalize() {
    let matches = 0; let winningCardNames = [];
    winningIndices.forEach(idx => { 
        if(currentBets.includes(cards[idx].id)) matches++; 
        winningCardNames.push(`${RANK_NAMES[cards[idx].rank]} of ${SUIT_NAMES[cards[idx].suit]}`);
    });
    const payout = matches > 0 ? (matches + 1) * betAmountPerCard : 0;
    balanceTokens += payout; updateUI();
    
    document.getElementById('results-area').innerHTML = winningIndices.map(idx => `
        <div class="w-16 h-20 glass-pane rounded-xl flex flex-col items-center justify-center border-2 border-amber-500 shadow-lg">
            <span class="${COLORS[cards[idx].suit]} text-xs font-black">${cards[idx].rank}</span>
            <span class="${COLORS[cards[idx].suit]} text-3xl">${SYMBOLS[cards[idx].suit]}</span>
        </div>
    `).join('');

    isDrawing = false;
    if(matches > 0) {
        const cardString = winningCardNames.slice(0, 3).join(", ");
        barkerTalk(`THRILLING! ${cardString}! You win ${payout} Tokens!`);
        playSound(900, 'square', 0.4); initConfetti();
    } else {
        barkerTalk("No luck! The Imperial table beckons once more!");
        playSound(180, 'sawtooth', 0.5);
    }
}

async function barkerTalk(ctx) {
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dealer voice. Short response. Context: ${ctx}`,
            config: { systemInstruction: "Enthusiastic carnival dealer. Max 15 words.", temperature: 0.8 }
        });
        if(res.text) document.getElementById('dealer-msg').innerText = `"${res.text.trim()}"`;
    } catch(e) { document.getElementById('dealer-msg').innerText = `"Step right up! Your destiny is but a deposit away!"`; }
}

function playSound(f=440, t='sine', d=0.1) {
    try {
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
        g.gain.setValueAtTime(0.04, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d);
        o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
    } catch(e) {}
}

function setupCursor() {
    const cursor = document.getElementById('custom-cursor');
    window.onmousemove = (e) => {
        cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
        cursor.classList.toggle('hovering-table', !!e.target.closest('#table-surface'));
        cursor.classList.toggle('hovering-btn', !!e.target.closest('button, .perya-card, .item-card'));
    };
}

function initConfetti() {
    for(let i=0; i<30; i++) {
        const c = document.createElement('div');
        c.className = 'fixed pointer-events-none z-[10000] w-2 h-2 rounded-sm';
        c.style.left = Math.random() * 100 + 'vw'; c.style.top = '-20px';
        c.style.backgroundColor = ['#ef4444', '#fbbf24', '#fff', '#22c55e'][Math.floor(Math.random() * 4)];
        document.body.appendChild(c);
        c.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(110vh) rotate(${Math.random()*720}deg)`, opacity: 0 }], { duration: 3000 }).onfinish = () => c.remove();
    }
}

function emitEnergyParticle() {
    const p = document.createElement('div'); p.className = 'energy-particle';
    p.style.left = (Math.random() * window.innerWidth) + 'px';
    p.style.top = (Math.random() * window.innerHeight) + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
}

init();
