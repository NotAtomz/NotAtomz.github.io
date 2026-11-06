/** Presence of a friend, from {@link RealtimeClient.findFriends}. */
export interface FriendInfo {
    readonly userId: string;
    readonly isOnline: boolean;
    /** The room the friend is in, if any. */
    readonly roomName: string;
    readonly isInRoom: boolean;
}
