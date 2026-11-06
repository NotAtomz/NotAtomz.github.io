/** Game-level traffic counters, from {@link RealtimeClient.trafficStatsGameLevel}. */
export interface TrafficStatsGameLevel {
    readonly operationByteCount: number;
    readonly operationCount: number;
    readonly resultByteCount: number;
    readonly resultCount: number;
    readonly eventByteCount: number;
    readonly eventCount: number;
    readonly longestOpResponseCallbackMs: number;
    readonly longestOpResponseCallbackOpCode: number;
    readonly longestEventCallbackMs: number;
    readonly longestEventCallbackCode: number;
    readonly longestDeltaBetweenDispatchingMs: number;
    readonly longestDeltaBetweenSendingMs: number;
    readonly dispatchIncomingCommandsCalls: number;
    readonly sendOutgoingCommandsCalls: number;
    readonly totalByteCount: number;
    readonly totalMessageCount: number;
    readonly totalIncomingByteCount: number;
    readonly totalIncomingMessageCount: number;
    readonly totalOutgoingByteCount: number;
    readonly totalOutgoingMessageCount: number;
}
