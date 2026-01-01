import { GoogleGenAI } from "@google/genai";

// --- Game Configuration ---
const INITIAL_BALANCE = 0; 
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const RANK_NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
const SUIT_NAMES = { HEARTS: 'Hearts', SPADES: 'Spades', DIAMONDS: 'Diamonds' };
const COLORS = { HEARTS: 'text-red-600', SPADES: 'text-stone-900', DIAMONDS: 'text-red-500' };

// --- Shop Data ---
const SHOP_ITEMS = {
    FOODS: [
        { name: "Balut", price: 50, icon: "🥚" },
        { name: "Fishballs", price: 60, icon: "🍢" },
        { name: "Kwek-kwek", price: 70, icon: "🍘" },
        { name: "Halo-Halo", price: 120, icon: "🍧" },
        { name: "Lechon Manok", price: 350, icon: "🍗" },
        { name: "Pancit Palabok", price: 180, icon: "🍝" },
        { name: "Ube Halaya", price: 150, icon: "🍮" },
        { name: "Lumpia", price: 90, icon: "🌯" },
        { name: "Adobo Bowl", price: 200, icon: "🍲" },
        { name: "Bibingka", price: 110, icon: "🥧" },
        { name: "Puto Bumbong", price: 130, icon: "🍡" },
        { name: "Turon", price: 80, icon: "🍌" },
        { name: "Isaw", price: 65, icon: "🍢" },
        { name: "Sisig Platter", price: 280, icon: "🍳" },
        { name: "Royal Lechon", price: 1200, icon: "🐖" }
    ],
    THINGS: [
        { name: "Lucky Charm", price: 100, icon: "🧿" },
        { name: "Fiesta Fan", price: 150, icon: "🪭" },
        { name: "Woven Hat", price: 220, icon: "👒" },
        { name: "Wooden Jeepney", price: 450, icon: "🚐" },
        { name: "Hand Bracelet", price: 80, icon: "📿" },
        { name: "Imperial Fan", price: 300, icon: "🎋" },
        { name: "Silk Scarf", price: 550, icon: "🧣" },
        { name: "Gilded Cards", price: 800, icon: "🃏" },
        { name: "Perya Badge", price: 1500, icon: "🎖️" },
        { name: "Golden Rooster", price: 2000, icon: "🐓" },
        { name: "Coin Bank", price: 120, icon: "🥥" },
        { name: "Shell Lamp", price: 650, icon: "🏮" },
        { name: "Rattan Basket", price: 320, icon: "🧺" },
        { name: "Paper Kite", price: 180, icon: "🪁" },
        { name: "Abaca Bag", price: 480, icon: "👜" }
    ]
};

// Ornate Filigree SVG
const FILIGREE_SVG = `
<svg viewBox="0 0 100 100" fill="currentColor">
  <path d="M10,10 Q25,0 40,10 Q50,20 40,30 Q25,40 10,30 Q0,20 10,10 Z" fill="none" stroke="currentColor" stroke-width="2" />
  <path d="M15,15 Q25,10 35,15 Q40,20 35,25 Q25,30 15,25 Q10,20 15,15 Z" fill="currentColor" opacity="0.4" />
  <circle cx="10" cy="10" r="3" fill="currentColor" />
</svg>`;

// --- AI Barker Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function barkerTalk(context) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are an enthusiastic international carnival dealer for a Royal Card Game. 
            Speak strictly in English with a festive, energetic, and loud personality. 
            Keep it very short (under 12 words). 
            Context: ${context}`,
            config: {
                systemInstruction: "You are a professional carnival barker. Use strictly English. Be festive and loud.",
                temperature: 0.8
            }
        });
        if (response.text) {
            dealerMsg.innerText = `"${response.text.trim()}"`;
        }
    } catch (e) {
        console.error("Barker Error:", e);
        dealerMsg.innerText = `"Step right up! Place your bets on the Imperial Cards!"`;
    }
}

// --- Global State ---
let balanceTokens = INITIAL_BALANCE;
let currentBets = []; 
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;
let selectedPack = null;
let audioCtx = null;
let currentShopTab = 'FOODS';

const ballIds = [0, 1, 2];
let activeBallsFinished = 0;
let winningIndices = [];
let isCharging = false;
let chargePower = 0;
let chargeDirection = 1;
let chargeInterval = null;

// Persistent Audio Nodes for Charging
let chargingOsc = null;
let chargingGain = null;

// --- DOM Elements ---
const cursorEl = document.getElementById('custom-cursor');
const cardGrid = document.getElementById('card-grid');
const balanceTxt = document.getElementById('balance-txt');
const betCountTxt = document.getElementById('bet-count-txt');
const dealerMsg = document.getElementById('dealer-msg');
const resultsArea = document.getElementById('results-area');
const drawBtn = document.getElementById('draw-btn');
const refillBtn = document.getElementById('refill-btn');
const betButtons = document.querySelectorAll('#bet-amount-selector button');
const powerFill = document.getElementById('power-fill');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const activeCardBanner = document.getElementById('active-card-banner');

const rulesModal = document.getElementById('rules-modal');
const rulesToggleBtn = document.getElementById('rules-toggle-btn');
const closeRulesBtn = document.getElementById('close-rules');
const closeRulesBottomBtn = document.getElementById('close-rules-bottom');

const shopModal = document.getElementById('shop-modal');
const shopToggleBtn = document.getElementById('shop-toggle-btn');
const closeShopBtn = document.getElementById('close-shop');
const tabFoodsBtn = document.getElementById('tab-foods');
const tabThingsBtn = document.getElementById('tab-things');
const shopGrid = document.getElementById('shop-grid');

const paymentModal = document.getElementById('payment-modal');
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const qrSection = document.getElementById('qr-section');
const transProcessing = document.getElementById('trans-processing');
const vaultPacks = document.querySelectorAll('.vault-pack');
const nextToPayBtn = document.getElementById('next-to-pay');
const backToPacksBtn = document.getElementById('back-to-packs');
const payMethodBtns = document.querySelectorAll('.pay-method-btn');
const simulateScanBtn = document.getElementById('simulate-scan-btn');
const closeVaultBtn = document.getElementById('close-vault');

// --- Initialization ---
function init() {
    setupCursor();
    initConfetti();
    cards = [];
    SUITS.forEach(suit => RANKS.forEach(rank => cards.push({ id: `${suit}-${rank}`, suit, rank })));
    renderCards();
    setupBetSelectors();
    setupLaunchMechanic();
    setupModals();
    setupFullscreen();
    updateUI();
    
    if (INITIAL_BALANCE === 0) {
        barkerTalk("Greeting a player with an empty wallet. Suggest visiting the Royal Treasury.");
    } else {
        barkerTalk("Welcoming the player back to the grand Imperial Table.");
    }
}

function playSound(freq = 440, type = 'sine', duration = 0.1) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function initConfetti() {
    const holder = document.getElementById('confetti-holder');
    const colors = ['#ef4444', '#fbbf24', '#3b82f6', '#22c55e', '#ffffff'];
    setInterval(() => {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
        c.style.setProperty('--duration', (3 + Math.random() * 4) + 's');
        holder.appendChild(c);
        setTimeout(() => c.remove(), 7000);
    }, 800);
}

function setupCursor() {
    window.addEventListener('mousemove', (e) => {
        cursorEl.style.left = `${e.clientX}px`;
        cursorEl.style.top = `${e.clientY}px`;
        const target = e.target;
        const isInteractive = target.closest('button, .perya-card, .vault-pack, .pay-method-btn, .item-card');
        cursorEl.classList.toggle('hovering', !!isInteractive);
    });
}

function setupFullscreen() {
    fullscreenToggle.onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else {
            document.exitFullscreen();
        }
    };
}

function createCelestialBurst(x, y) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.className = 'celestial-sparkle';
        document.body.appendChild(p);
        
        const angle = (Math.PI * 2 / particleCount) * i;
        const velocity = 2 + Math.random() * 4;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        let px = x;
        let py = y;
        let opacity = 1;
        let scale = 1;
        
        const animate = () => {
            px += vx;
            py += vy + 0.1; // gravity
            opacity -= 0.02;
            scale -= 0.015;
            
            p.style.transform = `translate(${px}px, ${py}px) scale(${Math.max(0, scale)}) rotate(${opacity * 360}deg)`;
            p.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                p.remove();
            }
        };
        animate();
    }
}

function renderCards() {
    cardGrid.innerHTML = '';
    cards.forEach(card => {
        const btn = document.createElement('button');
        btn.id = `card-${card.id}`;
        btn.className = 'perya-card aspect-[2.5/3.5] flex flex-col items-center justify-center';
        
        // Use direct click listener to avoid grid interaction issues
        btn.addEventListener('click', (e) => handleCardClick(card.id, e));
        
        btn.onmouseenter = () => { if(!isDrawing) activeCardBanner.innerText = `${RANK_NAMES[card.rank]} OF ${SUIT_NAMES[card.suit]}`; };
        btn.onmouseleave = () => { if (!isDrawing) activeCardBanner.innerText = "CHOOSE YOUR FATE"; };
        
        btn.innerHTML = `
            <div class="filigree filigree-tl">${FILIGREE_SVG}</div>
            <div class="filigree filigree-tr">${FILIGREE_SVG}</div>
            <div class="filigree filigree-bl">${FILIGREE_SVG}</div>
            <div class="filigree filigree-br">${FILIGREE_SVG}</div>
            <div class="absolute top-4 left-4 font-black ${COLORS[card.suit]} drop-shadow-sm text-lg pointer-events-none">${card.rank}</div>
            <div class="text-7xl ${COLORS[card.suit]} drop-shadow-md select-none pointer-events-none">${SYMBOLS[card.suit]}</div>
            <div class="absolute bottom-4 right-4 font-black rotate-180 ${COLORS[card.suit]} drop-shadow-sm text-lg pointer-events-none">${card.rank}</div>
            <div class="bet-badge uppercase pointer-events-none">PLACED</div>
        `;
        cardGrid.appendChild(btn);
    });

    const ballLayer = document.getElementById('ball-layer');
    ballLayer.innerHTML = '';
    ballIds.forEach(id => {
        const shadow = document.createElement('div');
        shadow.id = `ball-shadow-${id}`; shadow.className = 'ball-shadow';
        ballLayer.appendChild(shadow);
        const b = document.createElement('div');
        b.id = `ball-${id}`; b.className = 'selection-ball';
        ballLayer.appendChild(b);
    });
}

function handleCardClick(id, event) {
    if (isDrawing) return;
    const idx = currentBets.indexOf(id);
    const isAdding = idx === -1;
    
    if (!isAdding) {
        currentBets.splice(idx, 1);
    } else if (currentBets.length < MAX_BETS) {
        currentBets.push(id);
        createCelestialBurst(event.clientX, event.clientY);
    }
    
    playSound(isAdding ? 660 : 440);
    updateUI();
}

function setupBetSelectors() {
    betButtons.forEach(btn => btn.onclick = () => {
        if (isDrawing) return;
        betAmountPerCard = parseInt(btn.dataset.amount);
        betButtons.forEach(b => {
            b.classList.remove('bg-amber-500', 'text-stone-900');
            b.classList.add('bg-stone-800', 'text-amber-500', 'border-2', 'border-amber-500');
        });
        btn.classList.add('bg-amber-500', 'text-stone-900');
        btn.classList.remove('bg-stone-800', 'text-amber-500', 'border-2', 'border-amber-500');
        playSound(520);
    });
}

function setupModals() {
    rulesToggleBtn.onclick = () => { rulesModal.style.display = 'flex'; playSound(880); };
    const closeRules = () => { rulesModal.style.display = 'none'; playSound(440); };
    closeRulesBtn.onclick = closeRules;
    closeRulesBottomBtn.onclick = closeRules;

    shopToggleBtn.onclick = () => { shopModal.style.display = 'flex'; renderShopItems(); playSound(880); };
    closeShopBtn.onclick = () => { shopModal.style.display = 'none'; playSound(440); };
    
    tabFoodsBtn.onclick = () => { currentShopTab = 'FOODS'; tabFoodsBtn.classList.add('active'); tabThingsBtn.classList.remove('active'); renderShopItems(); playSound(660); };
    tabThingsBtn.onclick = () => { currentShopTab = 'THINGS'; tabThingsBtn.classList.add('active'); tabFoodsBtn.classList.remove('active'); renderShopItems(); playSound(660); };

    refillBtn.onclick = () => { paymentModal.style.display = 'flex'; resetRefillFlow(); playSound(880); };
    vaultPacks.forEach(pack => pack.onclick = () => {
        vaultPacks.forEach(p => p.classList.remove('active', 'border-amber-500', 'bg-amber-500/20'));
        pack.classList.add('active', 'border-amber-500', 'bg-amber-500/20');
        selectedPack = { tokens: parseInt(pack.dataset.tokens), price: pack.dataset.price };
        nextToPayBtn.disabled = false;
        nextToPayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        nextToPayBtn.innerText = `REDEEM FOR NT$ ${selectedPack.price}`;
        playSound(660);
    });

    nextToPayBtn.onclick = () => { step1.classList.add('hidden'); step2.classList.remove('hidden'); playSound(880); };
    backToPacksBtn.onclick = () => { step2.classList.add('hidden'); step1.classList.remove('hidden'); playSound(440); };

    payMethodBtns.forEach(btn => btn.onclick = () => {
        const method = btn.dataset.method;
        if (!selectedPack) return;
        step2.classList.add('hidden');
        qrSection.classList.remove('hidden');
        document.getElementById('qr-method-title').innerText = `COMPLETE VIA ${method.toUpperCase()}`;
        playSound(880);
    });

    simulateScanBtn.onclick = async () => {
        if (!selectedPack) return;
        transProcessing.classList.remove('hidden');
        await new Promise(resolve => setTimeout(resolve, 1500));
        completeRefill(selectedPack.tokens);
    };

    closeVaultBtn.onclick = () => { paymentModal.style.display = 'none'; playSound(440); };
}

function renderShopItems() {
    shopGrid.innerHTML = '';
    const items = SHOP_ITEMS[currentShopTab];
    items.forEach(item => {
        const canAfford = balanceTokens >= item.price;
        const card = document.createElement('div');
        card.className = `item-card p-6 rounded-3xl flex flex-col items-center gap-3 ${!canAfford ? 'opacity-50' : ''}`;
        card.innerHTML = `
            <div class="text-5xl mb-2">${item.icon}</div>
            <div class="font-black text-amber-950 text-center uppercase text-sm">${item.name}</div>
            <div class="text-amber-800 font-bold">🪙${item.price}</div>
            <button class="buy-btn mt-4 w-full py-2 bg-amber-800 text-white rounded-xl font-bold uppercase text-xs hover:bg-amber-900 transition-all ${!canAfford ? 'cursor-not-allowed grayscale' : ''}" ${!canAfford ? 'disabled' : ''}>Exchange</button>
        `;
        card.querySelector('.buy-btn').onclick = () => handlePurchase(item);
        shopGrid.appendChild(card);
    });
}

function handlePurchase(item) {
    if (balanceTokens >= item.price) {
        balanceTokens -= item.price;
        updateUI();
        renderShopItems();
        playSound(1100, 'square', 0.2);
        barkerTalk(`User exchanged tokens for ${item.name}! Perfect choice.`);
        
        const msg = document.createElement('div');
        msg.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-stone-900 font-black px-12 py-6 rounded-3xl shadow-2xl z-[2000] text-3xl animate-bounce uppercase tracking-widest';
        msg.innerText = `Obtained ${item.name}!`;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
    }
}

function resetRefillFlow() {
    step1.classList.remove('hidden'); step2.classList.add('hidden'); qrSection.classList.add('hidden');
    vaultPacks.forEach(p => p.classList.remove('active', 'border-amber-500', 'bg-amber-500/20'));
    nextToPayBtn.disabled = true; nextToPayBtn.classList.add('opacity-50', 'cursor-not-allowed');
    nextToPayBtn.innerText = 'CHOOSE PACK';
    selectedPack = null;
    transProcessing.classList.add('hidden');
}

function completeRefill(amount) {
    balanceTokens += amount;
    paymentModal.style.display = 'none';
    barkerTalk(`Tokens successfully added! Good luck at the table!`);
    playSound(1200, 'square', 0.3);
    updateUI();
}

function updateUI() {
    balanceTxt.innerText = balanceTokens.toLocaleString();
    betCountTxt.innerText = `${currentBets.length} / ${MAX_BETS}`;
    const cost = currentBets.length * betAmountPerCard;
    drawBtn.disabled = currentBets.length === 0 || isDrawing || balanceTokens < cost;
    
    if (balanceTokens === 0 && !isDrawing) {
        dealerMsg.innerText = `"Your wallet is empty, friend! Head to the Treasury for some lucky coins!"`;
    }

    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        if (el) el.classList.toggle('selected', currentBets.includes(c.id));
    });
}

function setupLaunchMechanic() {
    const startCharging = () => {
        if (isDrawing || currentBets.length === 0 || isCharging) return;
        const cost = currentBets.length * betAmountPerCard;
        if (balanceTokens < cost) {
            barkerTalk("You need more tokens to play this round!");
            return;
        }

        isCharging = true; 
        chargePower = 0; 
        chargeDirection = 1;

        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        chargingOsc = audioCtx.createOscillator();
        chargingGain = audioCtx.createGain();
        chargingOsc.type = 'sawtooth';
        chargingOsc.frequency.setValueAtTime(100, audioCtx.currentTime);
        chargingGain.gain.setValueAtTime(0, audioCtx.currentTime);
        chargingGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.1);
        chargingOsc.connect(chargingGain);
        chargingGain.connect(audioCtx.destination);
        chargingOsc.start();

        chargeInterval = setInterval(() => {
            chargePower += 3 * chargeDirection;
            if (chargePower >= 100 || chargePower <= 0) chargeDirection *= -1;
            powerFill.style.width = `${chargePower}%`;
            
            const targetFreq = 100 + (chargePower * 6);
            chargingOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.05);
            chargingGain.gain.setTargetAtTime(0.02 + (chargePower * 0.0004), audioCtx.currentTime, 0.05);
        }, 30);
    };

    const stopCharging = () => {
        if (!isCharging) return;
        isCharging = false; 
        clearInterval(chargeInterval);

        if (chargingGain) {
            chargingGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
            setTimeout(() => {
                if (chargingOsc) {
                    chargingOsc.stop();
                    chargingOsc.disconnect();
                }
                chargingGain.disconnect();
            }, 150);
        }

        handleLaunch(chargePower);
        powerFill.style.width = '0%';
    };

    drawBtn.addEventListener('mousedown', startCharging);
    window.addEventListener('mouseup', stopCharging);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!isCharging && !isDrawing && currentBets.length > 0) {
                startCharging();
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && isCharging) {
            e.preventDefault();
            stopCharging();
        }
    });
}

async function handleLaunch(power) {
    if(isDrawing) return;
    isDrawing = true;
    activeBallsFinished = 0;
    winningIndices = [];
    balanceTokens -= currentBets.length * betAmountPerCard;
    updateUI();
    
    barkerTalk("The Imperial Crystals are falling! Where will they land?");
    resultsArea.innerHTML = '<span class="text-amber-500 animate-pulse uppercase font-bold tracking-widest text-lg">Crystals are Falling...</span>';

    ballIds.forEach(id => {
        const ballEl = document.getElementById(`ball-${id}`);
        const shadowEl = document.getElementById(`ball-shadow-${id}`);
        ballEl.style.display = 'block';
        shadowEl.style.display = 'block';

        let currentIdx = -1;
        const totalHops = 14 + Math.floor(Math.random() * 8);
        let currentHop = 0;

        const performHop = () => {
            currentIdx = Math.floor(Math.random() * cards.length);
            const target = document.getElementById(`card-${cards[currentIdx].id}`);
            const ballX = target.offsetLeft + (target.offsetWidth / 2) - 18;
            const ballY = target.offsetTop + (target.offsetHeight / 2) - 18;
            
            const progress = currentHop / totalHops;
            const duration = 0.15 + (progress * 0.6);

            ballEl.style.transition = `transform ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            ballEl.style.transform = `translate(${ballX}px, ${ballY}px) translateZ(${150 * (1 - progress)}px)`;
            
            shadowEl.style.transition = `transform ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            shadowEl.style.transform = `translate(${ballX}px, ${ballY}px) scale(${0.8 + progress * 0.4})`;

            playSound(200 + (currentHop * 50), 'triangle', 0.05);
            currentHop++;

            if (currentHop < totalHops) {
                setTimeout(performHop, duration * 1000);
            } else {
                winningIndices.push(currentIdx);
                activeBallsFinished++;
                if (activeBallsFinished === 3) finalizeGame();
            }
        };
        performHop();
    });
}

function finalizeGame() {
    let matches = 0;
    const wins = winningIndices.map(i => cards[i]);
    wins.forEach(w => { if (currentBets.includes(w.id)) matches++; });
    
    const payout = matches > 0 ? (matches + 1) * betAmountPerCard : 0;
    balanceTokens += payout;
    
    resultsArea.innerHTML = wins.map(w => `
        <div class="flex flex-col items-center justify-center w-16 h-24 glass-pane rounded-xl border border-white/20 shadow-2xl animate-bounce">
            <span class="${COLORS[w.suit]} text-xs font-bold">${w.rank}</span>
            <span class="${COLORS[w.suit]} text-4xl">${SYMBOLS[w.suit]}</span>
        </div>
    `).join('');

    isDrawing = false;
    updateUI();
    if (matches > 0) {
        barkerTalk(`Incredible! You won ${payout} tokens! Fortune smiles upon you.`);
        playSound(880, 'square', 0.2);
    } else {
        barkerTalk("No matches this time. Better luck in the next ritual!");
        playSound(220, 'sawtooth', 0.3);
    }
}

init();