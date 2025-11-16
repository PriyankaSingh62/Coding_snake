// Professional Snake Game - Enhanced Version
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // Game state
        this.snake = [];
        this.food = {};
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.gamesPlayed = parseInt(localStorage.getItem('gamesPlayed')) || 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameMode = 'classic';
        this.difficulty = 'medium';
        this.gameSpeed = 100;
        this.startTime = 0;
        this.gameTime = 0;
        this.soundEnabled = true;
        this.musicEnabled = true;
        
        // Game loop
        this.gameLoop = null;
        this.animationId = null;
        
        // Audio context for sound effects
        this.audioContext = null;
        
        // Particle system for effects
        this.particles = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initAudio();
        this.showLoadingScreen();
        this.updateMenuStats();
        
        // Initialize canvas size for responsive design
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupEventListeners() {
        // Menu buttons
        document.getElementById('classicMode').addEventListener('click', () => this.startGame('classic'));
        document.getElementById('speedMode').addEventListener('click', () => this.startGame('speed'));
        document.getElementById('wallMode').addEventListener('click', () => this.startGame('wall'));
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        
        // Game controls
        document.getElementById('pauseGameBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('exitGame').addEventListener('click', () => this.exitToMenu());
        
        // Overlay buttons
        document.getElementById('overlayPrimaryBtn').addEventListener('click', () => this.handleOverlayPrimary());
        document.getElementById('overlaySecondaryBtn').addEventListener('click', () => this.handleOverlaySecondary());
        
        // Settings
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.hideSettings());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Settings modal
        document.getElementById('gameSpeed').addEventListener('input', (e) => {
            this.gameSpeed = parseInt(e.target.value);
        });
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    playSound(frequency, duration, type = 'sine') {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    playEatSound() {
        this.playSound(800, 0.1, 'square');
        setTimeout(() => this.playSound(1000, 0.1, 'square'), 50);
    }
    
    playGameOverSound() {
        this.playSound(400, 0.3, 'sawtooth');
        setTimeout(() => this.playSound(300, 0.3, 'sawtooth'), 100);
        setTimeout(() => this.playSound(200, 0.5, 'sawtooth'), 200);
    }
    
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.display = 'flex';
        
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                this.showMainMenu();
            }, 500);
        }, 2000);
    }
    
    showMainMenu() {
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'flex';
        mainMenu.classList.add('fade-in');
    }
    
    updateMenuStats() {
        document.getElementById('menuHighScore').textContent = this.highScore;
        document.getElementById('gamesPlayed').textContent = this.gamesPlayed;
    }
    
    startGame(mode) {
        this.gameMode = mode;
        this.hideMainMenu();
        this.showGameScreen();
        this.initGame();
        this.startGameLoop();
    }
    
    hideMainMenu() {
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'none';
    }
    
    showGameScreen() {
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.style.display = 'flex';
        gameScreen.classList.add('fade-in');
        
        // Update game mode specific settings
        switch(this.gameMode) {
            case 'speed':
                this.gameSpeed = 70;
                break;
            case 'wall':
                this.gameSpeed = 120;
                break;
            default:
                this.gameSpeed = 100;
        }
        
        this.updateGameUI();
    }
    
    initGame() {
        // Initialize snake
        this.snake = [{
            x: Math.floor(this.tileCount / 2),
            y: Math.floor(this.canvas.height / this.gridSize / 2)
        }];
        
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.startTime = Date.now();
        this.gameTime = 0;
        this.gameRunning = true;
        this.gamePaused = false;
        
        this.generateFood();
        this.updateGameUI();
        this.hideOverlay();
    }
    
    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize))
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
    }
    
    startGameLoop() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this.gameUpdate(), this.gameSpeed);
        this.gameRender();
    }
    
    gameUpdate() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.moveSnake();
        this.checkCollisions();
        this.updateGameTime();
        this.updateGameUI();
    }
    
    moveSnake() {
        if (this.dx === 0 && this.dy === 0) return;
        
        const head = {
            x: this.snake[0].x + this.dx,
            y: this.snake[0].y + this.dy
        };
        
        this.snake.unshift(head);
        
        // Check if food was eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.playEatSound();
            this.createEatParticles();
            this.generateFood();
            
            // Speed up game gradually
            if (this.score % 50 === 0 && this.gameSpeed > 50) {
                this.gameSpeed -= 10;
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => this.gameUpdate(), this.gameSpeed);
            }
        } else {
            this.snake.pop();
        }
    }
    
    checkCollisions() {
        const head = this.snake[0];
        
        // Wall collision
        if (head.x < 0 || head.x >= this.tileCount || 
            head.y < 0 || head.y >= this.canvas.height / this.gridSize) {
            this.gameOver();
            return;
        }
        
        // Self collision
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);
        
        this.playGameOverSound();
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
        }
        
        // Update games played
        this.gamesPlayed++;
        localStorage.setItem('gamesPlayed', this.gamesPlayed);
        
        this.showGameOverOverlay();
    }
    
    createEatParticles() {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.food.x * this.gridSize + this.gridSize / 2,
                y: this.food.y * this.gridSize + this.gridSize / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                decay: 0.02
            });
        }
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            return particle.life > 0;
        });
    }
    
    gameRender() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid pattern
        this.drawGrid();
        
        // Draw food with glow effect
        this.drawFood();
        
        // Draw snake with gradient and effects
        this.drawSnake();
        
        // Draw particles
        this.drawParticles();
        
        this.updateParticles();
        
        if (this.gameRunning || this.gamePaused) {
            this.animationId = requestAnimationFrame(() => this.gameRender());
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawFood() {
        const centerX = this.food.x * this.gridSize + this.gridSize / 2;
        const centerY = this.food.y * this.gridSize + this.gridSize / 2;
        const radius = this.gridSize / 2 - 2;
        
        // Glow effect
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(0.5, '#ff8800');
        gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Food core
        this.ctx.fillStyle = '#ff8800';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            if (index === 0) {
                // Head
                this.drawSnakeHead(x, y);
            } else {
                // Body
                this.drawSnakeBody(x, y, index);
            }
        });
    }
    
    drawSnakeHead(x, y) {
        // Snake head gradient
        const gradient = this.ctx.createLinearGradient(x, y, x + this.gridSize, y + this.gridSize);
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(1, '#00cc66');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
        
        // Eyes
        this.ctx.fillStyle = '#ffffff';
        const eyeSize = 4;
        const eyeOffset = 6;
        
        if (this.dx === 1) { // Moving right
            this.ctx.fillRect(x + this.gridSize - eyeOffset, y + eyeOffset, eyeSize, eyeSize);
            this.ctx.fillRect(x + this.gridSize - eyeOffset, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
        } else if (this.dx === -1) { // Moving left
            this.ctx.fillRect(x + eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
            this.ctx.fillRect(x + eyeOffset - eyeSize, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
        } else if (this.dy === -1) { // Moving up
            this.ctx.fillRect(x + eyeOffset, y + eyeOffset - eyeSize, eyeSize, eyeSize);
            this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + eyeOffset - eyeSize, eyeSize, eyeSize);
        } else if (this.dy === 1) { // Moving down
            this.ctx.fillRect(x + eyeOffset, y + this.gridSize - eyeOffset, eyeSize, eyeSize);
            this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + this.gridSize - eyeOffset, eyeSize, eyeSize);
        }
    }
    
    drawSnakeBody(x, y, index) {
        const intensity = 1 - (index / this.snake.length) * 0.3;
        this.ctx.fillStyle = `rgba(0, 255, 136, ${intensity})`;
        this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = `rgba(255, 255, 0, ${particle.life})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning && !this.gamePaused) return;
        
        const key = e.key;
        
        // Prevent snake from going back into itself
        switch(key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                if (this.dy !== 1) {
                    this.dx = 0;
                    this.dy = -1;
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                if (this.dy !== -1) {
                    this.dx = 0;
                    this.dy = 1;
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                if (this.dx !== 1) {
                    this.dx = -1;
                    this.dy = 0;
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                if (this.dx !== -1) {
                    this.dx = 1;
                    this.dy = 0;
                }
                break;
            case ' ':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        
        if (this.gamePaused) {
            this.showPauseOverlay();
        } else {
            this.hideOverlay();
        }
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('soundToggle');
        soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
    }
    
    updateGameTime() {
        this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('gameTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateGameUI() {
        document.getElementById('currentScore').textContent = this.score;
        document.getElementById('gameHighScore').textContent = this.highScore;
        
        // Update speed progress bar
        const progress = Math.min(100, (this.score / 500) * 100);
        document.getElementById('speedProgress').style.width = `${progress}%`;
    }
    
    updateMenuStats() {
        document.getElementById('menuHighScore').textContent = this.highScore;
        document.getElementById('gamesPlayed').textContent = this.gamesPlayed;
    }
    
    showOverlay(title, message, primaryText, secondaryText) {
        const overlay = document.getElementById('gameOverlay');
        document.getElementById('overlayTitle').textContent = title;
        document.getElementById('overlayMessage').textContent = message;
        document.getElementById('overlayPrimaryBtn').textContent = primaryText;
        document.getElementById('overlaySecondaryBtn').textContent = secondaryText;
        
        overlay.style.display = 'flex';
    }
    
    hideOverlay() {
        document.getElementById('gameOverlay').style.display = 'none';
    }
    
    showPauseOverlay() {
        this.showOverlay('Game Paused', 'Press SPACE to continue', 'Resume', 'Main Menu');
    }
    
    showGameOverOverlay() {
        this.showOverlay('Game Over!', `Final Score: ${this.score}`, 'Play Again', 'Main Menu');
    }
    
    handleOverlayPrimary() {
        if (this.gamePaused) {
            this.togglePause();
        } else {
            // Game over - play again
            this.initGame();
        }
    }
    
    handleOverlaySecondary() {
        this.exitToMenu();
    }
    
    exitToMenu() {
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.gameLoop);
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        this.hideOverlay();
        this.hideGameScreen();
        this.showMainMenu();
        this.updateMenuStats();
    }
    
    hideGameScreen() {
        document.getElementById('gameScreen').style.display = 'none';
    }
    
    showSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
    }
    
    hideSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }
    
    saveSettings() {
        this.difficulty = document.getElementById('difficultySelect').value;
        this.soundEnabled = document.getElementById('soundEffects').checked;
        this.musicEnabled = document.getElementById('backgroundMusic').checked;
        this.gameSpeed = parseInt(document.getElementById('gameSpeed').value);
        
        localStorage.setItem('difficulty', this.difficulty);
        localStorage.setItem('soundEnabled', this.soundEnabled);
        localStorage.setItem('musicEnabled', this.musicEnabled);
        localStorage.setItem('gameSpeed', this.gameSpeed);
        
        this.hideSettings();
    }
    
    resizeCanvas() {
        // Keep canvas dimensions fixed for consistent gameplay
        // but center it properly on different screen sizes
        const container = document.querySelector('.game-area');
        const canvas = document.getElementById('gameCanvas');
        
        // Canvas size is already set in HTML, just ensure it's centered
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new SnakeGame();
});