document.addEventListener('DOMContentLoaded', () => {
    const game = new OkeyGame();
    const roomManager = new RoomManager(game);
    
    // Bind end turn button
    document.getElementById('end-turn').addEventListener('click', () => {
        if (game.gameStarted) {
            game.endTurn();
        }
    });
    
    // Bind leave room button
    document.getElementById('leave-room').addEventListener('click', () => {
        roomManager.leaveRoom();
    });
    
    // Bind play to table button
    document.getElementById('play-to-table').addEventListener('click', () => {
        game.playToTable();
    });
    
    // Bind cancel selection button
    document.getElementById('cancel-selection').addEventListener('click', () => {
        game.cancelSelection();
    });
    
    // Animation loop
    function animate() {
        game.draw();
        requestAnimationFrame(animate);
    }
    
    animate();
}); 