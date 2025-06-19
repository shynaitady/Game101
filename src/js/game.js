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
        this.playerScroll = [0, 0, 0, 0]; // Индекс прокрутки для каждой руки
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
        // 21 фишка всем, 22 — первому игроку
        for (let i = 0; i < 4; i++) {
            const count = (i === 0) ? 22 : 21;
            if (!this.players[i]) {
                this.players[i] = { id: `player${i+1}`, name: `Player ${i+1}`, tiles: [], played: [], hasInitialMeld: false, isBot: i !== 0, score: 0 };
            }
            this.players[i].tiles = this.tiles.slice(i * 21 + (i === 0 ? 0 : 22), i * 21 + (i === 0 ? 22 : 21 * (i + 1) + 1));
            this.players[i].played = [];
            this.players[i].hasInitialMeld = false;
        }
        // Оставшиеся фишки — стопка
        this.deck = this.tiles.slice(22 + 21 * 3);
        this.discardPile = [];
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
        // В начале хода — взять фишку из стопки
        if (!currentPlayer.hasDrawn) {
            if (this.deck.length > 0) {
                currentPlayer.tiles.push(this.deck.pop());
            }
            currentPlayer.hasDrawn = true;
        }
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
        // Сбросить флаг взятия фишки
        this.players[this.currentPlayerIndex].hasDrawn = false;
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
        // 1. Визуализация стопки и сброса
        this.drawDeckAndDiscard();
        // 2. Игроки
        this.players.forEach((player, index) => {
            this.drawPlayerTiles(player, index);
            this.drawPlayerName(player, index);
        });
        // 3. Комбинации
        this.drawTable();
    }

    drawDeckAndDiscard() {
        // Coordinates and dimensions
        const deckX = 60, deckY = this.canvas.height / 2 - 40;
        const discardX = this.canvas.width - 108, discardY = this.canvas.height / 2 - 40;
        const tileWidth = 48, tileHeight = 64;

        // Store rectangles for interaction
        this.deckRect = { x: deckX, y: deckY, w: tileWidth, h: tileHeight };
        this.discardRect = { x: discardX, y: discardY, w: tileWidth, h: tileHeight };

        // Draw deck
        this.ctx.save();
        this.ctx.fillStyle = '#eee';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(deckX, deckY, tileWidth, tileHeight);
        this.ctx.strokeRect(deckX, deckY, tileWidth, tileHeight);
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Стопка', deckX + tileWidth/2, deckY - 18);
        this.ctx.fillText(this.deck.length.toString(), deckX + tileWidth/2, deckY + tileHeight/2);
        this.ctx.restore();

        // Draw discard pile
        this.ctx.save();
        this.ctx.fillStyle = '#ffe0b2';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(discardX, discardY, tileWidth, tileHeight);
        this.ctx.strokeRect(discardX, discardY, tileWidth, tileHeight);
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Сброс', discardX + tileWidth/2, discardY - 18);
        if (this.discardPile.length > 0) {
            const lastDiscard = this.discardPile[this.discardPile.length - 1];
            this.drawTile(lastDiscard, discardX, discardY, tileWidth, tileHeight);
        } else {
            this.ctx.fillText('0', discardX + tileWidth/2, discardY + tileHeight/2);
        }
        this.ctx.restore();
    }

    drawPlayerTiles(player, index) {
        const tileWidth = 48;
        const tileHeight = 64;
        const spacing = 10;
        const visibleTiles = 14;
        let x, y, rotation = 0;
        const scroll = this.playerScroll[index] || 0;
        
        // Calculate positions based on player index
        if (index === 0) {
            x = (this.canvas.width - (visibleTiles * (tileWidth + spacing))) / 2;
            y = this.canvas.height - tileHeight - 60;
        } else if (index === 1) {
            x = this.canvas.width - tileHeight - 60;
            y = (this.canvas.height + (visibleTiles * (tileWidth + spacing))) / 2;
            rotation = -90;
        } else if (index === 2) {
            x = (this.canvas.width + (visibleTiles * (tileWidth + spacing))) / 2;
            y = tileHeight + 60;
            rotation = 180;
        } else {
            x = tileHeight + 60;
            y = (this.canvas.height - (visibleTiles * (tileWidth + spacing))) / 2;
            rotation = 90;
        }

        // Draw scroll arrows if needed
        if (player.tiles.length > visibleTiles) {
            const arrowSize = 30;
            if (index === 0) {
                // Left arrow
                const leftEnabled = scroll > 0;
                this.drawScrollArrow(x - arrowSize - 10, y + tileHeight/2, 'left', index, leftEnabled);
                // Right arrow
                const rightEnabled = scroll < player.tiles.length - visibleTiles;
                this.drawScrollArrow(x + (visibleTiles * (tileWidth + spacing)), y + tileHeight/2, 'right', index, rightEnabled);
            } else if (index === 1) {
                const leftEnabled = scroll > 0;
                this.drawScrollArrow(x + tileHeight/2, y - arrowSize - 10, 'left', index, leftEnabled);
                const rightEnabled = scroll < player.tiles.length - visibleTiles;
                this.drawScrollArrow(x + tileHeight/2, y + (visibleTiles * (tileWidth + spacing)), 'right', index, rightEnabled);
            } else if (index === 2) {
                const leftEnabled = scroll > 0;
                this.drawScrollArrow(x - arrowSize - 10, y + tileHeight/2, 'left', index, leftEnabled);
                const rightEnabled = scroll < player.tiles.length - visibleTiles;
                this.drawScrollArrow(x - (visibleTiles * (tileWidth + spacing)), y + tileHeight/2, 'right', index, rightEnabled);
            } else {
                const leftEnabled = scroll > 0;
                this.drawScrollArrow(x + tileHeight/2, y - arrowSize - 10, 'left', index, leftEnabled);
                const rightEnabled = scroll < player.tiles.length - visibleTiles;
                this.drawScrollArrow(x + tileHeight/2, y - (visibleTiles * (tileWidth + spacing)), 'right', index, rightEnabled);
            }
        }

        // Draw tiles
        player.tiles.slice(scroll, scroll + visibleTiles).forEach((tile, i) => {
            this.ctx.save();
            let tileX, tileY;
            
            if (index === 0) {
                tileX = x + i * (tileWidth + spacing);
                tileY = y;
            } else if (index === 1) {
                tileX = x;
                tileY = y + i * (tileWidth + spacing);
            } else if (index === 2) {
                tileX = x - i * (tileWidth + spacing);
                tileY = y;
            } else {
                tileX = x;
                tileY = y - i * (tileWidth + spacing);
            }

            // Store tile rect for interaction
            if (index === this.currentPlayerIndex) {
                this.tileRects.push({
                    x: tileX,
                    y: tileY,
                    w: tileWidth,
                    h: tileHeight,
                    index: i + scroll
                });
            }

            // Rotate context if needed
            if (rotation !== 0) {
                this.ctx.translate(tileX + tileWidth/2, tileY + tileHeight/2);
                this.ctx.rotate(rotation * Math.PI / 180);
                tileX = -tileWidth/2;
                tileY = -tileHeight/2;
            }

            const isHovered = this.currentPlayerIndex === index && this.lastHoveredTileIndex === i + scroll;
            const isSelected = this.currentPlayerIndex === index && this.selectedTiles.includes(i + scroll);
            
            // Check if this tile can form valid combinations with selected tiles
            let isPossible = false;
            if (this.currentPlayerIndex === index && this.selectedTiles.length > 0 && !isSelected) {
                const testTiles = [...this.selectedTiles.map(idx => player.tiles[idx]), tile];
                isPossible = this.isValidCombination(testTiles);
            }

            this.drawTile(tile, tileX, tileY, tileWidth, tileHeight, isHovered, isSelected, isPossible);
            this.ctx.restore();
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
        // Добавить количество карт в руке
        this.ctx.fillText(`${player.name} (${player.tiles.length})`, x, y);
        this.ctx.restore();
    }

    drawTile(tile, x, y, width, height, isHovered = false, isSelected = false, isPossible = false) {
        this.ctx.save();
        if (isPossible) {
            this.ctx.strokeStyle = '#FFD600';
            this.ctx.lineWidth = 3;
        } else if (isSelected) {
            this.ctx.strokeStyle = '#FF9800';
            this.ctx.lineWidth = 4;
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

        // Handle scroll arrow clicks
        if (this.scrollArrows) {
            for (const arrow of this.scrollArrows) {
                if (arrow.enabled && 
                    mouseX >= arrow.x && mouseX <= arrow.x + arrow.w && 
                    mouseY >= arrow.y && mouseY <= arrow.y + arrow.h) {
                    if (arrow.dir === 'left') {
                        this.playerScroll[arrow.playerIdx] = Math.max(0, (this.playerScroll[arrow.playerIdx] || 0) - 1);
                    } else {
                        this.playerScroll[arrow.playerIdx] = Math.min(
                            this.players[arrow.playerIdx].tiles.length - 14,
                            (this.playerScroll[arrow.playerIdx] || 0) + 1
                        );
                    }
                    this.draw();
                    return;
                }
            }
        }

        // Handle deck/discard pile clicks if player hasn't drawn yet
        if (!this.players[0].hasDrawn) {
            if (this.deckRect && 
                mouseX >= this.deckRect.x && mouseX <= this.deckRect.x + this.deckRect.w && 
                mouseY >= this.deckRect.y && mouseY <= this.deckRect.y + this.deckRect.h) {
                if (this.deck.length > 0) {
                    this.players[0].tiles.push(this.deck.pop());
                    this.players[0].hasDrawn = true;
                    this.draw();
                }
                return;
            }
            if (this.discardRect && 
                mouseX >= this.discardRect.x && mouseX <= this.discardRect.x + this.discardRect.w && 
                mouseY >= this.discardRect.y && mouseY <= this.discardRect.y + this.discardRect.h) {
                if (this.discardPile.length > 0) {
                    this.players[0].tiles.push(this.discardPile.pop());
                    this.players[0].hasDrawn = true;
                    this.draw();
                }
                return;
            }
        }

        // Handle tile clicks
        let clickedTileIndex = -1;
        for (const rect of this.tileRects) {
            if (mouseX >= rect.x && mouseX <= rect.x + rect.w &&
                mouseY >= rect.y && mouseY <= rect.y + rect.h) {
                clickedTileIndex = rect.index;
                break;
            }
        }

        if (clickedTileIndex !== -1) {
            const idx = this.selectedTiles.indexOf(clickedTileIndex);
            if (idx !== -1) {
                // Deselect tile
                this.selectedTiles.splice(idx, 1);
            } else {
                // Select tile
                this.selectedTiles.push(clickedTileIndex);
                
                // Check if we can form a valid combination
                if (this.selectedTiles.length >= 3) {
                    const selectedCards = this.selectedTiles.map(i => this.players[0].tiles[i]);
                    if (this.isValidCombination(selectedCards)) {
                        // Highlight the valid combination
                        this.draw();
                    }
                }
            }
            
            // Sort selected tiles by index for better UX
            this.selectedTiles.sort((a, b) => a - b);
        }

        this.updateControls();
        this.draw();
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
        const tile = this.players[0].tiles[idx];
        this.discardPile.push(tile);
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
                html += `Комбинация: [${a.tiles.map(i => this.players[0].tiles[i]?.number).join(', ')}] <button onclick="window.okeyGame.removePendingAction(${idx})">✖</button><br>`
            }
        });
        panel.innerHTML = html;
    }

    drawScrollArrow(x, y, dir, playerIdx, enabled) {
        this.ctx.save();
        this.ctx.fillStyle = enabled ? '#4CAF50' : '#ccc';
        this.ctx.beginPath();
        
        if (dir === 'left') {
            this.ctx.moveTo(x + 30, y - 15);
            this.ctx.lineTo(x, y);
            this.ctx.lineTo(x + 30, y + 15);
        } else {
            this.ctx.moveTo(x, y - 15);
            this.ctx.lineTo(x + 30, y);
            this.ctx.lineTo(x, y + 15);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // Store arrow hitbox
        if (!this.scrollArrows) this.scrollArrows = [];
        this.scrollArrows.push({
            x: x,
            y: y - 15,
            w: 30,
            h: 30,
            dir: dir,
            playerIdx: playerIdx,
            enabled: enabled
        });
    }
}