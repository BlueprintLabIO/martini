/**
 * LobbyUI - Simple, reusable lobby UI for Phaser games
 *
 * Shows lobby state, player list, ready indicators, and start button
 *
 * @example
 * ```ts
 * this.lobbyUI = this.adapter.createLobbyUI({
 *   title: 'Paddle Battle',
 *   subtitle: 'Waiting for players...',
 *   position: { x: 400, y: 200 }
 * });
 * ```
 */
export class LobbyUI {
    adapter;
    scene;
    container;
    titleText;
    subtitleText;
    playerListText;
    readyButton;
    readyButtonText;
    startButton;
    startButtonText;
    instructionsText;
    statusText;
    isReady = false;
    config;
    constructor(adapter, scene, config = {}) {
        this.adapter = adapter;
        this.scene = scene;
        // Default config
        this.config = {
            title: config.title || 'Lobby',
            subtitle: config.subtitle || 'Waiting for players...',
            position: config.position || { x: 400, y: 200 },
            titleStyle: config.titleStyle || {
                fontSize: '48px',
                color: '#ffffff',
                fontStyle: 'bold'
            },
            subtitleStyle: config.subtitleStyle || {
                fontSize: '24px',
                color: '#aaaaaa'
            },
            playerStyle: config.playerStyle || {
                fontSize: '20px',
                color: '#ffffff'
            },
            buttonStyle: config.buttonStyle || {
                fill: 0x4ecdc4,
                textColor: '#ffffff',
                fontSize: '20px'
            },
            showInstructions: config.showInstructions !== false
        };
        // Create container
        this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
        this.container.setDepth(1000); // High depth to render on top
        this.createUI();
    }
    createUI() {
        let yOffset = 0;
        // Title
        if (this.config.title) {
            this.titleText = this.scene.add.text(0, yOffset, this.config.title, this.config.titleStyle);
            this.titleText.setOrigin(0.5, 0);
            this.container.add(this.titleText);
            yOffset += 60;
        }
        // Subtitle
        if (this.config.subtitle) {
            this.subtitleText = this.scene.add.text(0, yOffset, this.config.subtitle, this.config.subtitleStyle);
            this.subtitleText.setOrigin(0.5, 0);
            this.container.add(this.subtitleText);
            yOffset += 40;
        }
        // Status text (shows timer, player count, etc.)
        this.statusText = this.scene.add.text(0, yOffset, '', {
            fontSize: '18px',
            color: '#ffff00'
        });
        this.statusText.setOrigin(0.5, 0);
        this.container.add(this.statusText);
        yOffset += 30;
        // Player list
        this.playerListText = this.scene.add.text(0, yOffset, '', this.config.playerStyle);
        this.playerListText.setOrigin(0.5, 0);
        this.playerListText.setAlign('center');
        this.container.add(this.playerListText);
        yOffset += 150; // Reserve space for player list
        // Ready button
        this.readyButton = this.createButton(0, yOffset, 'Ready', () => {
            this.toggleReady();
        });
        this.container.add(this.readyButton);
        yOffset += 60;
        // Start button (host only)
        this.startButton = this.createButton(0, yOffset, 'Start Game', () => {
            this.startGame();
        });
        this.startButton.setVisible(false); // Hidden by default
        this.container.add(this.startButton);
        yOffset += 60;
        // Instructions
        if (this.config.showInstructions) {
            this.instructionsText = this.scene.add.text(0, yOffset, 'Click Ready when you are ready to play', {
                fontSize: '16px',
                color: '#888888',
                align: 'center'
            });
            this.instructionsText.setOrigin(0.5, 0);
            this.container.add(this.instructionsText);
        }
    }
    createButton(x, y, text, onClick) {
        const buttonContainer = this.scene.add.container(x, y);
        // Button background
        const bg = this.scene.add.rectangle(0, 0, 200, 50, this.config.buttonStyle.fill);
        bg.setStrokeStyle(2, 0xffffff);
        bg.setInteractive({ useHandCursor: true });
        // Button text
        const buttonText = this.scene.add.text(0, 0, text, {
            fontSize: this.config.buttonStyle.fontSize,
            color: this.config.buttonStyle.textColor,
            fontStyle: 'bold'
        });
        buttonText.setOrigin(0.5);
        // Store reference to text for updates
        if (text === 'Ready') {
            this.readyButtonText = buttonText;
        }
        else if (text === 'Start Game') {
            this.startButtonText = buttonText;
        }
        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(this.config.buttonStyle.fill, 0.8);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(this.config.buttonStyle.fill, 1);
        });
        bg.on('pointerdown', onClick);
        buttonContainer.add([bg, buttonText]);
        return buttonContainer;
    }
    toggleReady() {
        this.isReady = !this.isReady;
        const runtime = this.adapter.runtime;
        runtime.submitAction('__lobbyReady', { ready: this.isReady });
        // Update button appearance
        if (this.readyButtonText) {
            this.readyButtonText.setText(this.isReady ? 'Not Ready' : 'Ready');
        }
    }
    startGame() {
        const runtime = this.adapter.runtime;
        runtime.submitAction('__lobbyStart');
    }
    /**
     * Update the lobby UI based on current state
     * Call this in your scene's update() or onChange() callback
     */
    update(lobbyState) {
        // Update player list
        this.updatePlayerList(lobbyState);
        // Update status text
        this.updateStatusText(lobbyState);
        // Show/hide start button for host
        if (this.startButton) {
            const isHost = this.adapter.isHost();
            const canStart = this.canStartGame(lobbyState);
            this.startButton.setVisible(isHost && !lobbyState.config.requireAllReady);
            if (this.startButtonText) {
                this.startButtonText.setAlpha(canStart ? 1 : 0.5);
            }
        }
    }
    updatePlayerList(lobbyState) {
        if (!this.playerListText)
            return;
        const players = Object.values(lobbyState.players);
        const myId = this.adapter.getMyPlayerId();
        const lines = ['Players:'];
        players.forEach((player, index) => {
            const isMe = player.playerId === myId;
            const readyIndicator = player.ready ? '✓' : '○';
            const namePrefix = isMe ? 'You' : `Player ${index + 1}`;
            lines.push(`${readyIndicator} ${namePrefix}`);
        });
        this.playerListText.setText(lines.join('\n'));
    }
    updateStatusText(lobbyState) {
        if (!this.statusText)
            return;
        const playerCount = Object.keys(lobbyState.players).length;
        const minPlayers = lobbyState.config.minPlayers;
        const readyCount = Object.values(lobbyState.players).filter((p) => p.ready).length;
        let status = '';
        // Player count
        if (playerCount < minPlayers) {
            status = `Waiting for players (${playerCount}/${minPlayers})`;
        }
        else {
            status = `${playerCount} players`;
        }
        // Ready count
        if (lobbyState.config.requireAllReady) {
            status += ` | Ready: ${readyCount}/${playerCount}`;
        }
        // Auto-start timer (if applicable)
        if (lobbyState.config.autoStartTimeout && playerCount >= minPlayers) {
            status += ' | Auto-start enabled';
        }
        this.statusText.setText(status);
    }
    canStartGame(lobbyState) {
        const playerCount = Object.keys(lobbyState.players).length;
        const minPlayers = lobbyState.config.minPlayers;
        if (playerCount < minPlayers) {
            return false;
        }
        if (lobbyState.config.requireAllReady) {
            const allReady = Object.values(lobbyState.players).every((p) => p.ready);
            return allReady;
        }
        return true;
    }
    /**
     * Show the lobby UI
     */
    show() {
        this.container.setVisible(true);
    }
    /**
     * Hide the lobby UI
     */
    hide() {
        this.container.setVisible(false);
    }
    /**
     * Destroy the lobby UI
     */
    destroy() {
        this.container.destroy();
    }
    /**
     * Check if lobby UI is visible
     */
    isVisible() {
        return this.container.visible;
    }
}
/**
 * Helper method to create LobbyUI on PhaserAdapter
 */
export function attachLobbyUI(adapter, scene, config) {
    return new LobbyUI(adapter, scene, config);
}
//# sourceMappingURL=LobbyUI.js.map