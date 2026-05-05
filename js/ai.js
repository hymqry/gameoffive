const SCORE_FIVE = 100000;
const SCORE_OPEN_FOUR = 10000;
const SCORE_HALF_FOUR = 5000;
const SCORE_OPEN_THREE = 1000;
const SCORE_HALF_THREE = 500;
const SCORE_OPEN_TWO = 100;
const SCORE_HALF_TWO = 50;
const SCORE_WIN = 1000000;
const CANDIDATE_LIMIT = 15;
const SEARCH_DEPTH = 4;

function scoreLine(count, openEnds) {
    if (count >= 5) return SCORE_FIVE;
    if (count === 4 && openEnds >= 2) return SCORE_OPEN_FOUR;
    if (count === 4 && openEnds >= 1) return SCORE_HALF_FOUR;
    if (count === 3 && openEnds >= 2) return SCORE_OPEN_THREE;
    if (count === 3 && openEnds >= 1) return SCORE_HALF_THREE;
    if (count === 2 && openEnds >= 2) return SCORE_OPEN_TWO;
    if (count === 2 && openEnds >= 1) return SCORE_HALF_TWO;
    return 0;
}

function countStonesOnBoard(board) {
    let cnt = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) cnt++;
        }
    }
    return cnt;
}

function findFirstStone(board) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) return [i, j];
        }
    }
    return [7, 7];
}

function isNearStone(board, row, col, dist) {
    for (let dr = -dist; dr <= dist; dr++) {
        for (let dc = -dist; dc <= dist; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr, c = col + dc;
            if (inBounds(r, c) && board[r][c] !== EMPTY) return true;
        }
    }
    return false;
}

function getCandidates(board) {
    const candidates = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;
            if (isNearStone(board, i, j, 2)) candidates.push([i, j]);
        }
    }
    return candidates;
}

function calcProximityBonus(board, row, col, opponent, player) {
    let bonus = 0;
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr, c = col + dc;
            if (!inBounds(r, c)) continue;
            const v = board[r][c];
            if (v === opponent) bonus += 15;
            else if (v === player) bonus += 8;
        }
    }
    return bonus;
}

function evaluatePosition(board, row, col, player) {
    const opponent = player === BLACK ? WHITE : BLACK;
    let score = 0;
    const dirs = [1, 0, 0, 1, 1, 1, 1, -1];

    for (let d = 0; d < 4; d++) {
        const dx = dirs[d * 2], dy = dirs[d * 2 + 1];

        let count = 1, openEnds = 0;

        let blocked = false;
        for (let i = 1; i < 5; i++) {
            const r = row + dx * i, c = col + dy * i;
            if (!inBounds(r, c)) { blocked = true; break; }
            const v = board[r][c];
            if (v === player) count++;
            else if (v === EMPTY) { openEnds++; break; }
            else { blocked = true; break; }
        }
        if (!blocked) openEnds++;

        blocked = false;
        for (let i = 1; i < 5; i++) {
            const r = row - dx * i, c = col - dy * i;
            if (!inBounds(r, c)) { blocked = true; break; }
            const v = board[r][c];
            if (v === player) count++;
            else if (v === EMPTY) { openEnds++; break; }
            else { blocked = true; break; }
        }
        if (!blocked) openEnds++;

        score += scoreLine(count, openEnds);

        // Opponent threat
        let oppCount = 1, oppOpenEnds = 0;

        blocked = false;
        for (let i = 1; i < 5; i++) {
            const r = row + dx * i, c = col + dy * i;
            if (!inBounds(r, c)) { blocked = true; break; }
            const v = board[r][c];
            if (v === opponent) oppCount++;
            else if (v === EMPTY) { oppOpenEnds++; break; }
            else { blocked = true; break; }
        }
        if (!blocked) oppOpenEnds++;

        blocked = false;
        for (let i = 1; i < 5; i++) {
            const r = row - dx * i, c = col - dy * i;
            if (!inBounds(r, c)) { blocked = true; break; }
            const v = board[r][c];
            if (v === opponent) oppCount++;
            else if (v === EMPTY) { oppOpenEnds++; break; }
            else { blocked = true; break; }
        }
        if (!blocked) oppOpenEnds++;

        if (oppCount >= 5) score += SCORE_FIVE - 10000;
        else if (oppCount === 4 && oppOpenEnds >= 2) score += 8000;
        else if (oppCount === 4 && oppOpenEnds >= 1) score += 4000;
        else if (oppCount === 3 && oppOpenEnds >= 2) score += 800;
    }

    score += calcProximityBonus(board, row, col, opponent, player);
    return score;
}

function scoreBoard(board, aiPlayer) {
    let score = 0;
    const dirs = [1, 0, 0, 1, 1, 1, 1, -1];

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = board[i][j];
            if (cell === EMPTY) continue;

            for (let d = 0; d < 4; d++) {
                const dx = dirs[d * 2], dy = dirs[d * 2 + 1];

                const pr = i - dx, pc = j - dy;
                if (inBounds(pr, pc) && board[pr][pc] === cell) continue;

                let count = 0, r = i, c = j;
                while (inBounds(r, c) && board[r][c] === cell) {
                    count++;
                    r += dx;
                    c += dy;
                }

                let openEnds = 0;
                if (inBounds(i - dx, j - dy) && board[i - dx][j - dy] === EMPTY) openEnds++;
                if (inBounds(r, c) && board[r][c] === EMPTY) openEnds++;

                const ls = scoreLine(count, openEnds);
                if (cell === aiPlayer) score += ls;
                else score -= ls + Math.floor(ls / 10);
            }
        }
    }
    return score;
}

function sortCandidates(board, candidates, player) {
    const scored = candidates.map(mv => {
        const s = evaluatePosition(board, mv[0], mv[1], player);
        return [mv[0], mv[1], s];
    });
    scored.sort((a, b) => b[2] - a[2]);
    return scored.map(x => [x[0], x[1]]);
}

function alphaBeta(board, depth, alpha, beta, isMaximizing, aiPlayer) {
    let a = alpha, b = beta;
    const candidates = getCandidates(board);
    if (candidates.length === 0) return 0;

    const limit = Math.min(candidates.length, CANDIDATE_LIMIT);
    const sorted = isMaximizing
        ? sortCandidates(board, candidates, aiPlayer)
        : sortCandidates(board, candidates, aiPlayer === BLACK ? WHITE : BLACK);

    if (depth <= 0) return scoreBoard(board, aiPlayer);

    if (isMaximizing) {
        let value = -SCORE_WIN * 10;
        for (let idx = 0; idx < limit; idx++) {
            const [r, c] = sorted[idx];
            const child = cloneBoard(board);
            child[r][c] = aiPlayer;

            if (checkWin(child, r, c, aiPlayer)) return SCORE_WIN + depth;

            const childVal = alphaBeta(child, depth - 1, a, b, false, aiPlayer);
            if (childVal > value) value = childVal;
            if (value > a) a = value;
            if (a >= b) break;
        }
        return value;
    } else {
        let value = SCORE_WIN * 10;
        const opponent = aiPlayer === BLACK ? WHITE : BLACK;
        for (let idx = 0; idx < limit; idx++) {
            const [r, c] = sorted[idx];
            const child = cloneBoard(board);
            child[r][c] = opponent;

            if (checkWin(child, r, c, opponent)) return -SCORE_WIN - depth;

            const childVal = alphaBeta(child, depth - 1, a, b, true, aiPlayer);
            if (childVal < value) value = childVal;
            if (value < b) b = value;
            if (a >= b) break;
        }
        return value;
    }
}

function getAIMove(board, player) {
    const stones = countStonesOnBoard(board);

    if (stones <= 1) {
        const [tr, tc] = findFirstStone(board);
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = tr + dr, c = tc + dc;
                if (isValid(r, c) && board[r][c] === EMPTY) return [r, c];
            }
        }
    }

    const candidates = getCandidates(board);
    if (candidates.length === 0) return [7, 7];

    const sorted = sortCandidates(board, candidates, player);
    const limit = Math.min(sorted.length, CANDIDATE_LIMIT);

    let bestScore = -SCORE_WIN * 10;
    let bestMove = sorted[0];

    for (let idx = 0; idx < limit; idx++) {
        const [r, c] = sorted[idx];
        const child = cloneBoard(board);
        child[r][c] = player;

        if (checkWin(child, r, c, player)) return [r, c];

        const score = alphaBeta(child, SEARCH_DEPTH - 1, -SCORE_WIN * 10, SCORE_WIN * 10, false, player);
        if (score > bestScore) {
            bestScore = score;
            bestMove = [r, c];
        }
    }

    return bestMove;
}
