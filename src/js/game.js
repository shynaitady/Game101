class OkeyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = [];
        this.currentPlayerIndex = 0;
        this.tiles = [];
        this.selectedTile = null;
        this.turnTime = 30; // seconds
        this.timer = null;
        this.gameStarted = false;
        this.tileRects = [];
        this.table = [];
        this.winner = null;
        this.scores = [0, 0, 0, 0];
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHover());
        this.canvas.addEventListener('click', (e) => this.handleTileClick(e));
        this.updateControls();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    initializeGame() {
        this.createTiles();
        this.shuffleTiles();
        this.distributeTiles();
        this.players.forEach((p, i) => { p.played = []; p.hasInitialMeld = false; p.score = 0; p.isBot = !!p.isBot; });
        this.table = [];
        this.winner = null;
        this.scores = [0, 0, 0, 0];
        this.updateScores();
    }

    createTiles() {
        this.tiles = [];
        const colors = ['red', 'blue', 'black', 'yellow'];
        const numbers = Array.from({length: 13}, (_, i) => i + 1);
        for (let k = 0; k < 2; k++) {
            colors.forEach(color => {
                numbers.forEach(number => {
                    this.tiles.push({ color, number });
                });
            });
        }
    }

    shuffleTiles() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    distributeTiles() {
        for (let i = 0; i < 4; i++) {
            if (!this.players[i]) {
                this.players[i] = { id: `player${i+1}`, name: `Player ${i+1}`, tiles: [], played: [], hasInitialMeld: false, isBot: i !== 0, score: 0 };
            }
            this.players[i].tiles = this.tiles.slice(i * 14, (i + 1) * 14);
            this.players[i].played = [];
            this.players[i].hasInitialMeld = false;
        }
    }

    updateScores() {
        for (let i = 0; i < 4; i++) {
            this.scores[i] = this.players[i].tiles.reduce((sum, t) => sum + t.number, 0);
            this.players[i].score = this.scores[i];
        }
        this.drawScores();
    }

    drawScores() {
        let scoreDiv = document.getElementById('score-board');
        if (!scoreDiv) {
            scoreDiv = document.createElement('div');
            scoreDiv.id = 'score-board';
            scoreDiv.style.position = 'fixed';
            scoreDiv.style.top = '10px';
            scoreDiv.style.right = '10px';
            scoreDiv.style.background = 'rgba(255,255,255,0.95)';
            scoreDiv.style.padding = '10px 20px';
            scoreDiv.style.borderRadius = '8px';
            scoreDiv.style.fontSize = '18px';
            scoreDiv.style.zIndex = 100;
            document.body.appendChild(scoreDiv);
        }
        let html = '<b>Очки игроков:</b><br>';
        for (let i = 0; i < 4; i++) {
            html += `${this.players[i].name}: <b>${this.scores[i]}</b><br>`;
        }
        if (this.winner !== null) {
            html += `<hr><b>Победитель: ${this.players[this.winner].name}</b>`;
        }
        scoreDiv.innerHTML = html;
    }

    checkWin() {
        for (let i = 0; i < 4; i++) {
            if (this.players[i].tiles.length === 0) {
                this.winner = i;
                this.updateScores();
                setTimeout(() => alert(`Победитель: ${this.players[i].name}!`), 100);
                return true;
            }
        }
        return false;
    }

    startTurn() {
        if (this.timer) clearInterval(this.timer);
        if (this.checkWin()) return;
        const currentPlayer = this.players[this.currentPlayerIndex];
        document.getElementById('current-player').textContent = `Current Player: ${currentPlayer.name}`;
        this.turnTime = 30;
        this.updateTimer();
        this.updateControls();
        this.selectedTile = null;
        this.timer = setInterval(() => {
            this.turnTime--;
            this.updateTimer();
            if (this.turnTime <= 0) {
                this.endTurn();
            }
        }, 1000);
        if (currentPlayer.isBot) {
            setTimeout(() => this.botMove(), 1000);
        }
    }

    botMove() {
        const bot = this.players[this.currentPlayerIndex];
        // Попробовать выложить сет или ряд
        let found = false;
        for (let i = 0; i < bot.tiles.length - 2; i++) {
            for (let j = i + 1; j < bot.tiles.length - 1; j++) {
                for (let k = j + 1; k < bot.tiles.length; k++) {
                    const comb = [bot.tiles[i], bot.tiles[j], bot.tiles[k]];
                    if (this.isValidCombination(comb)) {
                        this.table.push([...comb]);
                        [i, j, k].sort((a, b) => b - a).forEach(idx => bot.tiles.splice(idx, 1));
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) break;
        }
        // Если не смог — сбросить первую фишку
        if (!found && bot.tiles.length > 0) {
            bot.tiles.splice(0, 1);
        }
        this.updateScores();
        this.endTurn();
    }

    endTurn() {
        if (this.timer) clearInterval(this.timer);
        this.updateScores();
        if (this.checkWin()) return;
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
    }

    isValidCombination(tiles) {
        if (tiles.length < 3) return false;
        const allSameNumber = tiles.every(t => t.number === tiles[0].number);
        const allUniqueColors = new Set(tiles.map(t => t.color)).size === tiles.length;
        if (allSameNumber && allUniqueColors) return true;
        const allSameColor = tiles.every(t => t.color === tiles[0].color);
        const sorted = [...tiles].sort((a, b) => a.number - b.number);
        let isSequence = true;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].number !== sorted[i - 1].number + 1) {
                isSequence = false;
                break;
            }
        }
        if (allSameColor && isSequence) return true;
        return false;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.players.forEach((player, index) => {
            this.drawPlayerTiles(player, index);
            this.drawPlayerName(player, index);
        });
        // Draw table
        this.drawTable();
    }

    drawTable() {
        // В центре — все комбинации
        const tableZone = document.getElementById('table-zone');
        if (tableZone) tableZone.innerHTML = '';
        const centerY = this.canvas.height / 2;
        let x = this.canvas.width / 2 - (this.table.length * 60) / 2;
        for (let i = 0; i < this.table.length; i++) {
            const comb = this.table[i];
            for (let j = 0; j < comb.length; j++) {
                this.drawTile(comb[j], x + j * 30, centerY, 28, 40);
            }
            x += comb.length * 30 + 20;
        }
    }

    drawPlayerTiles(player, index) {
        if (!player.tiles) return;
        
        const tileWidth = 40;
        const tileHeight = 60;
        const padding = 5;
        
        // Highlight current player
        if (index === this.currentPlayerIndex) {
            this.ctx.save();
            this.ctx.strokeStyle = 'green';
            this.ctx.lineWidth = 5;
            let x, y, w, h;
            if (index === 0) {
                x = this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 - 10;
                y = this.canvas.height - tileHeight - padding - 10;
                w = player.tiles.length * (tileWidth + padding) + 20;
                h = tileHeight + 20;
            } else if (index === 1) {
                x = this.canvas.width - tileWidth - padding - 10;
                y = this.canvas.height / 2 - (player.tiles.length * (tileHeight + padding)) / 2 - 10;
                w = tileWidth + 20;
                h = player.tiles.length * (tileHeight + padding) + 20;
            } else if (index === 2) {
                x = this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 - 10;
                y = padding - 10;
                w = player.tiles.length * (tileWidth + padding) + 20;
                h = tileHeight + 20;
            } else {
                x = padding - 10;
                y = this.canvas.height / 2 - (player.tiles.length * (tileHeight + padding)) / 2 - 10;
                w = tileWidth + 20;
                h = player.tiles.length * (tileHeight + padding) + 20;
            }
            this.ctx.strokeRect(x, y, w, h);
            this.ctx.restore();
        }
        
        player.tiles.forEach((tile, tileIndex) => {
            const x = (index === 0) ? 
                (this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 + tileIndex * (tileWidth + padding)) :
                (index === 1) ? 
                    (this.canvas.width - tileWidth - padding) :
                    (index === 2) ? 
                        (this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 + tileIndex * (tileWidth + padding)) :
                        (padding);
            
            const y = (index === 0) ? 
                (this.canvas.height - tileHeight - padding) :
                (index === 1) ? 
                    (this.canvas.height / 2 - (player.tiles.length * (tileHeight + padding)) / 2 + tileIndex * (tileHeight + padding)) :
                    (index === 2) ? 
                        (padding) :
                        (this.canvas.height / 2 - (player.tiles.length * (tileHeight + padding)) / 2 + tileIndex * (tileHeight + padding));
            
            this.drawTile(tile, x, y, tileWidth, tileHeight);
        });
    }

    drawPlayerName(player, index) {
        this.ctx.save();
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = (index === this.currentPlayerIndex) ? 'green' : 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let x, y;
        if (index === 0) {
            x = this.canvas.width / 2;
            y = this.canvas.height - 20;
        } else if (index === 1) {
            x = this.canvas.width - 40;
            y = this.canvas.height / 2;
        } else if (index === 2) {
            x = this.canvas.width / 2;
            y = 20;
        } else {
            x = 40;
            y = this.canvas.height / 2;
        }
        this.ctx.fillText(player.name, x, y);
        this.ctx.restore();
    }

    drawTile(tile, x, y, width, height) {
        // Draw tile background
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeRect(x, y, width, height);
        
        // Draw tile number
        this.ctx.fillStyle = tile.color;
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.number.toString(), x + width/2, y + height/2);
    }

    handleMouseMove(e) {
        // Implementation of handleMouseMove method
    }

    handleTileClick(e) {
        // Implementation of handleTileClick method
    }

    clearHover() {
        // Implementation of clearHover method
    }

    updateControls() {
        // Implementation of updateControls method
    }

    updateTimer() {
        document.getElementById('timer').textContent = 
            `Time remaining: ${this.turnTime}s`;
    }
} 