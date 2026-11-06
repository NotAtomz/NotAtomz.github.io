/**
 * Drives the native client.
 *
 * The web build of the native library has no threads, no socket callbacks and no timers:
 * nothing happens -- no packet is read, no promise settles, no event fires -- until
 * `service()` runs. The pump calls it on a fixed interval. `setInterval` rather than
 * `requestAnimationFrame` because a hidden tab stops animation frames entirely and the
 * server would time the client out; intervals keep ticking (throttled to once a second, and
 * after five minutes hidden to once a minute -- raise `disconnectTimeoutMs` or run the client
 * in a Web Worker if that matters to you).
 *
 * The pump holds a strong reference to its tick function on purpose: a running pump is what
 * keeps a connected client alive, exactly as an open socket keeps a Node process alive.
 * `dispose()` stops it.
 *
 * @internal
 */
export class Pump {
    static DEFAULT_INTERVAL_MS = 16;
    #timer;
    #intervalMs;
    #tick;
    constructor(tick, intervalMs = Pump.DEFAULT_INTERVAL_MS) {
        this.#tick = tick;
        this.#intervalMs = Pump.#validate(intervalMs);
    }
    get isRunning() {
        return this.#timer !== undefined;
    }
    /** Milliseconds between ticks. Changing it while running restarts the timer. */
    get intervalMs() {
        return this.#intervalMs;
    }
    set intervalMs(value) {
        this.#intervalMs = Pump.#validate(value);
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
    /** Starts ticking; a no-op when already running (an explicit interval still applies). */
    start(intervalMs) {
        if (intervalMs !== undefined) {
            this.#intervalMs = Pump.#validate(intervalMs);
            if (this.isRunning) {
                this.stop();
            }
        }
        if (this.#timer !== undefined) {
            return;
        }
        this.#timer = setInterval(this.#tick, this.#intervalMs);
    }
    stop() {
        if (this.#timer !== undefined) {
            clearInterval(this.#timer);
            this.#timer = undefined;
        }
    }
    static #validate(intervalMs) {
        if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs) || intervalMs < 1) {
            throw new RangeError(`pump interval must be a number of milliseconds >= 1, got ${String(intervalMs)}`);
        }
        return intervalMs;
    }
}
