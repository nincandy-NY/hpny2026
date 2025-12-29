let players = [];
let availablePlayers = [];
let actions = {}; 
let currentRoomId = null;
let isHost = false;
let myName = "";
let limitPerPerson = 0;
let gameState = "setup"; 
let stats = {};
let historyData = [];

function goHome() {
        window.location.href = "https://nincandy-ny.github.io/hpny2026/"; // เปลี่ยนจาก reload เป็นกลับหน้าหลัก
    }

function createRoom() {
    myName = document.getElementById('playerName').value.trim();
    limitPerPerson = parseInt(document.getElementById('actionLimit').value) || 3;
    if (!myName) return alert("กรุณาใส่ชื่อของคุณก่อนครับ");

    currentRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    isHost = true;

    db.ref('rooms/' + currentRoomId).set({
        config: { limit: limitPerPerson },
        players: {},
        actions: {},
        gameState: "setup",
        history: {},
        isCounting: false,
        stats: {}
    }).then(() => joinRoomLogic(currentRoomId, myName, true));
}

function joinRoom() {
    const rId = document.getElementById('roomInput').value.trim().toUpperCase();
    myName = document.getElementById('playerName').value.trim();
    if (!rId || !myName) return alert("กรุณากรอกชื่อและรหัสห้องให้ครบ");

    currentRoomId = rId;
    isHost = false;
    joinRoomLogic(rId, myName, false);
}

function joinRoomLogic(roomId, name, hostStatus) {
    document.getElementById('room-controls').style.display = 'none';
    document.getElementById('game-info').style.display = 'block';
    document.getElementById('roomDisplay').innerText = roomId;
    document.getElementById('myRole').innerText = name + (hostStatus ? " (Host)" : "");

    db.ref(`rooms/${roomId}/players`).push({ name: name, host: hostStatus });

    // ฟังก์ชันสำหรับ Host: คอยฟังคำสั่งสุ่มต่อจากเครื่องอื่น
    if (hostStatus) {
        db.ref(`rooms/${roomId}/nextRoundTrigger`).on('value', (snap) => {
            if (snap.exists()) {
                db.ref(`rooms/${roomId}/actions`).once('value', (actionSnap) => {
                    if (actionSnap.exists()) {
                        // หน่วงเวลา 3 วิเพื่อให้ทุกคนเห็นผลลัพธ์คนล่าสุดก่อนเริ่มรอบใหม่
                        setTimeout(() => startCountdown(), 3000);
                    }
                });
            }
        });
    }

    db.ref(`rooms/${roomId}`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        gameState = data.gameState || "setup";
        stats = data.stats || {}; 
        players = data.players ? Object.values(data.players).map(p => p.name) : [];
        actions = data.actions || {}; 
        const actionList = Object.values(actions);
        
        document.getElementById('remainingActions').innerText = actionList.length;
        limitPerPerson = data.config ? data.config.limit : 3;
        availablePlayers = data.availablePlayers || [];
        historyData = data.history ? Object.values(data.history).reverse() : [];

        const inputArea = document.getElementById('action-input-area');
        const hostPanel = document.getElementById('host-panel');
        const resultCard = document.getElementById('resultCard');
        const countdownEl = document.getElementById('countdown-overlay');

        if(gameState === "setup") {
            resultCard.style.display = 'none';
            const myCount = actionList.filter(a => a.by === myName).length;
            const remaining = limitPerPerson - myCount;
            
            if(remaining > 0) {
                inputArea.style.display = 'block';
                inputArea.innerHTML = `
                    <div class="input-group">
                        <p style="color: #ff9f43; font-size: 0.9rem;">คุณต้องเขียนอีก ${remaining} ข้อ</p>
                        <input type="text" id="actionText" placeholder="พิมพ์คำสั่ง/คำถามที่นี่...">
                        <div class="row-group">
                            <input type="number" id="penalty" placeholder="แก้ว" min="1" value="1" style="flex: 1;">
                            <button onclick="addAction()" class="btn-add" style="flex: 2;">ส่ง</button>
                        </div>
                    </div>`;
            } else {
                inputArea.innerHTML = `<div style="padding: 20px; color: #2ecc71; font-weight: bold;">✅ ส่งครบแล้ว รอเริ่มเกม</div>`;
            }
            if(isHost) updateHostDashboard(actions);
        } else {
            inputArea.style.display = 'none';
        }

        if (isHost) hostPanel.style.display = (gameState === "setup") ? 'block' : 'none';

        if (data.isCounting) {
            resultCard.style.display = 'none';
            countdownEl.style.display = 'block';
            countdownEl.innerText = data.countdownValue || "3";
        } else {
            countdownEl.style.display = 'none';
            if (data.lastResult && gameState === "playing") {
                resultCard.style.display = 'block';
                displayResult(data.lastResult.player, data.lastResult.action, data.lastResult.status);
                document.getElementById('resetRoomBtn').style.display = (actionList.length === 0 && data.lastResult.status) ? 'block' : 'none';
            }
        }

        updateStatsUI();
        updateHistoryUI();
        document.getElementById('playerBadgeContainer').innerHTML = players.map(p => `<span class="badge">${p}</span>`).join('');
    });
}

function handleDecision(type) {
    db.ref(`rooms/${currentRoomId}`).once('value', (snapshot) => {
        const data = snapshot.val();
        if(!data || !data.lastResult) return;
        
        const player = data.lastResult.player;
        const action = data.lastResult.action;
        const actionId = data.lastResult.actionId;

        if (type === 'drink') {
            const currentStat = (data.stats && data.stats[player]) ? parseInt(data.stats[player]) : 0;
            db.ref(`rooms/${currentRoomId}/stats/${player}`).set(currentStat + parseInt(action.penalty));
        }

        db.ref(`rooms/${currentRoomId}/history`).push({
            player: player, type: type, text: action.text, penalty: action.penalty 
        });

        if (actionId) db.ref(`rooms/${currentRoomId}/actions/${actionId}`).remove();

        // อัปเดตสถานะและส่งสัญญาณ Trigger ให้เครื่อง Host สุ่มต่อ
        db.ref(`rooms/${currentRoomId}/lastResult`).update({ status: type });
        db.ref(`rooms/${currentRoomId}/nextRoundTrigger`).set(Date.now());
    });
}

function startCountdown() {
    if (!isHost) return;
    let count = 3;
    db.ref(`rooms/${currentRoomId}`).update({ isCounting: true, countdownValue: count, nextRoundTrigger: null });
    const timer = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(timer);
            db.ref(`rooms/${currentRoomId}`).update({ isCounting: false });
            drawRound();
        } else {
            db.ref(`rooms/${currentRoomId}/countdownValue`).set(count);
        }
    }, 1000);
}

function drawRound() {
    if (!isHost) return;
    db.ref(`rooms/${currentRoomId}`).once('value', (snapshot) => {
        const data = snapshot.val();
        const currentActions = data.actions || {};
        const actionKeys = Object.keys(currentActions);
        if (actionKeys.length === 0) return;

        let pool = (data.availablePlayers && data.availablePlayers.length > 0) ? [...data.availablePlayers] : [...players];
        const pIndex = Math.floor(Math.random() * pool.length);
        const selectedPlayer = pool[pIndex];

        let validKeys = actionKeys.filter(key => currentActions[key].by !== selectedPlayer);
        if (validKeys.length === 0) validKeys = actionKeys;
        
        const randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];
        const selectedAction = currentActions[randomKey];
        
        pool.splice(pIndex, 1);
        db.ref(`rooms/${currentRoomId}`).update({
            lastResult: { 
                player: selectedPlayer, 
                action: { text: selectedAction.text, penalty: selectedAction.penalty },
                actionId: randomKey,
                status: null 
            },
            availablePlayers: pool
        });
    });
}

function updateStatsUI() {
    document.getElementById('statsList').innerHTML = players.map(p => 
        `<div><span>🍺 ${p}</span> <b>${stats[p] || 0} แก้ว</b></div>`
    ).join('');
}

function displayResult(player, action, status) {
    document.getElementById('displayPlayer').innerText = player;
    document.getElementById('displayAction').innerText = action.text;
    document.getElementById('actionPenaltyAmount').innerText = action.penalty; 
    
    const decisionArea = document.getElementById('decision-area');
    const penaltyBox = document.getElementById('penaltyBox');
    const penaltyWarning = document.getElementById('penaltyWarning');

    if (!status) {
        penaltyBox.style.display = 'none';
        penaltyWarning.style.display = 'block';
        decisionArea.style.display = (myName === player) ? 'flex' : 'none';
    } else {
        decisionArea.style.display = 'none';
        penaltyWarning.style.display = 'none';
        penaltyBox.style.display = 'inline-block';
        penaltyBox.innerText = (status === 'drink') ? `🍺 ดื่มไป ${action.penalty} แก้ว!` : `✅ ตอบคำถามแล้ว`;
    }
}

function addAction() {
    const text = document.getElementById('actionText').value.trim();
    const penalty = document.getElementById('penalty').value;
    if (text) {
        db.ref(`rooms/${currentRoomId}/actions`).push({ text, penalty, by: myName });
    }
}

function updateHostDashboard(actionsObj) {
    const actionList = Object.values(actionsObj);
    let allReady = true;
    let html = players.map(p => {
        const count = actionList.filter(a => a.by === p).length;
        const remaining = limitPerPerson - count;
        if(remaining > 0) allReady = false;
        return `<div><span>${p}</span> <span style="color: ${remaining === 0 ? '#2ecc71' : '#ff9f43'}">${remaining === 0 ? '✅' : 'ขาด '+remaining}</span></div>`;
    }).join('');
    document.getElementById('hostProgressList').innerHTML = html;
    document.getElementById('startGameBtn').disabled = !(allReady && players.length >= 2);
    document.getElementById('hostWarning').style.display = (allReady && players.length >= 2) ? "none" : "block";
}

function startGame() { if(isHost) db.ref(`rooms/${currentRoomId}`).update({ gameState: "playing", availablePlayers: [] }).then(() => startCountdown()); }
function resetRoom() { if(isHost) db.ref(`rooms/${currentRoomId}`).update({ gameState: "setup", lastResult: null, availablePlayers: [], isCounting: false }); }
function resetStats() { if(isHost && confirm("รีเซ็ตสถิติ?")) db.ref(`rooms/${currentRoomId}/stats`).remove(); }

// แสดงผลประวัติล่าสุดเพียง 1 รายการ
function updateHistoryUI() {
    const list = document.getElementById('historyList');
    if (historyData.length === 0) {
        list.innerHTML = "<p style='font-size:0.8rem; opacity:0.5;'>ยังไม่มีประวัติ</p>";
        return;
    }
    const h = historyData[0]; // ดึงข้อมูลคนล่าสุดตัวเดียว
    list.innerHTML = `
        <div class="history-item" style="border-left: 4px solid ${h.type === 'drink' ? 'var(--primary)' : '#2ecc71'}">
            <b>${h.player}</b>: ${h.type === 'drink' ? `🍺 ดื่ม (${h.penalty} แก้ว)` : '✅ ตอบคำถามแล้ว'}
            <div style="font-size: 0.75rem; opacity: 0.6;">${h.text}</div>
        </div>
    `;
}