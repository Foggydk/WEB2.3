// === ОСНОВНЫЕ НАСТРОЙКИ ===
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

// птица
let birdWidth = 34;
let birdHeight = 24;
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let birdImg;

let bird = {
    x: birdX,
    y: birdY,
    width: birdWidth,
    height: birdHeight
};

// трубы
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

// физика
let velocityX = -2;
let velocityY = 0;
let gravity = 0.4;

let gameOver = false;
let score = 0;
let animationId = null;
let pipeInterval = null;

// === ТАБЛИЦА ЛИДЕРОВ (localStorage) ===
let leaders = []; // массив {score, date}

// загрузка рекордов
function loadLeaders() {
    const stored = localStorage.getItem("flappy_leaders");
    if (stored) {
        try {
            leaders = JSON.parse(stored);
        } catch(e) { leaders = []; }
    }
    if (!leaders || leaders.length === 0) {
        // демо-рекорд для примера
        leaders = [
            { score: 42, date: "ЧЕМПИОН" },
            { score: 28, date: "ПРОФИ" },
            { score: 15, date: "НОВИЧОК" }
        ];
        saveLeaders();
    }
    leaders.sort((a,b) => b.score - a.score);
    if(leaders.length > 10) leaders = leaders.slice(0,10);
}

function saveLeaders() {
    localStorage.setItem("flappy_leaders", JSON.stringify(leaders));
}

// добавление нового рекорда
function addLeaderIfNeeded(finalScore) {
    if (finalScore === 0) return false;
    let added = false;
    // проверяем, входит ли в топ-10 или выше последнего
    leaders.push({ score: finalScore, date: new Date().toLocaleDateString() });
    leaders.sort((a,b) => b.score - a.score);
    if (leaders.length > 10) leaders = leaders.slice(0,10);
    saveLeaders();
    return true;
}

// отобразить таблицу лидеров в меню
function renderLeadersList() {
    const container = document.getElementById("leadersList");
    if (!container) return;
    if (!leaders.length) {
        container.innerHTML = '<div class="empty-leaders">🏆 Пока нет рекордов. Стань первым!</div>';
        return;
    }
    let html = "";
    leaders.forEach((lead, idx) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "📌";
        const dateStr = lead.date !== "ЧЕМПИОН" && lead.date !== "ПРОФИ" && lead.date !== "НОВИЧОК" 
            ? lead.date : "";
        html += `
            <div class="leader-item">
                <span>${medal} ${lead.score} очков</span>
                <span style="font-size:0.8rem;">${dateStr || ""}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function resetLeaders() {
    if (confirm("Сбросить все рекорды? 🗑 Вернуть демо-список?")) {
        leaders = [
            { score: 42, date: "ЧЕМПИОН" },
            { score: 28, date: "ПРОФИ" },
            { score: 15, date: "НОВИЧОК" }
        ];
        saveLeaders();
        renderLeadersList();
        alert("✅ Таблица лидеров сброшена к демо-рекордам");
    }
}

// === УПРАВЛЕНИЕ МЕНЮ ===
function showMainMenu() {
    let menu = document.getElementById("mainMenu");
    let leadersMenu = document.getElementById("leadersMenu");
    let canvas = document.getElementById("board");
    if (menu) menu.style.display = "flex";
    if (leadersMenu) leadersMenu.style.display = "none";
    if (canvas) canvas.style.display = "none";
}

function startGame() {
    // скрываем все меню
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("leadersMenu").style.display = "none";
    const canvas = document.getElementById("board");
    canvas.style.display = "block";
    
    // полный сброс игры
    resetGameVariables();
    
    // если анимация уже запущена - не дублируем
    if (animationId) cancelAnimationFrame(animationId);
    if (pipeInterval) clearInterval(pipeInterval);
    
    gameOver = false;
    score = 0;
    bird.y = birdY;
    velocityY = 0;
    pipeArray = [];
    
    // чистим поле и запускаем цикл
    if (context) context.clearRect(0, 0, board.width, board.height);
    
    animationId = requestAnimationFrame(update);
    pipeInterval = setInterval(placePipes, 1500);
}

function showLeaders() {
    renderLeadersList();
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("leadersMenu").style.display = "flex";
    document.getElementById("board").style.display = "none";
    // если игра активна — остановить циклы, чтобы не фонила
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (pipeInterval) {
        clearInterval(pipeInterval);
        pipeInterval = null;
    }
}

function hideLeaders() {
    document.getElementById("leadersMenu").style.display = "none";
    document.getElementById("mainMenu").style.display = "flex";
    document.getElementById("board").style.display = "none";
}

function resetGameVariables() {
    gameOver = false;
    score = 0;
    bird.y = birdY;
    velocityY = 0;
    pipeArray = [];
    if (context) context.clearRect(0, 0, board.width, board.height);
}

// === ИГРОВАЯ ЛОГИКА ===
function detectCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function placePipes() {
    if (gameOver) return;
    
    let randomPipeY = pipeY - pipeHeight/4 - Math.random() * (pipeHeight/2);
    let openingSpace = board.height/4;
    
    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    };
    pipeArray.push(topPipe);
    
    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    };
    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    // работаем, если игра активна или меню (на старте меню прыжок не рестартит, только при gameOver)
    if (!gameOver && (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyX")) {
        velocityY = -6;
        e.preventDefault();
    }
    // рестарт после game over
    if (gameOver && (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyX")) {
        e.preventDefault();
        // полный рестарт без возврата в меню
        resetGameAndRestart();
    }
}

function resetGameAndRestart() {
    // сброс всех параметров
    gameOver = false;
    score = 0;
    bird.y = birdY;
    velocityY = 0;
    pipeArray = [];
    // очищаем трубы и перезапускаем интервалы
    if (pipeInterval) {
        clearInterval(pipeInterval);
        pipeInterval = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    // запускаем заново
    pipeInterval = setInterval(placePipes, 1500);
    animationId = requestAnimationFrame(update);
}

function update() {
    if (!board || !context) return;
    requestAnimationFrame(update);
    if (gameOver) {
        // отрисовываем game over, но не обновляем физику
        context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
        for (let i = 0; i < pipeArray.length; i++) {
            let pipe = pipeArray[i];
            context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
        }
        context.fillStyle = "white";
        context.font = "bold 30px 'Courier New'";
        context.fillText("GAME OVER", board.width/2-90, board.height/2-40);
        context.font = "16px monospace";
        context.fillStyle = "#ffd966";
        context.fillText("ПРОБЕЛ / ↑ / X для рестарта", board.width/2-130, board.height/2+30);
        return;
    }
    
    context.clearRect(0, 0, board.width, board.height);
    
    // физика птицы
    velocityY += gravity;
    bird.y += velocityY;
    if (bird.y < 0) bird.y = 0;
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    
    // проверка падения вниз
    if (bird.y + bird.height > board.height) {
        gameOver = true;
        handleGameOver();
        return;
    }
    
    // трубы
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
        
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            pipe.passed = true;
            score += 0.5;
        }
        
        if (detectCollision(bird, pipe)) {
            gameOver = true;
            handleGameOver();
            return;
        }
    }
    
    // удаление труб за экраном
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }
    
    // отображение счета
    context.fillStyle = "#ffffff";
    context.font = "bold 32px 'Courier New'";
    context.shadowBlur = 0;
    context.fillText(Math.floor(score), 15, 55);
    context.font = "18px monospace";
    context.fillStyle = "#ffe0a3";
    context.fillText("SCORE", 15, 30);
}

function handleGameOver() {
    const finalScore = Math.floor(score);
    addLeaderIfNeeded(finalScore);
    // дополнительно обновить таблицу в меню (на всякий случай)
    renderLeadersList();
}

// === ЗАГРУЗКА РЕСУРСОВ И СТАРТ ===
window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");
    
    // загружаем таблицу лидеров
    loadLeaders();
    
    // загружаем изображения
    birdImg = new Image();
    birdImg.src = "./flappybird.png";
    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";
    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";
    
    // показываем главное меню
    showMainMenu();
    
    // события управления
    document.addEventListener("keydown", moveBird);
    // клик по канвасу для прыжка (для мобильных ощущений)
    board.addEventListener("click", (e) => {
        if (!gameOver) {
            velocityY = -6;
        } else if (gameOver) {
            resetGameAndRestart();
        }
        e.preventDefault();
    });
    
    // предзагрузка: отрисовка стартового кадра (чтобы не было пустоты)
    const waitImages = setInterval(() => {
        if (birdImg.complete && topPipeImg.complete && bottomPipeImg.complete) {
            clearInterval(waitImages);
            context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
        }
    }, 50);
};
