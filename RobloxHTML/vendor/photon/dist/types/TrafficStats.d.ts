/** Low-level traffic counters for one direction, from {@link RealtimeClient.trafficStatsIncoming} and {@link RealtimeClient.trafficStatsOutgoing}. */
export interface TrafficStats {
    readonly packageHeaderSize: number;
    readonly reliableCommandCount: number;
    readonly unreliableCommandCount: number;
    readonly fragmentCommandCount: number;
    readonly controlCommandCount: number;
    readonly totalPacketCount: number;
    readonly totalCommandsInPackets: number;
    readonly reliableCommandBytes: number;
    readonly unreliableCommandBytes: number;
    readonly fragmentCommandBytes: number;
    readonly controlCommandBytes: number;
    readonly totalCommandCount: number;
    readonly totalCommandBytes: number;
    readonly totalPacketBytes: number;
    readonly timestampOfLastAck: number;
    readonly timestampOfLastReliableCommand: number;
}
