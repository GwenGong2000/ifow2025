// AI对手实现

class GomokuAI {
    constructor(boardWidth, boardHeight, difficulty = 'medium') {
        this.boardWidth = boardWidth;
        this.boardHeight = boardHeight;
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth();
        this.directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 主对角线
            [1, -1]   // 副对角线
        ];
    }

    getMaxDepth() {
        switch (this.difficulty) {
            case 'easy':
                return 2;
            case 'medium':
                return 3;
            case 'hard':
                return 4;
            default:
                return 3;
        }
    }

    // 主要AI接口
    getBestMove(board, currentPlayer) {
        const emptyPositions = this.getEmptyPositions(board);
        
        if (emptyPositions.length === 0) return null;
        
        // 第一步下在棋盘中心附近
        if (emptyPositions.length === this.boardWidth * this.boardHeight) {
            const centerX = Math.floor(this.boardWidth / 2);
            const centerY = Math.floor(this.boardHeight / 2);
            return { x: centerX, y: centerY };
        }

        // 根据难度选择不同的策略
        switch (this.difficulty) {
            case 'easy':
                return this.getRandomMove(board, emptyPositions);
            case 'medium':
                return this.getMediumMove(board, currentPlayer, emptyPositions);
            case 'hard':
                return this.getHardMove(board, currentPlayer, emptyPositions);
            default:
                return this.getMediumMove(board, currentPlayer, emptyPositions);
        }
    }

    // 简单难度：随机移动
    getRandomMove(board, emptyPositions) {
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        return emptyPositions[randomIndex];
    }

    // 中等难度：基础评估
    getMediumMove(board, currentPlayer, emptyPositions) {
        let bestMove = null;
        let bestScore = -Infinity;

        for (const pos of emptyPositions) {
            const score = this.evaluatePosition(board, pos.x, pos.y, currentPlayer);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = pos;
            }
        }

        return bestMove;
    }

    // 困难难度：极小化极大算法
    getHardMove(board, currentPlayer, emptyPositions) {
        let bestMove = null;
        let bestScore = -Infinity;

        // 限制搜索范围以提高性能
        const candidatePositions = this.getCandidatePositions(board, emptyPositions, 10);

        for (const pos of candidatePositions) {
            board[pos.y][pos.x] = currentPlayer;
            const score = this.minimax(board, this.maxDepth - 1, false, currentPlayer, -Infinity, Infinity);
            board[pos.y][pos.x] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestMove = pos;
            }
        }

        return bestMove;
    }

    // 极小化极大算法
    minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
        const winner = this.checkWinner(board);
        
        if (winner === aiPlayer) return 10000 + depth;
        if (winner === 3 - aiPlayer) return -10000 - depth;
        if (depth === 0 || this.isBoardFull(board)) {
            return this.evaluateBoard(board, aiPlayer);
        }

        const currentPlayer = isMaximizing ? aiPlayer : 3 - aiPlayer;
        const emptyPositions = this.getEmptyPositions(board);

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const pos of emptyPositions) {
                board[pos.y][pos.x] = currentPlayer;
                const score = this.minimax(board, depth - 1, false, aiPlayer, alpha, beta);
                board[pos.y][pos.x] = 0;
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const pos of emptyPositions) {
                board[pos.y][pos.x] = currentPlayer;
                const score = this.minimax(board, depth - 1, true, aiPlayer, alpha, beta);
                board[pos.y][pos.x] = 0;
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }

    // 获取候选位置（限制搜索范围）
    getCandidatePositions(board, emptyPositions, limit) {
        const scoredPositions = emptyPositions.map(pos => ({
            ...pos,
            score: this.evaluatePosition(board, pos.x, pos.y, 1) + this.evaluatePosition(board, pos.x, pos.y, 2)
        }));

        scoredPositions.sort((a, b) => b.score - a.score);
        return scoredPositions.slice(0, Math.min(limit, scoredPositions.length));
    }

    // 评估棋盘整体局势
    evaluateBoard(board, player) {
        let score = 0;
        
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (board[y][x] === player) {
                    score += this.evaluatePosition(board, x, y, player);
                } else if (board[y][x] === 3 - player) {
                    score -= this.evaluatePosition(board, x, y, 3 - player);
                }
            }
        }
        
        return score;
    }

    // 评估特定位置的价值
    evaluatePosition(board, x, y, player) {
        let score = 0;
        
        for (const [dx, dy] of this.directions) {
            score += this.evaluateDirection(board, x, y, dx, dy, player);
        }
        
        // 中心位置加分
        const centerX = this.boardWidth / 2;
        const centerY = this.boardHeight / 2;
        const distanceFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
        score += (this.boardWidth + this.boardHeight - distanceFromCenter) * 2;
        
        return score;
    }

    // 评估特定方向的威胁
    evaluateDirection(board, x, y, dx, dy, player) {
        let score = 0;
        let count = 1;
        let openEnds = 0;
        
        // 正向检查
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && board[ny][nx] === player) {
            count++;
            nx += dx;
            ny += dy;
        }
        if (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && board[ny][nx] === 0) {
            openEnds++;
        }
        
        // 反向检查
        nx = x - dx;
        ny = y - dy;
        while (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && board[ny][nx] === player) {
            count++;
            nx -= dx;
            ny -= dy;
        }
        if (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && board[ny][nx] === 0) {
            openEnds++;
        }
        
        // 根据连子数和开放端计算分数
        if (count >= 5) {
            score += 100000; // 五连
        } else if (count === 4) {
            if (openEnds === 2) score += 10000; // 活四
            else if (openEnds === 1) score += 1000; // 冲四
        } else if (count === 3) {
            if (openEnds === 2) score += 1000; // 活三
            else if (openEnds === 1) score += 100; // 眠三
        } else if (count === 2) {
            if (openEnds === 2) score += 100; // 活二
            else if (openEnds === 1) score += 10; // 眠二
        } else if (count === 1 && openEnds === 2) {
            score += 10; // 单子
        }
        
        return score;
    }

    // 获取空位置
    getEmptyPositions(board) {
        const emptyPositions = [];
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (board[y][x] === 0) {
                    emptyPositions.push({ x, y });
                }
            }
        }
        return emptyPositions;
    }

    // 检查棋盘是否已满
    isBoardFull(board) {
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (board[y][x] === 0) return false;
            }
        }
        return true;
    }

    // 检查获胜者
    checkWinner(board) {
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (board[y][x] !== 0) {
                    const player = board[y][x];
                    for (const [dx, dy] of this.directions) {
                        if (this.checkDirection(board, x, y, dx, dy, player)) {
                            return player;
                        }
                    }
                }
            }
        }
        return 0;
    }

    // 检查特定方向是否有五连
    checkDirection(board, x, y, dx, dy, player) {
        let count = 1;
        
        // 正向检查
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && board[ny][nx] === player) {
            count++;
            nx += dx;
            ny += dy;
        }
        
        // 反向检查
        nx = x - dx;
        ny = y - dy;
        while (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && board[ny][nx] === player) {
            count++;
            nx -= dx;
            ny -= dy;
        }
        
        return count >= 5;
    }

    // 设置难度
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth();
    }

    // 更新棋盘尺寸
    updateBoardSize(width, height) {
        this.boardWidth = width;
        this.boardHeight = height;
    }
}