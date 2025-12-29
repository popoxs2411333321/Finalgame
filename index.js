import { GoogleGenAI } from "@google/genai";

// --- Game Configuration ---
const INITIAL_BALANCE = 0; // Starts at 0 Tokens
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const RANK_NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
const SUIT_NAMES = { HEARTS: 'Hearts', SPADES: 'Spades', DIAMONDS: 'Diamonds' };
const COLORS = { HEARTS: 'text-red-600', SPADES: 'text-slate-900', DIAMONDS: 'text-red-500' };

// --- Global State ---
let balanceTokens = INITIAL_BALANCE;
let currentBets = []; 
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;
let audioCtx = null;
let lastFocusedCard = null;
let selectedPack = null;

// --- Physics & Charging State ---
const ballIds = [0, 1, 2];
let activeBallsFinished = 0;
let winningIndices = [];
let isCharging = false;
let chargePower = 0;
let chargeDirection = 1;
let chargeInterval = null;

// --- DOM Elements ---
const cardGrid = document.getElementById('card-grid');
const balanceTxt = document.getElementById('balance-txt');
const betCountTxt = document.getElementById('bet-count-txt');
const dealerMsg = document.getElementById('dealer-msg');
const resultsArea = document.getElementById('results-area');
const drawBtn = document.getElementById('draw-btn');
const resetBtn = document.getElementById('reset-btn');
const refillBtn = document.getElementById('refill-btn');
const betButtons = document.querySelectorAll('#bet-amount-selector button');
const powerFill = document.getElementById('power-fill');
const avatarMouth = document.getElementById('avatar-mouth');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const liveBg = document.getElementById('live-bg');
const crowd = document.getElementById('crowd');
const activeCardBanner = document.getElementById('active-card-banner');

// Modal Elements
const paymentModal = document.getElementById('payment-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const vaultPacks = document.querySelectorAll('.vault-pack');
const nextToPayBtn = document.getElementById('next-to-pay');
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const qrSection = document.getElementById('qr-section');
const backToPacksBtn = document.getElementById('back-to-packs');
const payMethodBtns = document.querySelectorAll('.pay-method-btn');
const simulateScanBtn = document.getElementById('simulate-scan-btn');

const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const closeHelpBtn = document.getElementById('close-help-btn');

// --- Live Background Effects ---
function initLiveBackground() {
    const crowdCount = 20;
    for (let i = 0; i < crowdCount; i++) {
        const person = document.createElement('div');
        person.className = 'person-silhouette';
        person.style.setProperty('--speed', `${2 + Math.random() * 3}s`);
        crowd.appendChild(person);
    }

    setInterval(() => {
        const c = document.createElement('div');
        c.className = 'confetti';
        const colors = ['#ef4444', '#fbbf24', '#3b82f6', '#22c55e', '#ec4899'];
        c.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
        c.style.setProperty('--duration', `${5 + Math.random() * 5}s`);
        c.style.left = `${Math.random() * 100}vw`;
        liveBg.appendChild(c);
        setTimeout(() => c.remove(), 10000);
    }, 400);
}

// --- Audio System ---
function playSound(type) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);

    switch (type) {
        case 'select': {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }
        case 'launch': {
            const osc1 = audioCtx.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(150, now);
            osc1.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            const g1 = audioCtx.createGain();
            g1.gain.setValueAtTime(0.3, now);
            g1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc1.connect(g1);
            g1.connect(audioCtx.destination);
            osc1.start(now);
            osc1.stop(now + 0.3);

            const bufferSize = audioCtx.sampleRate * 0.2;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
            noise.connect(filter);
            filter.connect(gain);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            noise.start(now);
            noise.stop(now + 0.2);
            break;
        }
        case 'hop': {
            const osc = audioCtx.createOscillator();
            osc.frequency.setValueAtTime(350 + Math.random() * 250, now);
            gain.gain.setValueAtTime(0.03, now);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.06);
            break;
        }
        case 'win': {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((f, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(f, now + i * 0.1);
                g.gain.setValueAtTime(0.05, now + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
                o.connect(g);
                g.connect(audioCtx.destination);
                o.start(now + i * 0.1);
                o.stop(now + i * 0.1 + 0.5);
            });
            break;
        }
        case 'lose': {
            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        }
    }
}

// --- Initialization ---
function init() {
    cards = [];
    SUITS.forEach(suit => RANKS.forEach(rank => cards.push({ id: `${suit}-${rank}`, suit, rank })));
    renderCards();
    setupBetSelectors();
    setupLaunchMechanic();
    setupModals();
    setupFullscreen();
    initLiveBackground();
    updateUI();
}

function setupFullscreen() {
    fullscreenToggle.onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };
}

function setupBetSelectors() {
    betButtons.forEach(btn => {
        btn.onclick = () => {
            if (isDrawing) return;
            betAmountPerCard = parseInt(btn.dataset.amount);
            betButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            playSound('select');
        };
    });
}

function setupModals() {
    refillBtn.onclick = () => {
        playSound('select');
        paymentModal.style.display = 'flex';
        resetRefillFlow();
    };

    vaultPacks.forEach(pack => {
        pack.onclick = () => {
            vaultPacks.forEach(p => p.classList.remove('active'));
            pack.classList.add('active');
            selectedPack = { 
                tokens: parseInt(pack.dataset.tokens), 
                price: pack.dataset.price 
            };
            nextToPayBtn.disabled = false;
            nextToPayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            nextToPayBtn.innerText = `PAY $${selectedPack.price}`;
            playSound('select');
        };
    });

    nextToPayBtn.onclick = () => {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        playSound('select');
    };

    backToPacksBtn.onclick = () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
        playSound('select');
    };

    payMethodBtns.forEach(btn => {
        btn.onclick = () => {
            const method = btn.dataset.method;
            if (method === 'Cash') {
                completeRefill(selectedPack.tokens, "Cash Deposit");
            } else {
                step2.classList.add('hidden');
                qrSection.classList.remove('hidden');
                document.getElementById('qr-title').innerText = `${method.toUpperCase()} SCAN`;
                playSound('select');
            }
        };
    });

    simulateScanBtn.onclick = () => {
        completeRefill(selectedPack.tokens, "Digital Payment");
    };

    closeModalBtn.onclick = () => {
        playSound('select');
        paymentModal.style.display = 'none';
    };

    helpBtn.onclick = () => {
        playSound('select');
        helpModal.style.display = 'flex';
    };
    closeHelpBtn.onclick = () => {
        playSound('select');
        helpModal.style.display = 'none';
    };
}

function resetRefillFlow() {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    qrSection.classList.add('hidden');
    vaultPacks.forEach(p => p.classList.remove('active'));
    nextToPayBtn.disabled = true;
    nextToPayBtn.classList.add('opacity-50', 'cursor-not-allowed');
    nextToPayBtn.innerText = "SELECT PACKAGE";
}

function completeRefill(amount, method) {
    balanceTokens += amount;
    paymentModal.style.display = 'none';
    playSound('win');
    setBarkerMessage(`"Imperial Vault replenished via ${method}! You gained 🪙${amount} Tokens!"`);
    updateUI();
}

function setupLaunchMechanic() {
    const startCharging = () => {
        if (isDrawing || currentBets.length === 0 || balanceTokens < (currentBets.length * betAmountPerCard)) {
            if (balanceTokens < (currentBets.length * betAmountPerCard) && currentBets.length > 0) {
                 setBarkerMessage(`"The Treasury is dry! Top up to get more Tokens!"`);
            }
            return;
        }
        isCharging = true;
        chargePower = 0;
        chargeDirection = 1;
        drawBtn.innerText = "CHARGING...";
        chargeInterval = setInterval(() => {
            chargePower += 3 * chargeDirection;
            if (chargePower >= 100 || chargePower <= 0) chargeDirection *= -1;
            powerFill.style.width = `${chargePower}%`;
        }, 16);
    };

    const stopCharging = () => {
        if (!isCharging) return;
        isCharging = false;
        clearInterval(chargeInterval);
        playSound('launch');
        handleLaunch(chargePower);
        drawBtn.innerText = "LAUNCHED!";
        powerFill.style.width = '0%';
    };

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isCharging && !isDrawing) {
            e.preventDefault();
            startCharging();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            stopCharging();
        }
    });

    drawBtn.addEventListener('mousedown', startCharging);
    window.addEventListener('mouseup', stopCharging);
}

function renderCards() {
    cardGrid.innerHTML = '';
    ballIds.forEach(id => {
        const b = document.createElement('div');
        b.id = `ball-${id}`;
        b.className = 'selection-ball';
        cardGrid.appendChild(b);
    });

    cards.forEach(card => {
        const btn = document.createElement('button');
        btn.id = `card-${card.id}`;
        btn.className = 'perya-card aspect-[2.5/3.5] flex flex-col items-center justify-center relative';
        
        btn.onmouseenter = () => updateBanner(card);
        btn.onmouseleave = () => updateBanner(null);
        btn.onclick = () => handleCardClick(card.id);

        const symbol = SYMBOLS[card.suit];
        const cardName = `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`;
        
        btn.innerHTML = `
            <div class="card-tooltip">${cardName}</div>
            <div class="card-corner corner-tl"></div>
            <div class="card-corner corner-tr"></div>
            <div class="card-corner corner-bl"></div>
            <div class="card-corner corner-br"></div>
            
            <div class="absolute top-2 left-2 font-card text-lg font-black ${COLORS[card.suit]}">${card.rank}</div>
            <div class="text-5xl ${COLORS[card.suit]} drop-shadow-sm">${symbol}</div>
            <div class="absolute bottom-2 right-2 font-card text-lg font-black rotate-180 ${COLORS[card.suit]}">${card.rank}</div>
            <div class="bet-badge">BET</div>
        `;
        cardGrid.appendChild(btn);
    });
}

function updateBanner(card) {
    if (isDrawing) return;

    if (card) {
        lastFocusedCard = card;
        activeCardBanner.innerText = `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`;
        activeCardBanner.className = `text-3xl md:text-5xl visible ${card.suit === 'SPADES' ? 'neon-text-white' : 'neon-text-red'}`;
    } else {
        if (currentBets.length > 0) {
            const latestId = currentBets[currentBets.length - 1];
            const latestCard = cards.find(c => c.id === latestId);
            activeCardBanner.innerText = `${RANK_NAMES[latestCard.rank]} of ${SUIT_NAMES[latestCard.suit]}`;
            activeCardBanner.className = `text-3xl md:text-5xl visible ${latestCard.suit === 'SPADES' ? 'neon-text-white' : 'neon-text-red'}`;
        } else {
            activeCardBanner.innerText = "PICK YOUR DESTINY";
            activeCardBanner.className = "text-3xl md:text-5xl visible neon-text-white";
        }
    }
}

function handleCardClick(id) {
    if (isDrawing) return;
    const idx = currentBets.indexOf(id);
    if (idx > -1) {
        currentBets.splice(idx, 1);
        playSound('select');
    } else if (currentBets.length < MAX_BETS) {
        currentBets.push(id);
        playSound('select');
    }
    updateUI();
}

function updateUI() {
    balanceTxt.innerText = balanceTokens.toLocaleString();
    betCountTxt.innerText = `${currentBets.length} / ${MAX_BETS}`;
    drawBtn.disabled = currentBets.length === 0 || isDrawing || balanceTokens < (currentBets.length * betAmountPerCard);
    if (!isDrawing && !isCharging) drawBtn.innerText = "HOLD [SPACE]";
    
    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        el.classList.toggle('selected', currentBets.includes(c.id));
    });

    const hoveredCard = Array.from(document.querySelectorAll('.perya-card:hover'))[0];
    if (!hoveredCard) updateBanner(null);

    if (balanceTokens < 10) {
        balanceTxt.classList.add('animate-pulse', 'text-red-500');
        refillBtn.classList.add('animate-bounce');
    } else {
        balanceTxt.classList.remove('animate-pulse', 'text-red-500');
        refillBtn.classList.remove('animate-bounce');
    }
}

async function handleLaunch(power) {
    if (isDrawing) return;
    const totalCost = currentBets.length * betAmountPerCard;
    isDrawing = true;
    balanceTokens -= totalCost;
    updateUI();

    setBarkerMessage(`"Imperial Orbs released at ${Math.round(power)}% energy!"`);
    resultsArea.innerHTML = '<span class="text-amber-500 font-royal text-xl animate-pulse">Orbs in Motion</span>';
    activeCardBanner.innerText = "WAITING FOR FATE...";
    
    document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('winner', 'loser'));
    
    activeBallsFinished = 0;
    winningIndices = [];

    ballIds.forEach(id => {
        const ballEl = document.getElementById(`ball-${id}`);
        ballEl.style.display = 'block';
        
        let currentIdx = -1;
        let momentum = 15 + (power / 5);
        let currentHop = 0;
        const totalHops = 20 + Math.floor(Math.random() * 10);

        const performHop = () => {
            let nextIdx = Math.floor(Math.random() * cards.length);
            currentIdx = nextIdx;
            const target = document.getElementById(`card-${cards[currentIdx].id}`);

            const ballX = target.offsetLeft + (target.offsetWidth / 2) - 18 + (id-1)*10;
            const ballY = target.offsetTop + (target.offsetHeight / 2) - 18 + (id-1)*10;
            
            const hopHeight = momentum * 4;
            const duration = 0.15 + (0.5 / momentum);
            
            ballEl.style.transition = `transform ${duration}s ease-out`;
            ballEl.style.transform = `translate(${ballX}px, ${ballY}px) translateZ(${hopHeight}px)`;
            
            playSound('hop');
            momentum *= 0.85;
            currentHop++;

            if (currentHop < totalHops) {
                setTimeout(performHop, duration * 1000 + 50);
            } else {
                winningIndices.push(currentIdx);
                target.classList.add('winner');
                ballEl.style.transform = `translate(${ballX}px, ${ballY}px) translateZ(0px)`;
                activeBallsFinished++;
                if (activeBallsFinished === 3) finalize();
            }
        };
        performHop();
    });
}

function finalize() {
    let matches = 0;
    const winList = winningIndices.map(i => cards[i]);
    
    winList.forEach(wc => {
        if (currentBets.includes(wc.id)) matches++;
    });

    currentBets.forEach(betId => {
        if (!winList.some(wc => wc.id === betId)) {
            document.getElementById(`card-${betId}`).classList.add('loser');
        }
    });

    const winAmount = (matches > 0) ? (matches + 1) * betAmountPerCard : 0;
    balanceTokens += winAmount;

    if (winAmount > 0) playSound('win'); else playSound('lose');

    resultsArea.innerHTML = '';
    winList.forEach((wc, i) => {
        const div = document.createElement('div');
        const isMatch = currentBets.includes(wc.id);
        div.className = `w-16 h-24 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-amber-500 shadow-xl ${isMatch ? 'ring-4 ring-amber-400' : ''}`;
        div.innerHTML = `
            <div class="text-xs font-bold ${COLORS[wc.suit]}">${wc.rank}</div>
            <div class="text-2xl ${COLORS[wc.suit]}">${SYMBOLS[wc.suit]}</div>
        `;
        resultsArea.appendChild(div);
    });

    isDrawing = false;
    updateUI();
    getBarkerCommentary(winAmount > 0 ? 'WIN' : 'LOSS', winList, winAmount);
}

async function getBarkerCommentary(outcome, winners, amount) {
    if (!process.env.API_KEY) {
        setBarkerMessage(outcome === 'WIN' ? `Mabuhay! You won 🪙${amount} Tokens!` : "The orbs have spoken. Try again!");
        return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const winStr = winners.map(w => w.rank + ' ' + w.suit).join(', ');
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Game result: ${winStr}. Player ${outcome === 'WIN' ? 'won ' + amount + ' tokens' : 'lost'}. Give a 1-sentence, high-energy, Filipino perya barker reaction strictly in English.`
        });
        setBarkerMessage(response.text);
    } catch (e) {
        setBarkerMessage(outcome === 'WIN' ? "Victory for the King!" : "Fate rests for now.");
    }
}

function setBarkerMessage(msg) {
    dealerMsg.innerText = msg;
    if (avatarMouth) {
        avatarMouth.style.height = '10px';
        setTimeout(() => avatarMouth.style.height = '1px', 3000);
    }
}

resetBtn.onclick = () => {
    if (isDrawing) return;
    currentBets = [];
    winningIndices = [];
    resultsArea.innerHTML = '<span class="text-amber-600/30 font-royal text-xl animate-pulse">Destiny Awaits</span>';
    ballIds.forEach(id => document.getElementById(`ball-${id}`).style.display = 'none');
    document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('winner', 'selected', 'loser'));
    updateUI();
    playSound('select');
};

init();