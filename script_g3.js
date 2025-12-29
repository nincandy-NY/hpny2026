const baseCards = [
    { val: 'A', title: 'โดนคนเดียว!', desc: 'คุณคือผู้โชคดี จัดไป 1 ดอกเต็มๆ' },
    { val: '2', title: 'หาเพื่อนโดน (1 คน)', desc: 'เลือกเพื่อนผู้โชคดีมาซวยด้วยกัน 1 คน' },
    { val: '3', title: 'หาเพื่อนโดน (2 คน)', desc: 'เลือกเพื่อนมาซวยด้วยกัน 2 คน' },
    { val: '4', title: 'เพื่อนฝั่งซ้ายโดน', desc: 'คนทางซ้ายมือของคุณต้องรับบทลงโทษ' },
    { val: '5', title: 'ห้าเฮฮา!', desc: 'ทุกคนโดนหมด! ชนแก้วพร้อมกัน' },
    { val: '6', title: 'เพื่อนฝั่งขวาโดน', desc: 'คนทางขวามือของคุณต้องรับบทลงโทษ' },
    { val: '7', title: 'ดวลปอด', desc: 'ลากเสียงยาวแข่งกัน ใครสั้นสุดแพ้และต้องผูกผ้าพันคอ' },
    { val: '8', title: 'พักผ่อน', desc: 'รอดตัว! พักได้ตามอัธยาศัย' },
    { val: '9', title: 'มินิเกม!', desc: 'เล่น SpyFall หรือทายชื่อจังหวัด ใครแพ้โดน!' },
    { val: '10', title: 'เลอะเทอะ!', desc: 'โดนแป้งโปะหน้าไป 1 ที' },
    { val: 'J', title: 'แจ็คจับหน้า', desc: 'คนจั่วได้จับหน้า ใครทำตามช้าสุด...โดน!' },
    { val: 'Q', title: 'แหม่มเพื่อนไม่คบ', desc: 'ห้ามใครคุยด้วย หรือตอบคำถามที่คุณถาม' },
    { val: 'K', title: 'กฎของคิง', desc: 'ทำตามกฎพิเศษที่ตกลงกันไว้ (เช่น ห้ามใช้มือชี้)' }
];

let deck = [];
let isAnimating = false;

function initDeck() {
    deck = [];
    baseCards.forEach(card => {
        for (let i = 0; i < 4; i++) {
            deck.push({ ...card });
        }
    });
    updateUI();
    resetDisplay();
}

const cardDisplay = document.getElementById('cardDisplay');
const cardText = cardDisplay.querySelector('.card-value');
const ruleTitle = document.getElementById('ruleTitle');
const ruleDesc = document.getElementById('ruleDesc');
const resetBtn = document.getElementById('resetBtn');
const cardCountEl = document.getElementById('cardCount');

function updateUI() {
    cardCountEl.textContent = deck.length;
}

function resetDisplay() {
    cardText.textContent = "?";
    ruleTitle.textContent = "เริ่มเกมใหม่แล้ว!";
    ruleDesc.textContent = "แตะที่ไพ่ด้านบนเพื่อเริ่มจั่ว";
    cardDisplay.style.background = "#2f3542";
    cardDisplay.style.pointerEvents = "auto";
    resetBtn.style.display = "none";
}

function drawCard() {
    // ป้องกันการกดรัวๆ หรือถ้าไพ่หมดแล้ว
    if (isAnimating || deck.length === 0) return;

    isAnimating = true;
    const randomIndex = Math.floor(Math.random() * deck.length);
    const card = deck[randomIndex];
    deck.splice(randomIndex, 1);

    cardDisplay.classList.add('animating');
    
    setTimeout(() => {
        cardText.textContent = card.val;
        ruleTitle.textContent = card.title;
        ruleDesc.textContent = card.desc;
        
        if (['J', 'Q', 'K', 'A'].includes(card.val)) {
            cardDisplay.style.background = 'linear-gradient(135deg, #ffa502, #ff7f50)';
        } else {
            cardDisplay.style.background = 'linear-gradient(135deg, #ff4757, #ee5253)';
        }
        updateUI();

        if (deck.length === 0) {
            ruleTitle.textContent = "จบเกม! ไพ่หมดสำรับ";
            ruleDesc.textContent = "กดปุ่มด้านล่างเพื่อเริ่มใหม่";
            cardDisplay.style.pointerEvents = "none";
            resetBtn.style.display = "inline-block";
        }
    }, 250);

    setTimeout(() => {
        cardDisplay.classList.remove('animating');
        isAnimating = false;
    }, 500);
}

// คลิกที่ตัวไพ่เพื่อจั่ว
cardDisplay.addEventListener('click', drawCard);
resetBtn.addEventListener('click', initDeck);

initDeck();