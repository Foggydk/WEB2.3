// board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

// bird
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

// pipes
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

// physics - УМЕНЬШЕННАЯ ГРАВИТАЦИЯ
let velocityX = -2;
let velocityY = 0;
let gravity = 0.15;  // <-- ОЧЕНЬ МАЛЕНЬКАЯ (было 0.4)

let gameOver = false;
let score = 0;
let gameLoop = null;
let pipeGenerator = null;

// Таблица лидеров
let leaders = [];

function loadLeaders() {
    const stored = localStorage.getItem("flappy_leaders");
    if (stored) {
        try {
            leaders = JSON.parse(stored);
        } catch(e) { 
            leaders = [];
        }
    }
    if (!leaders || leaders.length === 0) {
        leaders = [
            { score: 42, name: "ЧЕМПИОН" },
            { score: 28, name: "ПРОФИ" },
            { score: 15, name: "НОВИЧОК" }
        ];
        saveLeaders();
    }
    leaders.sort((a, b) => b.score - a.score);
    if (leaders.length > 10) leaders = leaders.slice(0, 10);
}

function saveLeaders() {
    localStorage.setItem("flappy_leaders", JSON.stringify(leaders));
}

function addLeaderIfNeeded(finalScore) {
    if (finalScore === 0) return false;
    leaders.push({ score: finalScore, name: "ИГРОК" });
    leaders.sort((a, b) => b.score - a.score);
    if (leaders.length > 10) leaders = leaders.slice(0, 10);
    saveLeaders();
    return true;
}

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
        html += `
            <div class="leader-item">
                <span>${medal} ${lead.score} очков</span>
                <span style="font-size:0.8rem;">${lead.name}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function resetLeaders() {
    if (confirm("Сбросить все рекорды?")) {
        leaders = [
            { score: 42, name: "ЧЕМПИОН" },
            { score: 28, name: "ПРОФИ" },
            { score: 15, name: "НОВИЧОК" }
        ];
        saveLeaders();
        renderLeadersList();
        alert("Таблица лидеров сброшена");
    }
}

function showMainMenu() {
    document.getElementById("mainMenu").style.display = "flex";
    document.getElementById("leadersMenu").style.display = "none";
    document.getElementById("board").style.display = "none";
    
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    if (pipeGenerator) {
        clearInterval(pipeGenerator);
        pipeGenerator = null;
    }
}

function startGame() {
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("leadersMenu").style.display = "none";
    const canvas = document.getElementById("board");
    canvas.style.display = "block";
    
    gameOver = false;
    score = 0;
    bird.y = birdY;
    velocityY = 0;
    pipeArray = [];
    
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }
    if (pipeGenerator) {
        clearInterval(pipeGenerator);
    }
    
    pipeGenerator = setInterval(placePipes, 1500);
    gameLoop = requestAnimationFrame(update);
}

function showLeaders() {
    renderLeadersList();
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("leadersMenu").style.display = "flex";
    document.getElementById("board").style.display = "none";
    
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    if (pipeGenerator) {
        clearInterval(pipeGenerator);
        pipeGenerator = null;
    }
}

function hideLeaders() {
    document.getElementById("leadersMenu").style.display = "none";
    document.getElementById("mainMenu").style.display = "flex";
}

function moveBird(e) {
    if (!gameOver && (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX")) {
        velocityY = -6;
        e.preventDefault();
    }
    if (gameOver && (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX")) {
        e.preventDefault();
        resetGame();
    }
}

function resetGame() {
    gameOver = false;
    score = 0;
    bird.y = birdY;
    velocityY = 0;
    pipeArray = [];
    
    if (pipeGenerator) {
        clearInterval(pipeGenerator);
    }
    pipeGenerator = setInterval(placePipes, 1500);
}

function placePipes() {
    if (gameOver) return;
    
    let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    let openingSpace = boardHeight / 4;
    
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

function detectCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function update() {
    if (!context) return;
    
    // ОТЛАДКА: выводим текущую гравитацию и скорость
    console.log("Текущая gravity =", gravity, "velocityY =", velocityY);
    
    gameLoop = requestAnimationFrame(update);
    
    if (gameOver) {
        context.fillStyle = "white";
        context.font = "bold 30px 'Courier New'";
        context.fillText("GAME OVER", boardWidth / 2 - 90, boardHeight / 2 - 40);
        context.font = "16px monospace";
        context.fillStyle = "#ffd966";
        context.fillText("ПРОБЕЛ / ↑ / X для рестарта", boardWidth / 2 - 130, boardHeight / 2 + 30);
        return;
    }
    
    context.clearRect(0, 0, board.width, board.height);
    
    // Bird physics
    velocityY += gravity;
    bird.y += velocityY;
    
    if (bird.y < 0) {
        bird.y = 0;
        velocityY = 0;
    }
    
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    
    if (bird.y + bird.height > board.height) {
        gameOver = true;
        const finalScore = Math.floor(score);
        addLeaderIfNeeded(finalScore);
        renderLeadersList();
        return;
    }
    
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
        
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5;
            pipe.passed = true;
        }
        
        if (detectCollision(bird, pipe)) {
            gameOver = true;
            const finalScore = Math.floor(score);
            addLeaderIfNeeded(finalScore);
            renderLeadersList();
            return;
        }
    }
    
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }
    
    context.fillStyle = "white";
    context.font = "bold 32px 'Courier New'";
    context.fillText(Math.floor(score), 15, 55);
    context.font = "18px monospace";
    context.fillStyle = "#ffe0a3";
    context.fillText("SCORE", 15, 30);
}

function handleCanvasClick(e) {
    if (!gameOver) {
        velocityY = -6;
    } else {
        resetGame();
    }
    e.preventDefault();
}

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");
    
    loadLeaders();
    
    birdImg = new Image();
    birdImg.src = "./flappybird.png";
    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";
    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";
    
    let imagesLoaded = 0;
    function imageLoaded() {
        imagesLoaded++;
        if (imagesLoaded === 3) {
            showMainMenu();
        }
    }
    
    birdImg.onload = imageLoaded;
    topPipeImg.onload = imageLoaded;
    bottomPipeImg.onload = imageLoaded;
    
    document.addEventListener("keydown", moveBird);
    board.addEventListener("click", handleCanvasClick);
};
