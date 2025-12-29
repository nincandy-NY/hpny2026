const firebaseConfig = {
    apiKey: "AIzaSyD1M1lSsrBKh9PZViGWg5AZVmfnVzCaGGQ",
    authDomain: "kang-c94af.firebaseapp.com",
    databaseURL: "https://kang-c94af-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kang-c94af",
    storageBucket: "kang-c94af.firebasestorage.app",
    messagingSenderId: "518592340430",
    appId: "1:518592340430:web:68f00a50226fad010d4b9f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let myName = "";
let currentRoomId = null;
let isHost = false;
let myHand = [];
let selectedIndices = [];
let hasDrawn = false;

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    let deck = [];
    SUITS.forEach(s => VALUES.forEach(v => deck.push({s, v})));
    return deck.sort(() => Math.random() - 0.5);
}

function getScore(v) {
    if (v === 'A') return 1;
    if (['J', 'Q', 'K', '10'].includes(v)) return 10;
    return parseInt(v);
}

function createRoom() {
    myName = document.getElementById('playerName').value.trim();
    if (!myName) return alert("กรุณาใส่ชื่อของคุณ");
    currentRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    isHost = true;
    db.ref('rooms/' + currentRoomId).set({
        gameState: "waiting",
        turn: 0,
        discardPile: [],
        deck: createDeck(),
        hasDrawn: false
    }).then(() => joinRoomLogic(currentRoomId, myName));
}

function joinRoom() {
    const rId = document.getElementById('roomInput').value.trim().toUpperCase();
    myName = document.getElementById('playerName').value.trim();
    if (!rId || !myName) return alert("ข้อมูลไม่ครบ");
    currentRoomId = rId;
    joinRoomLogic(rId, myName);
}

function joinRoomLogic(roomId, name) {
    document.getElementById('room-controls').style.display = 'none';
    document.getElementById('game-info').style.display = 'block';
    document.getElementById('room-id-display').style.display = 'block';
    document.getElementById('current-room-text').innerText = roomId;

    db.ref(`rooms/${roomId}/players/${name}`).update({ name: name });

    db.ref(`rooms/${roomId}`).on('value', (snap) => {
        const data = snap.val();
        if (!data) return;

        const playerKeys = Object.keys(data.players || {});
        const currentPlayerName = playerKeys[data.turn];
        hasDrawn = data.hasDrawn || false;

        const listHtml = playerKeys.map((p, idx) => `
            <div class="player-node ${idx === data.turn && data.gameState === 'playing' ? 'active' : ''}">
                <div style="font-weight:600; color:${idx === data.turn ? 'var(--primary)' : '#fff'}">${p === myName ? 'ME' : p}</div>
                <div style="font-size:0.6rem; color:var(--primary); margin:2px 0;">🏆 Win: ${data.players[p].winCount || 0}</div>
                <div style="font-size:0.6rem; opacity:0.6;">🎴 ${data.players[p].hand ? Object.keys(data.players[p].hand).length : 0} cards</div>
            </div>
        `).join('');
        document.getElementById('player-list-container').innerHTML = listHtml;

        document.getElementById('deck-count').innerText = data.deck ? data.deck.length : 0;
        const lastCard = data.discardPile ? data.discardPile[data.discardPile.length - 1] : null;
        if(lastCard) {
            const pileEl = document.getElementById('discard-pile');
            pileEl.innerText = `${lastCard.v}${lastCard.s}`;
            pileEl.style.color = (lastCard.s === '♥️' || lastCard.s === '♦️') ? 'var(--danger)' : '#fff';
        } else {
            document.getElementById('discard-pile').innerText = "🃏";
        }

        const isMyTurn = (currentPlayerName === myName && data.gameState === 'playing');
        
        if (data.players[myName]) {
            myHand = data.players[myName].hand || [];
            if (!isMyTurn || !hasDrawn) selectedIndices = [];
            renderHand(isMyTurn && hasDrawn); 
        }

        document.getElementById('player-actions').style.display = isMyTurn ? 'flex' : 'none';
        document.getElementById('pre-draw-actions').style.display = hasDrawn ? 'none' : 'flex';
        document.getElementById('discardBtn').style.display = hasDrawn ? 'block' : 'none';
        document.getElementById('action-hint').innerText = isMyTurn ? (hasDrawn ? "เลือกไพ่ที่เลขเหมือนกันเพื่อทิ้ง" : "จั่วไพ่เพิ่ม หรือกดแคง") : "รอผู้เล่นคนอื่น...";

        const announce = document.getElementById('table-announcement');
        if (data.gameState === 'ended') {
            announce.style.display = 'block';
            document.getElementById('winner-info').innerText = data.winner;
            if (isHost) document.getElementById('hostResetBtn').style.display = 'block';
        } else {
            announce.style.display = 'none';
        }

        if (isHost) document.getElementById('host-panel').style.display = (data.gameState === 'waiting') ? 'block' : 'none';
    });
}

function renderHand(isSelectable) {
    const container = document.getElementById('cards-container');
    container.innerHTML = "";
    let score = 0;
    
    myHand.forEach((card, index) => {
        score += getScore(card.v);
        const div = document.createElement('div');
        const isSelected = selectedIndices.includes(index);
        
        div.className = `card ${isSelected ? 'selected' : ''} ${!isSelectable ? 'disabled' : ''}`;
        div.innerText = `${card.v}${card.s}`;
        if (['♥️', '♦️'].includes(card.s)) div.style.color = "var(--danger)";
        
        if (isSelectable) {
            div.onclick = () => toggleSelectCard(index);
        }
        container.appendChild(div);
    });
    
    document.getElementById('my-score').innerText = score;
    document.getElementById('select-count').innerText = selectedIndices.length;

    if (score === 0 && myHand.length > 0 && !document.getElementById('table-announcement').style.display === 'block') {
        endGame(myName);
    }
}

function toggleSelectCard(index) {
    const pos = selectedIndices.indexOf(index);
    if (pos > -1) {
        selectedIndices.splice(pos, 1);
    } else {
        if (selectedIndices.length > 0) {
            const firstCardValue = myHand[selectedIndices[0]].v;
            if (myHand[index].v !== firstCardValue) {
                selectedIndices = [index];
            } else {
                selectedIndices.push(index);
            }
        } else {
            selectedIndices.push(index);
        }
    }
    renderHand(true);
}

function confirmDiscard() {
    if (selectedIndices.length === 0) return alert("กรุณาเลือกไพ่อย่างน้อย 1 ใบ");

    db.ref(`rooms/${currentRoomId}`).once('value', snap => {
        const data = snap.val();
        const pile = data.discardPile || [];
        const sortedIndices = [...selectedIndices].sort((a, b) => b - a);
        
        sortedIndices.forEach(idx => {
            const card = myHand.splice(idx, 1)[0];
            pile.push(card);
        });

        selectedIndices = [];
        
        db.ref(`rooms/${currentRoomId}`).update({
            [`players/${myName}/hand`]: myHand,
            discardPile: pile,
            turn: (data.turn + 1) % Object.keys(data.players).length,
            hasDrawn: false
        });
    });
}

function drawCard() {
    db.ref(`rooms/${currentRoomId}`).once('value', snap => {
        const data = snap.val();
        let deck = data.deck || [];
        if (deck.length === 0) return kang(); 
        
        myHand.push(deck.pop());
        db.ref(`rooms/${currentRoomId}`).update({
            [`players/${myName}/hand`]: myHand,
            deck: deck,
            hasDrawn: true
        });
    });
}

function kang() {
    db.ref(`rooms/${currentRoomId}`).once('value', snap => {
        const data = snap.val();
        const players = data.players;
        let winner = myName;
        let minScore = myHand.reduce((s, c) => s + getScore(c.v), 0);
        
        Object.keys(players).forEach(p => {
            const pHand = players[p].hand || [];
            let pScore = 0;
            pHand.forEach(c => pScore += getScore(c.v));
            if (pScore < minScore) {
                minScore = pScore;
                winner = p;
            }
        });
        endGame(winner);
    });
}

function startGame() {
    let deck = createDeck();
    let updates = { gameState: "playing", turn: 0, discardPile: [], winner: null, hasDrawn: false };
    db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        const players = snap.val();
        Object.keys(players).forEach(p => updates[`players/${p}/hand`] = deck.splice(0, 7));
        updates['deck'] = deck;
        db.ref(`rooms/${currentRoomId}`).update(updates);
    });
}

function endGame(winnerName) {
    db.ref(`rooms/${currentRoomId}`).update({ gameState: "ended", winner: winnerName });
    db.ref(`rooms/${currentRoomId}/players/${winnerName}/winCount`).transaction(c => (c || 0) + 1);
}