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
        this.playedThisTurn = [];
        this.lastHoveredTileIndex = null;
        this.isDiscarding = false;
        this.sets = [];
        
        // Set canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Initialize game
        this.initializeGame();
        
        // Add event listeners
        this.addEventListeners();
        
        // Start game loop
        this.gameLoop();

        // Tile selection events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHover());
        this.canvas.addEventListener('click', (e) => this.handleTileClick(e));

        // Управление кнопками
        this.updateControls();
    }

    addEventListeners() {
        // Add click event listener for Create Room button
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                this.createRoom();
            });
        }

        // Add click event listener for Join Room button
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => {
                const roomId = document.getElementById('roomIdInput').value;
                if (roomId) {
                    this.joinRoom(roomId);
                }
            });
        }

        // Add click event listener for Add Bot button
        const addBotBtn = document.getElementById('addBotBtn');
        if (addBotBtn) {
            addBotBtn.addEventListener('click', () => {
                this.addBot();
            });
        }

        // Add click event listener for Start Game button
        const startGameBtn = document.getElementById('startGameBtn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    initializeGame() {
        this.createTiles();
        this.shuffleTiles();
        this.distributeTiles();
        this.players.forEach(p => { p.played = []; p.hasInitialMeld = false; });
    }

    createTiles() {
        this.tiles = [];
        const colors = ['red', 'blue', 'black', 'yellow'];
        const numbers = Array.from({length: 13}, (_, i) => i + 1);
        colors.forEach(color => {
            numbers.forEach(number => {
                this.tiles.push({ color, number });
            });
        });
        // 2 комплекта
        this.tiles = this.tiles.concat(JSON.parse(JSON.stringify(this.tiles)));
    }

    shuffleTiles() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    distributeTiles() {
        for (let i = 0; i < 4; i++) {
            this.players[i].tiles = this.tiles.slice(i * 14, (i + 1) * 14);
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
        this.table = this.table || [];
        this.selectedTiles = [];
        this.selectedTableSet = null;
        this.selectedDiscard = null;
        this.isDiscarding = false;
        this.drawTable();
        
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
        // Сброс одной фишки (если не выиграл)
        if (!this.isDiscarding && player.tiles.length > 0) {
            this.isDiscarding = true;
            alert('Вы должны сбросить одну фишку в конце хода! Кликните по фишке для сброса.');
            this.updateControls();
            return;
        }
        if (this.isDiscarding && this.selectedDiscard != null) {
            player.tiles.splice(this.selectedDiscard, 1);
            this.selectedDiscard = null;
            this.isDiscarding = false;
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
            let isDiscard = (index === 0 && this.isDiscarding && tileIndex === this.selectedDiscard);
            this.drawTile(tile, x, y, tileWidth, tileHeight, isHovered, isSelected, isDiscard);
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

    drawTile(tile, x, y, width, height, isHovered = false, isSelected = false, isDiscard = false) {
        // Draw tile background
        this.ctx.save();
        if (isDiscard) {
            this.ctx.strokeStyle = '#ff4444';
            this.ctx.lineWidth = 5;
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
                if (this.isDiscarding) {
                    this.selectedDiscard = i;
                } else {
                    const idx = this.selectedTiles.indexOf(i);
                    if (idx !== -1) {
                        this.selectedTiles.splice(idx, 1);
                    } else {
                        this.selectedTiles.push(i);
                    }
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
        let addBtn = document.getElementById('add-to-table-set');
        if (!addBtn) {
            addBtn = document.createElement('button');
            addBtn.id = 'add-to-table-set';
            addBtn.textContent = 'Добавить к набору';
            addBtn.style.marginLeft = '5px';
            addBtn.style.display = 'none';
            document.getElementById('player-controls').insertBefore(addBtn, endBtn);
            addBtn.onclick = () => this.addToTableSet();
        }
        const player = this.players[0];
        if (this.currentPlayerIndex === 0) {
            const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
            playBtn.style.display = (this.selectedTiles.length >= 3 && this.isValidCombination(tilesToPlay)) ? '' : 'none';
            cancelBtn.style.display = (this.selectedTiles.length > 0 || this.table.length) ? '' : 'none';
            if (!player.hasInitialMeld) {
                const value = this.getTableValue();
                endBtn.style.display = (this.table.length > 0 && value >= 101 && !this.isDiscarding) ? '' : 'none';
            } else {
                endBtn.style.display = (this.table.length > 0 && !this.isDiscarding) ? '' : 'none';
            }
            // Кнопка "Добавить к набору" — если выбран ровно 1 тайл и выбран набор, и добавление возможно
            if (player.hasInitialMeld && this.selectedTiles.length === 1 && this.selectedTableSet != null && this.canAddToSet(this.players[0].tiles[this.selectedTiles[0]], this.selectedTableSet)) {
                addBtn.style.display = '';
            } else {
                addBtn.style.display = 'none';
            }
            // Сброс
            if (this.isDiscarding) {
                playBtn.style.display = 'none';
                addBtn.style.display = 'none';
                endBtn.style.display = (this.selectedDiscard != null) ? '' : 'none';
                cancelBtn.style.display = 'none';
            }
        } else {
            playBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            endBtn.style.display = 'none';
            addBtn.style.display = 'none';
        }
        // Для отладки
        console.log('playBtn:', playBtn.style.display, 'cancelBtn:', cancelBtn.style.display, 'endBtn:', endBtn.style.display, 'addBtn:', addBtn.style.display);
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
        if (this.currentPlayerIndex !== 0) return;
        if (this.selectedTiles.length < 3) return;
        const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
        if (!this.isValidCombination(tilesToPlay)) return;
        this.table.push([...tilesToPlay]);
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
        // Для каждого набора на столе
        this.table.forEach((comb, setIdx) => {
            const setDiv = document.createElement('div');
            setDiv.className = 'table-comb';
            setDiv.style.display = 'inline-block';
            setDiv.style.margin = '0 10px';
            setDiv.style.padding = '2px';
            setDiv.style.border = (this.selectedTableSet === setIdx) ? '2px solid #2196F3' : '2px dashed #bbb';
            setDiv.style.borderRadius = '6px';
            setDiv.style.cursor = (this.currentPlayerIndex === 0 && this.players[0].hasInitialMeld) ? 'pointer' : 'default';
            // Клик по набору — выбрать для добавления
            setDiv.onclick = () => {
                if (this.currentPlayerIndex === 0 && this.players[0].hasInitialMeld) {
                    this.selectedTableSet = setIdx;
                    this.updateControls();
                    this.drawTable();
                }
            };
            comb.forEach(tile => {
                const div = document.createElement('div');
                div.className = 'table-tile';
                div.style.color = tile.color;
                div.textContent = tile.number;
                setDiv.appendChild(div);
            });
            tableZone.appendChild(setDiv);
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

    canAddToSet(tile, setIdx) {
        // Проверить, можно ли добавить tile к набору table[setIdx] (после первого выхода)
        if (setIdx == null) return false;
        const comb = [...this.table[setIdx], tile];
        return this.isValidCombination(comb);
    }

    addToTableSet() {
        if (this.currentPlayerIndex !== 0 || !this.players[0].hasInitialMeld) return;
        if (this.selectedTiles.length !== 1 || this.selectedTableSet == null) return;
        const tileIdx = this.selectedTiles[0];
        const tile = this.players[0].tiles[tileIdx];
        if (!this.canAddToSet(tile, this.selectedTableSet)) return;
        // Добавить к выбранному набору
        this.table[this.selectedTableSet].push(tile);
        this.players[0].tiles.splice(tileIdx, 1);
        this.selectedTiles = [];
        this.selectedTableSet = null;
        this.updateControls();
        this.drawTable();
    }

    // Добавляем тайл к существующему набору
    addTileToSet(tile, setIndex) {
        if (this.currentPlayerIndex !== 0) return false; // Только игрок может добавлять тайлы
        
        const set = this.table[setIndex];
        if (!set) return false;
        
        // Проверяем, можно ли добавить тайл к набору
        if (set.type === 'set') {
            // Для сета проверяем цвет и последовательность
            if (tile.color !== set[0].color) return false;
            const values = set.map(t => t.number);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            
            if (tile.number === minValue - 1 || tile.number === maxValue + 1) {
                set.push(tile);
                set.sort((a, b) => a.number - b.number);
                this.players[0].tiles.splice(this.selectedTiles.indexOf(tile), 1);
                this.selectedTiles = [];
                this.updateControls();
                this.drawTable();
                return true;
            }
        } else if (set.type === 'run') {
            // Для рана проверяем последовательность
            const values = set.map(t => t.number);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            
            if (tile.number === minValue - 1 || tile.number === maxValue + 1) {
                set.push(tile);
                set.sort((a, b) => a.number - b.number);
                this.players[0].tiles.splice(this.selectedTiles.indexOf(tile), 1);
                this.selectedTiles = [];
                this.updateControls();
                this.drawTable();
                return true;
            }
        }
        
        return false;
    }

    // Проверяем возможность второго выхода
    canSecondExit() {
        if (this.currentPlayerIndex !== 0) return false; // Только игрок может делать выходы
        
        // Проверяем, есть ли уже первый выход
        if (this.table.length === 0) return false;
        
        // Проверяем, есть ли тайл для второго выхода
        const handTiles = this.players[0].tiles;
        for (const tile of handTiles) {
            // Проверяем, можно ли создать сет или ран с этим тайлом
            if (this.isValidCombination([tile]) || this.canCreateRun([tile])) {
                return true;
            }
        }
        
        return false;
    }

    // Создаем второй выход
    createSecondExit(tile) {
        if (!this.canSecondExit()) return false;
        
        // Создаем новый сет или ран
        if (this.isValidCombination([tile])) {
            this.table.push([tile]);
        } else if (this.canCreateRun([tile])) {
            this.table.push([tile]);
        }
        
        this.updateControls();
        this.drawTable();
        return true;
    }

    // Проверяем возможность создания сета
    canCreateSet(tiles) {
        if (tiles.length < 3) return false;
        // Проверка на сет (все числа равны, цвета разные)
        const allSameNumber = tiles.every(t => t.number === tiles[0].number);
        const allUniqueColors = new Set(tiles.map(t => t.color)).size === tiles.length;
        return allSameNumber && allUniqueColors;
    }

    // Проверяем возможность создания рана
    canCreateRun(tiles) {
        if (tiles.length < 3) return false;
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
        return allSameColor && isSequence;
    }

    // Создаем сет
    createSet(tiles) {
        this.table.push(tiles);
        this.players[0].tiles.splice(this.selectedTiles.indexOf(tiles[0]), 1);
        this.selectedTiles = [];
        this.updateControls();
        this.drawTable();
    }

    // Создаем ран
    createRun(tiles) {
        this.table.push(tiles);
        this.players[0].tiles.splice(this.selectedTiles.indexOf(tiles[0]), 1);
        this.selectedTiles = [];
        this.updateControls();
        this.drawTable();
    }

    // Обновляем UI
    updateUI() {
        console.log('Updating UI...');
        
        // Очищаем канвас
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем стол
        this.drawTable();
        
        // Рисуем тайлы игроков
        this.drawPlayerTiles();
        
        // Обновляем отображение игроков
        this.updatePlayersDisplay();
        
        // Обновляем отображение текущего игрока
        this.updateCurrentPlayerDisplay();
        
        // Обновляем отображение возможных действий
        this.updatePossibleActions();
        
        console.log('UI updated');
    }

    // Обновляем отображение возможных действий
    updatePossibleActions() {
        const actionsContainer = document.getElementById('possible-actions');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = '';
        
        // Добавляем кнопку для второго выхода, если возможно
        if (this.canSecondExit()) {
            const secondExitBtn = document.createElement('button');
            secondExitBtn.textContent = 'Сделать второй выход';
            secondExitBtn.onclick = () => {
                // Здесь будет логика выбора тайла для второго выхода
                this.showTileSelectionForSecondExit();
            };
            actionsContainer.appendChild(secondExitBtn);
        }
    }

    // Показываем выбор тайла для второго выхода
    showTileSelectionForSecondExit() {
        const handTiles = this.players[0].tiles;
        const validTiles = handTiles.filter(tile => 
            this.canCreateSet([tile]) || this.canCreateRun([tile])
        );
        
        if (validTiles.length === 0) return;
        
        // Создаем модальное окно для выбора тайла
        const modal = document.createElement('div');
        modal.className = 'tile-selection-modal';
        modal.innerHTML = `
            <div class="tile-selection-content">
                <h3>Выберите тайл для второго выхода</h3>
                <div class="tile-selection-grid"></div>
            </div>
        `;
        
        const grid = modal.querySelector('.tile-selection-grid');
        validTiles.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.className = 'tile';
            tileElement.style.backgroundColor = this.getTileColor(tile.color);
            tileElement.textContent = tile.number;
            tileElement.onclick = () => {
                this.createSecondExit([tile]);
                document.body.removeChild(modal);
            };
            grid.appendChild(tileElement);
        });
        
        document.body.appendChild(modal);
    }

    createRoom() {
        console.log('Creating room...');
        
        // Генерируем уникальный ID комнаты
        const roomId = Math.random().toString(36).substring(2, 8);
        console.log('Generated room ID:', roomId);
        
        // Создаем игрока
        const player = {
            id: 'player1',
            name: 'Player 1',
            tiles: [],
            isBot: false
        };
        
        // Добавляем игрока в массив игроков
        this.players = [player];
        console.log('Added player to room:', player);
        
        // Обновляем UI
        this.updateUI();
        
        // Показываем ID комнаты
        const roomIdDisplay = document.createElement('div');
        roomIdDisplay.id = 'roomIdDisplay';
        roomIdDisplay.textContent = `Room ID: ${roomId}`;
        roomIdDisplay.style.position = 'fixed';
        roomIdDisplay.style.top = '80px';
        roomIdDisplay.style.left = '50%';
        roomIdDisplay.style.transform = 'translateX(-50%)';
        roomIdDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        roomIdDisplay.style.padding = '10px';
        roomIdDisplay.style.borderRadius = '5px';
        roomIdDisplay.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
        document.body.appendChild(roomIdDisplay);
        
        // Активируем кнопки
        const addBotBtn = document.getElementById('addBotBtn');
        const startGameBtn = document.getElementById('startGameBtn');
        if (addBotBtn) addBotBtn.disabled = false;
        if (startGameBtn) startGameBtn.disabled = false;
        
        console.log('Room created successfully');
        return roomId;
    }

    drawPlayerTiles() {
        console.log('Drawing player tiles...');
        
        if (!this.players || this.players.length === 0) {
            console.log('No players to draw tiles for');
            return;
        }
        
        const player = this.players[0];
        if (!player.tiles || player.tiles.length === 0) {
            console.log('No tiles to draw for player');
            return;
        }
        
        const tileWidth = 40;
        const tileHeight = 60;
        const startX = (this.canvas.width - (player.tiles.length * tileWidth)) / 2;
        const startY = this.canvas.height - tileHeight - 20;
        
        player.tiles.forEach((tile, index) => {
            const x = startX + (index * tileWidth);
            const y = startY;
            
            // Рисуем фон тайла
            this.ctx.fillStyle = this.getTileColor(tile.color);
            this.ctx.fillRect(x, y, tileWidth, tileHeight);
            
            // Рисуем обводку тайла
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, tileWidth, tileHeight);
            
            // Рисуем номер тайла
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(tile.number.toString(), x + tileWidth / 2, y + tileHeight / 2);
        });
        
        console.log('Player tiles drawn');
    }
} 