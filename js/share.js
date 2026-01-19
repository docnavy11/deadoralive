/**
 * Share Module - Clipboard and social sharing
 */

const Share = {
    /**
     * Generate emoji grid from answers (plain text for sharing)
     * @param {Array} answers - Array of {correct: bool, actualStatus: 'dead'|'alive', hasBonus: bool, bonusCorrect: bool}
     * @returns {string} - Two-row emoji grid for clipboard
     */
    generateEmojiGrid(answers) {
        // Row 1: main answers (🔲 = correct, ⬛ = wrong)
        // Row 2: bonus answers (same symbols, · for no bonus)

        let row1 = [];
        let row2 = [];
        let hasAnyBonus = false;

        for (const a of answers) {
            row1.push(a.correct ? '🔲' : '⬛');

            if (a.hasBonus) {
                hasAnyBonus = true;
                row2.push(a.bonusCorrect ? '🔲' : '⬛');
            } else {
                row2.push('·'); // Middle dot as placeholder
            }
        }

        // Only show second row if there were any bonus rounds
        if (hasAnyBonus) {
            return row1.join('') + '\n' + row2.join(' ');
        }
        return row1.join('');
    },

    /**
     * Generate HTML emoji grid for display (properly aligned)
     * @param {Array} answers - Array of answer objects
     * @returns {string} - HTML string
     */
    generateEmojiGridHTML(answers) {
        let hasAnyBonus = answers.some(a => a.hasBonus);

        let html = '<div class="emoji-row">';
        for (const a of answers) {
            html += `<span class="emoji-cell">${a.correct ? '🔲' : '⬛'}</span>`;
        }
        html += '</div>';

        if (hasAnyBonus) {
            html += '<div class="emoji-row">';
            for (const a of answers) {
                if (a.hasBonus) {
                    html += `<span class="emoji-cell">${a.bonusCorrect ? '🔲' : '⬛'}</span>`;
                } else {
                    html += '<span class="emoji-cell"></span>';
                }
            }
            html += '</div>';
        }

        return html;
    },

    /**
     * Generate shareable text
     * @param {Object} results - Game results
     * @returns {string} - Share text
     */
    generateShareText(results) {
        const emojiGrid = this.generateEmojiGrid(results.answers);

        const stats = Storage.getStats();
        const streakText = stats.currentPlayStreak > 1
            ? ` 🔥${stats.currentPlayStreak}`
            : '';

        return [
            `Dead or Alive #${results.dayNumber}`,
            `${results.score}/${results.total}${streakText}`,
            emojiGrid,
            '',
            'https://deadoralive.today'
        ].join('\n');
    },

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} - Success status
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            return false;
        }
    },

    /**
     * Share results (copy to clipboard, or use native share if available)
     * @param {Object} results - Game results
     * @returns {Promise<{success: boolean, method: string}>}
     */
    async shareResults(results) {
        const shareText = this.generateShareText(results);

        // Only use native share on mobile (touch devices)
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (isMobile && navigator.share) {
            try {
                await navigator.share({
                    text: shareText
                });
                return { success: true, method: 'native' };
            } catch (err) {
                // User cancelled or share failed, fall through to clipboard
                if (err.name !== 'AbortError') {
                    console.error('Native share failed:', err);
                }
            }
        }

        // Desktop: just copy to clipboard
        const copied = await this.copyToClipboard(shareText);
        return { success: copied, method: 'clipboard' };
    }
};

// Export for use in other modules
window.Share = Share;
