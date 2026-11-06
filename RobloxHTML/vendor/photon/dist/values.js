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
export const ValueType = {
    Null: 0,
    Bool: 1,
    Byte: 2,
    Int16: 3,
    Int32: 4,
    Int64: 5,
    Float: 6,
    Double: 7,
    String: 8,
    ByteArray: 9,
    Int16Array: 10,
    Int32Array: 11,
    Int64Array: 12,
    FloatArray: 13,
    DoubleArray: 14,
    BoolArray: 15,
    StringArray: 16,
    Array: 17,
    Map: 18,
    Dictionary: 19,
    Custom: 20,
};
/**
 * A value with an explicit wire type, produced by {@link byte}, {@link int16}, {@link float}
 * and the other helpers. Passes straight through to the native bridge as `{ __rt, v }`.
 */
export class TaggedValue {
    __rt;
    v;
    keyType;
    /** @internal Use the helper functions. */
    constructor(tag, value, keyType) {
        this.__rt = tag;
        this.v = value;
        if (keyType !== undefined) {
            this.keyType = keyType;
        }
    }
    /**
     * The value inside the tag, so a tagged number behaves like its number in arithmetic and
     * comparisons: `int32(5) * 2` is `10` rather than `NaN`.
     *
     * A tag is a *write-side* annotation -- something you hand to a property bag, not something
     * you compute with -- but nothing stops a caller from holding one, and silently poisoning
     * their arithmetic is a poor way to tell them. Identity is still object identity
     * (`int32(5) === 5` is `false`), and reads never produce a tag in the first place.
     */
    valueOf() {
        return this.v;
    }
}
/**
 * A Photon custom type: an application-defined type code (1..254) plus its serialized bytes.
 * Received custom values arrive as instances of this class; send one with {@link custom}.
 */
export class CustomValue {
    __rt = 'custom';
    code;
    v;
    constructor(code, data) {
        if (!Number.isInteger(code) || code < 1 || code > 254) {
            throw new RangeError(`custom: type code must be an integer 1..254, got ${String(code)}`);
        }
        if (!(data instanceof Uint8Array)) {
            throw new TypeError(`custom: data must be a Uint8Array, got ${describe(data)}`);
        }
        this.code = code;
        this.v = data;
    }
    /** The serialized bytes. */
    get data() {
        return this.v;
    }
}
// ---- helpers -------------------------------------------------------------------------------
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const INT64_MIN = -(2n ** 63n);
const INT64_MAX = 2n ** 63n - 1n;
/**
 * A boolean.
 *
 * A plain `true` / `false` already infers to Photon's Bool, so this exists for symmetry with the
 * numeric helpers -- and so that a caller building a value up from typed pieces can be explicit
 * about every one of them.
 */
export function bool(value) {
    if (typeof value !== 'boolean') {
        throw new TypeError(`bool: expected a boolean, got ${describe(value)}`);
    }
    return new TaggedValue('bool', value);
}
/** An unsigned 8-bit integer (0..255). */
export function byte(value) {
    requireInteger('byte', value, 0, 255);
    return new TaggedValue('byte', value);
}
/** A signed 16-bit integer. */
export function int16(value) {
    requireInteger('int16', value, -32768, 32767);
    return new TaggedValue('int16', value);
}
/** A signed 32-bit integer (what an integer-valued `number` infers to anyway; use it to be explicit). */
export function int32(value) {
    requireInteger('int32', value, INT32_MIN, INT32_MAX);
    return new TaggedValue('int32', value);
}
/** A signed 64-bit integer, from a `bigint` or a safe-integer `number`. Reads back as `bigint`. */
export function int64(value) {
    if (typeof value === 'bigint') {
        if (value < INT64_MIN || value > INT64_MAX) {
            throw new RangeError(`int64: ${value}n is outside the int64 range`);
        }
    }
    else if (!Number.isSafeInteger(value)) {
        throw new RangeError(`int64: ${String(value)} is not a safe integer; pass a bigint for values beyond 2^53`);
    }
    return new TaggedValue('int64', value);
}
/** A 32-bit float. */
export function float(value) {
    requireNumber('float', value);
    return new TaggedValue('float', value);
}
/** A 64-bit double (what a fractional `number` infers to anyway; use it to force a double for an integer). */
export function double(value) {
    requireNumber('double', value);
    return new TaggedValue('double', value);
}
/** A Photon `string[]` (a plain JS array of strings would be sent as an object array). */
export function strings(values) {
    requireArrayOf('strings', values, (v) => typeof v === 'string', 'strings');
    return new TaggedValue('stringArray', [...values]);
}
/** A Photon `bool[]` (a plain JS array of booleans would be sent as an object array). */
export function bools(values) {
    requireArrayOf('bools', values, (v) => typeof v === 'boolean', 'booleans');
    return new TaggedValue('boolArray', [...values]);
}
/**
 * A Photon typed dictionary: every key has the same wire type. Reads back as a `Map`.
 * Numeric keys are given as `number` (or `bigint` for `int64`) and coerced to `keyType`.
 */
export function dictionary(keyType, entries) {
    const map = entries instanceof Map || Symbol.iterator in entries
        ? new Map(entries)
        : new Map(Object.entries(entries));
    return new TaggedValue('dictionary', map, keyType);
}
/** A Photon custom type; see {@link CustomValue}. */
export function custom(code, data) {
    return new CustomValue(code, data);
}
// ---- validation (mirrors the native conversion, so misuse fails here with a good message) ----
/**
 * Validates a value against the inference table and throws `TypeError` / `RangeError` naming
 * the offending path (`"$.props.pos[2]"`). The native bridge applies the same rules; running
 * them here first means a mistake fails synchronously with a readable message instead of a
 * logged conversion failure.
 *
 * @internal
 */
export function validateValue(value, path = '$') {
    switch (typeof value) {
        case 'undefined':
        case 'boolean':
        case 'number':
        case 'string':
            return;
        case 'bigint':
            if (value < INT64_MIN || value > INT64_MAX) {
                throw new RangeError(`RealtimeValue: bigint ${value}n at ${path} is outside the int64 range`);
            }
            return;
        case 'object':
            break;
        default:
            throw new TypeError(`RealtimeValue: unsupported value of type ${typeof value} at ${path}`);
    }
    if (value === null) {
        return;
    }
    if (value instanceof TaggedValue || value instanceof CustomValue) {
        validateTagged(value, path);
        return;
    }
    if (value instanceof Uint8Array ||
        value instanceof Int16Array ||
        value instanceof Int32Array ||
        value instanceof BigInt64Array ||
        value instanceof Float32Array ||
        value instanceof Float64Array) {
        return;
    }
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
        throw new TypeError(`RealtimeValue: ${describe(value)} at ${path} has no lossless Photon type; use Uint8Array, Int16Array, Int32Array, BigInt64Array, Float32Array or Float64Array`);
    }
    if (Array.isArray(value)) {
        value.forEach((element, i) => {
            validateValue(element, `${path}[${i}]`);
        });
        return;
    }
    if (value instanceof Map) {
        for (const [key, element] of value) {
            validateKey(key, path);
            validateValue(element, `${path}.${describeKey(key)}`);
        }
        return;
    }
    if (isPlainObject(value)) {
        for (const [key, element] of Object.entries(value)) {
            if (key === '__rt') {
                throw new TypeError(`RealtimeValue: "__rt" at ${path} is reserved for tagged values; use the byte()/int16()/... helpers instead of building tags by hand`);
            }
            validateValue(element, `${path}.${key}`);
        }
        return;
    }
    throw new TypeError(`RealtimeValue: unsupported value of type ${describe(value)} at ${path} (only plain objects, Maps, arrays, typed arrays, strings, numbers, bigints, booleans and null can be sent)`);
}
/**
 * Validates a string-keyed property bag (custom properties, filters, custom-operation
 * parameters). Accepts a plain object or a Map with string keys.
 *
 * @internal
 */
export function validateProperties(value, path = '$') {
    if (value instanceof Map) {
        for (const [key, element] of value) {
            if (typeof key !== 'string') {
                throw new TypeError(`RealtimeValue: property keys must be strings, got ${describe(key)} at ${path}`);
            }
            validateValue(element, `${path}.${key}`);
        }
        return;
    }
    if (!isPlainObject(value)) {
        throw new TypeError(`RealtimeValue: expected a plain object of properties, got ${describe(value)} at ${path}`);
    }
    validateValue(value, path);
}
function validateKey(key, path) {
    if (typeof key === 'string' || typeof key === 'number') {
        return;
    }
    if (typeof key === 'bigint') {
        if (key < INT64_MIN || key > INT64_MAX) {
            throw new RangeError(`RealtimeValue: bigint key ${key}n at ${path} is outside the int64 range`);
        }
        return;
    }
    if (key instanceof TaggedValue && isScalarTag(key.__rt)) {
        return;
    }
    throw new TypeError(`RealtimeValue: map keys must be string, number, bigint or a tagged scalar, got ${describe(key)} at ${path}`);
}
function validateTagged(value, path) {
    if (value instanceof CustomValue) {
        return; // validated by its constructor
    }
    const payload = value.v;
    switch (value.__rt) {
        case 'stringArray':
        case 'boolArray':
        case 'byte':
        case 'int16':
        case 'int32':
        case 'int64':
        case 'float':
        case 'double':
            return; // validated by the helper that built it
        case 'dictionary':
            for (const [key, element] of payload) {
                validateDictionaryKey(value.keyType, key, path);
                validateValue(element, `${path}.${describeKey(key)}`);
            }
            return;
        default:
            validateValue(payload, path);
    }
}
function validateDictionaryKey(keyType, key, path) {
    switch (keyType) {
        case 'string':
            if (typeof key !== 'string') {
                throw new TypeError(`RealtimeValue: dictionary key ${describe(key)} at ${path} is not a string`);
            }
            return;
        case 'int64':
            if (typeof key !== 'bigint' && !(typeof key === 'number' && Number.isSafeInteger(key))) {
                throw new TypeError(`RealtimeValue: dictionary key ${describe(key)} at ${path} is not a bigint or safe integer`);
            }
            return;
        case 'float':
        case 'double':
            if (typeof key !== 'number') {
                throw new TypeError(`RealtimeValue: dictionary key ${describe(key)} at ${path} is not a number`);
            }
            return;
        case 'byte':
            requireInteger('dictionary key', key, 0, 255, path);
            return;
        case 'int16':
            requireInteger('dictionary key', key, -32768, 32767, path);
            return;
        case 'int32':
            requireInteger('dictionary key', key, INT32_MIN, INT32_MAX, path);
            return;
        default:
            throw new TypeError(`RealtimeValue: unknown dictionary keyType ${String(keyType)} at ${path}`);
    }
}
// ---- reads ------------------------------------------------------------------------------------
/**
 * Post-processes a value produced by the native bridge. Native emits plain JS everywhere it
 * can; only a typed dictionary and a custom type come back as `{ __rt, ... }` objects, which
 * this turns into a `Map` and a {@link CustomValue}. Returns the very same reference when
 * nothing had to change, so the common case (numbers, strings, byte arrays, flat objects) is
 * one walk and no allocation.
 *
 * @internal
 */
export function fromNative(value) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    if (ArrayBuffer.isView(value)) {
        return value;
    }
    if (Array.isArray(value)) {
        const items = value;
        let changed;
        for (let i = 0; i < items.length; i++) {
            const converted = fromNative(items[i]);
            if (converted !== items[i]) {
                changed ??= [...items];
                changed[i] = converted;
            }
        }
        return (changed ?? items);
    }
    if (value instanceof Map) {
        let changed;
        for (const [key, element] of value) {
            const converted = fromNative(element);
            if (converted !== element) {
                changed ??= new Map(value);
                changed.set(key, converted);
            }
        }
        return (changed ?? value);
    }
    const record = value;
    if (typeof record['__rt'] === 'string') {
        if (record['__rt'] === 'custom') {
            return new CustomValue(record['code'], record['v']);
        }
        if (record['__rt'] === 'dictionary') {
            return fromNative(record['v']);
        }
        // A tagged scalar/array from a typed read: unwrap to the plain payload.
        return fromNative(record['v']);
    }
    let changed;
    for (const key of Object.keys(record)) {
        const converted = fromNative(record[key]);
        if (converted !== record[key]) {
            changed ??= { ...record };
            changed[key] = converted;
        }
    }
    return (changed ?? value);
}
/**
 * Post-processes a property bag read from native (always a plain object with string keys).
 *
 * @internal
 */
export function propertiesFromNative(value) {
    const converted = fromNative(value);
    if (converted instanceof Map) {
        return Object.fromEntries(converted);
    }
    return (converted ?? {});
}
// ---- small utilities --------------------------------------------------------------------------
function isScalarTag(tag) {
    return (tag === 'byte' ||
        tag === 'int16' ||
        tag === 'int32' ||
        tag === 'int64' ||
        tag === 'float' ||
        tag === 'double' ||
        tag === 'string');
}
/** @internal */
export function isPlainObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
/** @internal */
export function describe(value) {
    if (value === null) {
        return 'null';
    }
    if (typeof value !== 'object') {
        return typeof value;
    }
    if (Array.isArray(value)) {
        return 'Array';
    }
    const ctor = value.constructor;
    return typeof ctor?.name === 'string' && ctor.name !== '' ? ctor.name : 'object';
}
function describeKey(key) {
    if (typeof key === 'string') {
        return key;
    }
    if (key instanceof TaggedValue) {
        return `<${key.__rt} ${String(key.v)}>`;
    }
    return `<${String(key)}>`;
}
function requireNumber(helper, value) {
    if (typeof value !== 'number') {
        throw new TypeError(`${helper}: expected a number, got ${describe(value)}`);
    }
}
function requireInteger(helper, value, min, max, path) {
    const where = path === undefined ? '' : ` at ${path}`;
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new TypeError(`${helper}: expected an integer, got ${typeof value === 'number' ? String(value) : describe(value)}${where}`);
    }
    if (value < min || value > max) {
        throw new RangeError(`${helper}: ${String(value)} is outside ${String(min)}..${String(max)}${where}`);
    }
}
function requireArrayOf(helper, values, pred, kind) {
    if (!Array.isArray(values)) {
        throw new TypeError(`${helper}: expected an array of ${kind}, got ${describe(values)}`);
    }
    values.forEach((v, i) => {
        if (!pred(v)) {
            throw new TypeError(`${helper}: element ${String(i)} is ${describe(v)}, expected one of ${kind}`);
        }
    });
}
