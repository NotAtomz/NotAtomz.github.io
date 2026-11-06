import { type ErrorCode } from './enums.js';
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
export declare class RealtimeError<C extends ErrorCode = ErrorCode> extends Error {
    readonly name: "RealtimeError";
    readonly code: C;
    readonly codeValue: number;
    /**
     * A numeric `code` is the native value; it maps to its name, or to `'unknown'` when the
     * wrapper does not know it. The caller vouches that the name is a member of `C`.
     */
    constructor(code: C | number, message: string, options?: ErrorOptions);
}
/**
 * Type guard for {@link RealtimeError}. Also accepts an instance from a second copy of
 * this package (which `instanceof` alone would reject), so it stays reliable when npm
 * fails to dedupe.
 */
export declare function isRealtimeError(value: unknown): value is RealtimeError;
