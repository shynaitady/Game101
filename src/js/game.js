class OkeyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = [];
        this.currentPlayerIndex = 0;
        this.tiles = [];
        this.selectedTiles = [];
        this.turnTime = 30; // seconds
        this.timer = null;
        this.gameStarted = false;
        this.tileRects = [];
        this.table = [];
        // Для каждого игрока — массив сыгранных карт
        this.playedThisTurn = [];
        this.lastHoveredTileIndex = null;
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize game
        this.initializeGame();

        // Tile selection events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHover());
        this.canvas.addEventListener('click', (e) => this.handleTileClick(e));

        // Управление кнопками
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
        // Инициализация массива сыгранных карт и флага первого выхода для каждого игрока
        this.players.forEach(p => { p.played = []; p.hasInitialMeld = false; });
    }

    createTiles() {
        const colors = ['red', 'blue', 'black', 'yellow'];
        const numbers = Array.from({length: 13}, (_, i) => i + 1);
        
        colors.forEach(color => {
            numbers.forEach(number => {
                this.tiles.push({ color, number });
            });
        });
    }

    shuffleTiles() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    distributeTiles() {
        // Distribute 14 tiles to each player
        for (let i = 0; i < this.players.length; i++) {
            const playerTiles = this.tiles.slice(i * 14, (i + 1) * 14);
            this.players[i].tiles = playerTiles;
        }
    }

    startTurn() {
        if (this.timer) clearInterval(this.timer);
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        document.getElementById('current-player').textContent = 
            `Current Player: ${currentPlayer.name}`;
        
        this.turnTime = 30;
        this.updateTimer();
        this.updateControls();
        this.table = [];
        this.drawTable();
        this.selectedTiles = [];
        
        this.timer = setInterval(() => {
            this.turnTime--;
            this.updateTimer();
            
            if (this.turnTime <= 0) {
                this.endTurn();
            }
        }, 1000);

        // If current player is a bot, make their move
        if (currentPlayer.isBot) {
            currentPlayer.makeMove();
        }
    }

    updateTimer() {
        document.getElementById('timer').textContent = 
            `Time remaining: ${this.turnTime}s`;
    }

    endTurn() {
        if (this.timer) clearInterval(this.timer);
        // Проверка первого выхода
        const player = this.players[this.currentPlayerIndex];
        if (!player.hasInitialMeld) {
            const value = this.getTableValue();
            if (this.table.length === 0 || value < 101) {
                alert('Для первого выхода нужно выложить комбинации на сумму не менее 101 очка!');
                this.updateControls();
                return;
            }
            player.hasInitialMeld = true;
        }
        // Все карты, выложенные на стол, добавляем в played текущего игрока
        if (this.table.length) {
            player.played = player.played || [];
            this.table.forEach(comb => player.played.push(...comb));
        }
        this.table = [];
        this.updateControls();
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.tileRects = [];
        // Draw player tiles, played tiles и names
        this.players.forEach((player, index) => {
            this.drawPlayerTiles(player, index);
            this.drawPlayerPlayed(player, index);
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
        player.tiles.forEach((tile, tileIndex) => {
            let x, y;
            if (index === 0) {
                x = this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 + tileIndex * (tileWidth + padding);
                y = this.canvas.height - tileHeight - padding;
            } else if (index === 1) {
                // Вертикальное распределение справа
                x = this.canvas.width - tileWidth - padding;
                const totalHeight = this.canvas.height - tileHeight - 2 * padding;
                const step = player.tiles.length > 1 ? totalHeight / (player.tiles.length - 1) : 0;
                y = padding + tileIndex * step;
            } else if (index === 2) {
                x = this.canvas.width / 2 - (player.tiles.length * (tileWidth + padding)) / 2 + tileIndex * (tileWidth + padding);
                y = padding;
            } else {
                // Вертикальное распределение слева
                x = padding;
                const totalHeight = this.canvas.height - tileHeight - 2 * padding;
                const step = player.tiles.length > 1 ? totalHeight / (player.tiles.length - 1) : 0;
                y = padding + tileIndex * step;
            }
            // Save rect for selection (только для игрока 0)
            if (index === 0) {
                this.tileRects[tileIndex] = { x, y, w: tileWidth, h: tileHeight };
            }
            // Мультивыбор: подсветка выбранных
            let isHovered = (index === 0 && tileIndex === this.hoveredTileIndex);
            let isSelected = (index === 0 && this.selectedTiles.includes(tileIndex));
            this.drawTile(tile, x, y, tileWidth, tileHeight, isHovered, isSelected);
        });
    }

    drawPlayerPlayed(player, index) {
        if (!player.played || !player.played.length) return;
        const miniWidth = 24;
        const miniHeight = 36;
        const padding = 2;
        let x, y;
        if (index === 0) {
            x = this.canvas.width / 2 - (player.played.length * (miniWidth + padding)) / 2;
            y = this.canvas.height - 80;
        } else if (index === 1) {
            x = this.canvas.width - miniWidth - 10;
            y = this.canvas.height / 2 - (player.played.length * (miniHeight + padding)) / 2;
        } else if (index === 2) {
            x = this.canvas.width / 2 - (player.played.length * (miniWidth + padding)) / 2;
            y = 60;
        } else {
            x = 10;
            y = this.canvas.height / 2 - (player.played.length * (miniHeight + padding)) / 2;
        }
        for (let i = 0; i < player.played.length; i++) {
            if (index === 1 || index === 3) {
                // Вертикально
                this.drawTile(player.played[i], x, y + i * (miniHeight + padding), miniWidth, miniHeight);
            } else {
                // Горизонтально
                this.drawTile(player.played[i], x + i * (miniWidth + padding), y, miniWidth, miniHeight);
            }
        }
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

    drawTile(tile, x, y, width, height, isHovered = false, isSelected = false) {
        // Draw tile background
        this.ctx.save();
        if (isSelected) {
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
        
        // Draw tile number
        this.ctx.fillStyle = tile.color;
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.number.toString(), x + width/2, y + height/2);
        this.ctx.restore();
    }

    clearHover() {
        this.hoveredTileIndex = null;
    }

    handleMouseMove(e) {
        if (!this.players[0] || !this.players[0].tiles) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.hoveredTileIndex = null;
        if (this.currentPlayerIndex === 0) {
            for (let i = 0; i < this.tileRects.length; i++) {
                const r = this.tileRects[i];
                if (
                    mouseX >= r.x && mouseX <= r.x + r.w &&
                    mouseY >= r.y && mouseY <= r.y + r.h
                ) {
                    this.hoveredTileIndex = i;
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
                // Мультивыбор: если уже выбрана — снять, иначе добавить
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
    }

    updateControls() {
        const playBtn = document.getElementById('play-to-table');
        const cancelBtn = document.getElementById('cancel-selection');
        const endBtn = document.getElementById('end-turn');
        const player = this.players[0];
        if (this.currentPlayerIndex === 0) {
            // Кнопка "Выложить на стол" только если выбран валидный набор
            const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
            playBtn.style.display = (this.selectedTiles.length >= 3 && this.isValidCombination(tilesToPlay)) ? '' : 'none';
            cancelBtn.style.display = (this.selectedTiles.length > 0 || this.table.length) ? '' : 'none';
            // Кнопка "Подтвердить ход" — только если на столе есть комбинации и (если не было первого выхода, сумма >= 101)
            if (!player.hasInitialMeld) {
                const value = this.getTableValue();
                endBtn.style.display = (this.table.length > 0 && value >= 101) ? '' : 'none';
            } else {
                endBtn.style.display = (this.table.length > 0) ? '' : 'none';
            }
        } else {
            playBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            endBtn.style.display = 'none';
        }
        // Для отладки
        console.log('playBtn:', playBtn.style.display, 'cancelBtn:', cancelBtn.style.display, 'endBtn:', endBtn.style.display);
    }

    isValidCombination(tiles) {
        if (tiles.length < 3) return false;
        // Проверка на сет (все числа равны, цвета разные)
        const allSameNumber = tiles.every(t => t.number === tiles[0].number);
        const allUniqueColors = new Set(tiles.map(t => t.color)).size === tiles.length;
        if (allSameNumber && allUniqueColors) return true;
        // Проверка на ряд (цвет один, числа последовательные)
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

    playToTable() {
        if (this.currentPlayerIndex !== 0 || this.selectedTiles.length < 3) return;
        // Собираем выбранные карты
        const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
        if (!this.isValidCombination(tilesToPlay)) return;
        // Добавляем комбинацию на стол
        this.table.push([...tilesToPlay]);
        // Удаляем карты из руки (сортируем индексы по убыванию для корректного удаления)
        this.selectedTiles.sort((a, b) => b - a).forEach(i => this.players[0].tiles.splice(i, 1));
        this.selectedTiles = [];
        this.updateControls();
        this.drawTable();
    }

    cancelSelection() {
        this.selectedTiles = [];
        this.updateControls();
        this.drawTable();
    }

    drawTable() {
        const tableZone = document.getElementById('table-zone');
        tableZone.innerHTML = '';
        this.table.forEach(tile => {
            const div = document.createElement('div');
            div.className = 'table-tile';
            div.style.color = tile.color;
            div.textContent = tile.number;
            tableZone.appendChild(div);
        });
    }

    getCombinationValue(tiles) {
        // Сумма очков комбинации (для сета и ряда — сумма номиналов)
        return tiles.reduce((sum, t) => sum + t.number, 0);
    }

    getTableValue() {
        // Сумма очков всех новых комбинаций за ход
        return this.table.reduce((sum, comb) => sum + this.getCombinationValue(comb), 0);
    }
} 