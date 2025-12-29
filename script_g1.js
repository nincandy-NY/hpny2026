let candidates = JSON.parse(localStorage.getItem('luckyV6')) || [];
let historyLog = JSON.parse(localStorage.getItem('histV6')) || [];
const blackList = ["nincandy", "นินจา", "นิน","ninja","nin","จา","ja"];
const blacklist2 =["por","ป๋อ"];
let currentWinner = null; 

function renderUI() {
    const inputContainer = document.getElementById('name-list-inputs');
    inputContainer.innerHTML = '';
    candidates.forEach((person, index) => {
        const div = document.createElement('div');
        div.className = 'flex-row';
        div.innerHTML = `
            <input type="text" value="${person.name}" onchange="updateName(${index}, this.value)" placeholder="ชื่อ">
            <button onclick="removeCandidate(${index})" style="border:none; background:none; color:red; cursor:pointer;">✕</button>
        `;
        inputContainer.appendChild(div);
    });

    const statsBody = document.getElementById('stats-body');
    statsBody.innerHTML = candidates.map(p => `<tr><td>${p.name}</td><td style="text-align:right;"><strong>${p.total}</strong></td></tr>`).join('');

    const historyList = document.getElementById('history-list');
    if (historyLog.length === 0) {
        historyList.innerHTML = '<li style="color:#cbd5e1">ไม่มีประวัติ</li>';
    } else {
        // แก้ไขให้แสดงคำว่า "รอด" ในประวัติให้ถูกต้อง
        historyList.innerHTML = historyLog.map(h => `<li><span style="font-weight:bold">${h.name}</span> <span>${h.cups === "รอด" ? "รอด 😇" : h.cups + " แก้ว"}</span></li>`).join('');
    }
}

// ฟังก์ชันเพิ่มรายชื่อ (เพิ่มกลับเข้าไป)
function addCandidate() {
    candidates.push({ name: "", chance: 50, total: 0 });
    renderUI();
}

// ฟังก์ชันอัปเดตชื่อพร้อมตรวจ Blacklist เพื่อปรับโอกาส
function updateName(index, val) {
    const name = val.trim();
    candidates[index].name = name;
    if (blackList.includes(name.toLowerCase())) {
        candidates[index].chance = 30; // ถ้าเป็นชื่อใน blacklist ให้โอกาสสุ่มโดนน้อยลง (หรือมากขึ้นตามต้องการ)
    } else if (blacklist2.includes(name.toLowerCase())) {
        candidates[index].chance = 50;
    } else {
        candidates[index].chance = 80;
    }
}

function removeCandidate(index) { candidates.splice(index, 1); renderUI(); }

function saveAndHide() {
    localStorage.setItem('luckyV6', JSON.stringify(candidates));
    document.getElementById('setup-area').classList.add('hidden');
    document.getElementById('edit-mode-btn').classList.remove('hidden');
    renderUI();
}

function showSetup() {
    document.getElementById('setup-area').classList.remove('hidden');
    document.getElementById('edit-mode-btn').classList.add('hidden');
}

function resetOnlyStats() {
    if(confirm("ต้องการรีเซ็ตยอดแก้วและประวัติการสุ่มใช่หรือไม่?")) {
        candidates.forEach(c => c.total = 0);
        historyLog = [];
        document.getElementById('winner-name').innerText = "พร้อมสุ่ม!";
        document.getElementById('cup-count').innerText = "";
        document.getElementById('cup-count').classList.remove('survive-text');
        localStorage.setItem('luckyV6', JSON.stringify(candidates));
        localStorage.setItem('histV6', JSON.stringify(historyLog));
        renderUI();
    }
}

function spin() {
    if (candidates.length === 0) return alert("กรุณาเพิ่มรายชื่อก่อนครับ");
    
    // ใช้ค่า chance จากตัว candidate เองที่ถูกตั้งไว้ตอน updateName
    const totalChance = candidates.reduce((s, c) => s + (c.chance || 50), 0);
    
    let rand = Math.random() * totalChance;
    let winnerIndex = 0;
    for (let i = 0; i < candidates.length; i++) {
        let weight = candidates[i].chance || 50;
        if (rand < weight) { winnerIndex = i; break; }
        rand -= weight;
    }

    currentWinner = candidates[winnerIndex];
    document.getElementById('winner-name').innerText = currentWinner.name;
    
    const cupDisplay = document.getElementById('cup-count');
    cupDisplay.innerText = "รอลุ้นจำนวนแก้ว...";
    cupDisplay.classList.remove('survive-text'); // ล้างสีเขียวหายไปทันทีที่กดสุ่มคนใหม่
    
    document.getElementById('spin-btn').classList.add('hidden');
    document.getElementById('spin-cups-btn').classList.remove('hidden');
}

function spinCups() {
    if (!currentWinner) return;

    const min = parseInt(document.getElementById('min-cups').value) || 1;
    const max = parseInt(document.getElementById('max-cups').value) || 5;

    // โอกาสรอด: Blacklist รอด 70% (ตามโค้ดที่คุณส่งมา), คนปกติ 20%
    const surviveChance = blackList.includes(currentWinner.name.toLowerCase()) ? 0.70 : 0.20;
    
    let cups;
    const cupDisplay = document.getElementById('cup-count');
    
    if (Math.random() < surviveChance) {
        cups = 0;
        cupDisplay.innerText = "รอด!!";
        cupDisplay.classList.add('survive-text');
    } else {
        cups = Math.floor(Math.random() * (max - min + 1)) + min;
        cupDisplay.innerText = `${cups} แก้ว 🥤`;
    }

    currentWinner.total += cups;
    historyLog.unshift({ name: currentWinner.name, cups: cups === 0 ? "รอด" : cups });
    if (historyLog.length > 3) historyLog.pop();

    document.getElementById('spin-btn').classList.remove('hidden');
    document.getElementById('spin-btn').innerText = "สุ่มรอบต่อไป";
    document.getElementById('spin-cups-btn').classList.add('hidden');

    renderUI();
    localStorage.setItem('luckyV6', JSON.stringify(candidates));
    localStorage.setItem('histV6', JSON.stringify(historyLog));
    currentWinner = null; 
}

document.getElementById('spin-cups-btn').onclick = spinCups;
document.getElementById('add-name-btn').onclick = addCandidate;
document.getElementById('spin-btn').onclick = spin;
renderUI();