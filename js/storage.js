/**
 * LocalStorage persistence for game state
 */

const Storage = {
    KEYS: {
        GAME_STATE: 'deadOrAlive_gameState',
        STATS: 'deadOrAlive_stats',
        LAST_PLAYED: 'deadOrAlive_lastPlayed'
    },

    /**
     * Get today's date string in YYYY-MM-DD format (UTC)
     */
    getTodayString() {
        const now = new Date();
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    },

    /**
     * Check if user has already played today
     */
    hasPlayedToday() {
        const lastPlayed = localStorage.getItem(this.KEYS.LAST_PLAYED);
        return lastPlayed === this.getTodayString();
    },

    /**
     * Mark today as played
     */
    markAsPlayed() {
        localStorage.setItem(this.KEYS.LAST_PLAYED, this.getTodayString());
    },

    /**
     * Save game state (for resuming if page is refreshed mid-game)
     */
    saveGameState(state) {
        const data = {
            date: this.getTodayString(),
            ...state
        };
        localStorage.setItem(this.KEYS.GAME_STATE, JSON.stringify(data));
    },

    /**
     * Load game state if it exists and is from today
     */
    loadGameState() {
        try {
            const data = localStorage.getItem(this.KEYS.GAME_STATE);
            if (!data) return null;

            const state = JSON.parse(data);
            if (state.date !== this.getTodayString()) {
                this.clearGameState();
                return null;
            }
            return state;
        } catch (e) {
            console.error('Failed to load game state:', e);
            return null;
        }
    },

    /**
     * Clear current game state
     */
    clearGameState() {
        localStorage.removeItem(this.KEYS.GAME_STATE);
    },

    /**
     * Save completed game results
     */
    saveResults(results) {
        const data = {
            date: this.getTodayString(),
            dayNumber: results.dayNumber,
            score: results.score,
            total: results.total,
            bestStreak: results.bestStreak,
            answers: results.answers, // Array of {correct: bool, actualStatus: 'dead'|'alive'}
            emojiGrid: results.emojiGrid
        };
        localStorage.setItem(this.KEYS.GAME_STATE, JSON.stringify(data));
        this.markAsPlayed();
        this.updateStats(results);
    },

    /**
     * Get today's completed results (if any)
     */
    getTodayResults() {
        if (!this.hasPlayedToday()) return null;

        try {
            const data = localStorage.getItem(this.KEYS.GAME_STATE);
            if (!data) return null;

            const state = JSON.parse(data);
            if (state.date !== this.getTodayString()) return null;
            if (state.score === undefined) return null; // Game not complete

            return state;
        } catch (e) {
            return null;
        }
    },

    /**
     * Update lifetime stats
     */
    updateStats(results) {
        const stats = this.getStats();

        stats.gamesPlayed += 1;
        stats.totalCorrect += results.score;
        stats.totalQuestions += results.total;

        if (results.score === results.total) {
            stats.perfectGames += 1;
        }

        if (results.bestStreak > stats.bestStreakEver) {
            stats.bestStreakEver = results.bestStreak;
        }

        // Update current play streak
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;

        if (stats.lastPlayDate === yesterdayStr) {
            stats.currentPlayStreak += 1;
        } else if (stats.lastPlayDate !== this.getTodayString()) {
            stats.currentPlayStreak = 1;
        }

        if (stats.currentPlayStreak > stats.maxPlayStreak) {
            stats.maxPlayStreak = stats.currentPlayStreak;
        }

        stats.lastPlayDate = this.getTodayString();

        localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
    },

    /**
     * Get lifetime stats
     */
    getStats() {
        try {
            const data = localStorage.getItem(this.KEYS.STATS);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load stats:', e);
        }

        return {
            gamesPlayed: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            perfectGames: 0,
            bestStreakEver: 0,
            currentPlayStreak: 0,
            maxPlayStreak: 0,
            lastPlayDate: null
        };
    },

    /**
     * Clear all data (for testing)
     */
    clearAll() {
        localStorage.removeItem(this.KEYS.GAME_STATE);
        localStorage.removeItem(this.KEYS.STATS);
        localStorage.removeItem(this.KEYS.LAST_PLAYED);
    }
};

// Export for use in other modules
window.Storage = Storage;
