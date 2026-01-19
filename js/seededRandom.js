/**
 * Seeded Random Number Generator
 * Uses Mulberry32 algorithm for deterministic, reproducible random sequences
 */

const SeededRandom = {
    /**
     * Get date from URL param or use today
     * Supports ?date=20260120 for testing
     */
    getDateSeed() {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');

        if (dateParam && /^\d{8}$/.test(dateParam)) {
            return parseInt(dateParam, 10);
        }

        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        return parseInt(`${year}${month}${day}`, 10);
    },

    /**
     * Get today's date seed as YYYYMMDD integer
     * Uses UTC to ensure same challenge globally
     */
    getTodaySeed() {
        return this.getDateSeed();
    },

    /**
     * Calculate day number since launch
     * Launch date: January 19, 2026
     */
    getDayNumber() {
        const launchDate = new Date(Date.UTC(2026, 0, 19)); // Jan 19, 2026

        // Support ?date= param for testing
        const seed = this.getDateSeed();
        const seedStr = String(seed);
        const year = parseInt(seedStr.slice(0, 4));
        const month = parseInt(seedStr.slice(4, 6)) - 1;
        const day = parseInt(seedStr.slice(6, 8));

        const targetDate = new Date(Date.UTC(year, month, day));
        const diffTime = targetDate - launchDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays + 1); // Day 1 is launch day
    },

    /**
     * Mulberry32 PRNG
     * Fast, small footprint, good statistical properties
     * @param {number} seed - Integer seed value
     * @returns {function} - Function that returns random float [0, 1)
     */
    mulberry32(seed) {
        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    },

    /**
     * Create a seeded random instance for today's date
     * @returns {object} - Object with random utilities
     */
    createForToday() {
        const seed = this.getTodaySeed();
        const random = this.mulberry32(seed);

        return {
            seed,
            dayNumber: this.getDayNumber(),

            /**
             * Get random float [0, 1)
             */
            next() {
                return random();
            },

            /**
             * Get random integer in range [min, max]
             */
            nextInt(min, max) {
                return Math.floor(random() * (max - min + 1)) + min;
            },

            /**
             * Shuffle array in place using Fisher-Yates
             */
            shuffle(array) {
                const arr = [...array];
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            },

            /**
             * Pick n random items from array
             */
            pick(array, n) {
                const shuffled = this.shuffle(array);
                return shuffled.slice(0, n);
            }
        };
    }
};

// Export for use in other modules
window.SeededRandom = SeededRandom;
