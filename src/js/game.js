class OkeyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = [];
        this.currentPlayerIndex = 0;
        this.tiles = [];
        this.selectedTiles = [];
        this.selectedTableSet = null;
        this.selectedDiscard = null;
        this.turnTime = 30;
        this.timer = null;
        this.gameStarted = false;
        this.tileRects = [];
        this.table = [];
        this.winner = null;
        this.scores = [0, 0, 0, 0];
        this.isDiscarding = false;
        this.pendingActions = [];
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHover());
        this.canvas.addEventListener('click', (e) => this.handleTileClick(e));
        this.updateControls();
    }

    initializeGame() {
        this.createTiles();
        this.shuffleTiles();
        this.distributeTiles();
        this.players.forEach((p, i) => { p.played = []; p.hasInitialMeld = false; p.score = 0; p.isBot = !!p.isBot; });
        this.table = [];
        this.winner = null;
        this.scores = [0, 0, 0, 0];
        this.pendingActions = [];
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
        this.selectedTiles = [];
        this.selectedTableSet = null;
        this.selectedDiscard = null;
        this.isDiscarding = false;
        this.draw();
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
        this.tileRects = [];
        this.players.forEach((player, index) => {
            this.drawPlayerTiles(player, index);
            this.drawPlayerName(player, index);
        });
        this.drawTable();
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
                y = 0;
                w = tileWidth + 20;
                h = this.canvas.height;
            } else if (index === 2) {
                x = this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 - 10;
                y = padding - 10;
                w = player.tiles.length * (tileWidth + padding) + 20;
                h = tileHeight + 20;
            } else {
                x = padding - 10;
                y = 0;
                w = tileWidth + 20;
                h = this.canvas.height;
            }
            this.ctx.strokeRect(x, y, w, h);
            this.ctx.restore();
        }
        // Подсветка возможных комбинаций
        let possible = [];
        if (index === 0) {
            if (this.selectedTiles.length === 1) {
                // Подсветить все карты, которые с выбранной могут дать валидную комбинацию
                for (let i = 0; i < player.tiles.length; i++) {
                    if (i === this.selectedTiles[0]) continue;
                    for (let j = 0; j < player.tiles.length; j++) {
                        if (j === this.selectedTiles[0] || j === i) continue;
                        const comb = [player.tiles[this.selectedTiles[0]], player.tiles[i], player.tiles[j]];
                        if (this.isValidCombination(comb)) {
                            possible.push(i, j);
                        }
                    }
                }
                possible = Array.from(new Set(possible));
            } else if (this.selectedTiles.length === 2) {
                // Подсветить все третьи карты, которые с двумя выбранными дадут валидную комбинацию
                for (let i = 0; i < player.tiles.length; i++) {
                    if (this.selectedTiles.includes(i)) continue;
                    const comb = [player.tiles[this.selectedTiles[0]], player.tiles[this.selectedTiles[1]], player.tiles[i]];
                    if (this.isValidCombination(comb)) {
                        possible.push(i);
                    }
                }
            } else if (this.selectedTiles.length === 0 && this.lastHoveredTileIndex !== null) {
                // Подсветить все возможные пары для наведения
                for (let i = 0; i < player.tiles.length; i++) {
                    if (i === this.lastHoveredTileIndex) continue;
                    for (let j = 0; j < player.tiles.length; j++) {
                        if (j === this.lastHoveredTileIndex || j === i) continue;
                        const comb = [player.tiles[this.lastHoveredTileIndex], player.tiles[i], player.tiles[j]];
                        if (this.isValidCombination(comb)) {
                            possible.push(i, j);
                        }
                    }
                }
                possible = Array.from(new Set(possible));
            }
        }
        player.tiles.forEach((tile, tileIndex) => {
            let x, y;
            if (index === 0) {
                x = this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 + tileIndex * (tileWidth + padding);
                y = this.canvas.height - tileHeight - padding;
            } else if (index === 1) {
                x = this.canvas.width - tileWidth - padding;
                const totalHeight = this.canvas.height - tileHeight - 2 * padding;
                const step = player.tiles.length > 1 ? totalHeight / (player.tiles.length - 1) : 0;
                y = padding + tileIndex * step;
            } else if (index === 2) {
                x = this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 + tileIndex * (tileWidth + padding);
                y = padding;
            } else {
                x = padding;
                const totalHeight = this.canvas.height - tileHeight - 2 * padding;
                const step = player.tiles.length > 1 ? totalHeight / (player.tiles.length - 1) : 0;
                y = padding + tileIndex * step;
            }
            // Save rect for selection (только для игрока 0)
            if (index === 0) {
                this.tileRects[tileIndex] = { x, y, w: tileWidth, h: tileHeight };
            }
            // Подсветка
            let isHovered = (index === 0 && tileIndex === this.lastHoveredTileIndex);
            let isSelected = (index === 0 && this.selectedTiles.includes(tileIndex));
            let isPossible = (index === 0 && possible.includes(tileIndex));
            let isValid = false, isInvalid = false;
            if (index === 0 && this.selectedTiles.length >= 3) {
                const comb = this.selectedTiles.map(i => player.tiles[i]);
                if (this.isValidCombination(comb)) isValid = true;
                else isInvalid = true;
            }
            this.drawTile(tile, x, y, tileWidth, tileHeight, isHovered, isSelected, isPossible, isValid, isInvalid);
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

    drawTile(tile, x, y, width, height, isHovered = false, isSelected = false, isPossible = false, isValid = false, isInvalid = false) {
        this.ctx.save();
        if (isInvalid) {
            this.ctx.strokeStyle = '#ff4444';
            this.ctx.lineWidth = 4;
        } else if (isValid) {
            this.ctx.strokeStyle = '#4CAF50';
            this.ctx.lineWidth = 4;
        } else if (isSelected) {
            this.ctx.strokeStyle = '#FF9800';
            this.ctx.lineWidth = 4;
        } else if (isPossible) {
            this.ctx.strokeStyle = '#FFD600';
            this.ctx.lineWidth = 3;
        } else if (isHovered) {
            this.ctx.strokeStyle = '#2196F3';
            this.ctx.lineWidth = 3;
        } else {
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
        }
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.fillStyle = tile.color;
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.number.toString(), x + width/2, y + height/2);
        this.ctx.restore();
    }

    clearHover() {
        this.lastHoveredTileIndex = null;
    }

    handleMouseMove(e) {
        if (!this.players[0] || !this.players[0].tiles) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.lastHoveredTileIndex = null;
        if (this.currentPlayerIndex === 0) {
            for (let i = 0; i < this.tileRects.length; i++) {
                const r = this.tileRects[i];
                if (
                    mouseX >= r.x && mouseX <= r.x + r.w &&
                    mouseY >= r.y && mouseY <= r.y + r.h
                ) {
                    this.lastHoveredTileIndex = i;
                    break;
                }
            }
        }
    }

    handleTileClick(e) {
        if (this.currentPlayerIndex !== 0) return;
        if (!this.players[0] || !this.players[0].tiles) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        for (let i = 0; i < this.tileRects.length; i++) {
            const r = this.tileRects[i];
            if (
                mouseX >= r.x && mouseX <= r.x + r.w &&
                mouseY >= r.y && mouseY <= r.y + r.h
            ) {
                const idx = this.selectedTiles.indexOf(i);
                if (idx !== -1) {
                    this.selectedTiles.splice(idx, 1);
                } else {
                    this.selectedTiles.push(i);
                }
                break;
            }
        }
        this.updateControls();
        this.drawPendingActions();
    }

    updateControls() {
        // Управление видимостью кнопок
        const playBtn = document.getElementById('play-to-table');
        const cancelBtn = document.getElementById('cancel-selection');
        const endBtn = document.getElementById('end-turn');
        if (this.currentPlayerIndex === 0) {
            const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
            playBtn.style.display = (this.selectedTiles.length >= 3 && this.isValidCombination(tilesToPlay)) ? '' : 'none';
            cancelBtn.style.display = (this.selectedTiles.length > 0 || this.table.length) ? '' : 'none';
            endBtn.style.display = (this.table.length > 0) ? '' : 'none';
        } else {
            playBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            endBtn.style.display = 'none';
        }
    }

    playToTable() {
        if (this.currentPlayerIndex !== 0) return;
        if (this.selectedTiles.length < 3) return;
        const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
        if (!this.isValidCombination(tilesToPlay)) return;
        this.table.push([...tilesToPlay]);
        this.selectedTiles.sort((a, b) => b - a).forEach(i => this.players[0].tiles.splice(i, 1));
        this.selectedTiles = [];
        this.updateControls();
        this.draw();
    }

    cancelSelection() {
        this.selectedTiles = [];
        this.updateControls();
        this.draw();
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

    updateTimer() {
        document.getElementById('timer').textContent = 
            `Time remaining: ${this.turnTime}s`;
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    // Добавить выбранные карты как новую комбинацию в pendingActions
    addPendingCombination() {
        const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
        if (tilesToPlay.length < 3 || !this.isValidCombination(tilesToPlay)) return;
        this.pendingActions.push({ type: 'comb', tiles: [...this.selectedTiles] });
        this.selectedTiles = [];
        this.updateControls();
        this.drawPendingActions();
    }

    // Добавить выбранную карту к выбранному набору на столе
    addPendingToSet() {
        if (this.selectedTiles.length !== 1 || this.selectedTableSet == null) return;
        this.pendingActions.push({ type: 'add', tile: this.selectedTiles[0], setIdx: this.selectedTableSet });
        this.selectedTiles = [];
        this.selectedTableSet = null;
        this.updateControls();
        this.drawPendingActions();
    }

    // Удалить действие из pendingActions
    removePendingAction(idx) {
        this.pendingActions.splice(idx, 1);
        this.updateControls();
        this.drawPendingActions();
    }

    // Подтвердить ход: применить все pendingActions, проверить первый выход, сбросить фишку
    confirmTurn() {
        // Собираем все новые комбинации
        const newCombs = this.pendingActions.filter(a => a.type === 'comb').map(a => a.tiles.map(i => this.players[0].tiles[i]));
        // Проверка первого выхода
        const player = this.players[0];
        if (!player.hasInitialMeld) {
            const sum = newCombs.reduce((acc, comb) => acc + comb.reduce((s, t) => s + t.number, 0), 0);
            if (sum < 101) {
                alert('Для первого выхода нужно выложить комбинации на сумму не менее 101 очка!');
                return;
            }
            player.hasInitialMeld = true;
        }
        // Применяем все действия
        // 1. Выложить новые комбинации
        for (const action of this.pendingActions) {
            if (action.type === 'comb') {
                const combTiles = action.tiles.map(i => this.players[0].tiles[i]);
                this.table.push(combTiles);
            }
        }
        // 2. Добавить к наборам
        for (const action of this.pendingActions) {
            if (action.type === 'add') {
                const tile = this.players[0].tiles[action.tile];
                this.table[action.setIdx].push(tile);
            }
        }
        // 3. Удалить все сыгранные карты из руки
        let toRemove = [];
        for (const action of this.pendingActions) {
            if (action.type === 'comb') toRemove.push(...action.tiles);
            if (action.type === 'add') toRemove.push(action.tile);
        }
        toRemove = Array.from(new Set(toRemove)).sort((a, b) => b - a);
        toRemove.forEach(i => this.players[0].tiles.splice(i, 1));
        this.pendingActions = [];
        this.updateScores();
        this.draw();
        // Сброс одной фишки
        if (this.players[0].tiles.length > 0) {
            this.isDiscarding = true;
            this.updateControls();
            alert('Вы должны сбросить одну фишку в конце хода! Кликните по фишке для сброса.');
        } else {
            this.endTurn();
        }
    }

    // Сбросить выбранную фишку
    discardTile(idx) {
        if (!this.isDiscarding) return;
        this.players[0].tiles.splice(idx, 1);
        this.isDiscarding = false;
        this.updateScores();
        this.draw();
        this.endTurn();
    }

    // Визуализация pendingActions
    drawPendingActions() {
        let panel = document.getElementById('pending-actions-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'pending-actions-panel';
            panel.style.position = 'fixed';
            panel.style.bottom = '80px';
            panel.style.left = '50%';
            panel.style.transform = 'translateX(-50%)';
            panel.style.background = 'rgba(255,255,255,0.97)';
            panel.style.padding = '10px 20px';
            panel.style.borderRadius = '8px';
            panel.style.fontSize = '16px';
            panel.style.zIndex = 100;
            document.body.appendChild(panel);
        }
        let html = '<b>Ваши действия за ход:</b><br>';
        this.pendingActions.forEach((a, idx) => {
            if (a.type === 'comb') {
                html += `Комбинация: [${a.tiles.map(i => this.players[0].tiles[i]?.number).join(', ')}] <button onclick="window.okeyGame.removePendingAction(${idx})">✖</button><br>`;
            } else if (a.type === 'add') {
                html += `Добавить к набору #${a.setIdx+1}: ${this.players[0].tiles[a.tile]?.number} <button onclick="window.okeyGame.removePendingAction(${idx})">✖</button><br>`;
            }
        });
        panel.innerHTML = html;
    }
}

// Для доступа из onclick в панели действий
window.okeyGame = window.okeyGame || new OkeyGame(); 