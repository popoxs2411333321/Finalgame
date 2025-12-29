import { GoogleGenAI } from "@google/genai";

// --- Game Configuration ---
const INITIAL_BALANCE = 1000;
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const RANK_NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
const SUIT_NAMES = { HEARTS: 'Hearts', SPADES: 'Spades', DIAMONDS: 'Diamonds' };
const COLORS = { HEARTS: 'text-red-600', SPADES: 'text-slate-900', DIAMONDS: 'text-red-500' };

// --- Global State ---
let balance = INITIAL_BALANCE;
let currentBets = []; 
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;
let audioCtx = null;

// --- Physics & Charging State ---
const ballIds = [0, 1, 2];
let activeBallsFinished = 0;
let winningIndices = [];
let isCharging = false;
let chargePower = 0;
let chargeDirection = 1;
let chargeInterval = null;

// --- Audio ---
function playSound(type) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    switch (type) {
        case 'hop':
            osc.frequency.setValueAtTime(350 + Math.random() * 250, now);
            gain.gain.setValueAtTime(0.03, now);
            osc.start(now); osc.stop(now + 0.06);
            break;
        case 'win':
            [523, 659, 783, 1046].forEach((f, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.frequency.setValueAtTime(f, now + i * 0.08);
                g.gain.setValueAtTime(0.04, now + i * 0.08);
                o.connect(g); g.connect(audioCtx.destination);
                o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.4);
            });
            break;
        case 'lose':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(110, now);
            gain.gain.setValueAtTime(0.06, now);
            osc.start(now); osc.stop(now + 0.6);
            break;
    }
}

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

// Modal Elements
const paymentModal = document.getElementById('payment-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const paymentOptions = document.querySelectorAll('.payment-option');

const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const closeHelpBtn = document.getElementById('close-help-btn');

// --- Initialization ---
function init() {
    cards = [];
    SUITS.forEach(suit => RANKS.forEach(rank => cards.push({ id: `${suit}-${rank}`, suit, rank })));
    renderCards();
    setupBetSelectors();
    setupLaunchMechanic();
    setupModals();
    setupFullscreen();
    updateUI();
}

function setupFullscreen() {
    fullscreenToggle.onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
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
            playSound('hop');
        };
    });
}

function setupModals() {
    // Payment Modal
    refillBtn.onclick = () => {
        paymentModal.classList.add('active');
        playSound('hop');
    };
    closeModalBtn.onclick = () => {
        paymentModal.classList.remove('active');
    };
    paymentOptions.forEach(opt => {
        opt.onclick = () => {
            const method = opt.dataset.method;
            paymentModal.classList.remove('active');
            performRefill(method);
        };
    });

    // Help Modal
    helpBtn.onclick = () => {
        helpModal.classList.add('active');
        playSound('hop');
    };
    closeHelpBtn.onclick = () => {
        helpModal.classList.remove('active');
    };
    helpModal.onclick = (e) => {
        if (e.target === helpModal) helpModal.classList.remove('active');
    };
}

function performRefill(method) {
    setBarkerMessage(`"Payment processed via ${method}. The vault is open! Go forth and win!"`);
    balance = INITIAL_BALANCE;
    updateUI();
    playSound('win');
    resultsArea.innerHTML = `<span class="text-green-500 font-royal text-xl animate-pulse">₱${INITIAL_BALANCE} REFILLED VIA ${method.toUpperCase()}</span>`;
}

function setupLaunchMechanic() {
    const startCharging = () => {
        if (isDrawing || currentBets.length === 0 || balance < (currentBets.length * betAmountPerCard)) return;
        isCharging = true;
        chargePower = 0;
        chargeDirection = 1;
        drawBtn.innerText = "CHARGING...";
        chargeInterval = setInterval(() => {
            chargePower += 2.8 * chargeDirection;
            if (chargePower >= 100 || chargePower <= 0) chargeDirection *= -1;
            powerFill.style.width = `${chargePower}%`;
        }, 16);
    };

    const stopCharging = () => {
        if (!isCharging) return;
        isCharging = false;
        clearInterval(chargeInterval);
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
    drawBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startCharging(); }, {passive: false});
    drawBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopCharging(); }, {passive: false});
}

function renderCards() {
    const ball0 = document.getElementById('ball-0');
    const ball1 = document.getElementById('ball-1');
    const ball2 = document.getElementById('ball-2');
    
    cardGrid.innerHTML = '';
    cardGrid.appendChild(ball0);
    cardGrid.appendChild(ball1);
    cardGrid.appendChild(ball2);

    cards.forEach(card => {
        const btn = document.createElement('button');
        btn.id = `card-${card.id}`;
        btn.className = 'perya-card aspect-[2.5/3.5] flex flex-col items-center justify-center';
        btn.onclick = () => handleCardClick(card.id);
        const rankName = RANK_NAMES[card.rank];
        const suitName = SUIT_NAMES[card.suit];
        const symbol = SYMBOLS[card.suit];
        
        btn.innerHTML = `
            <div class="card-tooltip">${rankName} of ${suitName} ${symbol}</div>
            <div class="absolute top-3 left-3 font-card text-xl font-black leading-none ${COLORS[card.suit]}">${card.rank}</div>
            <div class="text-6xl ${COLORS[card.suit]} drop-shadow-md transition-transform group-hover:scale-110">${symbol}</div>
            <div class="absolute bottom-3 right-3 font-card text-xl font-black rotate-180 leading-none ${COLORS[card.suit]}">${card.rank}</div>
            <div class="bet-badge">ACTIVE BET</div>
        `;
        cardGrid.appendChild(btn);
    });
}

function handleCardClick(id) {
    if (isDrawing) return;
    const idx = currentBets.indexOf(id);
    if (idx > -1) {
        currentBets.splice(idx, 1);
    } else if (currentBets.length < MAX_BETS) {
        currentBets.push(id);
        playSound('hop');
    }
    updateUI();
}

function updateUI() {
    balanceTxt.innerText = balance.toLocaleString();
    betCountTxt.innerText = `${currentBets.length} / ${MAX_BETS}`;
    drawBtn.disabled = currentBets.length === 0 || isDrawing || balance < (currentBets.length * betAmountPerCard);
    if (!isDrawing && !isCharging) drawBtn.innerText = "HOLD [SPACE]";
    refillBtn.classList.toggle('hidden', balance < 10);
    
    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        el.classList.toggle('selected', currentBets.includes(c.id));
    });
}

async function handleLaunch(power) {
    if (isDrawing) return;
    const totalCost = currentBets.length * betAmountPerCard;
    isDrawing = true;
    balance -= totalCost;
    updateUI();

    setBarkerMessage(`"The Triple Drop is unleashed! Energy level: ${Math.round(power)}%!"`);
    resultsArea.innerHTML = '<span class="text-amber-500 font-royal text-xl animate-pulse tracking-widest uppercase">Orbs in Motion</span>';
    
    document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('winner', 'active', 'loser'));
    
    activeBallsFinished = 0;
    winningIndices = [];

    ballIds.forEach(id => {
        const ballEl = document.getElementById(`ball-${id}`);
        ballEl.style.display = 'block';
        
        let currentIdx = -1;
        let momentum = 12 + (power / 5) + Math.random() * 8;
        let decay = 0.88 + (Math.random() * 0.05); 
        let currentHop = 0;
        const totalHops = 18 + Math.floor(Math.random() * 10);
        
        let driftX = (Math.random() - 0.5) * 40;
        let driftY = (Math.random() - 0.5) * 40;

        const performHop = () => {
            if (currentIdx !== -1) {
                document.getElementById(`card-${cards[currentIdx].id}`).classList.remove('active');
            }
            
            let nextIdx;
            const progress = currentHop / totalHops;
            if (progress < 0.4 || Math.random() > 0.7) {
                nextIdx = Math.floor(Math.random() * cards.length);
            } else {
                nextIdx = (currentIdx + (Math.random() > 0.5 ? 1 : -1) + cards.length) % cards.length;
            }
            
            currentIdx = nextIdx;
            const target = document.getElementById(`card-${cards[currentIdx].id}`);
            target.classList.add('active');

            const jitterFactor = Math.max(0, 1 - progress);
            const jitterX = (Math.random() - 0.5) * 50 * jitterFactor;
            const jitterY = (Math.random() - 0.5) * 50 * jitterFactor;
            const ballOffset = (id - 1) * 14;

            const ballX = target.offsetLeft + (target.offsetWidth / 2) - 18 + ballOffset + jitterX + driftX * jitterFactor;
            const ballY = target.offsetTop + (target.offsetHeight / 2) - 18 + ballOffset + jitterY + driftY * jitterFactor;
            
            const hopHeight = momentum * (5 + Math.random() * 3);
            
            const duration = 0.12 + (0.8 / (momentum + 1));
            const easing = progress < 0.7 
                ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
                : 'cubic-bezier(0.34, 1.56, 0.64, 1)'; 

            ballEl.style.transition = `transform ${duration}s ${easing}`;
            ballEl.style.transform = `translate(${ballX}px, ${ballY}px) translateZ(${hopHeight}px)`;
            
            playSound('hop');

            momentum *= decay;
            currentHop++;

            if (currentHop < totalHops) {
                const delay = (duration * 1000) + (progress * 150);
                setTimeout(performHop, delay);
            } else {
                winningIndices.push(currentIdx);
                target.classList.remove('active');
                target.classList.add('winner');
                
                const finalX = target.offsetLeft + (target.offsetWidth / 2) - 18 + ballOffset;
                const finalY = target.offsetTop + (target.offsetHeight / 2) - 18 + ballOffset;
                
                ballEl.style.transition = `transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
                ballEl.style.transform = `translate(${finalX}px, ${finalY}px) translateZ(0px)`;
                
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

    // Mark losing bets
    currentBets.forEach(betId => {
        const isWinner = winList.some(wc => wc.id === betId);
        if (!isWinner) {
            const el = document.getElementById(`card-${betId}`);
            if (el) el.classList.add('loser');
        }
    });

    const winAmount = (matches > 0) ? (matches + 1) * betAmountPerCard : 0;
    balance += winAmount;

    if (winAmount > 0) playSound('win'); else playSound('lose');

    resultsArea.innerHTML = '';
    winList.forEach((wc, i) => {
        const div = document.createElement('div');
        const isMatch = currentBets.includes(wc.id);
        div.className = `result-card-anim w-20 h-28 bg-[#fffdf7] rounded-lg flex flex-col items-center justify-center border-2 border-[#d4af37] shadow-lg ${isMatch ? 'ring-4 ring-amber-400' : ''}`;
        div.style.animationDelay = `${i * 0.15}s`;
        div.innerHTML = `
            <div class="text-[12px] font-bold ${COLORS[wc.suit]}">${wc.rank}</div>
            <div class="text-3xl ${COLORS[wc.suit]}">${SYMBOLS[wc.suit]}</div>
            <div class="text-[8px] font-bold text-stone-600 mt-1 uppercase tracking-tighter">${isMatch ? 'WINNER!' : 'Landed'}</div>
        `;
        resultsArea.appendChild(div);
    });

    isDrawing = false;
    updateUI();
    getBarkerCommentary(winAmount > 0 ? 'WIN' : 'LOSS', winList, winAmount);
}

async function getBarkerCommentary(outcome, winners, amount) {
    if (!process.env.API_KEY) {
        setBarkerMessage(outcome === 'WIN' ? `Marvelous! You've claimed ₱${amount} from the royal treasury!` : "Fate has spoken. Better luck on the next drop, traveler!");
        return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const winStr = winners.map(w => w.rank + ' ' + w.suit).join(', ');
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Game result: ${winStr}. Player ${outcome === 'WIN' ? 'won ₱' + amount : 'lost'}. Give a 1-sentence, high-energy, royal casino barker reaction strictly in English.`
        });
        setBarkerMessage(response.text);
    } catch (e) {
        setBarkerMessage(outcome === 'WIN' ? "A splendid victory! The orbs have favored you!" : "The orbs are silent this time. Fortune favors the bold—try again!");
    }
}

function setBarkerMessage(msg) {
    dealerMsg.innerText = msg;
    if (avatarMouth) {
        avatarMouth.classList.add('speaking');
        setTimeout(() => avatarMouth.classList.remove('speaking'), 3500);
    }
}

resetBtn.onclick = () => {
    if (isDrawing) return;
    currentBets = [];
    winningIndices = [];
    resultsArea.innerHTML = '<span class="text-amber-600/20 font-royal text-xl self-center uppercase tracking-widest animate-pulse">Destiny Awaits</span>';
    ballIds.forEach(id => {
        const b = document.getElementById(`ball-${id}`);
        if(b) b.style.display = 'none';
    });
    document.querySelectorAll('.perya-card').forEach(el => el.classList.remove('winner', 'active', 'selected', 'loser'));
    updateUI();
    playSound('hop');
};

init();