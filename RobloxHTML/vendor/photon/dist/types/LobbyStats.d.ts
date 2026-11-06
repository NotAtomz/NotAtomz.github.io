import type { LobbyType } from '../enums.js';
/** Statistics of one lobby. */
export interface LobbyStats {
    readonly name: string;
    readonly type: LobbyType;
    readonly peerCount: number;
    readonly roomCount: number;
}
