import type { CustomAuthenticationType } from '../enums.js';
import type { Properties } from '../values.js';
/** Authentication for {@link RealtimeClient.connect}. Mirrors the native `AuthenticationValues`. */
export interface AuthenticationValues {
    /** The user id this client authenticates as. Optional for anonymous authentication. */
    readonly userId?: string;
    /** Which provider verifies the credentials. Default: `none`. */
    readonly type?: CustomAuthenticationType;
    /** Query-string style parameters forwarded to the provider (`"token=abc&x=y"`). */
    readonly parameters?: string;
    /** Payload forwarded to the provider: raw bytes, a string, or a property bag. */
    readonly data?: Uint8Array | string | Properties;
}
