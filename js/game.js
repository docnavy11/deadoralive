/**
 * Main Game Logic - Ties everything together
 */

const Game = {
    // Game configuration
    config: {
        totalRounds: 10,
        // Salt for daily file hash - obfuscate in production
        _s: 'DailyDeparted2024SecretSalt!@#$'
    },

    // Game state
    state: {
        todayCelebrities: [], // Today's 10 celebrities (loaded from daily file)
        currentRound: 0,
        currentStreak: 0,
        bestStreak: 0,
        answers: [],          // {correct: bool, actualStatus: 'dead'|'alive', hasBonus: bool, bonusCorrect: bool}
        dayNumber: 1,
        isComplete: false,
        inBonusRound: false   // Track if we're waiting for bonus answer
    },

    /**
     * Initialize the game
     */
    async init() {
        UI.init();

        // Set up event listeners
        this.setupEventListeners();

        // Get day number from seeded random
        const rng = SeededRandom.createForToday();
        this.state.dayNumber = rng.dayNumber;
        UI.setDayCounter(this.state.dayNumber);

        // Check if already played today
        if (Storage.hasPlayedToday()) {
            const results = Storage.getTodayResults();
            UI.showAlreadyPlayed(results);
            return;
        }

        // Try to resume existing game
        const savedState = Storage.loadGameState();
        if (savedState && savedState.currentRound > 0 && !savedState.isComplete) {
            await this.loadCelebrities();
            this.resumeGame(savedState);
            return;
        }

        // Start new game
        await this.loadCelebrities();
        this.startNewGame();
    },

    /**
     * Pure JS SHA-256 fallback (for non-HTTPS contexts)
     */
    sha256Fallback(str) {
        // Simple SHA-256 implementation
        const K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];
        const rotr = (n, x) => (x >>> n) | (x << (32 - n));
        const ch = (x, y, z) => (x & y) ^ (~x & z);
        const maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
        const sigma0 = x => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
        const sigma1 = x => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
        const gamma0 = x => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
        const gamma1 = x => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);

        const bytes = new TextEncoder().encode(str);
        const len = bytes.length;
        const bitLen = len * 8;
        const padLen = ((len + 8) >> 6 << 6) + 64;
        const padded = new Uint8Array(padLen);
        padded.set(bytes);
        padded[len] = 0x80;
        const view = new DataView(padded.buffer);
        view.setUint32(padLen - 4, bitLen, false);

        let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        const w = new Uint32Array(64);

        for (let i = 0; i < padLen; i += 64) {
            for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
            for (let j = 16; j < 64; j++) w[j] = (gamma1(w[j-2]) + w[j-7] + gamma0(w[j-15]) + w[j-16]) >>> 0;

            let [a, b, c, d, e, f, g, hh] = h;
            for (let j = 0; j < 64; j++) {
                const t1 = (hh + sigma1(e) + ch(e, f, g) + K[j] + w[j]) >>> 0;
                const t2 = (sigma0(a) + maj(a, b, c)) >>> 0;
                hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
            }
            h = [h[0]+a>>>0, h[1]+b>>>0, h[2]+c>>>0, h[3]+d>>>0, h[4]+e>>>0, h[5]+f>>>0, h[6]+g>>>0, h[7]+hh>>>0];
        }
        return h.map(x => x.toString(16).padStart(8, '0')).join('');
    },

    /**
     * Generate SHA-256 hash for today's date (or ?date=YYYYMMDD for testing)
     */
    async getDailyHash() {
        let dateStr;

        // Check for ?date= param for testing different days
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');

        if (dateParam && /^\d{8}$/.test(dateParam)) {
            // Parse YYYYMMDD format
            const year = dateParam.substring(0, 4);
            const month = dateParam.substring(4, 6);
            const day = dateParam.substring(6, 8);
            dateStr = `${year}-${month}-${day}`;
        } else {
            dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        }

        const toHash = `${this.config._s}:${dateStr}`;

        let hashHex;

        // Use SubtleCrypto if available (HTTPS/localhost only)
        if (crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(toHash);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                // Fallback for non-secure contexts
                hashHex = this.sha256Fallback(toHash);
            }
        } else {
            hashHex = this.sha256Fallback(toHash);
        }

        return hashHex.substring(0, 16); // First 16 chars
    },

    /**
     * Load today's celebrities from daily file
     */
    async loadCelebrities() {
        try {
            const hash = await this.getDailyHash();
            const url = `data/days/${hash}.json`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Daily file already contains exactly 10 celebrities
            this.state.todayCelebrities = await response.json();
        } catch (error) {
            console.error('Failed to load celebrities:', error);
            UI.elements.loadingScreen.innerHTML = `
                <p style="color: var(--color-error);">Failed to load game data.</p>
                <p style="color: var(--color-text-muted);">Please refresh the page to try again.</p>
            `;
            throw error;
        }
    },

    /**
     * Start a new game
     */
    startNewGame() {
        // Celebrities already loaded from daily file
        // Reset state
        this.state.currentRound = 0;
        this.state.currentStreak = 0;
        this.state.bestStreak = 0;
        this.state.answers = [];
        this.state.isComplete = false;

        // Show game screen and start first round
        UI.showScreen('gameScreen');
        this.nextRound();
    },

    /**
     * Resume a saved game
     */
    resumeGame(savedState) {
        // Celebrities already loaded from daily file
        // Restore state
        this.state.currentRound = savedState.currentRound;
        this.state.currentStreak = savedState.currentStreak;
        this.state.bestStreak = savedState.bestStreak;
        this.state.answers = savedState.answers || [];
        this.state.isComplete = false;

        // Show game screen and current round
        UI.showScreen('gameScreen');
        this.showCurrentRound();
    },

    /**
     * Move to next round
     */
    nextRound() {
        this.state.currentRound++;

        // Check if game is complete
        if (this.state.currentRound > this.config.totalRounds) {
            this.endGame();
            return;
        }

        // Save state
        this.saveState();

        // Show current round
        this.showCurrentRound();
    },

    /**
     * Display current round's celebrity
     */
    showCurrentRound() {
        const celebrity = this.state.todayCelebrities[this.state.currentRound - 1];

        UI.updateProgress(this.state.currentRound, this.config.totalRounds);
        UI.updateStreaks(this.state.currentStreak, this.state.bestStreak);
        UI.showCelebrity(celebrity);
        UI.showAnswerButtons();
    },

    /**
     * Handle user's answer
     */
    handleAnswer(answer) {
        const celebrity = this.state.todayCelebrities[this.state.currentRound - 1];
        const isAlive = !celebrity.deathYear;
        const actualStatus = isAlive ? 'alive' : 'dead';
        const isCorrect = answer === actualStatus;

        // Update streak
        if (isCorrect) {
            this.state.currentStreak++;
            if (this.state.currentStreak > this.state.bestStreak) {
                this.state.bestStreak = this.state.currentStreak;
            }
            UI.triggerHaptic();
        } else {
            this.state.currentStreak = 0;
        }

        // Check if bonus round is available
        const hasBonus = isCorrect && actualStatus === 'dead' && celebrity.causeCategory;

        // Record answer
        this.state.answers.push({
            correct: isCorrect,
            actualStatus: actualStatus,
            hasBonus: hasBonus,
            bonusCorrect: null  // Will be set if bonus round is played
        });

        // Update UI
        UI.updateStreaks(this.state.currentStreak, this.state.bestStreak);
        UI.showResult(isCorrect, celebrity);

        // Check if we should show the bonus round
        if (hasBonus) {
            this.state.inBonusRound = true;
            UI.showBonusRound();
        }

        // Save state
        this.saveState();
    },

    /**
     * Handle bonus round answer
     */
    handleBonusAnswer(guessedCause) {
        const celebrity = this.state.todayCelebrities[this.state.currentRound - 1];
        const actualCause = celebrity.causeCategory;
        const isCorrect = guessedCause === actualCause;

        // Record bonus result in the current answer
        const currentAnswer = this.state.answers[this.state.answers.length - 1];
        currentAnswer.bonusCorrect = isCorrect;

        if (isCorrect) {
            UI.triggerHaptic();
        }

        this.state.inBonusRound = false;
        UI.showBonusResult(isCorrect, guessedCause, actualCause, celebrity.causeOfDeath);

        // Save state
        this.saveState();
    },

    /**
     * End the game and show results
     */
    endGame() {
        this.state.isComplete = true;

        // Calculate score including bonus rounds
        const mainScore = this.state.answers.filter(a => a.correct).length;
        const bonusAnswers = this.state.answers.filter(a => a.hasBonus);
        const bonusScore = bonusAnswers.filter(a => a.bonusCorrect).length;
        const totalScore = mainScore + bonusScore;
        const totalQuestions = this.config.totalRounds + bonusAnswers.length;

        const emojiGrid = Share.generateEmojiGrid(this.state.answers);

        const results = {
            dayNumber: this.state.dayNumber,
            score: totalScore,
            total: totalQuestions,
            mainScore: mainScore,
            bonusScore: bonusScore,
            bonusTotal: bonusAnswers.length,
            bestStreak: this.state.bestStreak,
            answers: this.state.answers,
            emojiGrid: emojiGrid
        };

        // Save results
        Storage.saveResults(results);

        // Show results screen
        UI.showResults(results);
    },

    /**
     * Save current game state
     */
    saveState() {
        Storage.saveGameState({
            currentRound: this.state.currentRound,
            currentStreak: this.state.currentStreak,
            bestStreak: this.state.bestStreak,
            answers: this.state.answers,
            isComplete: this.state.isComplete
        });
    },

    /**
     * Handle share button click
     */
    async handleShare() {
        const results = Storage.getTodayResults();
        if (!results) return;

        try {
            const { success, method } = await Share.shareResults(results);

            if (success) {
                UI.showShareConfirmation(method === 'clipboard' ? 'Copied!' : 'Shared!');
            } else {
                UI.showShareConfirmation('Could not copy');
            }
        } catch (err) {
            console.error('Share error:', err);
            UI.showShareConfirmation('Could not copy');
        }
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Answer buttons
        UI.elements.deadBtn.addEventListener('click', () => {
            if (!UI.elements.deadBtn.disabled) {
                this.handleAnswer('dead');
            }
        });

        UI.elements.aliveBtn.addEventListener('click', () => {
            if (!UI.elements.aliveBtn.disabled) {
                this.handleAnswer('alive');
            }
        });

        // Next button
        UI.elements.nextBtn.addEventListener('click', () => {
            UI.hideBonusRound();
            this.nextRound();
        });

        // Bonus round buttons
        const bonusButtons = document.querySelectorAll('.btn-bonus');
        bonusButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.disabled && this.state.inBonusRound) {
                    this.handleBonusAnswer(btn.dataset.cause);
                }
            });
        });

        // Share buttons
        UI.elements.shareBtn.addEventListener('click', () => {
            this.handleShare();
        });

        UI.elements.shareAgainBtn.addEventListener('click', () => {
            this.handleShare();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const gameScreen = UI.elements.gameScreen;
            const isGameVisible = !gameScreen.classList.contains('hidden');

            if (isGameVisible) {
                // D key for Dead
                if (e.key.toLowerCase() === 'd') {
                    if (!UI.elements.answerButtons.classList.contains('hidden')) {
                        UI.elements.deadBtn.click();
                    }
                }

                // A key for Alive
                if (e.key.toLowerCase() === 'a') {
                    if (!UI.elements.answerButtons.classList.contains('hidden')) {
                        UI.elements.aliveBtn.click();
                    }
                }

                // Enter key for Next
                if (e.key === 'Enter') {
                    if (!UI.elements.nextBtn.classList.contains('hidden')) {
                        UI.hideBonusRound();
                        UI.elements.nextBtn.click();
                    }
                }

                // Number keys 1-6 for bonus round
                if (this.state.inBonusRound && !UI.elements.bonusRound.classList.contains('hidden')) {
                    const causeMap = {
                        '1': 'heart',
                        '2': 'cancer',
                        '3': 'accident',
                        '4': 'illness',
                        '5': 'violence',
                        '6': 'overdose'
                    };
                    const cause = causeMap[e.key];
                    if (cause) {
                        this.handleBonusAnswer(cause);
                    }
                }
            }
        });
    }
};

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Secret reset: add ?reset to URL to clear storage
    if (window.location.search.includes('reset')) {
        localStorage.clear();
        window.location.href = window.location.pathname;
        return;
    }
    Game.init();
});
