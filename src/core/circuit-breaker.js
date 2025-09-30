/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily disabling failing providers
 */

export class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.timeout = options.timeout || 60000; // 1 minute
        this.resetTimeout = options.resetTimeout || 300000; // 5 minutes

        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttempt = null;
    }

    async call(fn, ...args) {
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN - provider temporarily disabled');
            }
        }

        try {
            const result = await Promise.race([
                fn(...args),
                this.createTimeoutPromise()
            ]);

            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
        this.lastFailureTime = null;
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeout;
        }
    }

    shouldAttemptReset() {
        return Date.now() >= this.nextAttempt;
    }

    createTimeoutPromise() {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Circuit breaker timeout'));
            }, this.timeout);
        });
    }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
            nextAttempt: this.nextAttempt
        };
    }

    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttempt = null;
    }

    /**
     * Check if the circuit breaker allows execution
     * @returns {boolean} True if execution is allowed
     */
    canExecute() {
        if (this.state === 'CLOSED') {
            return true;
        }

        if (this.state === 'OPEN') {
            return this.shouldAttemptReset();
        }

        // HALF_OPEN state allows one attempt
        return this.state === 'HALF_OPEN';
    }

    /**
     * Record a failure for circuit breaker tracking
     */
    recordFailure() {
        this.onFailure();
    }

    /**
     * Record a success for circuit breaker tracking
     */
    recordSuccess() {
        this.onSuccess();
    }
}