const BOARD_SIZE = 15;
const CELL_SIZE = 600 / BOARD_SIZE;
const EMPTY = 0, BLACK = 1, WHITE = 2;
const PLAYER_NAMES = { 1: '黑棋(X)', 2: '白棋(O)' };

let canvas, ctx;
let gameMode = 'pvp';
let board = [];
let currentPlayer = BLACK;
let gameOver = false;
let isAIThinking = false;
let lastAIMove = null;

// --- Board helpers ---

function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isValid(row, col) {
    return inBounds(row, col) && board[row][col] === EMPTY;
}

function cloneBoard(src) {
    return src.map(row => [...row]);
}

function checkWin(board, row, col, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dx, dy] of dirs) {
        let count = 1;
        for (let i = 1; i < 5; i++) {
            const r = row + dx * i, c = col + dy * i;
            if (inBounds(r, c) && board[r][c] === player) count++;
            else break;
        }
        for (let i = 1; i < 5; i++) {
            const r = row - dx * i, c = col - dy * i;
            if (inBounds(r, c) && board[r][c] === player) count++;
            else break;
        }
        if (count >= 5) return true;
    }
    return false;
}

// --- Drawing ---

function initCanvas() {
    canvas = document.getElementById('board');
    ctx = canvas.getContext('2d');
    canvas.addEventListener('click', onCanvasClick);
    drawBoard();
}

function drawBoard() {
    ctx.clearRect(0, 0, 600, 600);

    ctx.fillStyle = '#deb887';
    ctx.fillRect(0, 0, 600, 600);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
        const pos = i * CELL_SIZE + CELL_SIZE / 2;
        ctx.beginPath();
        ctx.moveTo(CELL_SIZE / 2, pos);
        ctx.lineTo(600 - CELL_SIZE / 2, pos);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos, CELL_SIZE / 2);
        ctx.lineTo(pos, 600 - CELL_SIZE / 2);
        ctx.stroke();
    }

    const starPoints = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
    ctx.fillStyle = '#333';
    for (const [r, c] of starPoints) {
        const x = c * CELL_SIZE + CELL_SIZE / 2;
        const y = r * CELL_SIZE + CELL_SIZE / 2;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r] && board[r][c] !== EMPTY) drawStone(r, c, board[r][c]);
        }
    }

    if (lastAIMove) {
        const x = lastAIMove[1] * CELL_SIZE + CELL_SIZE / 2;
        const y = lastAIMove[0] * CELL_SIZE + CELL_SIZE / 2;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE / 2 - 3, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawStone(row, col, player) {
    const x = col * CELL_SIZE + CELL_SIZE / 2;
    const y = row * CELL_SIZE + CELL_SIZE / 2;
    const radius = CELL_SIZE / 2 - 4;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (player === BLACK) {
        const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
        grad.addColorStop(0, '#555');
        grad.addColorStop(1, '#000');
        ctx.fillStyle = grad;
    } else {
        const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#ccc');
        ctx.fillStyle = grad;
    }
    ctx.fill();
    ctx.strokeStyle = player === BLACK ? '#000' : '#999';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// --- Game logic ---

function initBoard() {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
    currentPlayer = BLACK;
    gameOver = false;
    lastAIMove = null;
    isAIThinking = false;
}

function placeStone(row, col) {
    if (gameOver || isAIThinking) return;
    if (board[row][col] !== EMPTY) return;
    if (gameMode === 'pve' && currentPlayer !== BLACK) return;

    board[row][col] = currentPlayer;
    lastAIMove = null;
    drawBoard();

    if (checkWin(board, row, col, currentPlayer)) {
        gameOver = true;
        showResult(currentPlayer);
        updateStatus();
        return;
    }

    if (isBoardFull()) {
        gameOver = true;
        showResult(EMPTY);
        updateStatus();
        return;
    }

    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateStatus();

    if (gameMode === 'pve' && currentPlayer === WHITE && !gameOver) {
        isAIThinking = true;
        setTimeout(doAIMove, 100);
    }
}

function doAIMove() {
    const move = getAIMove(board, WHITE);
    if (!move) { isAIThinking = false; return; }

    const [r, c] = move;
    board[r][c] = WHITE;
    lastAIMove = [r, c];
    drawBoard();

    if (checkWin(board, r, c, WHITE)) {
        gameOver = true;
        isAIThinking = false;
        showResult(WHITE);
        updateStatus();
        return;
    }

    if (isBoardFull()) {
        gameOver = true;
        isAIThinking = false;
        showResult(EMPTY);
        updateStatus();
        return;
    }

    currentPlayer = BLACK;
    isAIThinking = false;
    updateStatus();
}

function isBoardFull() {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === EMPTY) return false;
        }
    }
    return true;
}

function onCanvasClick(e) {
    if (gameOver || isAIThinking) return;
    if (gameMode === 'pve' && currentPlayer !== BLACK) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    if (!isValid(row, col)) return;
    placeStone(row, col);
}

function updateStatus() {
    const el = document.getElementById('status-text');
    if (gameOver) el.textContent = '游戏结束';
    else el.textContent = `${PLAYER_NAMES[currentPlayer]} 回合`;
}

function showResult(winner) {
    document.getElementById('result-modal').style.display = 'flex';
    const text = document.getElementById('result-text');
    if (winner === EMPTY) text.textContent = '平局！';
    else text.textContent = `${PLAYER_NAMES[winner]} 获胜！`;
}

function showMenu() {
    document.getElementById('result-modal').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
}

function startGame(mode) {
    gameMode = mode;
    initBoard();
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-area').style.display = 'inline-block';
    if (!canvas) initCanvas();
    drawBoard();
    updateStatus();
}

document.addEventListener('DOMContentLoaded', initCanvas);
