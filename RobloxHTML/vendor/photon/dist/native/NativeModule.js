/**
 * The embind contract: what `realtimecore.mjs` exports, as TypeScript sees it.
 *
 * This file, the C++ bindings, the emitted `realtimecore.d.mts` and the in-memory test fake
 * describe the same surface and change together. Everything here is internal to the package.
 *
 * Conventions of the surface:
 * - enums are numbers; option objects are the fully populated `Native*Options` shapes from
 *   `options.ts`; values follow the rules in `values.ts`;
 * - every async method returns a Promise that rejects with an `Error` carrying a numeric
 *   `code` -- a member of that operation's C++ error enum (`ConnectError`, `JoinRoomError`,
 *   ...) widened to `ErrorCode`, or `Disconnected` when the binding is or gets disposed -- and
 *   never throws synchronously;
 * - sync methods never throw for SDK-level failures: they return `false` / `0` / `null` and
 *   log, the C++ SDK's own convention;
 * - `on('error', cb)` calls `cb(code, message)` with a `ClientError` value; `on('warning', cb)`
 *   calls `cb(code, message)` with a `WarningCode` value;
 * - callbacks handed to `on` / `onEvent` receive positional arguments and MUST NOT throw
 *   (the build has no C++ exceptions; a JS exception would unwind through wasm frames).
 *
 * @internal
 * @module
 */
export {};
