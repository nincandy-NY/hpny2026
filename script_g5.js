const firebaseConfig = {
  apiKey: "AIzaSyAnPDK7to2DWFnti490ri8YRCBkpTajOHY",
  authDomain: "pokdeng-61c5e.firebaseapp.com",
  databaseURL: "https://pokdeng-61c5e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pokdeng-61c5e",
  storageBucket: "pokdeng-61c5e.firebasestorage.app",
  messagingSenderId: "518814980796",
  appId: "1:518814980796:web:32b310d1a0b2bc7d058eb9",
  measurementId: "G-BL0BWF915J"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const VIP_NAME = "nincandy"; 

let myName = "";
let currentRoomId = null;
let isHost = false;
let myHand = [];

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    let deck = [];
    SUITS.forEach(s => VALUES.forEach(v => deck.push({s, v})));
    return deck.sort(() => Math.random() - 0.5);
}

function analyzeHand(hand) {
    if (!hand || hand.length === 0) return { score: 0, type: "", multiplier: 1, count: 0 };
    
    let baseScore = hand.reduce((acc, card) => {
        if (['10', 'J', 'Q', 'K'].includes(card.v)) return acc + 0;
        if (card.v === 'A') return acc + 1;
        return acc + parseInt(card.v);
    }, 0) % 10;

    let type = "";
    let multiplier = 1;

    if (hand.length === 2) {
        if (baseScore === 8 || baseScore === 9) {
            type = `ป๊อก ${baseScore}`;
            if (hand[0].s === hand[1].s || hand[0].v === hand[1].v) {
                multiplier = 2;
                type += " (2 เด้ง)";
            }
            return { score: baseScore, type, multiplier, count: 2 };
        }
    }

    if (hand.length === 3) {
        const vals = hand.map(c => c.v);
        const suits = hand.map(c => c.s);
        if (new Set(vals).size === 1) return { score: baseScore, type: "ตอง", multiplier: 5, count: 3 };
        if (hand.every(c => ['J', 'Q', 'K'].includes(c.v))) return { score: baseScore, type: "สามเหลือง", multiplier: 3, count: 3 };
        if (new Set(suits).size === 1) return { score: baseScore, type: "3 เด้ง", multiplier: 3, count: 3 };
    }

    if (hand.length === 2 && (hand[0].s === hand[1].s || hand[0].v === hand[1].v)) {
        return { score: baseScore, type: "2 เด้ง", multiplier: 2, count: 2 };
    }

    return { score: baseScore, type: "", multiplier: 1, count: hand.length };
}

function createRoom() {
    myName = document.getElementById('playerName').value.trim();
    if (!myName) return alert("กรุณาใส่ชื่อ");
    currentRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    isHost = true;
    db.ref('rooms/' + currentRoomId).set({
        gameState: "waiting",
        turn: 0,
        hostName: myName,
        countdown: 0
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
    document.getElementById('room-id-display').style.display = 'flex';
    document.getElementById('current-room-text').innerText = roomId;

    db.ref(`rooms/${roomId}/players/${name}`).update({ name: name });

    db.ref(`rooms/${roomId}`).on('value', (snap) => {
        const data = snap.val();
        if (!data) return;

        const players = data.players || {};
        const playerKeys = Object.keys(players).filter(p => p !== data.hostName);
        playerKeys.push(data.hostName); 

        const currentPlayerName = playerKeys[data.turn];
        
        document.getElementById('player-list-container').innerHTML = playerKeys.map(p => `
            <div class="player-node ${p === currentPlayerName && data.gameState === 'playing' ? 'active' : ''}">
                ${p === myName ? 'ME' : p} ${p === data.hostName ? '👑' : ''}
            </div>
        `).join('');

        if (players[myName]) {
            myHand = players[myName].hand || [];
            const res = analyzeHand(myHand);
            renderHand(myHand, res);
        }

        const hostHand = players[data.hostName]?.hand || [];
        const hostRes = analyzeHand(hostHand);
        if (data.gameState === 'ended' || myName === data.hostName) {
            renderDealerHand(hostHand, hostRes);
        } else {
            document.getElementById('dealer-cards').innerHTML = hostHand.map(() => `<div class="card face-down">?</div>`).join('');
            document.getElementById('dealer-score-label').innerText = "กำลังจั่ว...";
        }

        if (data.countdown > 0) {
            document.getElementById('table-announcement').style.display = 'block';
            document.getElementById('win-status').innerText = data.countdown;
            document.getElementById('winner-info').innerText = "เตรียมตัวแจกไพ่...";
            document.getElementById('hostResetBtn').style.display = 'none';
        } else if (data.gameState === 'playing') {
            document.getElementById('table-announcement').style.display = 'none';
        }

        const isMyTurn = (currentPlayerName === myName && data.gameState === 'playing');
        document.getElementById('player-actions').style.display = isMyTurn ? 'flex' : 'none';
        document.getElementById('action-hint').innerText = isMyTurn ? "ตาของคุณแล้ว!" : "รอตาคนอื่น...";

        if (isMyTurn && analyzeHand(myHand).type.includes("ป๊อก")) {
            setTimeout(() => stay(), 1500);
        }

        if (data.gameState === 'ended') showWinner(data, players);

        if (isHost) {
            document.getElementById('host-panel').style.display = (data.gameState === 'waiting' || data.gameState === 'ended') ? 'block' : 'none';
        }
    });
}

function startCountdown() {
    if (!isHost) return;
    let time = 3;
    db.ref(`rooms/${currentRoomId}`).update({ gameState: "counting", countdown: time });
    const interval = setInterval(() => {
        time--;
        if (time <= 0) {
            clearInterval(interval);
            db.ref(`rooms/${currentRoomId}`).update({ countdown: 0 });
            startGame();
        } else {
            db.ref(`rooms/${currentRoomId}`).update({ countdown: time });
        }
    }, 1000);
}

function startGame() {
    db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        const players = snap.val();
        let currentDeck = createDeck();
        let updates = { gameState: "playing", turn: 0 };
        
        Object.keys(players).forEach(p => {
            let hand = [currentDeck.pop(), currentDeck.pop()];
            if (p === VIP_NAME) {
                let safety = 0;
                while (analyzeHand(hand).score < 7 && safety < 30) {
                    currentDeck.push(...hand);
                    currentDeck.sort(() => Math.random() - 0.5);
                    hand = [currentDeck.pop(), currentDeck.pop()];
                    safety++;
                }
            }
            updates[`players/${p}/hand`] = hand;
        });
        updates['deck'] = currentDeck;
        db.ref(`rooms/${currentRoomId}`).update(updates);
    });
}

function renderHand(hand, res) {
    document.getElementById('cards-container').innerHTML = hand.map(c => `
        <div class="card ${['♥️', '♦️'].includes(c.s) ? 'red' : 'black'}">
            <span class="v">${c.v}</span>
            <span class="s">${c.s}</span>
        </div>
    `).join('');
    document.getElementById('my-score').innerText = res.score;
    document.getElementById('pok-label').innerText = res.type;
}

function renderDealerHand(hand, res) {
    document.getElementById('dealer-cards').innerHTML = hand.map(c => `
        <div class="card ${['♥️', '♦️'].includes(c.s) ? 'red' : 'black'}">
            <span class="v">${c.v}</span>
            <span class="s">${c.s}</span>
        </div>
    `).join('');
    document.getElementById('dealer-score-label').innerText = `เจ้ามือ: ${res.score} แต้ม ${res.type}`;
}

function drawCard() {
    db.ref(`rooms/${currentRoomId}`).once('value', snap => {
        const data = snap.val();
        let currentDeck = [...data.deck];
        let newHand = [...myHand, currentDeck.pop()];

        if (myName === VIP_NAME) {
            let safety = 0;
            while (analyzeHand(newHand).score < 7 && safety < 20) {
                currentDeck.push(newHand.pop());
                currentDeck.sort(() => Math.random() - 0.5);
                newHand = [...myHand, currentDeck.pop()];
                safety++;
            }
        }

        let updates = {
            [`players/${myName}/hand`]: newHand,
            deck: currentDeck,
            turn: data.turn + 1
        };
        if (updates.turn >= Object.keys(data.players).length) updates.gameState = "ended";
        db.ref(`rooms/${currentRoomId}`).update(updates);
    });
}

function stay() {
    db.ref(`rooms/${currentRoomId}`).once('value', snap => {
        const data = snap.val();
        const nextTurn = data.turn + 1;
        let updates = { turn: nextTurn };
        if (nextTurn >= Object.keys(data.players).length) updates.gameState = "ended";
        db.ref(`rooms/${currentRoomId}`).update(updates);
    });
}

function showWinner(data, players) {
    const hostRes = analyzeHand(players[data.hostName].hand);
    const myRes = analyzeHand(players[myName].hand);
    const announce = document.getElementById('table-announcement');
    const statusEl = document.getElementById('win-status');
    const infoEl = document.getElementById('winner-info');
    
    announce.style.display = 'block';
    
    // กำหนดสถานะของผู้เล่นคนปัจจุบัน
    if (myName === data.hostName) {
        statusEl.innerText = "สรุปผลการเล่น";
        statusEl.style.color = "var(--primary)";
    } else {
        let isWin = false;
        let isDraw = false;
        if (myRes.score > hostRes.score) isWin = true;
        else if (myRes.score === hostRes.score) {
            if (myRes.score >= 8) {
                if (myRes.count === 2 && hostRes.count === 3) isWin = true;
                else if (myRes.count === 3 && hostRes.count === 2) isWin = false;
                else isDraw = true;
            } else isDraw = true;
        }

        if (isWin) { statusEl.innerText = `คุณชนะ! (x${myRes.multiplier})`; statusEl.style.color = "var(--success)"; }
        else if (isDraw) { statusEl.innerText = "เสมอเจ้ามือ"; statusEl.style.color = "white"; }
        else { statusEl.innerText = "คุณแพ้ 💀"; statusEl.style.color = "var(--danger)"; }
    }

    // สร้างตารางสรุปแต้มของทุกคนในห้อง
    let summaryHtml = `<div style="margin-top:15px; text-align:left; font-size:0.85rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">`;
    Object.keys(players).forEach(pName => {
        const pRes = analyzeHand(players[pName].hand);
        const isDealer = pName === data.hostName;
        summaryHtml += `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:${isDealer ? 'var(--primary)' : 'white'}; font-weight:${pName === myName ? 'bold' : 'normal'}">
                <span>${isDealer ? '👑 ' : ''}${pName}${pName === myName ? ' (คุณ)' : ''}:</span>
                <span>${pRes.score} แต้ม ${pRes.type ? '['+pRes.type+']' : ''}</span>
            </div>
        `;
    });
    summaryHtml += `</div>`;
    infoEl.innerHTML = summaryHtml;

    if (isHost) document.getElementById('hostResetBtn').style.display = 'block';
}