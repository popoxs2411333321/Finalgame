import { GoogleGenAI } from "@google/genai";

// --- Game Configuration ---
const INITIAL_BALANCE = 1000;
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const COLORS = { HEARTS: 'text-red-600', SPADES: 'text-slate-900', DIAMONDS: 'text-red-500' };

// --- Audio Context for synthesized sounds ---
let audioCtx = null;

function playSound(type) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    switch (type) {
        case 'select':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'draw':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100 + Math.random() * 50, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'win':
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(freq, now + i * 0.1);
                g.gain.setValueAtTime(0.1, now + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
                o.connect(g);
                g.connect(audioCtx.destination);
                o.start(now + i * 0.1);
                o.stop(now + i * 0.1 + 0.4);
            });
            break;
        case 'lose':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.6);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
            break;
    }
}

// --- Global State ---
let balance = INITIAL_BALANCE;
let currentBets = []; 
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;

// --- DOM Elements ---
const cardGrid = document.getElementById('card-grid');
const balanceTxt = document.getElementById('balance-txt');
const betCountTxt = document.getElementById('bet-count-txt');
const totalBetDisplay = document.getElementById('total-bet-display');
const dealerMsg = document.getElementById('dealer-msg');
const barkerBox = document.getElementById('barker-box');
const resultsArea = document.getElementById('results-area');
const drawBtn = document.getElementById('draw-btn');
const resetBtn = document.getElementById('reset-btn');
const refillBtn = document.getElementById('refill-btn');
const betAmountButtons = document.querySelectorAll('#bet-amount-selector button');

const rulesModal = document.getElementById('rules-modal');
const openRulesBtn = document.getElementById('open-rules');
const closeRulesBtn = document.getElementById('close-rules');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// --- Initialization ---
function init() {
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            cards.push({ id: `${suit}-${rank}`, suit, rank });
        });
    });

    renderCards();
    setupBetSelectors();
    setupModalListeners();
    setupFullscreenListener();
    updateUI();
}

function setupFullscreenListener() {
    fullscreenBtn.addEventListener('click', () => {
        playSound('select');
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenBtn.innerText = 'EXIT FULL SCREEN';
        } else {
            fullscreenBtn.innerText = 'FULL SCREEN';
        }
    });
}

function setupModalListeners() {
    openRulesBtn.addEventListener('click', () => {
        playSound('select');
        rulesModal.classList.remove('hidden');
    });
    closeRulesBtn.addEventListener('click', () => {
        playSound('select');
        rulesModal.classList.add('hidden');
    });
    // Close modal on background click
    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) {
            rulesModal.classList.add('hidden');
        }
    });
}

function setupBetSelectors() {
    betAmountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isDrawing) return;
            playSound('select');
            betAmountPerCard = parseInt(btn.dataset.amount);
            betAmountButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateUI();
        });
    });
}

function renderCards() {
    cardGrid.innerHTML = '';
    cards.forEach(card => {
        const btn = document.createElement('button');
        btn.id = `card-${card.id}`;
        btn.className = `perya-card aspect-[2.5/3.5] relative flex flex-col items-center justify-center p-2`;
        
        btn.innerHTML = `
            <!-- Top Corner -->
            <div class="absolute top-2 left-2 font-card font-bold text-lg flex flex-col items-center leading-none ${COLORS[card.suit]}">
                <span>${card.rank}</span>
                <span class="text-xs">${SYMBOLS[card.suit]}</span>
            </div>
            
            <!-- Center Large Graphic -->
            <div class="text-7xl ${COLORS[card.suit]} drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)] scale-110">${SYMBOLS[card.suit]}</div>
            
            <!-- Bottom Corner -->
            <div class="absolute bottom-2 right-2 font-card font-bold text-lg flex flex-col items-center rotate-180 leading-none ${COLORS[card.suit]}">
                <span>${card.rank}</span>
                <span class="text-xs">${SYMBOLS[card.suit]}</span>
            </div>

            <!-- BET TAG -->
            <div class="bet-tag absolute inset-0 flex items-center justify-center bg-yellow-400/20 backdrop-blur-[1px] opacity-0 transition-opacity pointer-events-none">
                 <div class="bg-yellow-400 text-slate-900 px-3 py-1 rounded-full font-perya text-[10px] shadow-lg border-2 border-slate-900 tracking-tighter transform -rotate-12">ACTIVE BET</div>
            </div>
        `;
        
        btn.addEventListener('click', () => {
            playSound('select');
            handleCardClick(card.id);
        });
        cardGrid.appendChild(btn);
    });
}

function handleCardClick(id) {
    if (isDrawing) return;
    const index = currentBets.indexOf(id);
    if (index > -1) {
        currentBets.splice(index, 1);
    } else if (currentBets.length < MAX_BETS) {
        currentBets.push(id);
    }
    updateUI();
}

function updateUI() {
    balanceTxt.innerText = balance.toLocaleString();
    betCountTxt.innerText = `${currentBets.length} / ${MAX_BETS}`;
    const totalCost = currentBets.length * betAmountPerCard;
    totalBetDisplay.innerText = `TOTAL BET: $${totalCost.toLocaleString()}`;
    drawBtn.disabled = currentBets.length === 0 || isDrawing || balance < totalCost;
    betAmountButtons.forEach(btn => btn.disabled = isDrawing);
    refillBtn.classList.toggle('hidden', balance >= 10);

    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        const isSelected = currentBets.includes(c.id);
        el.classList.toggle('selected', isSelected);
        el.querySelector('.bet-tag').style.opacity = isSelected ? '1' : '0';
    });
}

async function handleDraw() {
    const totalCost = currentBets.length * betAmountPerCard;
    if (balance < totalCost || isDrawing) return;

    isDrawing = true;
    balance -= totalCost;
    updateUI();

    // Start Draw Effects
    document.querySelectorAll('.perya-card').forEach(c => {
        c.classList.remove('winning');
        c.classList.add('drawing');
    });
    
    setBarkerMessage("Ladies and Gentlemen, place your eyes on the shuffle! The magic is happening!");
    resultsArea.innerHTML = `
        <div class="flex flex-col items-center justify-center animate-pulse">
            <div class="text-yellow-400 font-perya text-3xl tracking-widest drop-shadow-md">SHUFFLING...</div>
            <div class="text-[12px] text-slate-400 font-bold uppercase tracking-[0.5em] mt-2">Breathe in... Good Luck!</div>
        </div>
    `;

    // Dramatic draw sound loop
    const drawInterval = setInterval(() => playSound('draw'), 100);
    await new Promise(r => setTimeout(r, 2200));
    clearInterval(drawInterval);

    // Stop shakes
    document.querySelectorAll('.perya-card').forEach(c => c.classList.remove('drawing'));

    const shuffled = [...cards].sort(() => 0.5 - Math.random());
    const winCards = shuffled.slice(0, 3);

    let matches = 0;
    winCards.forEach(wc => {
        if (currentBets.includes(wc.id)) matches++;
    });

    let multiplier = matches === 1 ? 2 : matches === 2 ? 4 : matches === 3 ? 10 : 0;
    const totalWinnings = multiplier * betAmountPerCard;
    balance += totalWinnings;

    if (totalWinnings > 0) playSound('win');
    else playSound('lose');

    resultsArea.innerHTML = '';
    winCards.forEach((wc, i) => {
        const resCard = document.createElement('div');
        const isMatch = currentBets.includes(wc.id);
        
        resCard.className = `w-24 h-32 bg-[#fff9f0] rounded-xl flex flex-col items-center justify-center border-4 ${isMatch ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'border-slate-400'} shadow-xl relative result-card-celebrate`;
        resCard.style.animationDelay = `${i * 0.25}s`;
        
        resCard.innerHTML = `
            <div class="absolute top-1 left-1 font-card font-bold text-[10px] leading-none ${COLORS[wc.suit]}">${wc.rank}</div>
            <div class="text-4xl ${COLORS[wc.suit]}">${SYMBOLS[wc.suit]}</div>
            <div class="absolute bottom-1 right-1 font-card font-bold text-[10px] rotate-180 leading-none ${COLORS[wc.suit]}">${wc.rank}</div>
            ${isMatch ? '<div class="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-1 shadow-lg text-[8px] font-bold">MATCH!</div>' : ''}
        `;
        resultsArea.appendChild(resCard);
        
        if (isMatch) {
            const boardCard = document.getElementById(`card-${wc.id}`);
            if (boardCard) boardCard.classList.add('winning');
        }
    });

    isDrawing = false;
    updateUI();
    getBarkerCommentary(totalWinnings > 0 ? 'WIN' : 'LOSS', winCards, totalWinnings);
}

async function getBarkerCommentary(outcome, winners, amount) {
    if (!process.env.API_KEY) {
        setBarkerMessage(outcome === 'WIN' ? `WINNER WINNER! You scooped up $${amount}!` : "No luck this time! The table is ready for your next play!");
        return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
        Context: You are a theatrical, high-energy Carnival Barker. 
        The player just ${outcome === 'WIN' ? 'won $' + amount : 'lost their bet'}.
        Winning combo: ${winners.map(w => w.rank + ' of ' + w.suit).join(', ')}.
        Task: Give a very energetic 1-sentence reaction. Use phrases like "Unbelievable!", "Grand Fiesta indeed!", "Step up for another go!".
        Language: English only.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        setBarkerMessage(response.text || "Step right up! Who will be our next grand winner?");
    } catch (e) {
        setBarkerMessage(outcome === 'WIN' ? "Spectacular win! You've got the golden touch!" : "Fortune is a fickle mistress! Try your hand again!");
    }
}

function setBarkerMessage(msg) {
    barkerBox.classList.add('scale-105');
    setTimeout(() => barkerBox.classList.remove('scale-105'), 200);
    dealerMsg.innerText = msg;
}

drawBtn.addEventListener('click', handleDraw);

resetBtn.addEventListener('click', () => {
    if (isDrawing) return;
    playSound('select');
    currentBets = [];
    resultsArea.innerHTML = `
        <div class="flex gap-4 opacity-5">
            <div class="w-24 h-32 bg-slate-600 rounded-xl"></div>
            <div class="w-24 h-32 bg-slate-600 rounded-xl"></div>
            <div class="w-24 h-32 bg-slate-600 rounded-xl"></div>
        </div>
    `;
    document.querySelectorAll('.perya-card').forEach(c => {
        c.classList.remove('winning');
        c.classList.remove('drawing');
    });
    setBarkerMessage("The table is reset and fresh! Lady Luck awaits your next choice.");
    updateUI();
});

refillBtn.addEventListener('click', () => {
    playSound('win');
    balance = INITIAL_BALANCE;
    setBarkerMessage("A fresh stack of bills for the lucky player! Don't spend it all in one place!");
    updateUI();
});

init();