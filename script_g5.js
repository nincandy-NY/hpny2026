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

// --- ระบบสลับโหมด VIP (เนียนขึ้น) ---
let vipRoundCounter = 0; 
let currentVipMode = true; // true = ช่วย, false = ไม่ช่วย
let modeThreshold = 2; // จำนวนตาที่จะอยู่ในโหมดนั้นๆ

function updateVipLogic() {
    vipRoundCounter++;
    if (vipRoundCounter >= modeThreshold) {
        vipRoundCounter = 0;
        currentVipMode = !currentVipMode;
        // สุ่มรอบถัดไป: ถ้าโหมดช่วย (สุ่ม 2-3 ตา), ถ้าโหมดไม่ช่วย (สุ่ม 1-2 ตา)
        modeThreshold = currentVipMode ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 2) + 1;
        console.log(`VIP Next Mode: ${currentVipMode ? 'HELP' : 'NORMAL'} for ${modeThreshold} rounds`);
    }
}
// ------------------------------

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    let deck = [];
    SUITS.forEach(s => VALUES.forEach(v => deck.push({s, v})));
    return deck.sort(() => Math.random() - 0.5);
}

function analyzeHand(hand) {
    if (!hand || hand.length === 0) return { score: 0, type: "", multiplier: 1, count: 0, rank: 0 };
    
    let baseScore = hand.reduce((acc, card) => {
        if (['10', 'J', 'Q', 'K'].includes(card.v)) return acc + 0;
        if (card.v === 'A') return acc + 1;
        return acc + parseInt(card.v);
    }, 0) % 10;

    let type = "";
    let multiplier = 1;
    let rank = 0; 

    if (hand.length === 2) {
        if (baseScore === 8 || baseScore === 9) {
            type = `ป๊อก ${baseScore}`;
            multiplier = (hand[0].s === hand[1].s || hand[0].v === hand[1].v) ? 2 : 1;
            if (multiplier === 2) type += " (2 เด้ง)";
            return { score: baseScore, type, multiplier, count: 2, rank: 10 };
        }
        if (hand[0].s === hand[1].s || hand[0].v === hand[1].v) {
            return { score: baseScore, type: "2 เด้ง", multiplier: 2, count: 2, rank: 0 };
        }
    }

    if (hand.length === 3) {
        const valMap = {'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10};
        const vals = hand.map(c => valMap[c.v] || parseInt(c.v)).sort((a, b) => a - b);
        
        if (new Set(hand.map(c => c.v)).size === 1) {
            return { score: baseScore, type: "ตอง", multiplier: 5, count: 3, rank: 3 };
        }
        const isStraight = (vals[1] === vals[0] + 1) && (vals[2] === vals[1] + 1);
        if (isStraight) {
            return { score: baseScore, type: "เรียง", multiplier: 3, count: 3, rank: 2 };
        }
        if (hand.every(c => ['J', 'Q', 'K'].includes(c.v))) {
            return { score: baseScore, type: "สามเหลือง", multiplier: 3, count: 3, rank: 1 };
        }
        if (new Set(hand.map(c => c.s)).size === 1) {
            return { score: baseScore, type: "3 เด้ง", multiplier: 3, count: 3, rank: 0 };
        }
    }
    return { score: baseScore, type: "", multiplier: 1, count: hand.length, rank: 0 };
}

function getWinnerResult(playerRes, hostRes) {
    if (playerRes.rank > hostRes.rank) return { win: true, draw: false };
    if (playerRes.rank < hostRes.rank) return { win: false, draw: false };
    if (playerRes.score > hostRes.score) return { win: true, draw: false };
    if (playerRes.score < hostRes.score) return { win: false, draw: false };
    if (playerRes.count < hostRes.count) return { win: true, draw: false };
    if (playerRes.count > hostRes.count) return { win: false, draw: false };
    return { win: false, draw: true };
}

function getBestHandForVIP(deck, cardCount) {
    let bestHand = [];
    let bestRank = -1;
    let bestScore = -1;

    for (let i = 0; i < 50; i++) {
        let tempDeck = [...deck].sort(() => Math.random() - 0.5);
        let testHand = [];
        for(let j=0; j<cardCount; j++) testHand.push(tempDeck.pop());
        
        let res = analyzeHand(testHand);
        if (res.rank > bestRank || (res.rank === bestRank && res.score > bestScore)) {
            bestRank = res.rank;
            bestScore = res.score;
            bestHand = testHand;
        }
        if (bestRank >= 2) break;
    }
    return bestHand;
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
            renderHand(myHand, analyzeHand(myHand));
        }

        const hostHand = players[data.hostName]?.hand || [];
        if (data.gameState === 'ended' || myName === data.hostName) {
            renderDealerHand(hostHand, analyzeHand(hostHand));
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

        if (isMyTurn && analyzeHand(myHand).rank === 10) {
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
    updateVipLogic(); // อัปเดตโหมด VIP ทุกครั้งที่เริ่มตาใหม่
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
            let hand;
            // ใช้ currentVipMode ในการตัดสินใจว่าตาปัจจุบันจะช่วยหรือไม่
            if (p === VIP_NAME && currentVipMode) {
                hand = getBestHandForVIP(currentDeck, 2);
                hand.forEach(vh => {
                    const idx = currentDeck.findIndex(dc => dc.v === vh.v && dc.s === vh.s);
                    if (idx > -1) currentDeck.splice(idx, 1);
                });
            } else {
                hand = [currentDeck.pop(), currentDeck.pop()];
            }
            updates[`players/${p}/hand`] = hand;
        });
        updates['deck'] = currentDeck;
        db.ref(`rooms/${currentRoomId}`).update(updates);
    });
}

function drawCard() {
    db.ref(`rooms/${currentRoomId}`).once('value', snap => {
        const data = snap.val();
        let currentDeck = [...data.deck];
        let newHand;

        // การจั่วไพ่จะอิงตามโหมดปัจจุบันของตาที่เล่นอยู่
        if (myName === VIP_NAME && currentVipMode) {
            let bestThirdCardIdx = -1;
            let bestRank = -1;
            
            for(let i=0; i < Math.min(20, currentDeck.length); i++) {
                let testHand = [...myHand, currentDeck[i]];
                let res = analyzeHand(testHand);
                if (res.rank > bestRank) {
                    bestRank = res.rank;
                    bestThirdCardIdx = i;
                }
            }
            
            let card;
            if (bestThirdCardIdx > -1) {
                card = currentDeck.splice(bestThirdCardIdx, 1)[0];
            } else {
                card = currentDeck.pop();
            }
            newHand = [...myHand, card];
        } else {
            newHand = [...myHand, currentDeck.pop()];
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

function showWinner(data, players) {
    const hostRes = analyzeHand(players[data.hostName].hand);
    const myRes = analyzeHand(players[myName].hand);
    const announce = document.getElementById('table-announcement');
    const statusEl = document.getElementById('win-status');
    const infoEl = document.getElementById('winner-info');
    
    announce.style.display = 'block';
    
    if (myName === data.hostName) {
        statusEl.innerText = "สรุปผลการเล่น (เจ้ามือ)";
        statusEl.style.color = "var(--primary)";
    } else {
        const res = getWinnerResult(myRes, hostRes);
        if (res.win) { 
            statusEl.innerText = `คุณชนะ! (x${myRes.multiplier})`; 
            statusEl.style.color = "var(--success)"; 
        } else if (res.draw) { 
            statusEl.innerText = "เสมอเจ้ามือ"; 
            statusEl.style.color = "white"; 
        } else { 
            statusEl.innerText = "คุณแพ้ 💀"; 
            statusEl.style.color = "var(--danger)"; 
        }
    }

    let summaryHtml = `<div style="margin-top:15px; text-align:left; font-size:0.85rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">`;
    Object.keys(players).forEach(pName => {
        const pRes = analyzeHand(players[pName].hand);
        const isDealer = pName === data.hostName;
        let statusBadge = "";
        
        if (!isDealer) {
            const pResult = getWinnerResult(pRes, hostRes);
            if (pResult.win) statusBadge = `<span style="color:var(--success)">[ชนะ x${pRes.multiplier}]</span>`;
            else if (pResult.draw) statusBadge = `<span style="color:white">[เสมอ]</span>`;
            else statusBadge = `<span style="color:var(--danger)">[แพ้]</span>`;
        } else {
            statusBadge = `<span style="color:var(--primary)">[เจ้ามือ]</span>`;
        }
        summaryHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; color:white;">
            <span>${isDealer ? '👑 ' : ''}${pName}</span>
            <span>${pRes.type || pRes.score + ' แต้ม'} ${statusBadge}</span>
        </div>`;
    });
    infoEl.innerHTML = summaryHtml;
    if (isHost) document.getElementById('hostResetBtn').style.display = 'block';
}
