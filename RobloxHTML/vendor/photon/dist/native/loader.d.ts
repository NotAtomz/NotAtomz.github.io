/**
 * Loads the native module exactly once per page / process.
 *
 * The emscripten loader (`realtimecore.mjs`) is imported lazily, so importing this package
 * costs nothing until the first client is created, and the `.wasm` beside it is located by
 * the loader's own `import.meta.url` logic unless the caller overrides it (see
 * {@link WasmLocation}).
 *
 * This docblock deliberately does not carry the internal marker, and must not even mention it
 * in prose: `stripInternal` looks for that tag as *text* anywhere in a comment, a file-level
 * docblock belongs to the statement below it, and the statement below this one is the
 * `import type` -- so the emitted `.d.ts` would reference `NativeModule` with no import for
 * it. What is public is decided by `index.ts` and `integration.ts` anyway.
 *
 * @module
 */
import type { NativeModule, NativeModuleFactory } from './NativeModule.js';
/**
 * Where the `.wasm` comes from. Leave it out and the module finds `realtimecore.wasm` next
 * to its own loader file, which every mainstream bundler (Vite, webpack 5, Rollup, esbuild)
 * resolves and emits as an asset. Override it when your setup serves the file elsewhere.
 */
export interface WasmLocation {
    /** URL of the `.wasm` file (e.g. from `import wasmUrl from '@photonengine/realtime-core/realtimecore.wasm?url'`). */
    readonly url?: string | URL;
    /** The compiled `.wasm` bytes, when you fetch them yourself (strict CSP, custom caching). */
    readonly binary?: ArrayBuffer | Uint8Array;
    /** Full control: emscripten's `locateFile` hook. */
    readonly locateFile?: (path: string, scriptDirectory: string) => string;
    /** A pre-imported module factory (for a custom build of the loader). */
    readonly moduleFactory?: NativeModuleFactory;
}
/** The version of the native library and of the Photon protocol it speaks. */
export interface RealtimeVersion {
    readonly native: string;
    readonly protocol: string;
}
export declare function loadNativeModule(location?: WasmLocation): Promise<NativeModule>;
export declare function getNativeVersion(location?: WasmLocation): Promise<RealtimeVersion>;
