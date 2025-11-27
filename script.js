// 五子棋游戏主逻辑

class GomokuGame {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.boardWidth = 15;
        this.boardHeight = 15;
        this.cellSize = 30;
        this.board = [];
        this.currentPlayer = 1; // 1: 黑棋, 2: 白棋
        this.gameMode = 'pvp'; // pvp: 双人对战, pve: 人机对战, online: 在线对战
        this.aiDifficulty = 'medium';
        this.gameOver = false;
        this.moveHistory = [];
        this.timer = 0;
        this.timerInterval = null;
        this.stats = this.loadStats();
        this.ai = null;
        this.isAIThinking = false;
        this.darkMode = false;
        this.showHints = true;
        this.soundEnabled = true;
        this.timerEnabled = false;
        this.replayMode = false;
        this.replayIndex = 0;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.initBoard();
        this.setupEventListeners();
        this.updateStatsDisplay();
        this.initAI();
        this.draw();
    }

    setupCanvas() {
        const canvasSize = Math.min(
            window.innerWidth - 400,
            window.innerHeight - 200,
            600
        );
        this.cellSize = Math.floor(canvasSize / Math.max(this.boardWidth, this.boardHeight));
        
        this.canvas.width = this.boardWidth * this.cellSize + this.cellSize;
        this.canvas.height = this.boardHeight * this.cellSize + this.cellSize;
        
        this.offsetX = this.cellSize / 2;
        this.offsetY = this.cellSize / 2;
    }

    initBoard() {
        this.board = Array(this.boardHeight).fill(null).map(() => Array(this.boardWidth).fill(0));
        this.moveHistory = [];
        this.gameOver = false;
        this.currentPlayer = 1;
        this.stopTimer();
        this.timer = 0;
        this.updateTimerDisplay();
        this.updateCurrentPlayerDisplay();
    }

    initAI() {
        this.ai = new GomokuAI(this.boardWidth, this.boardHeight, this.aiDifficulty);
    }

    setupEventListeners() {
        // 棋盘点击事件
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleCanvasMouseLeave());

        // 游戏模式按钮
        document.getElementById('pvp-mode').addEventListener('click', () => this.setGameMode('pvp'));
        document.getElementById('pve-mode').addEventListener('click', () => this.setGameMode('pve'));
        document.getElementById('online-mode').addEventListener('click', () => this.setGameMode('online'));

        // AI难度按钮
        document.getElementById('easy').addEventListener('click', () => this.setAIDifficulty('easy'));
        document.getElementById('medium').addEventListener('click', () => this.setAIDifficulty('medium'));
        document.getElementById('hard').addEventListener('click', () => this.setAIDifficulty('hard'));

        // 棋盘尺寸按钮
        document.getElementById('size-15').addEventListener('click', () => this.setBoardSize(15, 15));
        document.getElementById('size-19').addEventListener('click', () => this.setBoardSize(19, 19));
        document.getElementById('size-custom').addEventListener('click', () => this.toggleCustomSize());
        document.getElementById('apply-custom-size').addEventListener('click', () => this.applyCustomSize());

        // 游戏控制按钮
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('save-game').addEventListener('click', () => this.saveGame());
        document.getElementById('load-game').addEventListener('click', () => this.loadGame());
        document.getElementById('replay').addEventListener('click', () => this.startReplay());

        // 特殊功能复选框
        document.getElementById('dark-mode').addEventListener('change', (e) => this.setDarkMode(e.target.checked));
        document.getElementById('show-hints').addEventListener('change', (e) => this.setShowHints(e.target.checked));
        document.getElementById('sound').addEventListener('change', (e) => this.setSoundEnabled(e.target.checked));
        document.getElementById('timer-enabled').addEventListener('change', (e) => this.setTimerEnabled(e.target.checked));

        // 胜利消息关闭按钮
        document.getElementById('close-message').addEventListener('click', () => this.closeWinMessage());

        // 游戏记录控制
        document.getElementById('prev-move').addEventListener('click', () => this.previousMove());
        document.getElementById('next-move').addEventListener('click', () => this.nextMove());
        document.getElementById('close-history').addEventListener('click', () => this.closeHistory());

        // 窗口大小改变
        window.addEventListener('resize', () => this.handleResize());
    }

    handleCanvasClick(e) {
        if (this.gameOver || this.isAIThinking || this.replayMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const gridPos = gameUtils.pixelToGrid(x, y, this.cellSize, this.offsetX, this.offsetY);

        if (gameUtils.isValidPosition(gridPos.x, gridPos.y, this.boardWidth, this.boardHeight) && 
            this.board[gridPos.y][gridPos.x] === 0) {
            this.makeMove(gridPos.x, gridPos.y);
        }
    }

    handleCanvasMouseMove(e) {
        if (this.gameOver || this.replayMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const gridPos = gameUtils.pixelToGrid(x, y, this.cellSize, this.offsetX, this.offsetY);

        if (gameUtils.isValidPosition(gridPos.x, gridPos.y, this.boardWidth, this.boardHeight) && 
            this.board[gridPos.y][gridPos.x] === 0) {
            this.hoverPosition = gridPos;
            this.canvas.style.cursor = 'pointer';
        } else {
            this.hoverPosition = null;
            this.canvas.style.cursor = 'default';
        }

        this.draw();
    }

    handleCanvasMouseLeave() {
        this.hoverPosition = null;
        this.canvas.style.cursor = 'default';
        this.draw();
    }

    handleResize() {
        this.setupCanvas();
        this.draw();
    }

    makeMove(x, y) {
        if (this.board[y][x] !== 0 || this.gameOver) return false;

        this.board[y][x] = this.currentPlayer;
        this.moveHistory.push({ x, y, player: this.currentPlayer, timer: this.timer });

        if (this.soundEnabled) {
            soundManager.play('place');
        }

        if (this.checkWinner(x, y, this.currentPlayer)) {
            this.endGame(this.currentPlayer);
        } else if (this.isBoardFull()) {
            this.endGame(0); // 平局
        } else {
            this.currentPlayer = 3 - this.currentPlayer;
            this.updateCurrentPlayerDisplay();
            
            if (this.gameMode === 'pve' && this.currentPlayer === 2 && !this.gameOver) {
                this.makeAIMove();
            }
        }

        this.draw();
        return true;
    }

    makeAIMove() {
        this.isAIThinking = true;
        
        setTimeout(() => {
            const move = this.ai.getBestMove(this.board, 2);
            if (move) {
                this.makeMove(move.x, move.y);
            }
            this.isAIThinking = false;
        }, 500);
    }

    checkWinner(x, y, player) {
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 主对角线
            [1, -1]   // 副对角线
        ];

        for (const [dx, dy] of directions) {
            let count = 1;

            // 正向检查
            let nx = x + dx;
            let ny = y + dy;
            while (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && 
                   this.board[ny][nx] === player) {
                count++;
                nx += dx;
                ny += dy;
            }

            // 反向检查
            nx = x - dx;
            ny = y - dy;
            while (nx >= 0 && nx < this.boardWidth && ny >= 0 && ny < this.boardHeight && 
                   this.board[ny][nx] === player) {
                count++;
                nx -= dx;
                ny -= dy;
            }

            if (count >= 5) {
                return true;
            }
        }

        return false;
    }

    isBoardFull() {
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (this.board[y][x] === 0) return false;
            }
        }
        return true;
    }

    endGame(winner) {
        this.gameOver = true;
        this.stopTimer();

        if (winner === 0) {
            this.stats.draws++;
            this.showWinMessage('平局！');
        } else {
            const winnerName = winner === 1 ? '黑棋' : '白棋';
            if (winner === 1) {
                this.stats.blackWins++;
            } else {
                this.stats.whiteWins++;
            }
            this.showWinMessage(`${winnerName}获胜！`);
            
            if (this.soundEnabled) {
                soundManager.play('win');
            }
        }

        this.saveStats();
        this.updateStatsDisplay();
    }

    showWinMessage(message) {
        document.getElementById('winner-text').textContent = message;
        document.getElementById('win-message').classList.remove('hidden');
    }

    closeWinMessage() {
        document.getElementById('win-message').classList.add('hidden');
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制棋盘背景
        this.ctx.fillStyle = '#deb887';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格线
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.boardWidth; i++) {
            const x = i * this.cellSize + this.offsetX;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.offsetY);
            this.ctx.lineTo(x, this.boardHeight * this.cellSize + this.offsetY);
            this.ctx.stroke();
        }

        for (let i = 0; i < this.boardHeight; i++) {
            const y = i * this.cellSize + this.offsetY;
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, y);
            this.ctx.lineTo(this.boardWidth * this.cellSize + this.offsetX, y);
            this.ctx.stroke();
        }

        // 绘制星位
        this.drawStarPoints();

        // 绘制棋子
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (this.board[y][x] !== 0) {
                    this.drawPiece(x, y, this.board[y][x]);
                }
            }
        }

        // 绘制悬停提示
        if (this.hoverPosition && !this.gameOver && !this.isAIThinking) {
            this.drawHoverPiece();
        }

        // 绘制最后一步标记
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            this.drawLastMoveMarker(lastMove.x, lastMove.y);
        }

        // 绘制获胜提示
        if (this.gameOver && this.showHints) {
            this.drawWinLine();
        }
    }

    drawStarPoints() {
        const starPoints = this.getStarPoints();
        this.ctx.fillStyle = '#8b4513';

        for (const point of starPoints) {
            const x = point.x * this.cellSize + this.offsetX;
            const y = point.y * this.cellSize + this.offsetY;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    getStarPoints() {
        if (this.boardWidth === 15 && this.boardHeight === 15) {
            return [
                { x: 3, y: 3 }, { x: 11, y: 3 },
                { x: 7, y: 7 },
                { x: 3, y: 11 }, { x: 11, y: 11 }
            ];
        } else if (this.boardWidth === 19 && this.boardHeight === 19) {
            return [
                { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 },
                { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 },
                { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 }
            ];
        }
        return [];
    }

    drawPiece(x, y, player) {
        const centerX = x * this.cellSize + this.offsetX;
        const centerY = y * this.cellSize + this.offsetY;
        const radius = this.cellSize * 0.4;

        // 暗棋模式处理
        if (this.darkMode && !this.replayMode) {
            // 只显示最后几步的棋子
            const recentMoves = this.moveHistory.slice(-3);
            const isVisible = recentMoves.some(move => move.x === x && move.y === y);
            
            if (!isVisible) {
                // 绘制问号
                this.ctx.fillStyle = '#666';
                this.ctx.font = `${radius}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('?', centerX, centerY);
                return;
            }
        }

        // 绘制棋子阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        // 绘制棋子
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        if (player === 1) {
            // 黑棋渐变
            const gradient = this.ctx.createRadialGradient(
                centerX - radius/3, centerY - radius/3, 0,
                centerX, centerY, radius
            );
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#000');
            this.ctx.fillStyle = gradient;
        } else {
            // 白棋渐变
            const gradient = this.ctx.createRadialGradient(
                centerX - radius/3, centerY - radius/3, 0,
                centerX, centerY, radius
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            this.ctx.fillStyle = gradient;
        }
        
        this.ctx.fill();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // 绘制棋子边框
        this.ctx.strokeStyle = player === 1 ? '#000' : '#999';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawHoverPiece() {
        const centerX = this.hoverPosition.x * this.cellSize + this.offsetX;
        const centerY = this.hoverPosition.y * this.cellSize + this.offsetY;
        const radius = this.cellSize * 0.4;

        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.currentPlayer === 1 ? '#000' : '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = this.currentPlayer === 1 ? '#000' : '#999';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawLastMoveMarker(x, y) {
        const centerX = x * this.cellSize + this.offsetX;
        const centerY = y * this.cellSize + this.offsetY;
        const size = this.cellSize * 0.15;

        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(centerX - size/2, centerY - size/2, size, size);
    }

    drawWinLine() {
        // 这里可以添加获胜连线的绘制逻辑
        // 为了简化，暂时省略
    }

    setGameMode(mode) {
        this.gameMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        
        const modeText = {
            'pvp': '双人对战',
            'pve': '人机对战',
            'online': '在线对战'
        };
        
        document.getElementById(`${mode}-mode`).classList.add('active');
        document.getElementById('game-mode-text').textContent = modeText[mode];
        
        this.newGame();
    }

    setAIDifficulty(difficulty) {
        this.aiDifficulty = difficulty;
        document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(difficulty).classList.add('active');
        
        if (this.ai) {
            this.ai.setDifficulty(difficulty);
        }
    }

    setBoardSize(width, height) {
        this.boardWidth = width;
        this.boardHeight = height;
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
        
        if (width === 15 && height === 15) {
            document.getElementById('size-15').classList.add('active');
        } else if (width === 19 && height === 19) {
            document.getElementById('size-19').classList.add('active');
        }
        
        this.setupCanvas();
        this.initBoard();
        this.initAI();
        this.draw();
    }

    toggleCustomSize() {
        const customSizeInput = document.getElementById('custom-size-input');
        customSizeInput.classList.toggle('hidden');
        
        if (!customSizeInput.classList.contains('hidden')) {
            document.getElementById('custom-width').value = this.boardWidth;
            document.getElementById('custom-height').value = this.boardHeight;
        }
    }

    applyCustomSize() {
        const width = parseInt(document.getElementById('custom-width').value);
        const height = parseInt(document.getElementById('custom-height').value);
        
        if (width >= 9 && width <= 25 && height >= 9 && height <= 25) {
            this.setBoardSize(width, height);
            document.getElementById('custom-size-input').classList.add('hidden');
        } else {
            notificationManager.show('棋盘尺寸必须在9-25之间', 'error');
        }
    }

    newGame() {
        this.initBoard();
        this.draw();
        notificationManager.show('新游戏开始！', 'success');
    }

    undo() {
        if (this.moveHistory.length === 0 || this.gameOver || this.isAIThinking) return;

        const lastMove = this.moveHistory.pop();
        this.board[lastMove.y][lastMove.x] = 0;
        
        // 如果是人机对战，需要撤销AI的步骤
        if (this.gameMode === 'pve' && this.moveHistory.length > 0) {
            const aiMove = this.moveHistory.pop();
            this.board[aiMove.y][aiMove.x] = 0;
        }
        
        this.currentPlayer = 1;
        this.updateCurrentPlayerDisplay();
        this.draw();
        
        if (this.soundEnabled) {
            soundManager.play('click');
        }
    }

    saveGame() {
        const gameData = {
            board: this.board,
            boardWidth: this.boardWidth,
            boardHeight: this.boardHeight,
            currentPlayer: this.currentPlayer,
            gameMode: this.gameMode,
            moveHistory: this.moveHistory,
            timer: this.timer,
            timestamp: Date.now()
        };
        
        if (gameUtils.saveToLocalStorage('gomoku-save', gameData)) {
            notificationManager.show('游戏已保存', 'success');
        } else {
            notificationManager.show('保存失败', 'error');
        }
    }

    loadGame() {
        const gameData = gameUtils.loadFromLocalStorage('gomoku-save');
        
        if (gameData) {
            this.board = gameData.board;
            this.boardWidth = gameData.boardWidth;
            this.boardHeight = gameData.boardHeight;
            this.currentPlayer = gameData.currentPlayer;
            this.gameMode = gameData.gameMode;
            this.moveHistory = gameData.moveHistory;
            this.timer = gameData.timer;
            this.gameOver = false;
            
            this.setupCanvas();
            this.initAI();
            this.updateCurrentPlayerDisplay();
            this.updateTimerDisplay();
            this.draw();
            
            notificationManager.show('游戏已加载', 'success');
        } else {
            notificationManager.show('没有找到保存的游戏', 'warning');
        }
    }

    startReplay() {
        if (this.moveHistory.length === 0) {
            notificationManager.show('没有可回放的棋局', 'warning');
            return;
        }
        
        this.replayMode = true;
        this.replayIndex = 0;
        
        // 保存当前状态
        this.savedBoard = gameUtils.deepClone(this.board);
        this.savedMoveHistory = [...this.moveHistory];
        
        // 清空棋盘
        this.board = Array(this.boardHeight).fill(null).map(() => Array(this.boardWidth).fill(0));
        this.moveHistory = [];
        this.draw();
        
        // 显示回放控制
        document.getElementById('game-history').classList.remove('hidden');
        this.updateMoveList();
    }

    previousMove() {
        if (this.replayIndex > 0) {
            this.replayIndex--;
            this.updateReplayBoard();
        }
    }

    nextMove() {
        if (this.replayIndex < this.savedMoveHistory.length) {
            this.replayIndex++;
            this.updateReplayBoard();
        }
    }

    updateReplayBoard() {
        // 清空棋盘
        this.board = Array(this.boardHeight).fill(null).map(() => Array(this.boardWidth).fill(0));
        this.moveHistory = [];
        
        // 重新下棋到指定步骤
        for (let i = 0; i < this.replayIndex; i++) {
            const move = this.savedMoveHistory[i];
            this.board[move.y][move.x] = move.player;
            this.moveHistory.push(move);
        }
        
        this.updateMoveList();
        this.draw();
    }

    updateMoveList() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';
        
        this.savedMoveHistory.forEach((move, index) => {
            const moveItem = document.createElement('div');
            moveItem.className = 'move-item';
            if (index < this.replayIndex) {
                moveItem.classList.add('current');
            }
            
            const playerText = move.player === 1 ? '黑' : '白';
            moveItem.textContent = `${index + 1}. ${playerText} (${move.x}, ${move.y})`;
            
            moveItem.addEventListener('click', () => {
                this.replayIndex = index + 1;
                this.updateReplayBoard();
            });
            
            moveList.appendChild(moveItem);
        });
        
        // 滚动到当前步骤
        const currentMove = moveList.querySelector('.current:last-child');
        if (currentMove) {
            currentMove.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    closeHistory() {
        document.getElementById('game-history').classList.add('hidden');
        this.replayMode = false;
        
        // 恢复原始状态
        if (this.savedBoard) {
            this.board = this.savedBoard;
            this.moveHistory = this.savedMoveHistory;
            this.savedBoard = null;
            this.savedMoveHistory = null;
        }
        
        this.draw();
    }

    setDarkMode(enabled) {
        this.darkMode = enabled;
        this.draw();
    }

    setShowHints(enabled) {
        this.showHints = enabled;
        this.draw();
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        soundManager.setEnabled(enabled);
    }

    setTimerEnabled(enabled) {
        this.timerEnabled = enabled;
        if (enabled && !this.gameOver) {
            this.startTimer();
        } else {
            this.stopTimer();
        }
    }

    startTimer() {
        if (this.timerInterval) return;
        
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        document.getElementById('timer').textContent = gameUtils.formatTime(this.timer);
    }

    updateCurrentPlayerDisplay() {
        const playerText = this.currentPlayer === 1 ? '黑棋' : '白棋';
        document.getElementById('current-player').textContent = playerText;
    }

    updateStatsDisplay() {
        document.getElementById('black-wins').textContent = this.stats.blackWins;
        document.getElementById('white-wins').textContent = this.stats.whiteWins;
        document.getElementById('draws').textContent = this.stats.draws;
        document.getElementById('total-moves').textContent = this.moveHistory.length;
    }

    loadStats() {
        return gameUtils.loadFromLocalStorage('gomoku-stats') || {
            blackWins: 0,
            whiteWins: 0,
            draws: 0
        };
    }

    saveStats() {
        gameUtils.saveToLocalStorage('gomoku-stats', this.stats);
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new GomokuGame();
});