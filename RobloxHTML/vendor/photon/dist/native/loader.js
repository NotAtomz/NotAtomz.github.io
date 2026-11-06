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
let pending;
let firstLocation;
let aborted;
/** @internal Resets the memoized module (tests only). */
export function resetNativeModuleForTests() {
    pending = undefined;
    firstLocation = undefined;
    aborted = undefined;
}
export function loadNativeModule(location) {
    if (aborted !== undefined) {
        return Promise.reject(new Error(`The RealtimeCore native module has aborted and cannot be used again in this page or process (${describeAbort(aborted)}). Reload to recover.`));
    }
    if (pending) {
        if (location !== undefined && firstLocation !== undefined && !sameLocation(location, firstLocation)) {
            return Promise.reject(new Error('The RealtimeCore native module is already loaded with different wasm options. Call preloadRealtime() once, before the first client, with the options you want.'));
        }
        return pending;
    }
    firstLocation = location;
    const attempt = (async () => {
        await assertNodeWebSocketTransport();
        const factory = location?.moduleFactory ?? (await import('./realtimecore.mjs')).default;
        const options = {
            // libsockfs only wires Module['websocket'] when the property exists at start-up.
            websocket: {},
            onAbort: (reason) => {
                aborted = reason;
            },
            print: (text) => {
                console.log(text);
            },
            printErr: (text) => {
                console.error(text);
            },
        };
        if (location?.binary !== undefined) {
            options.wasmBinary = location.binary;
        }
        if (location?.locateFile !== undefined) {
            options.locateFile = location.locateFile;
        }
        else if (location?.url !== undefined) {
            const url = String(location.url);
            options.locateFile = (path, scriptDirectory) => path.endsWith('.wasm') ? url : scriptDirectory + path;
        }
        const module = await factory(options);
        module.setLogSink(defaultLogSink);
        return module;
    })();
    pending = attempt;
    attempt.catch(() => {
        // A failed load (network error, unsupported engine) may be retried with a later call.
        if (pending === attempt) {
            pending = undefined;
            firstLocation = undefined;
        }
    });
    return attempt;
}
export async function getNativeVersion(location) {
    const module = await loadNativeModule(location);
    return { native: module.version(), protocol: module.protocolVersion() };
}
function sameLocation(a, b) {
    return (String(a.url ?? '') === String(b.url ?? '') &&
        a.binary === b.binary &&
        a.locateFile === b.locateFile &&
        a.moduleFactory === b.moduleFactory);
}
function describeAbort(reason) {
    if (reason instanceof Error) {
        return reason.message;
    }
    return typeof reason === 'string' ? reason : String(reason);
}
// The native log levels are bit flags: Trace 1, Debug 2, Info 4, Warning 8, Error 16.
// Wrapped in try/catch like every callback that native may invoke (see events.ts).
function defaultLogSink(level, message) {
    try {
        const line = `[RealtimeCore] ${message}`;
        if (level >= 16) {
            console.error(line);
        }
        else if (level >= 8) {
            console.warn(line);
        }
        else if (level >= 4) {
            console.info(line);
        }
        else {
            console.debug(line);
        }
    }
    catch {
        // A console that throws must not reach the native frames.
    }
}
/**
 * Under Node.js, emscripten's socket layer requires the `ws` package (Node's own global
 * WebSocket is not consulted). Detect its absence up front so the failure is a clear
 * message at load time rather than an opaque one at connect time.
 */
async function assertNodeWebSocketTransport() {
    const proc = globalThis.process;
    if (proc?.versions?.node === undefined) {
        return;
    }
    const { createRequire } = await import('node:module');
    try {
        createRequire(import.meta.url).resolve('ws');
    }
    catch {
        throw new Error("RealtimeCore under Node.js needs the 'ws' package for its WebSocket transport. Install it with: npm install ws");
    }
}
