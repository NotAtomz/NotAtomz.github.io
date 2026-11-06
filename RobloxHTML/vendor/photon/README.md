# Photon Realtime Core for the Web

`@photonengine/realtime-core` is the base layer for higher level Photon network solutions. It focuses on matchmaking and message transport: connect to the Photon Cloud, match players into rooms and exchange messages via events.
It runs in the browser and Node.js and ships with JavaScript and TypeScript support.

The `@photonengine/realtime-core` package is the Web version of [Realtime Core](https://dev-doc.photonengine.com/realtime-core/v6/realtime-core-intro) and is able to communicate cross platform with any of the other platforms Realtime Core supports. The Web version uses the native Realtime Core library compiled to WebAssembly under the hood.

```ts
import { createRealtimeClient } from '@photonengine/realtime-core';

const client = await createRealtimeClient({ appId: 'your-app-id', appVersion: '1.0' });
await client.connect();
const room = await client.joinRandomOrCreateRoom();

client.onEvent(1, ({ senderNumber, data }) => console.log(`player #${senderNumber} says`, data));
client.sendEvent(1, { hello: 'world' });
```

Works in TypeScript and plain JavaScript (ES modules). Full typings are included.

## Install

```bash
npm install @photonengine/realtime-core
```

Under Node.js the WebSocket transport needs the `ws` package as well:

```bash
npm install ws
```

Requirements: an ES-module environment (every current browser, Node.js 22 or later, any bundler). Web Workers are supported.

## Docs & Community

[Realtime Core JavaScript/TypeScript Overview](https://doc.photonengine.com/realtime-core/v6/bindings/javascript-typescript-api)
[Quick Start Guide](https://doc.photonengine.com/realtime-core/v6/getting-started/quick-start-guide)
[Full Manual](doc.photonengine.com/realtime-core/v6/manual)

## Quick start

### JavaScript

```js
import { createRealtimeClient, isRealtimeError } from '@photonengine/realtime-core';

async function main() {
	const client = await createRealtimeClient({ appId: 'your-app-id', appVersion: '1.0' });

	client.on('playerJoined', ({ player }) => console.log(`#${player.number} joined`));
	client.on('disconnected', ({ cause }) => console.log('disconnected:', cause));

	try {
		await client.connect();
		const room = await client.joinOrCreateRoom('lobby-1', { maxPlayers: 4 });
		console.log(`in ${room.name} with ${room.playerCount} player(s)`);
	} catch (error) {
		if (isRealtimeError(error)) {
			console.error(`Photon said no: ${error.code} - ${error.message}`);
		} else {
			throw error;
		}
	}
}

main();
```

### TypeScript

```ts
import { createRealtimeClient, type RealtimeClient, type Room } from '@photonengine/realtime-core';

const client: RealtimeClient = await createRealtimeClient({ appId: 'your-app-id', appVersion: '1.0' });
await client.connect();
const room: Room = await client.createRoom('my-room', { customProperties: { map: 'desert' } });

room.setProperties({ round: 1 });
client.on('roomPropertiesChanged', ({ changed }) => console.log(changed));
```

## How the client runs

The native library does nothing on its own: no packet is read and no promise settles until its service function runs. The client pumps it for you with a timer (every 16 ms by default), so you never think about it. Two knobs exist for games with their own loop:

```ts
// Slower cadence
const client = await createRealtimeClient({ appId, appVersion, autoPump: { intervalMs: 33 } });

// Or drive it yourself, once per frame
const manual = await createRealtimeClient({ appId, appVersion, autoPump: false });
function frame() {
	manual.service();
	requestAnimationFrame(frame);
}
```

`client.pump.start()`, `client.pump.stop()` and `client.pump.intervalMs` control the timer at any time. The timer deliberately uses `setInterval`, which keeps running in a background tab (`requestAnimationFrame` stops there and the server would drop the connection). Browsers throttle background timers to once a second, and after five minutes to once a minute; if your game must survive that, raise `disconnectTimeoutMs` or run the client in a Web Worker, where timers are not throttled.

Never call `client.service()` from inside an event handler.

## Errors

Every failed operation rejects with a `RealtimeError`:

```ts
import { RealtimeError } from '@photonengine/realtime-core';

try {
	await client.joinRoom('nope');
} catch (error) {
	if (error instanceof RealtimeError) {
		error.code; // 'roomNotFound'
		error.codeValue; // 22
		error.message; // what the server said
	}
}
```

Each operation reports only some of them, and its code type says which. `RealtimeError` takes the code type as a parameter, so after you annotate the caught error TypeScript narrows `code` to what that operation can report:

```ts
import { isRealtimeError, type RealtimeError, type JoinRoomErrorCode } from '@photonengine/realtime-core';

try {
	await client.joinRoom('arena');
} catch (e) {
	if (isRealtimeError(e)) {
		const error = e as RealtimeError<JoinRoomErrorCode>;
		if (error.code === 'roomFull') {
			// try another room
		}
	}
}
```

| Operation                                                                  | Code type              |
| -------------------------------------------------------------------------- | ---------------------- |
| `connect`, `reconnect`                                                     | `ConnectErrorCode`     |
| `disconnect`                                                               | `DisconnectErrorCode`  |
| `availableRegions`, `selectRegion`                                         | `RegionErrorCode`      |
| `joinLobby`, `leaveLobby`, `getLobbyStats`                                 | `LobbyErrorCode`       |
| `getRoomList`                                                              | `RoomListErrorCode`    |
| `createRoom`                                                               | `CreateRoomErrorCode`  |
| `joinRoom`, `joinOrCreateRoom`, `joinRandomRoom`, `joinRandomOrCreateRoom` | `JoinRoomErrorCode`    |
| `leaveRoom`                                                                | `LeaveRoomErrorCode`   |
| `findFriends`                                                              | `FindFriendsErrorCode` |
| the `error` event                                                          | `ClientErrorCode`      |

## Events

```ts
const off = client.on('playerLeft', ({ playerNumber, isInactive }) => { ... });
off(); // unsubscribe

client.on('roomPropertiesChanged', handler, { signal: controller.signal }); // removed on abort
client.on('roomJoined', handler, { once: true });
const { newMasterNumber } = await client.once('masterClientChanged', { timeoutMs: 5000 });
```

Custom events raised by other players with `sendEvent` arrive through `onEvent(code, handler)`, `onEventRange(first, last, handler)` and `onAnyEvent(handler)`. Each handler receives `{ code, senderNumber, data }`. Pass `{ asBytes: true }` to receive the raw payload as a `Uint8Array`.

## Values

Custom properties, event payloads and matchmaking filters are plain JavaScript values. Photon's wire format is typed, so the value's type is inferred:

| You send                                    | Photon type                          |
| ------------------------------------------- | ------------------------------------ |
| `null`, `undefined`                         | null                                 |
| `boolean`                                   | bool                                 |
| integer `number` within 32 bits             | int32                                |
| any other `number`                          | double                               |
| `bigint`                                    | int64                                |
| `string`                                    | string                               |
| `Uint8Array`                                | byte[]                               |
| `Int16Array`, `Int32Array`, `BigInt64Array` | int16[], int32[], int64[]            |
| `Float32Array`, `Float64Array`              | float[], double[]                    |
| `Array`                                     | object[] (always, whatever it holds) |
| plain object                                | hashtable with string keys           |
| `Map`                                       | hashtable with inferred keys         |

When a peer written in another language expects an exact type, say so with a helper: `byte(5)`, `int16(-3)`, `int32(7)`, `int64(2n ** 40n)`, `float(1.5)`, `double(3)`, `strings(['a', 'b'])`, `string['a']`, `bools([true])`, `dictionary('byte', [[1, 'x']])`, `custom(code, bytes)`.

Values you receive are plain JavaScript again: numbers, `bigint` for int64, typed arrays, arrays, a plain object for a string-keyed hashtable and a `Map` for any other, and a `CustomValue` for custom types. Integer _width_ is not preserved on read (a `byte` reads as `5`).

## Rooms and players

`client.room` is the room you are in (or `null`). It is a live view: `room.players`, `room.playerCount`, `room.customProperties`, `room.isMasterClient` and the rest always reflect the current state, including from inside an event handler. The same `Room` object is returned by every join or create promise for as long as you stay in the room; after leaving, `room.isActive` is `false` and its getters throw.

Room mutators (`setOpen`, `setVisible`, `setMaxPlayers`, `setProperties`, `removeProperties`, `setLobbyProperties`, `setExpectedUsers`, `setMasterClient`) return whether the request was sent; the result arrives as an event. `setProperties(values, expected)` is a compare-and-swap.

`client.localPlayer` and `room.players` are snapshots (`{ number, name, userId, customProperties, isInactive, isMasterClient }`).

## Lifetime

```ts
client.dispose(); // stops the pump, rejects pending operations, frees the native client

// or, where `using` is available:
using client = await createRealtimeClient({ appId, appVersion });
```

`dispose()` may be called from inside an event handler. Pending operations reject with a `RealtimeError` of code `disconnected`, except a pending `disconnect()`, which resolves, because disposing disconnects the client. A client that is dropped without `dispose()` is cleaned up eventually by the garbage collector, but only when its pump is not running; disposing explicitly is the reliable way.

## Bundlers and the `.wasm` file

The package ships `realtimecore.mjs` (the loader) and `realtimecore.wasm` next to each other, and the loader finds the `.wasm` through `import.meta.url`. Vite, webpack 5, Rollup and esbuild all understand that pattern and emit the file as an asset; nothing to configure. If your setup serves it elsewhere:

```ts
import wasmUrl from '@photonengine/realtime-core/realtimecore.wasm?url'; // Vite-style asset import
await createRealtimeClient({ appId, appVersion, wasm: { url: wasmUrl } });

// or hand over the bytes yourself (strict CSP, custom caching)
const binary = await (await fetch('/static/realtimecore.wasm')).arrayBuffer();
await createRealtimeClient({ appId, appVersion, wasm: { binary } });
```

The module contains no `eval` or `new Function`, so it loads under a strict Content Security Policy. Only the first client's `wasm` option is used: one module instance serves every client in the page.

## Node.js

Install `ws` (see above). Everything else is identical. A connected client keeps the process alive through its pump, `dispose()` lets the process exit.

## Versions

`getVersion()` resolves to `{ native, protocol }`: the Realtime Core version compiled into the module and the Photon protocol version it speaks.
