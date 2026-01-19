/**
 * UI Module - DOM manipulation and screen management
 */

const UI = {
    // Cache DOM elements
    elements: {},

    /**
     * Initialize UI and cache DOM elements
     */
    init() {
        this.elements = {
            // Screens
            loadingScreen: document.getElementById('loadingScreen'),
            alreadyPlayedScreen: document.getElementById('alreadyPlayedScreen'),
            gameScreen: document.getElementById('gameScreen'),
            resultsScreen: document.getElementById('resultsScreen'),

            // Header
            dayCounter: document.getElementById('dayCounter'),

            // Progress
            progressFill: document.getElementById('progressFill'),
            currentRound: document.getElementById('currentRound'),
            totalRounds: document.getElementById('totalRounds'),

            // Streaks
            currentStreak: document.getElementById('currentStreak'),
            bestStreak: document.getElementById('bestStreak'),

            // Celebrity card
            celebrityCard: document.getElementById('celebrityCard'),
            celebrityImage: document.getElementById('celebrityImage'),
            celebrityInitials: document.getElementById('celebrityInitials'),
            celebrityName: document.getElementById('celebrityName'),
            celebrityProfession: document.getElementById('celebrityProfession'),

            // Answer buttons
            answerButtons: document.getElementById('answerButtons'),
            deadBtn: document.getElementById('deadBtn'),
            aliveBtn: document.getElementById('aliveBtn'),

            // Result feedback
            resultFeedback: document.getElementById('resultFeedback'),
            resultIcon: document.getElementById('resultIcon'),
            resultText: document.getElementById('resultText'),
            resultFact: document.getElementById('resultFact'),
            nextBtn: document.getElementById('nextBtn'),

            // Results screen
            finalScore: document.getElementById('finalScore'),
            finalTotal: document.getElementById('finalTotal'),
            finalStreak: document.getElementById('finalStreak'),
            playStreakDisplay: document.getElementById('playStreakDisplay'),
            playStreakCount: document.getElementById('playStreakCount'),
            emojiGrid: document.getElementById('emojiGrid'),
            shareBtn: document.getElementById('shareBtn'),
            shareHint: document.getElementById('shareHint'),

            // Already played screen
            previousResults: document.getElementById('previousResults'),
            shareAgainBtn: document.getElementById('shareAgainBtn'),
            shareAgainHint: document.getElementById('shareAgainHint'),

            // Bonus round
            bonusRound: document.getElementById('bonusRound'),
            bonusButtons: document.getElementById('bonusButtons'),
            bonusResult: document.getElementById('bonusResult'),
            bonusResultText: document.getElementById('bonusResultText'),
            bonusActualCause: document.getElementById('bonusActualCause')
        };
    },

    /**
     * Show a specific screen, hide others
     */
    showScreen(screenName) {
        const screens = ['loadingScreen', 'alreadyPlayedScreen', 'gameScreen', 'resultsScreen'];
        screens.forEach(name => {
            const el = this.elements[name];
            if (el) {
                el.classList.toggle('hidden', name !== screenName);
            }
        });
    },

    /**
     * Set the day counter text
     */
    setDayCounter(dayNumber) {
        this.elements.dayCounter.textContent = `Edition No. ${dayNumber}`;
    },

    /**
     * Update progress bar and round counter
     */
    updateProgress(current, total) {
        const percentage = ((current - 1) / total) * 100;
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.currentRound.textContent = current;
        this.elements.totalRounds.textContent = total;
    },

    /**
     * Update streak displays
     */
    updateStreaks(current, best) {
        this.elements.currentStreak.textContent = current;
        this.elements.bestStreak.textContent = best;
    },

    /**
     * Display a celebrity
     */
    showCelebrity(celebrity) {
        // Set name and profession
        this.elements.celebrityName.textContent = celebrity.name;
        this.elements.celebrityProfession.textContent = celebrity.professionDisplay || celebrity.profession;

        // Handle image
        if (celebrity.imageUrl) {
            this.elements.celebrityImage.src = celebrity.imageUrl;
            this.elements.celebrityImage.alt = celebrity.name;
            this.elements.celebrityImage.classList.remove('hidden');
            this.elements.celebrityInitials.classList.add('hidden');

            // Handle image load error
            this.elements.celebrityImage.onerror = () => {
                this.showInitials(celebrity.name);
            };
        } else {
            this.showInitials(celebrity.name);
        }

        // Reset card state
        this.elements.celebrityCard.classList.remove('pulse', 'shake');
    },

    /**
     * Show initials as fallback for missing image
     */
    showInitials(name) {
        const initials = name
            .split(' ')
            .map(part => part[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

        this.elements.celebrityInitials.textContent = initials;
        this.elements.celebrityImage.classList.add('hidden');
        this.elements.celebrityInitials.classList.remove('hidden');
    },

    /**
     * Enable/disable answer buttons
     */
    setButtonsEnabled(enabled) {
        this.elements.deadBtn.disabled = !enabled;
        this.elements.aliveBtn.disabled = !enabled;
    },

    /**
     * Show answer buttons, hide feedback
     */
    showAnswerButtons() {
        this.elements.answerButtons.classList.remove('hidden');
        this.elements.resultFeedback.classList.add('hidden');
        this.elements.nextBtn.classList.add('hidden');
        this.elements.bonusRound.classList.add('hidden');
        this.setButtonsEnabled(true);
    },

    /**
     * Show result feedback
     */
    showResult(isCorrect, celebrity) {
        this.elements.answerButtons.classList.add('hidden');
        this.elements.resultFeedback.classList.remove('hidden');
        this.elements.nextBtn.classList.remove('hidden');

        // Set icon and text with newspaper-themed language
        if (isCorrect) {
            this.elements.resultIcon.textContent = '✓';
            this.elements.resultIcon.className = 'result-stamp correct';
            this.elements.resultText.textContent = 'VERIFIED';
            this.elements.resultText.className = 'result-text correct';
            this.elements.celebrityCard.classList.add('pulse');
        } else {
            this.elements.resultIcon.textContent = '✗';
            this.elements.resultIcon.className = 'result-stamp incorrect';
            this.elements.resultText.textContent = 'MISPRINT';
            this.elements.resultText.className = 'result-text incorrect';
            this.elements.celebrityCard.classList.add('shake');
        }

        // Set fact
        const isAlive = !celebrity.deathYear;
        const currentYear = new Date().getUTCFullYear();

        if (isAlive) {
            const age = currentYear - celebrity.birthYear;
            this.elements.resultFact.textContent = `${celebrity.name} remains in circulation, aged ${age}.`;
        } else {
            const deathAge = celebrity.deathYear - celebrity.birthYear;
            this.elements.resultFact.textContent = `${celebrity.name} — obituary printed ${celebrity.deathYear}, aged ${deathAge}.`;
        }
    },

    /**
     * Show the bonus round for guessing cause of death
     */
    showBonusRound() {
        this.elements.bonusRound.classList.remove('hidden');
        this.elements.bonusResult.classList.add('hidden');
        this.elements.nextBtn.classList.add('hidden');

        // Reset all bonus buttons
        const buttons = this.elements.bonusButtons.querySelectorAll('.btn-bonus');
        buttons.forEach(btn => {
            btn.classList.remove('selected', 'correct', 'incorrect');
            btn.disabled = false;
        });
    },

    /**
     * Hide the bonus round
     */
    hideBonusRound() {
        this.elements.bonusRound.classList.add('hidden');
    },

    /**
     * Show bonus round result
     */
    showBonusResult(isCorrect, guessedCause, actualCause, causeOfDeath) {
        this.elements.bonusResult.classList.remove('hidden');
        this.elements.nextBtn.classList.remove('hidden');

        // Disable all buttons and highlight selected
        const buttons = this.elements.bonusButtons.querySelectorAll('.btn-bonus');
        buttons.forEach(btn => {
            btn.disabled = true;
            const cause = btn.dataset.cause;
            if (cause === guessedCause) {
                btn.classList.add('selected', isCorrect ? 'correct' : 'incorrect');
            }
            if (cause === actualCause && !isCorrect) {
                btn.classList.add('correct');
            }
        });

        // Set result text
        if (isCorrect) {
            this.elements.bonusResultText.textContent = 'CORRECT! You knew how they went.';
            this.elements.bonusResultText.className = 'bonus-result-text correct';
        } else {
            this.elements.bonusResultText.textContent = 'Not quite right.';
            this.elements.bonusResultText.className = 'bonus-result-text incorrect';
        }

        // Show actual cause
        const causeLabels = {
            heart: 'Heart',
            cancer: 'Cancer',
            accident: 'Accident',
            illness: 'Illness',
            violence: 'Violence',
            overdose: 'Overdose'
        };
        this.elements.bonusActualCause.textContent = `Cause: ${causeOfDeath || causeLabels[actualCause]}`;
    },

    /**
     * Show final results screen
     */
    showResults(results) {
        this.elements.finalScore.textContent = results.score;
        this.elements.finalTotal.textContent = results.total;
        this.elements.finalStreak.textContent = results.bestStreak;
        this.elements.emojiGrid.innerHTML = Share.generateEmojiGridHTML(results.answers);
        this.elements.shareHint.textContent = '';

        // Show play streak
        const stats = Storage.getStats();
        if (stats.currentPlayStreak > 1) {
            this.elements.playStreakCount.textContent = stats.currentPlayStreak;
            this.elements.playStreakDisplay.classList.remove('hidden');
        } else {
            this.elements.playStreakDisplay.classList.add('hidden');
        }

        this.showScreen('resultsScreen');
    },

    /**
     * Show already played screen with previous results
     */
    showAlreadyPlayed(results) {
        if (results) {
            this.elements.previousResults.innerHTML = `
                <div class="score">${results.score}/${results.total}</div>
                <div class="emoji-grid">${Share.generateEmojiGridHTML(results.answers)}</div>
            `;
        }
        this.showScreen('alreadyPlayedScreen');
    },

    /**
     * Show share confirmation
     */
    showShareConfirmation(message = 'Copied to clipboard!') {
        // Show on whichever screen is visible
        if (this.elements.shareHint) {
            this.elements.shareHint.textContent = message;
        }
        if (this.elements.shareAgainHint) {
            this.elements.shareAgainHint.textContent = message;
        }
        setTimeout(() => {
            if (this.elements.shareHint) {
                this.elements.shareHint.textContent = '';
            }
            if (this.elements.shareAgainHint) {
                this.elements.shareAgainHint.textContent = '';
            }
        }, 2000);
    },

    /**
     * Trigger haptic feedback (if supported)
     */
    triggerHaptic() {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }
};

// Export for use in other modules
window.UI = UI;
