const wishes = [
    "ปีใหม่นี้ขอให้แกเจอคนดีๆนะ อย่างเช่นเราไง! จะอยู่กวนใจแกไปจนแก่ ไม่ต้องหนีไปไหนทั้งนั้นแหละ!",
    "ขอบคุณที่ทนคบเรามาได้ตั้งปี ปีหน้าก็ทนต่อไปนะ ถือว่าทำบุญล้างซวย จะได้มีเพื่อนไปแสบด้วยกันทุกที่",
    "ปีใหม่แล้ว... เลิกนิสัยขี้บ่นได้แล้วนะเพื่อน (เพราะเราจะบ่นแทนเอง) รักแกนะ ขอบคุณที่รับฟังกันเสมอ",
    "ขอให้แกเลิกโสดซะทีนะ คานมันเริ่มสั่นแล้ว! แต่ถ้าไม่มีใครเอาจริงๆ ก็ไม่ต้องห่วงนะ... เราก็นั่งเป็นเพื่อนแกบนคานนี่แหละ",
    "Happy New Year! ขอให้แกมีความสุขมากๆ แต่อย่าสุขเกินหน้าเกินตาเรานะ เดี๋ยวหมั่นไส้จนอยากแกล้งเพิ่ม",
    "ปีใหม่นี้ขอให้เงินไหลมาเทมา แต่อย่าไหลผ่านไปไวเหมือนสติแกนะ รักแกเสมอนะไอ้ตัวแสบ!",
    "ถึงแกจะเอ๋อๆ บ๊องๆ แต่แกก็เป็นเพื่อนที่เจ๋งที่สุดละ ปีหน้าก็ขอให้รั่วแบบนี้ต่อไปนะ โลกจะได้ไม่เงียบเหงา",
    "ขอบคุณที่คอยอยู่ฟังเราบ่นนะปีที่ผ่านมา ปีหน้าก็เตรียมหูไว้เลย บ่นต่อแน่นอน ห้ามบล็อกห้ามหนี!",
    "ปีใหม่นี้ขอให้แกเจอเนื้อคู่ที่ศีลเสมอกันนะ คือแปลว่าต้องบ้าพอๆ กับแกถึงจะคุยกันรู้เรื่อง!",
    "ขอให้ปีหน้าแกฉลาดขึ้นสักนิด แค่นิดเดียวพอ เดี๋ยวคนอื่นจำไม่ได้ว่านี่คือเพื่อนที่น่ารักของฉัน",
    "HNY เพื่อนรัก! ความเป็นเพื่อนของเราไม่มีวันเปลี่ยนหรอก รักนะจุ๊บๆ",
    "ขอให้ปี 2026 เป็นปีที่ใจดีกับแก เหมือนที่แกชอบคนเก่าเรา... ขอบคุณที่ซัพพอร์ตกันตลอดนะเพื่อน",
    "จะปีใหม่หรือปีไหนแกก็ยังเป็นเพื่อนเบอร์หนึ่งเสมอ... หมายถึงเบอร์หนึ่งเรื่องความปัญญาอ่อนนะ รักนะเว้ย!",
    "ขอให้แกมีความสุขเหมือนตอนที่ได้ไปเที่ยว และขอให้โชคดีเหมือนตอนที่เดาข้อสอบถูกนะจ๊ะ",
    "สุดท้ายนี้... ขอบคุณที่ยังเป็นเพื่อนกันอยู่ ไม่รู้จะไปหาเพื่อนที่เคมีตรงกันแบบแกได้ที่ไหนอีกแล้ว โชคดีปีใหม่นะแก"
];

function checkPassword() {
    const pass = document.getElementById('passwordInput').value;
    const correctPass = 'nincandy_hpny2026'; // รหัสผ่าน

    if (pass === correctPass) {
        const loginScreen = document.getElementById('login-screen');
        loginScreen.style.opacity = '0';
        loginScreen.style.transition = '0.8s';
        
        setTimeout(() => {
            loginScreen.style.display = 'none';
            const mainContent = document.getElementById('main-content');
            mainContent.style.display = 'flex';
            
            // สุ่มคำอวยพรและแสดงผล
            const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
            document.getElementById('wish-text').innerText = randomWish;
            
            initFireworks();
        }, 800);
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

function initFireworks() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor(x, y, color) {
            this.x = x; this.y = y; this.color = color;
            this.velocity = { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 };
            this.alpha = 1;
            this.friction = 0.95;
        }
        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        update() {
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= 0.01;
        }
    }

    function createFirework() {
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height * 0.5);
        const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
        for (let i = 0; i < 60; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (Math.random() < 0.05) createFirework();

        particles.forEach((p, i) => {
            if (p.alpha > 0) {
                p.update();
                p.draw();
            } else {
                particles.splice(i, 1);
            }
        });
    }
    animate();
}