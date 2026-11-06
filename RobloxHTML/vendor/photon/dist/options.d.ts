/**
 * Option normalization: the public option objects (optional fields, string enums) become the
 * fully populated shapes the native module reads (every field present, enums as numbers,
 * defaults filled in). This is the one place where `exactOptionalPropertyTypes` meets
 * embind, and the place where a misuse fails synchronously with a readable TypeError before
 * anything crosses into wasm.
 *
 * The `Native*` interfaces are half of the embind contract; the other half is the C++
 * `OptionsBridge`, which reads exactly these field names.
 *
 * @internal
 * @module
 */
import type { AuthenticationValues, ClientOptions, ConnectOptions, CreateRoomOptions, DirectMessageOptions, EventOptions, JoinRoomOptions, MatchmakingOptions } from './types/index.js';
import { type Properties } from './values.js';
export interface NativeClientOptions {
    appId: string;
    appVersion: string;
    protocol: number;
    useAlternativePorts: boolean;
    regionSelection: number;
    autoLobbyStats: boolean;
    disconnectTimeoutMs: number;
    pingIntervalMs: number;
    enableCrc: boolean;
    sentCountAllowance: number;
    quickResendAttempts: number;
    limitOfUnreliableCommands: number;
}
export interface NativeAuthenticationValues {
    userId: string;
    type: number;
    parameters: string;
    /** `null`, a Uint8Array, a string, or a string-keyed property bag. */
    data: null | Uint8Array | string | Properties;
}
export interface NativeConnectOptions {
    auth: NativeAuthenticationValues;
    username: string;
    serverAddress: string;
    tryUseDatagramEncryption: boolean;
}
export interface NativeCreateRoomOptions {
    isVisible: boolean;
    isOpen: boolean;
    maxPlayers: number;
    customProperties: Properties;
    lobbyProperties: string[];
    lobbyName: string;
    lobby: number;
    playerTtlMs: number;
    emptyRoomTtlMs: number;
    suppressRoomEvents: boolean;
    publishUserId: boolean;
    directMessaging: number;
    plugins: string[];
    expectedUsers: string[];
}
export interface NativeJoinRoomOptions {
    rejoin: boolean;
    expectedUsers: string[];
}
export interface NativeMatchmakingOptions {
    filter: Properties;
    maxPlayers: number;
    mode: number;
    lobbyName: string;
    lobby: number;
    sqlFilter: string;
    expectedUsers: string[];
}
export interface NativeEventOptions {
    reliable: boolean;
    channel: number;
    receivers: number;
    targetPlayers: number[];
    interestGroup: number;
    caching: number;
    encrypt: boolean;
}
export interface NativeDirectMessageOptions {
    targetPlayers: number[];
    receivers: number;
    fallbackRelay: boolean;
}
export declare function normalizeClientOptions(options: ClientOptions): NativeClientOptions;
export declare function normalizeAuthenticationValues(auth: AuthenticationValues | undefined, path?: string): NativeAuthenticationValues;
export declare function normalizeConnectOptions(options: ConnectOptions | undefined): NativeConnectOptions;
export declare function normalizeCreateRoomOptions(options: CreateRoomOptions | undefined, path?: string): NativeCreateRoomOptions;
export declare function normalizeJoinRoomOptions(options: JoinRoomOptions | undefined, path?: string): NativeJoinRoomOptions;
export declare function normalizeMatchmakingOptions(options: MatchmakingOptions | undefined, path?: string): NativeMatchmakingOptions;
export declare function normalizeEventOptions(options: EventOptions | undefined, path?: string): NativeEventOptions;
export declare function normalizeDirectMessageOptions(options: DirectMessageOptions | undefined, path?: string): NativeDirectMessageOptions;
export declare function expectObject(name: string, value: unknown): asserts value is object;
export declare function expectString(name: string, value: unknown): string;
export declare function expectNonEmptyString(name: string, value: unknown): string;
export declare function expectBoolean(name: string, value: unknown): boolean;
export declare function expectInt(name: string, value: unknown, min?: number, max?: number): number;
export declare function expectByte(name: string, value: unknown): number;
export declare function expectStringArray(name: string, value: unknown): string[];
export declare function expectIntArray(name: string, value: unknown, min?: number, max?: number): number[];
export declare function expectProperties(name: string, value: unknown): Properties;
export declare function expectUint8Array(name: string, value: unknown): Uint8Array;
