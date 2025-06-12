document.addEventListener('DOMContentLoaded', () => {
    const game = new OkeyGame();
    const roomManager = new RoomManager(game);
    
    // Bind end turn button
    document.getElementById('end-turn').addEventListener('click', () => {
        if (game.gameStarted) {
            game.endTurn();
        }
    });
    
    // Animation loop
    function animate() {
        game.draw();
        requestAnimationFrame(animate);
    }
    
    animate();
}); 