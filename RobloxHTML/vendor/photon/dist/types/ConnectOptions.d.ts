import type { AuthenticationValues } from './AuthenticationValues.js';
/**
 * Options for {@link RealtimeClient.connect}. Mirrors the native `ConnectOptions`, minus
 * `useBackgroundSendReceiveThread`: the web build has no threads.
 */
export interface ConnectOptions {
    readonly auth?: AuthenticationValues;
    /** Display name of the local player (also settable later with {@link RealtimeClient.setPlayerName}). */
    readonly username?: string;
    /** Name server or master server address. Empty means the Photon Cloud default. */
    readonly serverAddress?: string;
    /** Ask for datagram-level encryption when the server supports it. */
    readonly tryUseDatagramEncryption?: boolean;
}
