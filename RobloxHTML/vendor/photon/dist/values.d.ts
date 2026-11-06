/**
 * Values that travel over the wire: custom properties, event payloads, matchmaking filters.
 *
 * Photon's wire format is typed (byte, int16, int32, int64, float, double, typed arrays,
 * hashtables with typed keys), JavaScript's values are not. The bridge infers the wire type
 * from the JS type and lets you override the inference with a small tag where it matters
 * (a Unity peer reading `props.hp` as `byte`, say). Reads always come back as plain JS
 * values.
 *
 * ## Inference (JS -> wire)
 *
 * | JavaScript                                         | Wire type                 |
 * |----------------------------------------------------|---------------------------|
 * | `null`, `undefined`                                | Null                      |
 * | `boolean`                                          | Bool                      |
 * | integer `number` within int32                      | Int32                     |
 * | any other `number` (fraction, NaN, out of range)   | Double                    |
 * | `bigint`                                           | Int64                     |
 * | `string`                                           | String                    |
 * | `Uint8Array`                                       | ByteArray                 |
 * | `Int16Array` / `Int32Array` / `BigInt64Array`      | Int16Array / Int32Array / Int64Array |
 * | `Float32Array` / `Float64Array`                    | FloatArray / DoubleArray  |
 * | `Array`                                            | Array (of inferred elements, always) |
 * | plain object                                       | Map with string keys      |
 * | `Map`                                              | Map with inferred keys    |
 * | {@link bool}, {@link byte}, {@link int16}, ...     | exactly that type         |
 *
 * A JS `Array` is always a Photon *object array*, even when every element is a string or
 * a boolean, because the wire type of a value must not change with its content (`[]` would
 * be ambiguous). Use {@link strings} / {@link bools} for a Photon `string[]` / `bool[]`.
 *
 * ## Reads (wire -> JS)
 *
 * Byte/Int16/Int32/Float/Double become `number`, Int64 becomes `bigint`, typed arrays map
 * one to one, `bool[]`/`string[]` become plain arrays, a hashtable whose keys are all
 * strings becomes a plain object and any other hashtable a `Map`, a typed dictionary
 * becomes a `Map`, and a custom type becomes a {@link CustomValue}. Integer *width* is
 * intentionally not preserved on read (a `byte` reads as `5`, not `byte(5)`).
 *
 * @module
 */
/** Wire type identifiers, equal to the native `ValueType` enumeration. */
export declare const ValueType: {
    readonly Null: 0;
    readonly Bool: 1;
    readonly Byte: 2;
    readonly Int16: 3;
    readonly Int32: 4;
    readonly Int64: 5;
    readonly Float: 6;
    readonly Double: 7;
    readonly String: 8;
    readonly ByteArray: 9;
    readonly Int16Array: 10;
    readonly Int32Array: 11;
    readonly Int64Array: 12;
    readonly FloatArray: 13;
    readonly DoubleArray: 14;
    readonly BoolArray: 15;
    readonly StringArray: 16;
    readonly Array: 17;
    readonly Map: 18;
    readonly Dictionary: 19;
    readonly Custom: 20;
};
export type ValueType = (typeof ValueType)[keyof typeof ValueType];
/** Tags understood by the native bridge. The `__rt` / `v` field names are the wire contract. */
export type ValueTag = 'null' | 'bool' | 'byte' | 'int16' | 'int32' | 'int64' | 'float' | 'double' | 'string' | 'byteArray' | 'int16Array' | 'int32Array' | 'int64Array' | 'floatArray' | 'doubleArray' | 'boolArray' | 'stringArray' | 'array' | 'map' | 'dictionary' | 'custom';
/** Key types a Photon typed dictionary can use. */
export type DictionaryKeyType = 'byte' | 'int16' | 'int32' | 'int64' | 'float' | 'double' | 'string';
/**
 * A value with an explicit wire type, produced by {@link byte}, {@link int16}, {@link float}
 * and the other helpers. Passes straight through to the native bridge as `{ __rt, v }`.
 */
export declare class TaggedValue<Tag extends ValueTag = ValueTag> {
    readonly __rt: Tag;
    readonly v: unknown;
    readonly keyType?: DictionaryKeyType;
    /**
     * The value inside the tag, so a tagged number behaves like its number in arithmetic and
     * comparisons: `int32(5) * 2` is `10` rather than `NaN`.
     *
     * A tag is a *write-side* annotation -- something you hand to a property bag, not something
     * you compute with -- but nothing stops a caller from holding one, and silently poisoning
     * their arithmetic is a poor way to tell them. Identity is still object identity
     * (`int32(5) === 5` is `false`), and reads never produce a tag in the first place.
     */
    valueOf(): unknown;
}
/**
 * A Photon custom type: an application-defined type code (1..254) plus its serialized bytes.
 * Received custom values arrive as instances of this class; send one with {@link custom}.
 */
export declare class CustomValue {
    readonly __rt: "custom";
    readonly code: number;
    readonly v: Uint8Array;
    constructor(code: number, data: Uint8Array);
    /** The serialized bytes. */
    get data(): Uint8Array;
}
/** Anything accepted as a hashtable key. */
export type RealtimeKey = string | number | bigint | TaggedValue<'byte' | 'int16' | 'int32' | 'int64' | 'float' | 'double' | 'string'>;
/**
 * Anything that can be sent as a custom property, event payload or filter, and everything a
 * read can produce.
 */
export type RealtimeValue = null | undefined | boolean | number | bigint | string | Uint8Array | Int16Array | Int32Array | BigInt64Array | Float32Array | Float64Array | readonly RealtimeValue[] | {
    readonly [key: string]: RealtimeValue;
} | ReadonlyMap<RealtimeKey, RealtimeValue> | TaggedValue | CustomValue;
/** A string-keyed bag of values: custom properties, matchmaking filters, custom-operation parameters. */
export type Properties = Readonly<Record<string, RealtimeValue>>;
/**
 * A boolean.
 *
 * A plain `true` / `false` already infers to Photon's Bool, so this exists for symmetry with the
 * numeric helpers -- and so that a caller building a value up from typed pieces can be explicit
 * about every one of them.
 */
export declare function bool(value: boolean): TaggedValue<'bool'>;
/** An unsigned 8-bit integer (0..255). */
export declare function byte(value: number): TaggedValue<'byte'>;
/** A signed 16-bit integer. */
export declare function int16(value: number): TaggedValue<'int16'>;
/** A signed 32-bit integer (what an integer-valued `number` infers to anyway; use it to be explicit). */
export declare function int32(value: number): TaggedValue<'int32'>;
/** A signed 64-bit integer, from a `bigint` or a safe-integer `number`. Reads back as `bigint`. */
export declare function int64(value: number | bigint): TaggedValue<'int64'>;
/** A 32-bit float. */
export declare function float(value: number): TaggedValue<'float'>;
/** A 64-bit double (what a fractional `number` infers to anyway; use it to force a double for an integer). */
export declare function double(value: number): TaggedValue<'double'>;
/** A Photon `string[]` (a plain JS array of strings would be sent as an object array). */
export declare function strings(values: readonly string[]): TaggedValue<'stringArray'>;
/** A Photon `bool[]` (a plain JS array of booleans would be sent as an object array). */
export declare function bools(values: readonly boolean[]): TaggedValue<'boolArray'>;
/**
 * A Photon typed dictionary: every key has the same wire type. Reads back as a `Map`.
 * Numeric keys are given as `number` (or `bigint` for `int64`) and coerced to `keyType`.
 */
export declare function dictionary(keyType: DictionaryKeyType, entries: Iterable<readonly [RealtimeKey, RealtimeValue]> | Properties): TaggedValue<'dictionary'>;
/** A Photon custom type; see {@link CustomValue}. */
export declare function custom(code: number, data: Uint8Array): CustomValue;
