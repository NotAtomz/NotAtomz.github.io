/** Connection statistics, from {@link RealtimeClient.stats}. */
export interface NetworkStats {
    readonly roundTripTimeMs: number;
    readonly rttVarianceMs: number;
    readonly bytesIn: number;
    readonly bytesOut: number;
    readonly bytesCurrentDispatch: number;
    readonly bytesLastOperation: number;
    readonly queuedIncomingCommands: number;
    readonly queuedOutgoingCommands: number;
    readonly incomingReliableCommands: number;
    readonly resentReliableCommands: number;
    readonly playersInGame: number;
    readonly gamesRunning: number;
    readonly playersOnline: number;
    readonly serverTimeOffsetMs: number;
    readonly serverTimeMs: number;
    readonly timestampLastReceive: number;
    readonly packetLossByCrc: number;
    readonly sentCountAllowance: number;
    readonly encryptionAvailable: boolean;
    readonly payloadEncryptionAvailable: boolean;
    readonly peerId: number;
    readonly disconnectTimeoutMs: number;
    readonly pingIntervalMs: number;
    readonly trafficStatsElapsedMs: number;
    readonly masterServerAddress: string;
    readonly channelCountUserChannels: number;
    readonly peerCount: number;
}
