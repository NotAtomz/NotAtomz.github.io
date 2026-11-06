/** A region offered by the name server. */
export interface RegionInfo {
    /** Region code, e.g. `"eu"`, `"us"`, `"asia"`. */
    readonly code: string;
    /** Master server address of the region. */
    readonly server: string;
}
