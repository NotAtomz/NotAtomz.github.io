/**
 * Entry point for packages that *embed* the Realtime module rather than consume it.
 *
 * A package whose own wasm module contains the Realtime client cannot load `realtimecore.wasm`
 * as a second module, because its native code has to share one linear memory with the
 * Realtime client. It points this package's loader at its own module instead, and the whole
 * Realtime TypeScript API (client, room, events, values, enums) keeps working unchanged
 * against it.
 *
 * ```ts
 * import { preloadRealtime } from '@photonengine/realtime-core';
 * import createMyModule from './my-module.mjs';
 *
 * await preloadRealtime({ moduleFactory: createMyModule });
 * // every @photonengine/realtime-core API now runs on that module
 * ```
 *
 * Everything here is a supported, versioned API, unlike the internal-marked members of the main
 * entry point. It is a small surface on purpose: the module handle, the escape hatch that
 * builds a client over an already loaded module, and the native-level types an embedder needs
 * to describe its own module factory.
 *
 * (That marker must not appear as text in this comment: `stripInternal` matches the tag
 * anywhere in a docblock, and a file-level docblock belongs to the statement below it -- the
 * re-export would vanish from the emitted `.d.ts`.)
 *
 * @packageDocumentation
 */
export { createClientWithModule, preloadRealtime } from './RealtimeClient.js';
export { loadNativeModule } from './native/loader.js';
export type { WasmLocation, RealtimeVersion } from './native/loader.js';
export type { NativeModule, NativeModuleFactory, NativeModuleOptions, NativeClient, NativeClientConstructor, NativeHandle, NativeSubscription, } from './native/NativeModule.js';
import type { NativeClient } from './native/NativeModule.js';
import type { RealtimeClient } from './RealtimeClient.js';
/**
 * The native client behind a {@link RealtimeClient}.
 *
 * An embedder needs it to hand the same underlying native client to its own binding, because
 * within one module an embind handle is the C++ object.
 *
 * Throws if the client has already been disposed: the native object is gone at that point and
 * the handle would be a dangling `delete()`d wrapper.
 */
export declare function getNativeClient(client: RealtimeClient): NativeClient;
