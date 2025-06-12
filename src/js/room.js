class RoomManager {
    constructor(game) {
        this.game = game;
        this.rooms = new Map();
        this.currentRoom = null;
        
        // Bind event listeners
        document.getElementById('create-room').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room').addEventListener('click', () => this.joinRoom());
    }

    createRoom() {
        const roomId = this.generateRoomId();
        const room = {
            id: roomId,
            players: [],
            maxPlayers: 4,
            gameStarted: false
        };
        
        this.rooms.set(roomId, room);
        this.currentRoom = room;
        
        // Clear existing players
        this.game.players = [];
        
        // Add current player to room
        const humanPlayer = new Player('player1', 'Player 1', false);
        this.addPlayerToRoom(humanPlayer);
        
        // Add bots
        for (let i = 2; i <= 4; i++) {
            const botPlayer = new Player(`bot${i}`, `Bot ${i}`, true);
            this.addPlayerToRoom(botPlayer);
        }
        
        // Show room id and leave button
        document.getElementById('room-id').textContent = `Room ID: ${roomId}`;
        document.getElementById('leave-room').style.display = '';
        // Hide room controls
        document.getElementById('room-controls').style.display = 'none';
        
        console.log(`Room created: ${roomId}`);
        this.startGame();
    }

    joinRoom() {
        // This will be implemented when integrating with Flutter
        // For now, just create a new room
        this.createRoom();
    }

    addPlayerToRoom(player) {
        if (!this.currentRoom) return;
        
        if (this.currentRoom.players.length < this.currentRoom.maxPlayers) {
            this.currentRoom.players.push(player);
            this.game.players.push(player);
        }
    }

    generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    startGame() {
        if (this.currentRoom && this.currentRoom.players.length === 4) {
            this.currentRoom.gameStarted = true;
            this.game.gameStarted = true;
            this.game.initializeGame();
            this.game.startTurn();
            this.game.draw();
        }
    }

    leaveRoom() {
        this.currentRoom = null;
        this.game.players = [];
        this.game.currentPlayerIndex = 0;
        this.game.tiles = [];
        this.game.selectedTile = null;
        this.game.selectedTileIndex = null;
        this.game.gameStarted = false;
        document.getElementById('room-id').textContent = '';
        document.getElementById('leave-room').style.display = 'none';
        document.getElementById('room-controls').style.display = '';
        document.getElementById('current-player').textContent = '';
        document.getElementById('timer').textContent = '';
        this.game.draw();
    }
} 