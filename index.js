
import { GoogleGenAI } from "@google/genai";

// Configuration
const INITIAL_BALANCE = 1000;
const MAX_BETS = 3;
const SUITS = ['HEARTS', 'SPADES', 'DIAMONDS'];
const RANKS = ['J', 'Q', 'K', 'A'];
const SYMBOLS = { HEARTS: '♥', SPADES: '♠', DIAMONDS: '♦' };
const COLORS = { HEARTS: 'text-red-600', SPADES: 'text-slate-900', DIAMONDS: 'text-red-500' };

// Game State
let balance = INITIAL_BALANCE;
let currentBets = []; 
let isDrawing = false;
let cards = [];
let betAmountPerCard = 10;

// DOM Elements
const cardGrid = document.getElementById('card-grid');
const balanceTxt = document.getElementById('balance-txt');
const betCountTxt = document.getElementById('bet-count-txt');
const dealerMsg = document.getElementById('dealer-msg');
const resultsArea = document.getElementById('results-area');
const drawBtn = document.getElementById('draw-btn');
const resetBtn = document.getElementById('reset-btn');
const refillBtn = document.getElementById('refill-btn');
const betAmountButtons = document.querySelectorAll('#bet-amount-selector button');

// Initialize Cards Pool (12 cards total)
SUITS.forEach(suit => {
    RANKS.forEach(rank => {
        cards.push({ id: `${suit}-${rank}`, suit, rank });
    });
});

function init() {
    renderCards();
    updateUI();
    setupBetSelectors();
}

function setupBetSelectors() {
    betAmountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isDrawing) return;
            betAmountPerCard = parseInt(btn.dataset.amount);
            
            // UI update for buttons
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
        btn.className = `perya-card bg-white rounded-xl border-4 border-slate-200 aspect-[2/3] relative flex flex-col items-center justify-center p-2 cursor-pointer`;
        btn.innerHTML = `
            <div class="absolute top-1 left-1 font-bold text-sm ${COLORS[card.suit]}">${card.rank}</div>
            <div class="text-5xl ${COLORS[card.suit]}">${SYMBOLS[card.suit]}</div>
            <div class="absolute bottom-1 right-1 font-bold text-sm rotate-180 ${COLORS[card.suit]}">${card.rank}</div>
            <div class="bet-tag absolute inset-0 bg-yellow-400/20 items-center justify-center hidden">
                <span class="bg-yellow-400 text-white text-[8px] font-bold px-1 rounded">TAYA</span>
            </div>
        `;
        btn.addEventListener('click', () => handleCardClick(card.id));
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
    balanceTxt.innerText = balance;
    betCountTxt.innerText = `${currentBets.length} / ${MAX_BETS}`;
    
    const totalCost = currentBets.length * betAmountPerCard;
    drawBtn.disabled = currentBets.length === 0 || isDrawing || balance < totalCost;
    
    // Also disable bet selectors while drawing
    betAmountButtons.forEach(btn => btn.disabled = isDrawing);

    refillBtn.classList.toggle('hidden', balance >= 10); // Check for min possible bet

    cards.forEach(c => {
        const el = document.getElementById(`card-${c.id}`);
        const isSelected = currentBets.includes(c.id);
        el.classList.toggle('selected', isSelected);
        el.querySelector('.bet-tag').classList.toggle('hidden', !isSelected);
    });
}

async function handleDraw() {
    const totalCost = currentBets.length * betAmountPerCard;
    if (balance < totalCost) return;

    isDrawing = true;
    balance -= totalCost;
    updateUI();

    dealerMsg.innerText = "Bola na! Sino kaya ang swerte?!";
    resultsArea.innerHTML = '<div class="text-yellow-400 font-perya text-2xl animate-pulse self-center">DRAWING...</div>';

    await new Promise(r => setTimeout(r, 1500));

    // Random draw of 3 cards from the deck
    const shuffled = [...cards].sort(() => 0.5 - Math.random());
    const winCards = shuffled.slice(0, 3);

    // Matches
    let matches = 0;
    winCards.forEach(wc => {
        if (currentBets.includes(wc.id)) matches++;
    });

    let multiplier = matches === 1 ? 2 : matches === 2 ? 4 : matches === 3 ? 10 : 0;
    const winnings = multiplier * betAmountPerCard;
    balance += winnings;

    // Display
    resultsArea.innerHTML = '';
    winCards.forEach(wc => {
        const resCard = document.createElement('div');
        resCard.className = 'w-16 h-24 bg-white rounded-lg flex flex-col items-center justify-center text-slate-900 border-2 border-yellow-500 animate-bounce shadow-lg';
        resCard.innerHTML = `
            <span class="text-xs font-bold">${wc.rank}</span>
            <span class="text-2xl ${COLORS[wc.suit]}">${SYMBOLS[wc.suit]}</span>
        `;
        resultsArea.appendChild(resCard);
        
        if (currentBets.includes(wc.id)) {
            document.getElementById(`card-${wc.id}`).classList.add('winning');
        }
    });

    isDrawing = false;
    updateUI();
    
    getBarkerTalk(winnings > 0 ? 'WIN' : 'LOSS', winCards, winnings);
}

async function getBarkerTalk(outcome, winners, amount) {
    if (!process.env.API_KEY) return;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
        You are a charismatic Filipino Perya Barker. 
        The player just ${outcome === 'WIN' ? 'won ' + amount + ' pesos' : 'lost'}.
        Winning cards: ${winners.map(w => w.rank + ' of ' + w.suit).join(', ')}.
        The player was betting ${betAmountPerCard} pesos per card.
        Speak in energetic Taglish (Tagalog-English). Short and lively!
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        dealerMsg.innerText = response.text || "Taya na ulit, suki!";
    } catch (e) {
        dealerMsg.innerText = outcome === 'WIN' ? "Ayos! Panalo ka!" : "Bawi na lang next round!";
    }
}

drawBtn.addEventListener('click', handleDraw);
resetBtn.addEventListener('click', () => {
    currentBets = [];
    resultsArea.innerHTML = '<div class="flex gap-3 opacity-10"><div class="w-16 h-24 bg-slate-600 rounded-lg"></div><div class="w-16 h-24 bg-slate-600 rounded-lg"></div><div class="w-16 h-24 bg-slate-600 rounded-lg"></div></div>';
    document.querySelectorAll('.perya-card').forEach(c => c.classList.remove('winning'));
    updateUI();
});
refillBtn.addEventListener('click', () => {
    balance = INITIAL_BALANCE;
    updateUI();
});

init();
