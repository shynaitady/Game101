class OkeyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Инициализируем базовые массивы
        this.players = [];
        this.tiles = [];
        this.selectedTiles = [];
        this.pendingActions = [];
        this.discardPile = [];
        this.reservePile = [];
        
        // Инициализируем начальные значения
        this.currentPlayerIndex = 0;
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
        this.openTile = null;
        this.jokerTile = null;
        
        // Создаем начальных игроков
        for (let i = 0; i < 4; i++) {
            this.players[i] = {
                id: `player${i+1}`,
                name: `Player ${i+1}`,
                tiles: [],
                played: [],
                hasInitialMeld: false,
                isBot: i !== 0,
                score: 0
            };
        }
        
        // Устанавливаем обработчики событий
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHover());
        this.canvas.addEventListener('click', (e) => this.handleTileClick(e));
        
        // Обновляем элементы управления
        this.updateControls();
    }

    initializeGame() {
        // Создаем и перемешиваем фишки
        this.createTiles();
        this.shuffleTiles();
        this.determineOpenTile();
        
        // Сбрасываем состояние игроков
        this.players.forEach((player, i) => {
            player.tiles = [];
            player.played = [];
            player.hasInitialMeld = false;
            player.score = 0;
        });
        
        // Сбрасываем состояние игры
        this.currentPlayerIndex = 0;
        this.table = [];
        this.winner = null;
        this.scores = [0, 0, 0, 0];
        this.pendingActions = [];
        this.discardPile = [];
        this.selectedTiles = [];
        this.selectedTableSet = null;
        this.selectedDiscard = null;
        this.isDiscarding = false;
        
        // Распределяем фишки
        this.distributeTiles();
        
        // Обновляем отображение
        this.updateScores();
        this.draw();
    }

    createTiles() {
        this.tiles = [];
        const colors = ['red', 'blue', 'black', 'yellow'];
        const numbers = Array.from({length: 13}, (_, i) => i + 1);
        
        for (let k = 0; k < 2; k++) {
            colors.forEach(color => {
                numbers.forEach(number => {
                    this.tiles.push({ color, number, isJoker: false });
                });
            });
        }
        
        this.tiles.push({ color: 'joker', number: 0, isJoker: true });
        this.tiles.push({ color: 'joker', number: 0, isJoker: true });
    }

    determineOpenTile() {
        // Выбираем случайную фишку как открытую
        const randomIndex = Math.floor(Math.random() * this.tiles.length);
        this.openTile = this.tiles[randomIndex];
        
        // Определяем фальш-джокер (следующая по номеру того же цвета)
        if (this.openTile.isJoker) {
            // Если открыта джокер, то фальш-джокер тоже джокер
            this.jokerTile = { color: 'joker', number: 0, isJoker: true };
        } else if (this.openTile.number === 13) {
            // Если открыта 13, то фальш-джокер - 1 того же цвета
            this.jokerTile = { color: this.openTile.color, number: 1, isJoker: false };
        } else {
            this.jokerTile = { color: this.openTile.color, number: this.openTile.number + 1, isJoker: false };
        }
        
        console.log(`Открытая фишка: ${this.openTile.color} ${this.openTile.number}`);
        console.log(`Фальш-джокер: ${this.jokerTile.color} ${this.jokerTile.number}`);
    }

    shuffleTiles() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    distributeTiles() {
        // Отделяем резервные фишки
        this.reservePile = this.tiles.slice(56);
        this.tiles = this.tiles.slice(0, 56);
        
        // Распределяем фишки игрокам
        for (let i = 0; i < 4; i++) {
            const tilesCount = i === 0 ? 15 : 14;
            const startIndex = i === 0 ? 0 : 15 + (i - 1) * 14;
            this.players[i].tiles = this.tiles.slice(startIndex, startIndex + tilesCount);
        }
    }

    updateScores() {
        for (let i = 0; i < 4; i++) {
            this.scores[i] = this.players[i].tiles.reduce((sum, t) => {
                if (t.isJoker) {
                    return sum + 25; // Джокер = 25 штрафных очков
                } else {
                    return sum + t.number; // Обычная фишка = её числовое значение
                }
            }, 0);
            this.players[i].score = this.scores[i];
        }
        this.drawScores();
    }

    drawScores() {
        // Проверяем инициализацию игроков
        if (!this.players || this.players.length === 0) return;

        let scoreDiv = document.getElementById('score-board');
        if (!scoreDiv) {
            scoreDiv = document.createElement('div');
            scoreDiv.id = 'score-board';
            document.body.appendChild(scoreDiv);
        }
        
        let html = '<div class="game-info-section">';
        html += '<div class="info-row"><b>Очки игроков:</b></div>';
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i]) {
                html += `<div class="info-row">${this.players[i].name}: <b>${this.scores[i]}</b></div>`;
            }
        }
        if (this.winner !== null && this.players[this.winner]) {
            html += `<div class="info-row" style="margin-top: 10px; color: #4CAF50"><b>Победитель: ${this.players[this.winner].name}</b></div>`;
        }
        html += '</div>';
        
        scoreDiv.innerHTML = html;
    }

    checkWin() {
        for (let i = 0; i < 4; i++) {
            if (this.players[i].tiles.length === 0 && this.players[i].hasInitialMeld) {
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
        
        // Игрок должен взять фишку в начале хода
        if (currentPlayer.isBot) {
            this.drawTileForBot();
        } else {
            // Для человеческого игрока показываем кнопки выбора
            this.showDrawOptions();
        }
        
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

    drawTileForBot() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Бот предпочитает брать из сброса, если там есть фишки
        if (this.discardPile.length > 0) {
            const drawnTile = this.discardPile.pop();
            currentPlayer.tiles.push(drawnTile);
            console.log(`${currentPlayer.name} взял фишку из сброса:`, drawnTile);
        }
        // Если сброс пуст, берем из резерва
        else if (this.reservePile.length > 0) {
            const drawnTile = this.reservePile.pop();
            currentPlayer.tiles.push(drawnTile);
            console.log(`${currentPlayer.name} взял фишку из резерва:`, drawnTile);
        }
        // Если резерв тоже пуст, игра заканчивается вничью
        else {
            console.log('Резерв пуст - игра заканчивается вничью');
            this.endGameInDraw();
        }
    }

    showDrawOptions() {
        // Показываем кнопки для выбора источника фишки
        const drawDiscardBtn = document.getElementById('draw-from-discard');
        const drawReserveBtn = document.getElementById('draw-from-reserve');
        
        if (this.discardPile.length > 0) {
            drawDiscardBtn.style.display = '';
            drawDiscardBtn.textContent = `Взять из сброса (${this.discardPile.length})`;
        } else {
            drawDiscardBtn.style.display = 'none';
        }
        
        if (this.reservePile.length > 0) {
            drawReserveBtn.style.display = '';
            drawReserveBtn.textContent = `Взять из резерва (${this.reservePile.length})`;
        } else {
            drawReserveBtn.style.display = 'none';
        }
    }

    drawFromReserve() {
        if (this.currentPlayerIndex !== 0) return;
        if (this.reservePile.length === 0) {
            this.endGameInDraw();
            return;
        }
        
        const drawnTile = this.reservePile.pop();
        this.players[0].tiles.push(drawnTile);
        console.log('Игрок взял фишку из резерва:', drawnTile);
        
        this.updateScores();
        this.draw();
    }

    drawFromDiscard() {
        if (this.currentPlayerIndex !== 0) return;
        if (this.discardPile.length === 0) {
            alert('Сброс пуст!');
            return;
        }
        
        const drawnTile = this.discardPile.pop();
        this.players[0].tiles.push(drawnTile);
        console.log('Игрок взял фишку из сброса:', drawnTile);
        
        // Скрываем кнопку взятия из сброса
        document.getElementById('draw-from-discard').style.display = 'none';
        
        this.updateScores();
        this.draw();
    }

    endGameInDraw() {
        this.winner = null;
        this.updateScores();
        setTimeout(() => alert('Игра завершена вничью! Резерв пуст.'), 100);
        return true;
    }

    botMove() {
        const bot = this.players[this.currentPlayerIndex];
        
        // Бот пытается найти комбинации для выкладывания
        let foundCombination = false;
        
        // Если бот еще не делал первый выход, ищет комбинации на 101+ очков
        if (!bot.hasInitialMeld) {
            const combinations = this.findValidCombinations(bot.tiles);
            const validInitialMeld = this.findInitialMeld(combinations);
            
            if (validInitialMeld) {
                // Выкладываем комбинации для первого выхода
                validInitialMeld.forEach(comb => {
                    this.table.push([...comb]);
                });
                // Удаляем выложенные фишки
                validInitialMeld.flat().forEach(tile => {
                    const index = bot.tiles.findIndex(t => t.color === tile.color && t.number === tile.number);
                    if (index !== -1) bot.tiles.splice(index, 1);
                });
                bot.hasInitialMeld = true;
                foundCombination = true;
            }
        } else {
            // Если уже вышел, ищет любые валидные комбинации
            for (let i = 0; i < bot.tiles.length - 2; i++) {
                for (let j = i + 1; j < bot.tiles.length - 1; j++) {
                    for (let k = j + 1; k < bot.tiles.length; k++) {
                        const comb = [bot.tiles[i], bot.tiles[j], bot.tiles[k]];
                        if (this.isValidCombination(comb)) {
                            this.table.push([...comb]);
                            [i, j, k].sort((a, b) => b - a).forEach(idx => bot.tiles.splice(idx, 1));
                            foundCombination = true;
                            break;
                        }
                    }
                    if (foundCombination) break;
                }
                if (foundCombination) break;
            }
        }
        
        // Сбрасываем одну фишку в конце хода
        if (bot.tiles.length > 0) {
            const discardedTile = bot.tiles.splice(0, 1)[0];
            this.discardPile.push(discardedTile);
            console.log(`${bot.name} сбросил фишку:`, discardedTile);
        }
        
        this.updateScores();
        this.endTurn();
    }

    findValidCombinations(tiles) {
        const combinations = [];
        
        // Ищем все возможные комбинации из 3+ фишек
        for (let size = 3; size <= tiles.length; size++) {
            const combs = this.getCombinations(tiles, size);
            combs.forEach(comb => {
                if (this.isValidCombination(comb)) {
                    combinations.push(comb);
                }
            });
        }
        
        return combinations;
    }

    getCombinations(tiles, size) {
        const combinations = [];
        
        function backtrack(start, current) {
            if (current.length === size) {
                combinations.push([...current]);
                return;
            }
            
            for (let i = start; i < tiles.length; i++) {
                current.push(tiles[i]);
                backtrack(i + 1, current);
                current.pop();
            }
        }
        
        backtrack(0, []);
        return combinations;
    }

    findInitialMeld(combinations) {
        // Ищем комбинации, которые дают 101+ очков
        const validMeld = [];
        let totalScore = 0;
        
        // Простая эвристика: берем комбинации с наибольшими очками
        const sortedCombinations = combinations.sort((a, b) => {
            const scoreA = a.reduce((sum, t) => sum + t.number, 0);
            const scoreB = b.reduce((sum, t) => sum + t.number, 0);
            return scoreB - scoreA;
        });
        
        for (const comb of sortedCombinations) {
            const score = comb.reduce((sum, t) => sum + t.number, 0);
            if (totalScore + score <= 150) { // Ограничиваем общее количество очков
                validMeld.push(comb);
                totalScore += score;
                if (totalScore >= 101) break;
            }
        }
        
        return totalScore >= 101 ? validMeld : null;
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
        
        // Проверяем, есть ли джокеры в комбинации
        const jokers = tiles.filter(t => t.isJoker);
        const normalTiles = tiles.filter(t => !t.isJoker);
        
        // Если все фишки - джокеры, это валидная комбинация
        if (normalTiles.length === 0) return true;
        
        // Проверяем, есть ли фальш-джокер (его можно использовать только как своё значение)
        const falseJoker = normalTiles.find(t => 
            t.color === this.jokerTile.color && 
            t.number === this.jokerTile.number && 
            !t.isJoker
        );
        
        // Проверяем сет (одинаковые числа, разные цвета)
        const allSameNumber = normalTiles.every(t => t.number === normalTiles[0].number);
        const allUniqueColors = new Set(normalTiles.map(t => t.color)).size === normalTiles.length;
        if (allSameNumber && allUniqueColors) return true;
        
        // Проверяем ряд (последовательные числа, один цвет)
        const allSameColor = normalTiles.every(t => t.color === normalTiles[0].color);
        const sorted = [...normalTiles].sort((a, b) => a.number - b.number);
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
        if (!this.ctx) return;
        
        this.tileRects = [];

        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем фон
        this.ctx.fillStyle = '#084c24';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.font = 'bold 100px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('OKEY 101', this.canvas.width / 2, this.canvas.height / 2 - 50);
        this.ctx.restore();
        
        // Проверяем инициализацию игроков перед отрисовкой
        if (this.players && this.players.length > 0) {
            // Отрисовываем стол с комбинациями
            this.drawTable();
            
            // Отрисовываем сброс
            this.drawDiscardPile();
            
            // Отрисовываем фишки игроков
            this.players.forEach((player, index) => {
                if (player) {
                    this.drawPlayerTiles(player, index);
                }
            });
            
            // Обновляем информацию об игре
            this.drawGameInfo();
            
            // Обновляем информацию о счете
            this.drawScores();
            
            // Обновляем информацию о действиях
            this.drawPendingActions();
        }
    }

    drawPlayerTiles(player, index) {
        if (!player || !player.tiles) return;

        const tileWidth = 40;
        const tileHeight = 60;
        const padding = 15;

        this.ctx.save();
        const isCurrentPlayer = index === this.currentPlayerIndex;

        switch (index) {
            case 0: { // Bottom player (human)
                const rackWidth = player.tiles.length * (tileWidth + 5) - 5;
                const x = (this.canvas.width - rackWidth) / 2;
                const y = this.canvas.height - tileHeight - padding;

                this.ctx.fillStyle = '#654321';
                this.ctx.strokeStyle = isCurrentPlayer ? 'yellow' : '#321a0a';
                this.ctx.lineWidth = isCurrentPlayer ? 4 : 2;
                this.ctx.beginPath();
                this.ctx.roundRect(x - 10, y - 10, rackWidth + 20, tileHeight + 20, 10);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${player.name}${isCurrentPlayer ? ' (Ваш ход)' : ''}`, x, y - 20);

                let currentX = x;
                this.tileRects = [];
                player.tiles.forEach((tile, idx) => {
                    const isHovered = this.lastHoveredTileIndex === idx;
                    const isSelected = this.selectedTiles.includes(idx);
                    this.drawTile(tile, currentX, y, tileWidth, tileHeight, isHovered, isSelected);
                    this.tileRects.push({ x: currentX, y, w: tileWidth, h: tileHeight });
                    currentX += tileWidth + 5;
                });
                break;
            }
            case 1: { // Right player
                const rackHeight = player.tiles.length * 15 + padding * 2;
                const x = this.canvas.width - tileHeight - padding;
                const y = (this.canvas.height - rackHeight) / 2;
                
                this.ctx.translate(x + tileHeight, y);
                this.ctx.rotate(Math.PI / 2);

                this.drawBotRack(player.name, isCurrentPlayer, player.tiles.length, rackHeight);
                break;
            }
            case 2: { // Top player
                const rackWidth = player.tiles.length * 15 + padding * 2;
                const x = (this.canvas.width - rackWidth) / 2;
                const y = padding;

                this.ctx.translate(x, y);

                this.drawBotRack(player.name, isCurrentPlayer, player.tiles.length, rackWidth, false);
                break;
            }
            case 3: { // Left player
                const rackHeight = player.tiles.length * 15 + padding * 2;
                const x = padding;
                const y = (this.canvas.height - rackHeight) / 2;

                this.ctx.translate(x, y + rackHeight);
                this.ctx.rotate(-Math.PI / 2);
                
                this.drawBotRack(player.name, isCurrentPlayer, player.tiles.length, rackHeight);
                break;
            }
        }
        this.ctx.restore();
    }
    
    drawBotRack(name, isCurrentPlayer, tileCount, length, isVertical = true) {
        const tileWidth = 40;
        const tileHeight = 60;
        const rackWidth = isVertical ? tileHeight + 10 : length;
        const rackHeight = isVertical ? length : tileHeight + 10;
    
        this.ctx.fillStyle = '#654321';
        this.ctx.strokeStyle = isCurrentPlayer ? 'yellow' : '#321a0a';
        this.ctx.lineWidth = isCurrentPlayer ? 4 : 2;
        this.ctx.beginPath();
        this.ctx.roundRect(-5, -5, rackWidth, rackHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();
    
        this.ctx.save();
        if (isVertical) {
            this.ctx.rotate(Math.PI / 2);
            this.ctx.translate(0, -rackWidth);
        }
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        
        if(isVertical) {
             this.ctx.fillText(name, 15, rackWidth - 20);
        } else {
             this.ctx.fillText(name, 5, -10);
        }

        this.ctx.restore();
    
        for (let i = 0; i < tileCount; i++) {
            if (isVertical) {
                this.drawTileBack(0, i * 15, tileHeight, tileWidth);
            } else {
                this.drawTileBack(i * 15, 0, tileWidth, tileHeight);
            }
        }
    }

    drawTileBack(x, y, width, height) {
        this.ctx.save();
        
        // Фон рубашки
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        
        // Рисуем рубашку
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, 5);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Узор на рубашке
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        
        // Диагональные линии
        for (let i = -height; i < width + height; i += 8) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i, y);
            this.ctx.lineTo(x + i - height, y + height);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawTile(tile, x, y, width, height, isHovered = false, isSelected = false, isPossible = false, isValid = false, isInvalid = false) {
        this.ctx.save();
        
        // Фон фишки
        this.ctx.fillStyle = '#fff';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        
        // Подсветка выбранной фишки
        if (isSelected) {
            this.ctx.shadowColor = '#FF9800';
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#FF9800';
            this.ctx.lineWidth = 3;
        }
        
        // Подсветка при наведении
        if (isHovered && !isSelected) {
            this.ctx.shadowColor = '#2196F3';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = '#2196F3';
            this.ctx.lineWidth = 2;
        }
        
        // Подсветка возможной комбинации
        if (isPossible) {
            this.ctx.shadowColor = '#4CAF50';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = '#4CAF50';
            this.ctx.lineWidth = 2;
        }
        
        // Подсветка валидной/невалидной комбинации
        if (isValid) {
            this.ctx.shadowColor = '#4CAF50';
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#4CAF50';
            this.ctx.lineWidth = 3;
        }
        if (isInvalid) {
            this.ctx.shadowColor = '#f44336';
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#f44336';
            this.ctx.lineWidth = 3;
        }
        
        // Рисуем фишку
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, 5);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Текст фишки
        this.ctx.fillStyle = tile.color === 'joker' ? '#000' : tile.color;
        this.ctx.font = `bold ${Math.floor(height * 0.4)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let displayText = tile.isJoker ? 'J' : tile.number.toString();
        this.ctx.fillText(displayText, x + width / 2, y + height / 2);
        
        this.ctx.restore();
    }

    clearHover() {
        if (this.lastHoveredTileIndex !== null) {
            this.lastHoveredTileIndex = null;
            this.draw();
        }
    }

    handleMouseMove(e) {
        if (!this.players[0] || !this.players[0].tiles) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        let newHoveredIndex = null;
        if (this.currentPlayerIndex === 0) {
            for (let i = 0; i < this.tileRects.length; i++) {
                const r = this.tileRects[i];
                if (
                    mouseX >= r.x && mouseX <= r.x + r.w &&
                    mouseY >= r.y && mouseY <= r.y + r.h
                ) {
                    newHoveredIndex = i;
                    break;
                }
            }
        }
        if(this.lastHoveredTileIndex !== newHoveredIndex) {
            this.lastHoveredTileIndex = newHoveredIndex;
            this.draw();
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
        this.draw();
    }

    updateControls() {
        const drawDiscardBtn = document.getElementById('draw-from-discard');
        const drawReserveBtn = document.getElementById('draw-from-reserve');
        const playBtn = document.getElementById('play-to-table');
        const cancelBtn = document.getElementById('cancel-selection');
        const endBtn = document.getElementById('end-turn');
        
        // Проверяем, что игроки инициализированы
        if (!this.players || this.players.length === 0 || !this.players[0]) {
            drawDiscardBtn.style.display = 'none';
            drawReserveBtn.style.display = 'none';
            playBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            endBtn.style.display = 'none';
            return;
        }
        
        if (this.currentPlayerIndex === 0) {
            // Показываем кнопки взятия фишек только в начале хода
            const hasDrawnTile = this.players[0].tiles.length > (this.currentPlayerIndex === 0 ? 15 : 14);
            
            if (!hasDrawnTile) {
                this.showDrawOptions();
            } else {
                drawDiscardBtn.style.display = 'none';
                drawReserveBtn.style.display = 'none';
            }
            
            const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
            playBtn.style.display = (this.selectedTiles.length >= 3 && this.isValidCombination(tilesToPlay)) ? '' : 'none';
            cancelBtn.style.display = (this.selectedTiles.length > 0 || this.table.length) ? '' : 'none';
            endBtn.style.display = (this.table.length > 0) ? '' : 'none';
        } else {
            drawDiscardBtn.style.display = 'none';
            drawReserveBtn.style.display = 'none';
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
        const tableY = this.canvas.height / 2 - 100;
        const tileHeight = 50;
        const tileWidth = 35;
        const padding = 10;
        let currentX = this.canvas.width * 0.2;
        let currentY = tableY;
        const tableAreaWidth = this.canvas.width * 0.6;


        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(currentX - padding, tableY - padding, tableAreaWidth + padding * 2, tileHeight * 2 + padding * 4, 10);
        this.ctx.fill();
        this.ctx.stroke();


        this.table.forEach((combination, combIdx) => {
            if (currentX + (combination.length * (tileWidth + 5)) > this.canvas.width * 0.8 - padding) {
                currentX = this.canvas.width * 0.2;
                currentY += tileHeight + padding;
            }

            combination.forEach((tile, tileIdx) => {
                this.drawTile(
                    tile,
                    currentX + tileIdx * (tileWidth + 5),
                    currentY,
                    tileWidth,
                    tileHeight,
                    false,
                    this.selectedTableSet === combIdx
                );
            });

            currentX += combination.length * (tileWidth + 5) + padding;
        });

        this.ctx.restore();
    }

    drawDiscardPile() {
        const pileY = this.canvas.height / 2 + 50;
        const tileHeight = 50;
        const tileWidth = 35;
        const padding = 10;
        let currentX = this.canvas.width * 0.2;
        const tableAreaWidth = this.canvas.width * 0.6;
        
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(currentX - padding, pileY - padding, tableAreaWidth + padding * 2, tileHeight + padding * 2, 10);
        this.ctx.fill();
        this.ctx.stroke();

        this.discardPile.slice(-10).forEach((tile, idx) => {
            const isSelected = this.selectedDiscard === this.discardPile.length - 10 + idx;
            this.drawTile(tile, currentX, pileY, tileWidth, tileHeight, false, isSelected);
            currentX += tileWidth + 5;
        });

        if (this.discardPile.length > 10) {
            this.ctx.fillStyle = '#ccc';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`+${this.discardPile.length - 10} more`, currentX + 10, pileY + tileHeight / 2);
        }

        this.ctx.restore();
    }

    updateTimer() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = `${this.turnTime}s`;
            timerElement.style.color = this.turnTime <= 10 ? '#ff4444' : '#333';
        }
        document.getElementById('timer').textContent = 
            `Time remaining: ${this.turnTime}s`;
    }

    resizeCanvas() {
        const container = document.getElementById('game-container');
        const containerWidth = container.clientWidth;
        const containerHeight = window.innerHeight - 200; // Оставляем место для UI элементов

        this.canvas.width = containerWidth - 40; // Отступы по бокам
        this.canvas.height = containerHeight;

        // Перерисовываем игру после изменения размера
        this.draw();
    }

    addPendingCombination() {
        const tilesToPlay = this.selectedTiles.map(i => this.players[0].tiles[i]);
        if (tilesToPlay.length < 3 || !this.isValidCombination(tilesToPlay)) return;
        this.pendingActions.push({ type: 'comb', tiles: [...this.selectedTiles] });
        this.selectedTiles = [];
        this.updateControls();
        this.drawPendingActions();
    }

    addPendingToSet() {
        if (this.selectedTiles.length !== 1 || this.selectedTableSet == null) return;
        this.pendingActions.push({ type: 'add', tile: this.selectedTiles[0], setIdx: this.selectedTableSet });
        this.selectedTiles = [];
        this.selectedTableSet = null;
        this.updateControls();
        this.drawPendingActions();
    }

    removePendingAction(idx) {
        this.pendingActions.splice(idx, 1);
        this.updateControls();
        this.drawPendingActions();
    }

    confirmTurn() {
        const newCombs = this.pendingActions.filter(a => a.type === 'comb').map(a => a.tiles.map(i => this.players[0].tiles[i]));
        const player = this.players[0];
        if (!player.hasInitialMeld) {
            const sum = newCombs.reduce((acc, comb) => acc + comb.reduce((s, t) => s + t.number, 0), 0);
            if (sum < 101) {
                alert('Для первого выхода нужно выложить комбинации на сумму не менее 101 очка!');
                return;
            }
            player.hasInitialMeld = true;
        }
        
        for (const action of this.pendingActions) {
            if (action.type === 'comb') {
                const combTiles = action.tiles.map(i => this.players[0].tiles[i]);
                this.table.push(combTiles);
            }
        }
        
        for (const action of this.pendingActions) {
            if (action.type === 'add') {
                const tile = this.players[0].tiles[action.tile];
                this.table[action.setIdx].push(tile);
            }
        }
        
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
        
        // Сброс одной фишки в конце хода
        if (this.players[0].tiles.length > 0) {
            this.isDiscarding = true;
            this.updateControls();
            alert('Вы должны сбросить одну фишку в конце хода! Кликните по фишке для сброса.');
        } else {
            this.endTurn();
        }
    }

    discardTile(idx) {
        if (!this.isDiscarding) return;
        const discardedTile = this.players[0].tiles.splice(idx, 1)[0];
        this.discardPile.push(discardedTile);
        console.log(`Игрок сбросил фишку:`, discardedTile);
        this.isDiscarding = false;
        this.updateScores();
        this.draw();
        this.endTurn();
    }

    drawPendingActions() {
        let actionsDiv = document.getElementById('pending-actions-panel');
        if (!actionsDiv) {
            actionsDiv = document.createElement('div');
            actionsDiv.id = 'pending-actions-panel';
            document.body.appendChild(actionsDiv);
        }

        if (this.pendingActions.length === 0) {
            actionsDiv.style.display = 'none';
            return;
        }

        let html = '<div class="pending-actions-header">Ожидающие действия:</div>';
        this.pendingActions.forEach((action, idx) => {
            html += '<div class="pending-action-row">';
            html += `<span class="action-description">${action.type === 'combination' ? 'Комбинация' : 'Добавление к набору'}: `;
            action.tiles.forEach(tile => {
                html += `<span class="tile-number" style="color: ${tile.color}">${tile.isJoker ? 'J' : tile.number}</span>`;
            });
            html += '</span>';
            html += `<button class="remove-action" onclick="game.removePendingAction(${idx})">✖</button>`;
            html += '</div>';
        });

        actionsDiv.innerHTML = html;
        actionsDiv.style.display = 'block';
    }

    drawGameInfo() {
        // Проверяем инициализацию игроков
        if (!this.players || !this.players[this.currentPlayerIndex]) return;

        let infoDiv = document.getElementById('game-info-details');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'game-info-details';
            document.body.appendChild(infoDiv);
        }

        let html = '<div class="game-info-section">';
        html += `<div class="info-row"><b>Комната:</b> ${this.roomId || 'Локальная игра'}</div>`;
        html += `<div class="info-row"><b>Текущий игрок:</b> <span style="color: ${this.currentPlayerIndex === 0 ? '#4CAF50' : '#333'}">${this.players[this.currentPlayerIndex].name}</span></div>`;
        html += `<div class="info-row"><b>Время хода:</b> <span style="color: ${this.turnTime <= 10 ? '#ff4444' : '#333'}">${this.turnTime}с</span></div>`;
        html += '</div>';

        if (this.openTile) {
            html += '<div class="game-info-section">';
            html += '<div class="info-row"><b>Открытая фишка:</b> ';
            html += `<span class="tile-info" style="color: ${this.openTile.color}">${this.openTile.isJoker ? 'J' : this.openTile.number}</span>`;
            html += '</div>';
        }

        if (this.jokerTile) {
            html += '<div class="info-row"><b>Фальш-джокер:</b> ';
            html += `<span class="tile-info" style="color: ${this.jokerTile.color}">${this.jokerTile.isJoker ? 'J' : this.jokerTile.number}</span>`;
            html += '</div>';
            html += '</div>';
        }

        infoDiv.innerHTML = html;
    }

    drawOpenTile() {
        if (!this.openTile) return;
        
        const x = 20;
        const y = this.canvas.height / 2 - 30;
        
        // Рисуем фон для открытой фишки
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(x - 10, y - 10, 60, 80);
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 10, y - 10, 60, 80);
        
        // Подпись
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Открытая', x + 20, y - 15);
        this.ctx.fillText('фишка', x + 20, y - 2);
        this.ctx.restore();
        
        // Рисуем открытую фишку
        this.drawTile(this.openTile, x, y, 40, 60);
    }
}

window.okeyGame = window.okeyGame || new OkeyGame(); 