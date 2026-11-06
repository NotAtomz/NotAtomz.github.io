// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface SubscriptionHandle extends ClassHandle {
  unsubscribe(): void;
  isSubscribed(): boolean;
}

export interface Client extends ClassHandle {
  service(_0: boolean): void;
  serviceBasic(): void;
  sendOutgoingCommands(): boolean;
  sendAcksOnly(): boolean;
  dispatchIncomingCommand(): boolean;
  connect(_0: any): any;
  disconnect(): any;
  reconnect(): any;
  availableRegions(): any;
  selectRegion(_0: EmbindString): any;
  joinLobby(_0: EmbindString, _1: number): any;
  leaveLobby(): any;
  getLobbyStats(): any;
  getRoomList(_0: EmbindString, _1: EmbindString): any;
  createRoom(_0: EmbindString, _1: any): any;
  joinRoom(_0: EmbindString, _1: any): any;
  joinOrCreateRoom(_0: EmbindString, _1: any, _2: any): any;
  joinRandomRoom(_0: any): any;
  joinRandomOrCreateRoom(_0: any, _1: any): any;
  leaveRoom(_0: boolean): any;
  findFriends(_0: any): any;
  getState(): number;
  isConnected(): boolean;
  isInRoom(): boolean;
  isInLobby(): boolean;
  getDisconnectCause(): number;
  getBestRegion(): string;
  getUserId(): string;
  getServerTime(): number;
  getMasterServerAddress(): string;
  getLocalPlayer(): any;
  getCurrentRoom(): any;
  getCachedRoomList(): any;
  getFriendList(): any;
  getFriendListAge(): number;
  getStats(): any;
  getTrafficStatsIncoming(): any;
  getTrafficStatsOutgoing(): any;
  getTrafficStatsGameLevel(): any;
  setPlayerName(_0: EmbindString): void;
  setPlayerProperties(_0: any): boolean;
  removePlayerProperties(_0: any): boolean;
  setRoomOpen(_0: boolean): boolean;
  setRoomVisible(_0: boolean): boolean;
  setRoomMaxPlayers(_0: number): boolean;
  setRoomProperties(_0: any, _1: any): boolean;
  removeRoomProperties(_0: any): boolean;
  setRoomLobbyProperties(_0: any): boolean;
  setRoomExpectedUsers(_0: any): boolean;
  setMasterClient(_0: number): boolean;
  sendEvent(_0: number, _1: any, _2: any): boolean;
  sendDirect(_0: any, _1: any): number;
  changeGroups(_0: any, _1: any): boolean;
  sendCustomAuthData(_0: any): boolean;
  setAutoJoinLobby(_0: boolean): void;
  fetchServerTimestamp(): void;
  setTrafficStatsEnabled(_0: boolean): void;
  resetTrafficStats(): void;
  resetTrafficStatsMaximumCounters(): void;
  getVitalStatsToString(_0: boolean): string;
  setDisconnectTimeout(_0: number): void;
  getDisconnectTimeout(): number;
  setPingInterval(_0: number): void;
  getPingInterval(): number;
  setSentCountAllowance(_0: number): void;
  getSentCountAllowance(): number;
  setQuickResendAttempts(_0: number): void;
  getQuickResendAttempts(): number;
  setCrcEnabled(_0: boolean): void;
  getCrcEnabled(): boolean;
  setLimitOfUnreliableCommands(_0: number): void;
  getLimitOfUnreliableCommands(): number;
  on(_0: EmbindString, _1: any): SubscriptionHandle;
  onEvent(_0: number, _1: number, _2: boolean, _3: any): SubscriptionHandle;
  dispose(): boolean;
  isDisposed(): boolean;
}

interface EmbindModule {
  SubscriptionHandle: {};
  Client: {
    new(_0: any): Client;
  };
  version(): string;
  protocolVersion(): string;
  enums(): any;
  setLogSink(_0: any): void;
  setLogLevelMask(_0: number): void;
}

export type MainModule = WasmModule & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
