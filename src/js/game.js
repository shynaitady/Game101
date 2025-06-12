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
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize game
        this.initializeGame();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    initializeGame() {
        // Create tiles (52 tiles in Okey 101)
        this.createTiles();
        this.shuffleTiles();
        this.distributeTiles();
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
        
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw player tiles and names
        this.players.forEach((player, index) => {
            this.drawPlayerTiles(player, index);
            this.drawPlayerName(player, index);
        });
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
} 