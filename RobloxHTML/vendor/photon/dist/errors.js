import { ErrorCodes, errorCodeCodec } from './enums.js';
/**
 * The error every failed Realtime operation rejects with.
 *
 * `code` is the reason as a string (`'roomNotFound'`, `'notConnected'`, ...) so `switch` and
 * `if` read naturally; `codeValue` is the number the native library reported, which
 * differs from `ErrorCodes[code]` only when the wrapper does not know the value (then
 * `code` is `'unknown'` and `codeValue` still tells you what the server said).
 *
 * `C` narrows `code` to the codes one operation can report: each async method of
 * {@link RealtimeClient} names its code type ({@link ConnectErrorCode},
 * {@link JoinRoomErrorCode}, ...), and the `error` event delivers a
 * `RealtimeError<ClientErrorCode>`. A promise's rejection cannot be typed in TypeScript, so
 * annotate the caught error yourself:
 *
 * ```ts
 * try {
 *   await client.joinRoom('lobby-1');
 * } catch (e) {
 *   if (isRealtimeError(e)) {
 *     const error = e as RealtimeError<JoinRoomErrorCode>;
 *     if (error.code === 'roomFull') { ... }
 *   }
 * }
 * ```
 *
 * Only *operation* failures are `RealtimeError`s. Misuse of the API -- calling into a
 * disposed client, passing a value that cannot be sent -- throws a plain `Error` or
 * `TypeError` synchronously, so `catch (e) { if (isRealtimeError(e)) ... }` cleanly
 * separates "the network/server said no" from "my code is wrong".
 */
export class RealtimeError extends Error {
    name = 'RealtimeError';
    code;
    codeValue;
    /**
     * A numeric `code` is the native value; it maps to its name, or to `'unknown'` when the
     * wrapper does not know it. The caller vouches that the name is a member of `C`.
     */
    constructor(code, message, options) {
        super(message, options);
        if (typeof code === 'number') {
            this.codeValue = code;
            // The native side reports only members of the operation's own enum (C), and every
            // such enum includes 'unknown', the fallback for a value the wrapper does not know.
            this.code = errorCodeCodec.fromNative(code);
        }
        else {
            this.code = code;
            this.codeValue = ErrorCodes[code];
        }
    }
    /**
     * Converts whatever the native module rejected with into a `RealtimeError`.
     *
     * The native side rejects with a JS `Error` carrying a numeric `code` property; anything
     * else (a bare string, an unrelated `Error`, `undefined`) maps to `unknown` with the best
     * message available, so a caller always gets the same type.
     *
     * @internal
     */
    static fromNative(reason) {
        if (reason instanceof RealtimeError) {
            // instanceof narrows to RealtimeError<any>; every instance's code is some ErrorCode.
            return reason;
        }
        if (typeof reason === 'object' && reason !== null) {
            const candidate = reason;
            const message = typeof candidate.message === 'string' ? candidate.message : 'Unknown error';
            if (typeof candidate.code === 'number') {
                return new RealtimeError(candidate.code, message, { cause: reason });
            }
            if (typeof candidate.code === 'string' && candidate.code in ErrorCodes) {
                return new RealtimeError(candidate.code, message, { cause: reason });
            }
            return new RealtimeError('unknown', message, { cause: reason });
        }
        return new RealtimeError('unknown', typeof reason === 'string' ? reason : 'Unknown error', { cause: reason });
    }
}
/**
 * Type guard for {@link RealtimeError}. Also accepts an instance from a second copy of
 * this package (which `instanceof` alone would reject), so it stays reliable when npm
 * fails to dedupe.
 */
export function isRealtimeError(value) {
    if (value instanceof RealtimeError) {
        return true;
    }
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value;
    return (candidate.name === 'RealtimeError' && typeof candidate.code === 'string' && typeof candidate.codeValue === 'number');
}
