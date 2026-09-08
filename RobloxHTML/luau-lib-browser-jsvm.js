/*
 * Blox Emulation - browser-native Luau/Lua runtime
 * -------------------------------------------------
 * Pure JavaScript execution engine. No WebAssembly, no luau-web, no Asyncify,
 * no JSPI, and no remote imports.
 *
 * This intentionally preserves the tiny public surface used by emulator.html:
 *   - Mutable(value)
 *   - await LuauState.createAsync(globals)
 *   - state.loadstring(source, chunkName, throwOnError)
 *
 * It is designed for classic Roblox-era Lua/Luau scripts and includes:
 * lexical scopes, closures, multiple returns, tables/metatables, varargs,
 * if/elseif/else, while/repeat/for/generic-for, break/continue, functions,
 * method calls, pcall/xpcall, coroutine primitives, wait/spawn/delay/task,
 * Promise-aware host calls, a bounded cooperative scheduler, RunService frame
 * signals, and a per-resume watchdog for non-yielding loops.
 */

const BLOX_PURE_JS_VM = true;
const LUA_INTERNAL = Symbol("blox.lua.internal");
const LUA_NATIVE = Symbol("blox.lua.native");
const LUA_TABLE = Symbol("blox.lua.table");
const LUA_THREAD = Symbol("blox.lua.thread");
const LUA_ITERATOR = Symbol("blox.lua.iterator");
const MUTABLE_MARK = Symbol("blox.mutable");

const DEFAULT_WAIT = 1 / 30;
const DEFAULT_MAX_STEPS = 350000;
const DEFAULT_MAX_WALL_MS = 100;
const DEFAULT_MAX_THREADS = 4096;
const DEFAULT_MAX_RESUMES = 512;

class CompileError extends Error {
    constructor(message, line = null, chunk = "Luau") {
        super(line == null ? String(message) : `${chunk}:${line}: ${message}`);
        this.name = "CompileError";
        this.line = line;
        this.chunk = chunk;
    }
}

class LuaRuntimeError extends Error {
    constructor(message, node = null, chunk = "Luau") {
        const line = node?.line ?? null;
        super(line == null ? String(message) : `${chunk}:${line}: ${message}`);
        this.name = "LuaRuntimeError";
        this.line = line;
        this.chunk = chunk;
    }
}

class ReturnSignal {
    constructor(values) { this.values = values; }
}
class BreakSignal {}
class ContinueSignal {}

class MultiReturn {
    constructor(values = []) { this.values = values; }
}

function LuaMultiReturn(...values) {
    if (values.length === 1 && Array.isArray(values[0]))
        values = values[0];
    return new MultiReturn(values);
}

class SuspendRequest {
    constructor(kind, data = {}) {
        this.kind = kind;
        Object.assign(this, data);
    }
}

function isPromise(value) {
    return !!value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
}

function nowSeconds() {
    return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
}

function nowMillis() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function luaTruthy(v) {
    return v !== false && v !== null && v !== undefined;
}

function luaType(v) {
    if (v === null || v === undefined) return "nil";
    if (v instanceof LuaTable) return "table";
    if (v?.[LUA_THREAD]) return "thread";
    if (typeof v === "boolean") return "boolean";
    if (typeof v === "number") return "number";
    if (typeof v === "string") return "string";
    if (typeof v === "function") return "function";
    return "table";
}

function unwrapSingle(v) {
    return v instanceof MultiReturn ? v.values[0] : v;
}

function asValues(v) {
    if (v instanceof MultiReturn) return v.values;
    return [v];
}

function normalizeKey(k) {
    if (typeof k === "number" && Object.is(k, -0)) return 0;
    return k;
}

function isVectorLike(v) {
    return !!v && typeof v === "object" &&
        typeof v.X === "number" && typeof v.Y === "number" && typeof v.Z === "number" &&
        !("_qx" in v) && !("_rx" in v);
}

function makeVector3(x = 0, y = 0, z = 0) {
    const v = {
        X: Number(x) || 0,
        Y: Number(y) || 0,
        Z: Number(z) || 0,
    };
    Object.defineProperty(v, "__bloxType", { value: "Vector3", enumerable: false });
    return v;
}

function vectorMagnitude(v) {
    return Math.hypot(v.X, v.Y, v.Z);
}

function vectorUnit(v) {
    const m = vectorMagnitude(v);
    return m <= 1e-12 ? makeVector3(0, 0, 0) : makeVector3(v.X / m, v.Y / m, v.Z / m);
}

function isColorLike(v) {
    return !!v && typeof v === "object" && typeof v.R === "number" && typeof v.G === "number" && typeof v.B === "number";
}

function isCFrameLike(v) {
    return !!v && typeof v === "object" &&
        typeof v.X === "number" && typeof v.Y === "number" && typeof v.Z === "number" &&
        (("_qx" in v && "_qw" in v) || ("_rx" in v && "_ry" in v && "_rz" in v));
}

class LuaTable {
    constructor(runtime = null) {
        this[LUA_TABLE] = true;
        this.runtime = runtime;
        this.map = new Map();
        this.metatable = null;
    }
    rawGet(key) { return this.map.get(normalizeKey(key)); }
    rawHas(key) { return this.map.has(normalizeKey(key)); }
    rawSet(key, value) {
        key = normalizeKey(key);
        if (value === null || value === undefined) this.map.delete(key);
        else this.map.set(key, value);
        return this;
    }
    length() {
        let n = 0;
        while (this.map.has(n + 1)) n++;
        return n;
    }
}

class Environment {
    constructor(parent = null, values = null) {
        this.parent = parent;
        this.values = values instanceof Map ? values : new Map();
    }
    hasLocal(name) { return this.values.has(name); }
    has(name) { return this.values.has(name) || !!this.parent?.has(name); }
    get(name) {
        if (this.values.has(name)) return this.values.get(name);
        return this.parent ? this.parent.get(name) : undefined;
    }
    define(name, value) { this.values.set(name, value); return value; }
    set(name, value) {
        if (this.values.has(name)) { this.values.set(name, value); return value; }
        if (this.parent && this.parent.has(name)) return this.parent.set(name, value);
        let root = this;
        while (root.parent) root = root.parent;
        root.values.set(name, value);
        return value;
    }
}

class Lexer {
    constructor(source, chunk = "Luau") {
        this.source = String(source ?? "");
        this.chunk = chunk;
        this.i = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
        this.keywords = new Set([
            "and","break","continue","do","else","elseif","end","false","for","function",
            "if","in","local","nil","not","or","repeat","return","then","true","until","while",
            "type","export"
        ]);
    }
    peek(n = 0) { return this.source[this.i + n] ?? ""; }
    advance() {
        const c = this.source[this.i++] ?? "";
        if (c === "\n") { this.line++; this.col = 1; } else this.col++;
        return c;
    }
    starts(s) { return this.source.startsWith(s, this.i); }
    token(type, value, line, col) { this.tokens.push({ type, value, line, col }); }
    error(msg) { throw new CompileError(msg, this.line, this.chunk); }
    scanLongBracket() {
        if (this.peek() !== "[") return null;
        let j = this.i + 1;
        let eq = 0;
        while (this.source[j] === "=") { eq++; j++; }
        if (this.source[j] !== "[") return null;
        const openLen = 2 + eq;
        const close = "]" + "=".repeat(eq) + "]";
        const startLine = this.line;
        for (let k = 0; k < openLen; k++) this.advance();
        let text = "";
        if (this.peek() === "\n") this.advance();
        while (this.i < this.source.length && !this.starts(close)) text += this.advance();
        if (!this.starts(close)) throw new CompileError("unfinished long string/comment", startLine, this.chunk);
        for (let k = 0; k < close.length; k++) this.advance();
        return text;
    }
    scanString(quote) {
        const line = this.line, col = this.col;
        this.advance();
        let out = "";
        while (this.i < this.source.length) {
            const c = this.advance();
            if (c === quote) return { value: out, line, col };
            if (c === "\n" || c === "") throw new CompileError("unfinished string", line, this.chunk);
            if (c !== "\\") { out += c; continue; }
            const e = this.advance();
            const escapes = { a:"\x07", b:"\b", f:"\f", n:"\n", r:"\r", t:"\t", v:"\v", "\\":"\\", "\"":"\"", "'":"'" };
            if (e in escapes) { out += escapes[e]; continue; }
            if (e === "z") {
                while (/\s/.test(this.peek())) this.advance();
                continue;
            }
            if (e === "x") {
                const h = this.advance() + this.advance();
                if (!/^[0-9a-fA-F]{2}$/.test(h)) throw new CompileError("invalid hex escape", this.line, this.chunk);
                out += String.fromCharCode(parseInt(h, 16));
                continue;
            }
            if (/\d/.test(e)) {
                let d = e;
                for (let k = 0; k < 2 && /\d/.test(this.peek()); k++) d += this.advance();
                out += String.fromCharCode(Math.min(255, parseInt(d, 10)));
                continue;
            }
            if (e === "\n") continue;
            out += e;
        }
        throw new CompileError("unfinished string", line, this.chunk);
    }
    scanBacktick() {
        const line = this.line, col = this.col;
        this.advance();
        let out = "";
        while (this.i < this.source.length) {
            const c = this.advance();
            if (c === "`") return { value: out, line, col };
            if (c === "\\") { out += this.advance(); continue; }
            // For classic scripts, preserve interpolation text literally rather than
            // silently executing JavaScript-like interpolation.
            out += c;
        }
        throw new CompileError("unfinished interpolated string", line, this.chunk);
    }
    scanNumber() {
        const line = this.line, col = this.col;
        const start = this.i;
        if (this.starts("0x") || this.starts("0X")) {
            this.advance(); this.advance();
            while (/[0-9a-fA-F_]/.test(this.peek())) this.advance();
            const raw = this.source.slice(start, this.i).replaceAll("_", "");
            return { value: Number.parseInt(raw.slice(2), 16), line, col };
        }
        if (this.starts("0b") || this.starts("0B")) {
            this.advance(); this.advance();
            while (/[01_]/.test(this.peek())) this.advance();
            const raw = this.source.slice(start, this.i).replaceAll("_", "");
            return { value: Number.parseInt(raw.slice(2), 2), line, col };
        }
        let seenDot = false;
        while (/[0-9_]/.test(this.peek())) this.advance();
        if (this.peek() === "." && this.peek(1) !== ".") {
            seenDot = true; this.advance();
            while (/[0-9_]/.test(this.peek())) this.advance();
        }
        if (/[eE]/.test(this.peek())) {
            this.advance();
            if (/[+-]/.test(this.peek())) this.advance();
            while (/[0-9_]/.test(this.peek())) this.advance();
        }
        const raw = this.source.slice(start, this.i).replaceAll("_", "");
        const value = Number(raw);
        if (!Number.isFinite(value)) throw new CompileError(`invalid number '${raw}'`, line, this.chunk);
        return { value, line, col };
    }
    scanIdentifier() {
        const line = this.line, col = this.col;
        const start = this.i;
        this.advance();
        while (/[A-Za-z0-9_]/.test(this.peek())) this.advance();
        return { value: this.source.slice(start, this.i), line, col };
    }
    run() {
        const longOps = ["...","..=","==","~=","<=",">=","+=","-=","*=","/=","//=","%=","^=","::","->","//","<<",">>",".."];
        while (this.i < this.source.length) {
            const c = this.peek();
            if (/\s/.test(c)) { this.advance(); continue; }
            if (this.starts("--")) {
                this.advance(); this.advance();
                if (this.peek() === "[") {
                    const saveI = this.i, saveLine = this.line, saveCol = this.col;
                    const long = this.scanLongBracket();
                    if (long !== null) continue;
                    this.i = saveI; this.line = saveLine; this.col = saveCol;
                }
                while (this.i < this.source.length && this.peek() !== "\n") this.advance();
                continue;
            }
            const line = this.line, col = this.col;
            if (c === "'" || c === '"') {
                const s = this.scanString(c); this.token("string", s.value, s.line, s.col); continue;
            }
            if (c === "`") {
                const s = this.scanBacktick(); this.token("string", s.value, s.line, s.col); continue;
            }
            if (c === "[") {
                const saveI = this.i, saveLine = this.line, saveCol = this.col;
                const long = this.scanLongBracket();
                if (long !== null) { this.token("string", long, line, col); continue; }
                this.i = saveI; this.line = saveLine; this.col = saveCol;
            }
            if (/\d/.test(c) || (c === "." && /\d/.test(this.peek(1)))) {
                const n = this.scanNumber(); this.token("number", n.value, n.line, n.col); continue;
            }
            if (/[A-Za-z_]/.test(c)) {
                const id = this.scanIdentifier();
                this.token(this.keywords.has(id.value) ? "kw" : "name", id.value, id.line, id.col); continue;
            }
            let matched = null;
            for (const op of longOps) if (this.starts(op)) { matched = op; break; }
            if (matched) {
                for (let k = 0; k < matched.length; k++) this.advance();
                this.token("sym", matched, line, col); continue;
            }
            if ("+-*/%^#=<>;:,.(){}[]|&~".includes(c)) {
                this.advance(); this.token("sym", c, line, col); continue;
            }
            this.error(`unexpected character '${c}'`);
        }
        this.tokens.push({ type: "eof", value: "<eof>", line: this.line, col: this.col });
        return this.tokens;
    }
}

class Parser {
    constructor(tokens, chunk = "Luau") {
        this.tokens = tokens;
        this.i = 0;
        this.chunk = chunk;
    }
    cur() { return this.tokens[this.i]; }
    peek(n = 1) { return this.tokens[this.i + n] ?? this.tokens[this.tokens.length - 1]; }
    is(value) { return this.cur().value === value; }
    isType(type) { return this.cur().type === type; }
    take() { return this.tokens[this.i++]; }
    match(value) { if (this.is(value)) { return this.take(); } return null; }
    expect(value, msg = null) {
        if (!this.is(value)) this.error(msg || `expected '${value}', got '${this.cur().value}'`);
        return this.take();
    }
    expectName(msg = "expected name") {
        if (!this.isType("name")) this.error(msg);
        return this.take();
    }
    error(msg, tok = this.cur()) { throw new CompileError(msg, tok.line, this.chunk); }
    skipTypeAnnotation() {
        if (!this.match(":")) return;
        let depth = 0;
        const annotationLine = this.cur().line;
        const stop = new Set([",","=",")","do","end","return","local","function","if","while","for","repeat"]);
        while (!this.isType("eof")) {
            const v = this.cur().value;
            if (depth === 0 && (stop.has(v) || this.cur().line > annotationLine)) break;
            if (["(","{","[","<"].includes(v)) depth++;
            else if ([")","}","]",">"].includes(v)) {
                if (depth === 0) break;
                depth--;
            }
            this.take();
        }
    }
    parseChunk() {
        const body = this.parseBlock(new Set(["<eof>"]));
        if (!this.isType("eof")) this.error("unexpected trailing tokens");
        return { type: "Chunk", body, line: 1 };
    }
    parseBlock(terminators) {
        const body = [];
        while (!this.isType("eof") && !terminators.has(this.cur().value)) {
            if (this.match(";")) continue;
            body.push(this.parseStatement());
            this.match(";");
        }
        return body;
    }
    parseStatement() {
        const tok = this.cur();
        if (this.match("local")) {
            if (this.match("function")) {
                const name = this.expectName().value;
                const func = this.parseFunctionBody(tok.line, false);
                return { type: "LocalFunction", name, func, line: tok.line };
            }
            const names = [];
            do {
                const n = this.expectName();
                names.push(n.value);
                this.skipTypeAnnotation();
            } while (this.match(","));
            const values = this.match("=") ? this.parseExprList() : [];
            return { type: "Local", names, values, line: tok.line };
        }
        if (this.match("function")) {
            let base = { type: "Name", name: this.expectName().value, line: tok.line };
            while (this.match(".")) {
                const key = this.expectName().value;
                base = { type: "Member", base, key, line: tok.line };
            }
            let methodName = null;
            if (this.match(":")) methodName = this.expectName().value;
            const func = this.parseFunctionBody(tok.line, methodName !== null);
            if (methodName !== null) base = { type: "Member", base, key: methodName, line: tok.line };
            return { type: "Assign", targets: [base], values: [func], line: tok.line };
        }
        if (this.match("if")) return this.parseIf(tok.line);
        if (this.match("while")) {
            const test = this.parseExpression();
            this.expect("do");
            const body = this.parseBlock(new Set(["end"]));
            this.expect("end");
            return { type: "While", test, body, line: tok.line };
        }
        if (this.match("repeat")) {
            const body = this.parseBlock(new Set(["until"]));
            this.expect("until");
            const test = this.parseExpression();
            return { type: "Repeat", body, test, line: tok.line };
        }
        if (this.match("for")) return this.parseFor(tok.line);
        if (this.match("do")) {
            const body = this.parseBlock(new Set(["end"]));
            this.expect("end");
            return { type: "Do", body, line: tok.line };
        }
        if (this.match("return")) {
            const stop = new Set(["end","else","elseif","until","<eof>",";"]);
            const values = stop.has(this.cur().value) ? [] : this.parseExprList();
            return { type: "Return", values, line: tok.line };
        }
        if (this.match("break")) return { type: "Break", line: tok.line };
        if (this.match("continue")) return { type: "Continue", line: tok.line };
        if (this.is("type") || (this.is("export") && this.peek().value === "type")) {
            // Type aliases are compile-time only. Skip to a conservative statement boundary.
            if (this.match("export")) this.expect("type"); else this.expect("type");
            if (this.isType("name")) this.take();
            if (this.match("<")) {
                let d = 1;
                while (d && !this.isType("eof")) { const v=this.take().value; if(v==="<")d++; else if(v===">")d--; }
            }
            if (this.match("=")) {
                let depth = 0;
                while (!this.isType("eof")) {
                    const v = this.cur().value;
                    if (depth === 0 && ["local","function","if","while","for","repeat","return","end"].includes(v)) break;
                    if (["(","[","{"].includes(v)) depth++;
                    else if ([")","]","}"].includes(v)) depth=Math.max(0,depth-1);
                    this.take();
                    if (depth===0 && this.match(";")) break;
                }
            }
            return { type: "Noop", line: tok.line };
        }

        const first = this.parsePrefixExpression();
        if (first.type === "Call" && !["=",",","+=","-=","*=","/=","//=","%=","^=","..="].includes(this.cur().value)) {
            return { type: "CallStmt", expr: first, line: tok.line };
        }
        const targets = [first];
        while (this.match(",")) targets.push(this.parsePrefixExpression());
        const compound = ["+=","-=","*=","/=","//=","%=","^=","..="].includes(this.cur().value) ? this.take().value : null;
        if (compound) {
            if (targets.length !== 1) this.error("compound assignment requires one target", tok);
            const value = this.parseExpression();
            return { type: "CompoundAssign", target: targets[0], op: compound.slice(0,-1), value, line: tok.line };
        }
        this.expect("=", "expected assignment or function call");
        const values = this.parseExprList();
        return { type: "Assign", targets, values, line: tok.line };
    }
    parseIf(line) {
        const branches = [];
        let test = this.parseExpression();
        this.expect("then");
        let body = this.parseBlock(new Set(["elseif","else","end"]));
        branches.push({ test, body });
        while (this.match("elseif")) {
            test = this.parseExpression(); this.expect("then");
            body = this.parseBlock(new Set(["elseif","else","end"]));
            branches.push({ test, body });
        }
        let elseBody = [];
        if (this.match("else")) elseBody = this.parseBlock(new Set(["end"]));
        this.expect("end");
        return { type: "If", branches, elseBody, line };
    }
    parseFor(line) {
        const first = this.expectName().value;
        this.skipTypeAnnotation();
        if (this.match("=")) {
            const start = this.parseExpression(); this.expect(",");
            const finish = this.parseExpression();
            const step = this.match(",") ? this.parseExpression() : { type:"Literal", value:1, line };
            this.expect("do");
            const body = this.parseBlock(new Set(["end"])); this.expect("end");
            return { type:"NumericFor", name:first, start, finish, step, body, line };
        }
        const names = [first];
        while (this.match(",")) { const n=this.expectName().value; names.push(n); this.skipTypeAnnotation(); }
        this.expect("in");
        const iter = this.parseExprList();
        this.expect("do");
        const body = this.parseBlock(new Set(["end"])); this.expect("end");
        return { type:"GenericFor", names, iter, body, line };
    }
    parseExprList() {
        const list = [this.parseExpression()];
        while (this.match(",")) list.push(this.parseExpression());
        return list;
    }
    parseFunctionBody(line, methodSelf = false) {
        this.expect("(");
        const params = [];
        let vararg = false;
        if (!this.is(")")) {
            while (true) {
                if (this.match("...")) { vararg = true; break; }
                const n = this.expectName().value;
                params.push(n); this.skipTypeAnnotation();
                if (!this.match(",")) break;
            }
        }
        this.expect(")");
        this.skipTypeAnnotation();
        if (methodSelf) params.unshift("self");
        const body = this.parseBlock(new Set(["end"]));
        this.expect("end");
        return { type:"Function", params, vararg, body, line };
    }
    parseExpression(minPrec = 0) {
        let left = this.parseUnary();
        const prec = {
            "or":1, "and":2,
            "<":3, ">":3, "<=":3, ">=":3, "~=":3, "==":3,
            "|":4, "~":5, "&":6, "<<":7, ">>":7,
            "..":8,
            "+":9, "-":9,
            "*":10, "/":10, "//":10, "%":10,
            "^":12
        };
        while (true) {
            const op = this.cur().value;
            const p = prec[op] ?? -1;
            if (p < minPrec) break;
            this.take();
            const rightAssoc = op === "^" || op === "..";
            const right = this.parseExpression(rightAssoc ? p : p + 1);
            left = { type:"Binary", op, left, right, line:left.line };
        }
        return left;
    }
    parseUnary() {
        const tok = this.cur();
        if (["not","-","#","~"].includes(tok.value)) {
            this.take();
            return { type:"Unary", op:tok.value, arg:this.parseExpression(11), line:tok.line };
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        const tok = this.cur();
        if (tok.type === "number" || tok.type === "string") { this.take(); return {type:"Literal",value:tok.value,line:tok.line}; }
        if (this.match("nil")) return {type:"Literal",value:null,line:tok.line};
        if (this.match("true")) return {type:"Literal",value:true,line:tok.line};
        if (this.match("false")) return {type:"Literal",value:false,line:tok.line};
        if (this.match("...")) return {type:"Vararg",line:tok.line};
        if (this.match("function")) return this.parseFunctionBody(tok.line, false);
        if (this.match("{")) return this.parseTable(tok.line);
        if (this.match("if")) return this.parseIfExpression(tok.line);
        if (tok.type === "name" || this.is("(")) return this.parsePrefixExpression();
        this.error(`unexpected token '${tok.value}' in expression`, tok);
    }
    parseIfExpression(line) {
        const test = this.parseExpression(); this.expect("then");
        const consequent = this.parseExpression(); this.expect("else");
        const alternate = this.is("if") ? (this.take(), this.parseIfExpression(this.tokens[this.i-1].line)) : this.parseExpression();
        return {type:"IfExpr",test,consequent,alternate,line};
    }
    parseTable(line) {
        const fields = [];
        while (!this.is("}")) {
            if (this.match("[")) {
                const key = this.parseExpression(); this.expect("]"); this.expect("=");
                const value = this.parseExpression(); fields.push({kind:"key",key,value});
            } else if (this.cur().type === "name" && this.peek().value === "=") {
                const name = this.take().value; this.expect("=");
                const value = this.parseExpression(); fields.push({kind:"name",name,value});
            } else {
                fields.push({kind:"array",value:this.parseExpression()});
            }
            if (!(this.match(",") || this.match(";"))) break;
        }
        this.expect("}");
        return {type:"Table",fields,line};
    }
    parsePrefixExpression() {
        let expr;
        const tok = this.cur();
        if (tok.type === "name") { this.take(); expr={type:"Name",name:tok.value,line:tok.line}; }
        else if (this.match("(")) { expr=this.parseExpression(); this.expect(")"); }
        else this.error("expected name or parenthesized expression", tok);

        while (true) {
            if (this.match(".")) {
                const key=this.expectName().value; expr={type:"Member",base:expr,key,line:tok.line}; continue;
            }
            if (this.match("[")) {
                const key=this.parseExpression(); this.expect("]"); expr={type:"Index",base:expr,key,line:tok.line}; continue;
            }
            if (this.match(":")) {
                const method=this.expectName().value;
                const args=this.parseCallArgs();
                expr={type:"Call",callee:{type:"Member",base:expr,key:method,line:tok.line},args,self:expr,line:tok.line}; continue;
            }
            if (this.is("(") || this.is("{") || this.cur().type === "string") {
                const args=this.parseCallArgs(); expr={type:"Call",callee:expr,args,self:null,line:tok.line}; continue;
            }
            break;
        }
        return expr;
    }
    parseCallArgs() {
        if (this.match("(")) {
            const args=[];
            if (!this.is(")")) { args.push(this.parseExpression()); while(this.match(","))args.push(this.parseExpression()); }
            this.expect(")"); return args;
        }
        if (this.is("{")) { this.take(); const tbl=this.parseTableOpened(this.tokens[this.i-1].line); return [tbl]; }
        if (this.cur().type === "string") { const t=this.take(); return [{type:"Literal",value:t.value,line:t.line}]; }
        this.error("expected function arguments");
    }
    parseTableOpened(line) {
        const fields=[];
        while(!this.is("}")) {
            if(this.match("[")){const key=this.parseExpression();this.expect("]");this.expect("=");fields.push({kind:"key",key,value:this.parseExpression()});}
            else if(this.cur().type==="name"&&this.peek().value==="="){const name=this.take().value;this.expect("=");fields.push({kind:"name",name,value:this.parseExpression()});}
            else fields.push({kind:"array",value:this.parseExpression()});
            if(!(this.match(",")||this.match(";")))break;
        }
        this.expect("}"); return {type:"Table",fields,line};
    }
}

class LuaIterator {
    constructor(items) { this[LUA_ITERATOR] = true; this.items = items; }
    [Symbol.iterator]() { return this.items[Symbol.iterator](); }
}

class LuaThread {
    constructor(runtime, func, args = []) {
        this[LUA_THREAD] = true;
        this.runtime = runtime;
        this.func = func;
        this.args = args;
        this.status = "suspended";
        this.generator = null;
        this.lastValues = [];
    }
}

class RuntimeSignal {
    constructor(runtime, name, { frame = false } = {}) {
        this.runtime = runtime;
        this.Name = name;
        this.frame = frame;
        this.listeners = new Set();
        this.waiters = new Set();
        const connect = (...args) => {
            const callback = [...args].reverse().find(v => typeof v === "function");
            if (!callback) throw new Error(`${name}:Connect expected a function`);
            const listener = { callback, connected:true, running:false, pendingArgs:null, task:null };
            this.listeners.add(listener);
            const connection = {
                Connected: true,
                Disconnect: () => {
                    listener.connected = false;
                    listener.pendingArgs = null;
                    connection.Connected = false;
                    this.listeners.delete(listener);
                }
            };
            connection.disconnect = connection.Disconnect;
            listener.connection = connection;
            return connection;
        };
        this.Connect = connect;
        this.connect = connect;
        const wait = () => new SuspendRequest("signal", { signal: this });
        Object.defineProperty(wait, LUA_NATIVE, { value: function* () { return yield new SuspendRequest("signal", { signal: this.__signal }); } });
        wait.__signal = this;
        this.Wait = wait;
        this.wait = wait;
    }
    _startListener(listener, args) {
        if (!listener.connected) return;
        listener.running = true;
        const task = this.runtime.scheduler.createTaskFromCallable(listener.callback, args, {
            label: this.Name,
            onComplete: () => {
                listener.running = false;
                listener.task = null;
                if (listener.connected && listener.pendingArgs) {
                    const pending = listener.pendingArgs;
                    listener.pendingArgs = null;
                    this._startListener(listener, pending);
                }
            }
        });
        listener.task = task;
        this.runtime.scheduler.runTask(task);
    }
    fire(...args) {
        for (const task of Array.from(this.waiters)) {
            this.waiters.delete(task);
            this.runtime.scheduler.resumeTask(task, args);
        }
        for (const listener of Array.from(this.listeners)) {
            if (!listener.connected) { this.listeners.delete(listener); continue; }
            if (this.frame && listener.running) {
                listener.pendingArgs = args;
                continue;
            }
            this._startListener(listener, args);
        }
    }
    _disconnectAll() {
        for (const listener of this.listeners) {
            listener.connected = false;
            if (listener.connection) listener.connection.Connected = false;
        }
        this.listeners.clear();
        for (const task of this.waiters) this.runtime.scheduler.cancelTask(task, "signal disconnected");
        this.waiters.clear();
    }
}

class Scheduler {
    constructor(runtime) {
        this.runtime = runtime;
        this.sleeping = [];
        this.ready = [];
        this.tasks = new Set();
        this.currentTask = null;
        this.sequence = 0;
        this.completed = 0;
        this.errored = 0;
        this.cancelled = 0;
        this.interrupted = 0;
        this.maxThreads = DEFAULT_MAX_THREADS;
        this.maxResumes = DEFAULT_MAX_RESUMES;
    }
    createTaskFromCallable(callable, args = [], options = {}) {
        if (this.tasks.size >= this.maxThreads) throw new Error(`Luau scheduler thread limit (${this.maxThreads}) reached`);
        const task = {
            id: ++this.sequence,
            callable,
            args,
            generator: this.runtime.makeCallGenerator(callable, args),
            state: "new",
            started: false,
            resumeValues: [],
            wakeTime: 0,
            waitingSignal: null,
            label: options.label || "thread",
            onComplete: options.onComplete || null,
            onError: options.onError || null,
            steps: 0,
            resumeStartedMs: 0,
            cancelled: false,
        };
        this.tasks.add(task);
        return task;
    }
    queueTask(task) {
        if (!task || task.cancelled || !this.tasks.has(task)) return;
        if (!this.ready.includes(task)) this.ready.push(task);
    }
    spawn(callable, args = [], options = {}) {
        const task = this.createTaskFromCallable(callable, args, options);
        this.queueTask(task);
        return task;
    }
    sleepTask(task, seconds) {
        const duration = Math.max(0, Number(seconds) || 0);
        task.state = "sleeping";
        task.sleepStarted = nowSeconds();
        task.sleepSeconds = duration;
        task.wakeTime = task.sleepStarted + duration;
        this.sleeping.push(task);
    }
    waitSignal(task, signal) {
        task.state = "signal";
        task.waitingSignal = signal;
        signal.waiters.add(task);
    }
    waitPromise(task, promise) {
        task.state = "promise";
        Promise.resolve(promise).then(
            value => {
                if (!this.tasks.has(task) || task.cancelled) return;
                this.resumeTask(task, value instanceof MultiReturn ? value.values : Array.isArray(value) ? value : [value]);
            },
            error => {
                if (!this.tasks.has(task) || task.cancelled) return;
                task.pendingThrow = error instanceof Error ? error : new Error(String(error));
                this.queueTask(task);
            }
        );
    }
    resumeTask(task, values = []) {
        if (!task || task.cancelled || !this.tasks.has(task)) return;
        if (task.waitingSignal) {
            task.waitingSignal.waiters.delete(task);
            task.waitingSignal = null;
        }
        task.resumeValues = Array.isArray(values) ? values : [values];
        task.state = "ready";
        this.queueTask(task);
    }
    finishTask(task, result = undefined) {
        if (!this.tasks.has(task)) return;
        this.tasks.delete(task);
        task.state = "dead";
        task.result = result;
        this.completed++;
        if (typeof task.onComplete === "function") {
            try { task.onComplete(result); } catch (e) { console.error("[Luau scheduler completion]", e); }
        }
    }
    failTask(task, error) {
        if (!this.tasks.has(task)) return;
        this.tasks.delete(task);
        task.state = "dead";
        task.error = error;
        this.errored++;
        if (String(error?.message || error).includes("execution budget")) this.interrupted++;
        if (typeof task.onError === "function") {
            try { task.onError(error); } catch (e) { console.error("[Luau scheduler error handler]", e); }
        } else {
            console.error(`[Luau] ${task.label}:`, error);
        }
        if (typeof task.onComplete === "function") {
            try { task.onComplete(undefined, error); } catch {}
        }
    }
    cancelTask(task, reason = "cancelled") {
        if (!task || !this.tasks.has(task)) return false;
        task.cancelled = true;
        if (task.waitingSignal) task.waitingSignal.waiters.delete(task);
        this.tasks.delete(task);
        task.state = "dead";
        task.cancelReason = reason;
        this.cancelled++;
        if (typeof task.onComplete === "function") { try { task.onComplete(undefined, new Error(reason)); } catch {} }
        return true;
    }
    runTask(task) {
        if (!task || task.cancelled || !this.tasks.has(task)) return { done:true, value:undefined };
        const previous = this.currentTask;
        this.currentTask = task;
        task.steps = 0;
        task.resumeStartedMs = nowMillis();
        task.state = "running";
        try {
            let result;
            if (task.pendingThrow) {
                const e = task.pendingThrow; task.pendingThrow = null;
                result = task.generator.throw(e);
            } else if (!task.started) {
                task.started = true;
                result = task.generator.next();
            } else {
                const values = task.resumeValues || [];
                task.resumeValues = [];
                result = task.generator.next(new MultiReturn(values));
            }
            if (result.done) {
                this.finishTask(task, result.value);
                return { done:true, value:result.value };
            }
            const req = result.value;
            if (!(req instanceof SuspendRequest)) {
                // Plain coroutine.yield values are represented as a generic cooperative yield.
                task.state = "ready";
                task.resumeValues = [];
                this.queueTask(task);
                return { done:false, yielded:req };
            }
            if (req.kind === "sleep") this.sleepTask(task, req.seconds);
            else if (req.kind === "signal") this.waitSignal(task, req.signal);
            else if (req.kind === "promise") this.waitPromise(task, req.promise);
            else if (req.kind === "defer") this.queueTask(task);
            else { task.state="ready"; this.queueTask(task); }
            return { done:false, yielded:req };
        } catch (error) {
            this.failTask(task, error);
            return { done:true, error };
        } finally {
            this.currentTask = previous;
        }
    }
    tick(now = nowSeconds()) {
        // Sleeping tasks are scheduled from performance.now()-style monotonic
        // seconds. Some legacy HTML code passes classic tick() here, which is
        // Date.now()/1000 (Unix epoch seconds). Never compare those two clock
        // domains directly or every wait() becomes due on the next frame.
        const monotonicNow = nowSeconds();
        const requestedNow = Number(now);
        now =
            Number.isFinite(requestedNow) &&
            Math.abs(requestedNow - monotonicNow) < 365 * 24 * 60 * 60
                ? requestedNow
                : monotonicNow;

        const due = [];
        const remaining = [];
        for (const task of this.sleeping) {
            if (!this.tasks.has(task) || task.cancelled) continue;
            if (task.wakeTime <= now) due.push(task); else remaining.push(task);
        }
        this.sleeping = remaining;
        due.sort((a,b)=>a.wakeTime-b.wakeTime || a.id-b.id);
        for (const task of due) this.resumeTask(task, [Math.max(0, now - (task.wakeTime - (task.sleepSeconds || 0)))]);
        let resumes = 0;
        while (this.ready.length && resumes < this.maxResumes) {
            const task = this.ready.shift();
            if (!this.tasks.has(task) || task.cancelled || task.state === "sleeping" || task.state === "signal" || task.state === "promise") continue;
            this.runTask(task);
            resumes++;
        }
        return resumes;
    }
    stats() {
        let sleeping = 0, waitingSignal = 0, waitingPromise = 0, running = 0;
        for (const t of this.tasks) {
            if (t.state === "sleeping") sleeping++;
            else if (t.state === "signal") waitingSignal++;
            else if (t.state === "promise") waitingPromise++;
            else if (t.state === "running") running++;
        }
        return {
            implementation: "Blox JS VM",
            wasm: false,
            liveThreads: this.tasks.size,
            readyThreads: this.ready.length,
            sleepingThreads: sleeping,
            signalWaiters: waitingSignal,
            promiseWaiters: waitingPromise,
            runningThreads: running,
            completedThreads: this.completed,
            erroredThreads: this.errored,
            cancelledThreads: this.cancelled,
            interruptedThreads: this.interrupted,
            maxThreads: this.maxThreads,
            maxResumesPerTick: this.maxResumes,
        };
    }
}

class InterpreterRuntime {
    constructor(initialEnv = {}) {
        this.chunkName = "Luau";
        this.global = new Environment();
        this.scheduler = new Scheduler(this);
        this.maxStepsPerResume = DEFAULT_MAX_STEPS;
        this.maxWallMsPerResume = DEFAULT_MAX_WALL_MS;
        this.runService = {
            Name: "Run Service",
            ClassName: "RunService",
            Stepped: new RuntimeSignal(this, "RunService.Stepped", {frame:true}),
            Heartbeat: new RuntimeSignal(this, "RunService.Heartbeat", {frame:true}),
            RenderStepped: new RuntimeSignal(this, "RunService.RenderStepped", {frame:true}),
            IsRunning: () => true,
            IsStudio: () => false,
        };
        this.installBuiltins();
        this.installHostGlobals(initialEnv);
    }
    watchdog(node = null) {
        const task = this.scheduler.currentTask;
        if (!task) return;
        task.steps++;
        if (task.steps > this.maxStepsPerResume || (task.steps % 2048 === 0 && nowMillis() - task.resumeStartedMs > this.maxWallMsPerResume)) {
            throw new LuaRuntimeError("Script timeout: thread exceeded uninterrupted execution budget", node, this.chunkName);
        }
    }
    installHostGlobals(initialEnv) {
        for (const [k,v] of Object.entries(initialEnv || {})) this.global.define(k, v);

        // Classic Vector3 gets JS-native values but interpreter-native arithmetic.
        this.global.define("Vector3", {
            new: (...args) => {
                const nums = args.filter(v => typeof v === "number");
                return makeVector3(nums[0] || 0, nums[1] || 0, nums[2] || 0);
            },
            zero: makeVector3(0,0,0),
            one: makeVector3(1,1,1),
        });

        const hostGame = initialEnv?.game;
        if (hostGame && typeof hostGame === "object") {
            const runtime = this;
            const gameProxy = new Proxy(hostGame, {
                get(target, prop, receiver) {
                    if (prop === "RunService") return runtime.runService;
                    if (prop === "GetService" || prop === "getService") {
                        return (...args) => {
                            const name = [...args].reverse().find(v => typeof v === "string");
                            if (name === "RunService" || name === "Run Service") return runtime.runService;
                            const fn = target.GetService || target.getService;
                            return typeof fn === "function" ? fn(...args) : target[name];
                        };
                    }
                    return Reflect.get(target, prop, receiver);
                },
                set(target, prop, value, receiver) { return Reflect.set(target, prop, value, receiver); }
            });
            this.global.define("game", gameProxy);
        }
        this.global.define("RunService", this.runService);

        // Replace host Promise-based scheduling globals with interpreter-native ones.
        this.global.define("wait", this.native("wait", function* (runtime, args) {
            const seconds = Math.max(0, Number(args[0] ?? DEFAULT_WAIT) || DEFAULT_WAIT);
            const started = nowSeconds();
            yield new SuspendRequest("sleep", { seconds });
            return nowSeconds() - started;
        }));
        this.global.define("spawn", this.native("spawn", function* (runtime, args) {
            const fn = args[0];
            if (typeof fn !== "function") throw new LuaRuntimeError("spawn expected a function");
            const task = runtime.scheduler.spawn(fn, [], { label:"spawn callback" });
            return task;
        }));
        this.global.define("delay", this.native("delay", function* (runtime, args) {
            const seconds = Math.max(0, Number(args[0]) || 0);
            const fn = args[1];
            if (typeof fn !== "function") throw new LuaRuntimeError("delay expected a function");
            const task = runtime.scheduler.createTaskFromCallable(fn, [], { label:"delay callback" });
            task.state = "sleeping"; task.wakeTime = nowSeconds() + seconds; runtime.scheduler.sleeping.push(task);
            return task;
        }));
        const taskTable = new LuaTable(this);
        taskTable.rawSet("wait", this.global.get("wait"));
        taskTable.rawSet("spawn", this.native("task.spawn", function* (runtime,args) {
            const fn=args[0]; if(typeof fn!=="function")throw new LuaRuntimeError("task.spawn expected a function");
            const t=runtime.scheduler.spawn(fn,args.slice(1),{label:"task.spawn"}); return t;
        }));
        taskTable.rawSet("defer", this.native("task.defer", function* (runtime,args) {
            const fn=args[0]; if(typeof fn!=="function")throw new LuaRuntimeError("task.defer expected a function");
            const t=runtime.scheduler.spawn(fn,args.slice(1),{label:"task.defer"}); return t;
        }));
        taskTable.rawSet("delay", this.native("task.delay", function* (runtime,args) {
            const seconds=Math.max(0,Number(args[0])||0), fn=args[1];
            if(typeof fn!=="function")throw new LuaRuntimeError("task.delay expected a function");
            const t=runtime.scheduler.createTaskFromCallable(fn,args.slice(2),{label:"task.delay"});
            t.state="sleeping";t.wakeTime=nowSeconds()+seconds;runtime.scheduler.sleeping.push(t);return t;
        }));
        taskTable.rawSet("cancel", this.native("task.cancel", function* (runtime,args) {
            const target=args[0];
            if(target?.__task) return runtime.scheduler.cancelTask(target.__task,"task.cancel");
            if(target && runtime.scheduler.tasks.has(target)) return runtime.scheduler.cancelTask(target,"task.cancel");
            return false;
        }));
        this.global.define("task", taskTable);

        const bridge = initialEnv?.__BloxSchedulerBridge;
        if (bridge && typeof bridge === "object") {
            bridge.Dispatch = (callback, ...args) => this.dispatchExternal(callback, args, "host signal");
            // IMPORTANT: all scheduler wake times are measured with nowSeconds(),
            // which is based on performance.now() in the browser. The HTML host's
            // classic tick() returns Unix/epoch seconds (Date.now()/1000), so using
            // that value here makes every sleeping thread appear instantly overdue.
            // Keep the scheduler entirely on its own monotonic clock.
            bridge.Tick = () => this.scheduler.tick(nowSeconds());
            bridge.RunServicePhase = (phase, ...args) => {
                const signal = this.runService[phase];
                if (signal instanceof RuntimeSignal) { signal.fire(...args); return true; }
                return false;
            };
            bridge.Stats = () => this.scheduler.stats();
        }
    }
    native(name, generatorFactory) {
        const fn = function(){ throw new Error(`${name} may only be called by the Luau interpreter`); };
        Object.defineProperty(fn, LUA_NATIVE, { value: generatorFactory });
        Object.defineProperty(fn, "__luaName", { value:name });
        return fn;
    }
    installBuiltins() {
        const def=(k,v)=>this.global.define(k,v);
        def("_VERSION", "Luau (Blox JS VM)");
        def("type", v=>luaType(v));
        def("typeof", v=>v?.__bloxType || v?.ClassName || luaType(v));
        def("tostring", v=>this.toString(v));
        def("tonumber", (v,base)=> base ? parseInt(String(v),Number(base)) : Number(v));
        def("assert", (v,msg="assertion failed!")=>{if(!luaTruthy(v))throw new LuaRuntimeError(msg);return v;});
        def("error", (msg)=>{throw new LuaRuntimeError(msg);});
        def("print", (...args)=>console.log("[Lua]",...args.map(v=>this.toString(v))));
        def("warn", (...args)=>console.warn("[Luau]",...args.map(v=>this.toString(v))));
        def("rawequal", (a,b)=>a===b);
        def("rawget", (t,k)=> t instanceof LuaTable ? t.rawGet(k) : t?.[k]);
        def("rawset", (t,k,v)=>{if(t instanceof LuaTable)t.rawSet(k,v);else if(t)t[k]=v;return t;});
        def("getmetatable", t=>t instanceof LuaTable?t.metatable:null);
        def("setmetatable", (t,mt)=>{if(!(t instanceof LuaTable))throw new LuaRuntimeError("bad argument #1 to setmetatable (table expected)");t.metatable=mt;return t;});
        def("collectgarbage", ()=>0);
        def("gcinfo", ()=>0);
        def("tick", ()=>Date.now()/1000);
        const started=nowSeconds();
        def("time", ()=>nowSeconds()-started);
        def("elapsedTime", ()=>nowSeconds()-started);
        def("select", (index,...args)=> {
            if(index==="#")return args.length;
            let i=Number(index); if(i<0)i=args.length+i+1; i=Math.max(1,i); return new MultiReturn(args.slice(i-1));
        });
        def("next", (table,key=null)=>this.tableNext(table,key));
        def("pairs", table=>this.makePairs(table));
        def("ipairs", table=>this.makeIpairs(table));
        def("unpack", (table,i=1,j=null)=>this.tableUnpack(table,i,j));
        def("pcall", this.native("pcall", function* (runtime,args) {
            const fn=args[0]; try { const result=yield* runtime.callValue(fn,args.slice(1),null); return new MultiReturn([true,...asValues(result)]); }
            catch(e){return new MultiReturn([false,e?.message||String(e)]);}
        }));
        def("xpcall", this.native("xpcall", function* (runtime,args) {
            const fn=args[0], handler=args[1]; try { const result=yield* runtime.callValue(fn,args.slice(2),null); return new MultiReturn([true,...asValues(result)]); }
            catch(e){ try { const handled=yield* runtime.callValue(handler,[e?.message||String(e)],null); return new MultiReturn([false,unwrapSingle(handled)]); } catch(e2){return new MultiReturn([false,e2?.message||String(e2)]);} }
        }));
        def("ypcall", this.global.get("pcall"));

        const math = new LuaTable(this);
        const mathFns = {
            abs:Math.abs,acos:Math.acos,asin:Math.asin,atan:Math.atan,atan2:Math.atan2,ceil:Math.ceil,cos:Math.cos,cosh:Math.cosh,
            deg:x=>x*180/Math.PI,exp:Math.exp,floor:Math.floor,fmod:(a,b)=>a%b,frexp:x=>{if(x===0)return new MultiReturn([0,0]);const e=Math.floor(Math.log2(Math.abs(x)))+1;return new MultiReturn([x/2**e,e]);},
            ldexp:(m,e)=>m*2**e,log:Math.log,log10:Math.log10,max:Math.max,min:Math.min,modf:x=>new MultiReturn([Math.trunc(x),x-Math.trunc(x)]),pow:Math.pow,
            rad:x=>x*Math.PI/180,random:(a,b)=>{const r=Math.random();if(a==null)return r;if(b==null)return Math.floor(r*a)+1;return Math.floor(r*(b-a+1))+a;},
            randomseed:s=>{ /* deterministic seeding is intentionally not global JS RNG */ return Number(s)||0;},sin:Math.sin,sinh:Math.sinh,sqrt:Math.sqrt,tan:Math.tan,tanh:Math.tanh,
            clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),sign:x=>Math.sign(x),round:x=>Math.round(x),noise:()=>0,
        };
        for(const[k,v]of Object.entries(mathFns))math.rawSet(k,v); math.rawSet("pi",Math.PI);math.rawSet("huge",Infinity);
        def("math",math);

        const string = new LuaTable(this);
        const sf={
            byte:(s,i=1,j=i)=>new MultiReturn(Array.from(String(s)).slice((i<0?String(s).length+i+1:i)-1,(j<0?String(s).length+j+1:j)).map(c=>c.charCodeAt(0))),
            char:(...codes)=>String.fromCharCode(...codes),
            find:(s,p,init=1,plain=false)=>{s=String(s);p=String(p);const start=Math.max(0,(init<0?s.length+init+1:init)-1);const idx=plain?s.indexOf(p,start):s.indexOf(p,start);return idx<0?new MultiReturn([null]):new MultiReturn([idx+1,idx+p.length]);},
            format:(fmt,...args)=>this.simpleFormat(fmt,args),
            gsub:(s,p,repl,n=Infinity)=>{s=String(s);p=String(p);let count=0;const out=s.split(p).map((part,i,arr)=>{if(i===arr.length-1||count>=n)return part;count++;return part+String(repl);}).join("");return new MultiReturn([out,count]);},
            len:s=>String(s).length,lower:s=>String(s).toLowerCase(),upper:s=>String(s).toUpperCase(),rep:(s,n,sep="")=>Array(Math.max(0,n)).fill(String(s)).join(String(sep)),reverse:s=>Array.from(String(s)).reverse().join(""),
            sub:(s,i,j=-1)=>{s=String(s);const len=s.length;let a=i<0?len+i+1:i;let b=j<0?len+j+1:j;a=Math.max(1,a);b=Math.min(len,b);return a>b?"":s.slice(a-1,b);},
            split:(s,sep)=>{const t=new LuaTable(this);String(s).split(String(sep??",")).forEach((v,i)=>t.rawSet(i+1,v));return t;},
        };
        for(const[k,v]of Object.entries(sf))string.rawSet(k,v); def("string",string);

        const table = new LuaTable(this);
        table.rawSet("insert",(t,pos,value)=>{if(!(t instanceof LuaTable))throw new LuaRuntimeError("table.insert expected table");if(value===undefined){value=pos;pos=t.length()+1;}const n=t.length();for(let i=n;i>=pos;i--)t.rawSet(i+1,t.rawGet(i));t.rawSet(pos,value);});
        table.rawSet("remove",(t,pos=null)=>{if(!(t instanceof LuaTable))throw new LuaRuntimeError("table.remove expected table");const n=t.length();pos=pos??n;const v=t.rawGet(pos);for(let i=pos;i<n;i++)t.rawSet(i,t.rawGet(i+1));t.rawSet(n,null);return v;});
        table.rawSet("concat",(t,sep="",i=1,j=null)=>{j=j??this.luaLength(t);const a=[];for(let k=i;k<=j;k++)a.push(this.toString(this.getIndexSync(t,k)));return a.join(sep);});
        table.rawSet("pack",(...args)=>{const t=new LuaTable(this);args.forEach((v,i)=>t.rawSet(i+1,v));t.rawSet("n",args.length);return t;});
        table.rawSet("unpack",(t,i=1,j=null)=>this.tableUnpack(t,i,j));
        table.rawSet("sort",(t,comp=null)=>{if(!(t instanceof LuaTable))return;const n=t.length();const a=[];for(let i=1;i<=n;i++)a.push(t.rawGet(i));a.sort((x,y)=>comp?(this.callSync(comp,[x,y])? -1:1):(x<y?-1:x>y?1:0));a.forEach((v,i)=>t.rawSet(i+1,v));});
        table.rawSet("create",(n,value=null)=>{const t=new LuaTable(this);for(let i=1;i<=n;i++)t.rawSet(i,value);return t;});
        table.rawSet("clear",t=>{if(t instanceof LuaTable)t.map.clear();});
        table.rawSet("find",(t,value,init=1)=>{for(let i=init;i<=this.luaLength(t);i++)if(this.getIndexSync(t,i)===value)return i;return null;});
        def("table",table);

        const coroutine = new LuaTable(this);
        coroutine.rawSet("create", fn=>{if(typeof fn!=="function")throw new LuaRuntimeError("coroutine.create expected function");return new LuaThread(this,fn,[]);});
        coroutine.rawSet("status", th=>th?.status||"dead");
        coroutine.rawSet("running", ()=>this.scheduler.currentTask?.luaThread || null);
        coroutine.rawSet("isyieldable", ()=>!!this.scheduler.currentTask);
        coroutine.rawSet("resume", this.native("coroutine.resume", function* (runtime,args){
            const th=args[0];if(!th?.[LUA_THREAD])return new MultiReturn([false,"thread expected"]);
            try{return new MultiReturn([true,...runtime.resumeManualThread(th,args.slice(1))]);}catch(e){return new MultiReturn([false,e?.message||String(e)]);}
        }));
        coroutine.rawSet("yield", this.native("coroutine.yield", function* (_runtime,args){
            const resumed=yield new SuspendRequest("manualYield",{values:args});return resumed instanceof MultiReturn?resumed:new MultiReturn(asValues(resumed));
        }));
        coroutine.rawSet("wrap", fn=>{const th=new LuaThread(this,fn,[]);return (...args)=>{const r=this.resumeManualThread(th,args);if(r[0]===false)throw new LuaRuntimeError(r[1]);return r.length<=1?r[0]:new MultiReturn(r);};});
        coroutine.rawSet("close", th=>{if(th?.[LUA_THREAD]){th.status="dead";th.generator=null;return true;}return false;});
        def("coroutine",coroutine);

        const bit32 = new LuaTable(this);
        bit32.rawSet("band",(...a)=>a.reduce((x,y)=>x&y,-1)>>>0);bit32.rawSet("bor",(...a)=>a.reduce((x,y)=>x|y,0)>>>0);bit32.rawSet("bxor",(...a)=>a.reduce((x,y)=>x^y,0)>>>0);
        bit32.rawSet("bnot",x=>(~x)>>>0);bit32.rawSet("lshift",(x,n)=>(x<<n)>>>0);bit32.rawSet("rshift",(x,n)=>(x>>>n)>>>0);bit32.rawSet("arshift",(x,n)=>(x>>n)>>>0);
        def("bit32",bit32);

        const utf8 = new LuaTable(this);utf8.rawSet("len",s=>Array.from(String(s)).length);utf8.rawSet("char",(...c)=>String.fromCodePoint(...c));utf8.rawSet("codepoint",(s,i=1,j=i)=>new MultiReturn(Array.from(String(s)).slice(i-1,j).map(c=>c.codePointAt(0))));
        def("utf8",utf8);
    }
    simpleFormat(fmt,args) {
        let i=0; return String(fmt).replace(/%([%sdqfix])/g,(_m,t)=>{if(t==="%")return "%";const v=args[i++];if(t==="s")return this.toString(v);if(t==="d"||t==="i")return String(Math.trunc(Number(v)||0));if(t==="f")return String(Number(v)||0);if(t==="q")return JSON.stringify(String(v));if(t==="x")return (Number(v)||0).toString(16);return this.toString(v);});
    }
    toString(v) {
        if(v===null||v===undefined)return "nil";
        if(v instanceof LuaTable){const mm=this.rawMetamethod(v,"__tostring");if(mm)return String(this.callSync(mm,[v]));return `table: 0x${(v.__id??=(Math.random()*0xffffffff>>>0)).toString(16)}`;}
        if(isVectorLike(v))return `${v.X}, ${v.Y}, ${v.Z}`;
        if(typeof v==="boolean")return v?"true":"false";
        if(typeof v==="function")return "function";
        return String(v);
    }
    rawMetamethod(value,name) {
        if(value instanceof LuaTable && value.metatable instanceof LuaTable)return value.metatable.rawGet(name);
        return null;
    }
    luaLength(value) {
        if(value instanceof LuaTable){const mm=this.rawMetamethod(value,"__len");if(mm)return Number(this.callSync(mm,[value]))||0;return value.length();}
        if(typeof value==="string"||Array.isArray(value))return value.length;
        if(value&&typeof value.Count==="number")return value.Count;
        if(value&&typeof value.Length==="number")return value.Length;
        return 0;
    }
    getIndexSync(base,key) {
        if(base instanceof LuaTable){if(base.rawHas(key))return base.rawGet(key);const idx=this.rawMetamethod(base,"__index");if(idx instanceof LuaTable)return this.getIndexSync(idx,key);if(typeof idx==="function")return this.callSync(idx,[base,key]);return undefined;}
        if(base==null)return undefined;
        if(typeof key==="number"&&Array.isArray(base))return base[key-1];
        if(typeof base.Get==="function"&&typeof key==="number"&&(typeof base.Count==="number"||typeof base.Length==="number")){try{return base.Get(key);}catch{} }
        return base[key];
    }
    setIndexSync(base,key,value) {
        if(base instanceof LuaTable){if(base.rawHas(key)||!this.rawMetamethod(base,"__newindex")){base.rawSet(key,value);return;}const ni=this.rawMetamethod(base,"__newindex");if(ni instanceof LuaTable){this.setIndexSync(ni,key,value);return;}if(typeof ni==="function"){this.callSync(ni,[base,key,value]);return;}}
        if(base==null)throw new LuaRuntimeError("attempt to index nil value");
        base[key]=value;
    }
    vectorProperty(base,key) {
        if(!isVectorLike(base))return undefined;
        if(key==="Magnitude"||key==="magnitude")return vectorMagnitude(base);
        if(key==="Unit"||key==="unit")return vectorUnit(base);
        if(key==="Dot"||key==="dot")return (_self,other)=>base.X*other.X+base.Y*other.Y+base.Z*other.Z;
        if(key==="Cross"||key==="cross")return (_self,b)=>makeVector3(base.Y*b.Z-base.Z*b.Y,base.Z*b.X-base.X*b.Z,base.X*b.Y-base.Y*b.X);
        if(key==="Lerp"||key==="lerp")return (_self,b,a)=>makeVector3(base.X+(b.X-base.X)*a,base.Y+(b.Y-base.Y)*a,base.Z+(b.Z-base.Z)*a);
        return undefined;
    }
    *getIndex(base,key,node=null) {
        base=unwrapSingle(base);key=unwrapSingle(key);
        if(base==null)throw new LuaRuntimeError(`attempt to index nil with '${key}'`,node,this.chunkName);
        if(isVectorLike(base)){const vp=this.vectorProperty(base,key);if(vp!==undefined)return vp;}
        if(base instanceof LuaTable){
            if(base.rawHas(key))return base.rawGet(key);
            const idx=this.rawMetamethod(base,"__index");
            if(idx instanceof LuaTable)return yield* this.getIndex(idx,key,node);
            if(typeof idx==="function")return unwrapSingle(yield* this.callValue(idx,[base,key],node));
            return undefined;
        }
        if(typeof key==="number"&&Array.isArray(base))return base[key-1];
        if(typeof base.Get==="function"&&typeof key==="number"&&(typeof base.Count==="number"||typeof base.Length==="number")){try{return base.Get(key);}catch{} }
        const value = base[key];
        if (typeof value === "function" && !value[LUA_INTERNAL] && !value[LUA_NATIVE]) {
            try { return value.bind(base); } catch {}
        }
        return value;
    }
    *setIndex(base,key,value,node=null) {
        if(base==null)throw new LuaRuntimeError("attempt to index nil value",node,this.chunkName);
        if(base instanceof LuaTable){
            if(base.rawHas(key)||!this.rawMetamethod(base,"__newindex")){base.rawSet(key,value);return value;}
            const ni=this.rawMetamethod(base,"__newindex");
            if(ni instanceof LuaTable)return yield* this.setIndex(ni,key,value,node);
            if(typeof ni==="function"){yield* this.callValue(ni,[base,key,value],node);return value;}
        }
        base[key]=value;return value;
    }
    tableNext(table,key=null) {
        const entries=this.enumerateTable(table);
        if(key==null)return entries.length?new MultiReturn(entries[0]):new MultiReturn([null]);
        const idx=entries.findIndex(([k])=>k===key);return idx>=0&&idx+1<entries.length?new MultiReturn(entries[idx+1]):new MultiReturn([null]);
    }
    enumerateTable(table) {
        if(table instanceof LuaTable)return Array.from(table.map.entries());
        if(Array.isArray(table))return table.map((v,i)=>[i+1,v]);
        if(table&&typeof table.Get==="function"&&(typeof table.Count==="number"||typeof table.Length==="number")){const n=Number(table.Count??table.Length)||0;const out=[];for(let i=1;i<=n;i++){try{out.push([i,table.Get(i)]);}catch{}}return out;}
        if(table&&typeof table==="object")return Object.keys(table).map(k=>[k,table[k]]);
        return [];
    }
    makePairs(table) { return new LuaIterator(this.enumerateTable(table)); }
    makeIpairs(table) {
        const out=[];const n=this.luaLength(table);for(let i=1;i<=n;i++){const v=this.getIndexSync(table,i);if(v==null)break;out.push([i,v]);}return new LuaIterator(out);
    }
    tableUnpack(t,i=1,j=null) { j=j??this.luaLength(t);const a=[];for(let k=i;k<=j;k++)a.push(this.getIndexSync(t,k));return new MultiReturn(a); }
    callSync(fn,args=[]) {
        if(typeof fn!=="function")throw new LuaRuntimeError("attempt to call a non-function value");
        if(fn[LUA_INTERNAL]) {
            const gen=this.makeCallGenerator(fn,args);let r=gen.next();
            while(!r.done){if(r.value instanceof SuspendRequest)throw new LuaRuntimeError("yield across synchronous host call");r=gen.next();}
            return unwrapSingle(r.value);
        }
        return fn(...args);
    }
    createLuaFunction(node, closureEnv, chunkName = this.chunkName) {
        const runtime=this;
        const wrapper=function(...args){return runtime.dispatchExternal(wrapper,args,wrapper.__luaName||"Lua callback");};
        Object.defineProperty(wrapper,LUA_INTERNAL,{value:{node,closureEnv,chunkName}});
        Object.defineProperty(wrapper,"__luaName",{value:`${chunkName}:${node.line||"?"}`,writable:true});
        return wrapper;
    }
    *invokeLuaFunction(wrapper,args) {
        const info=wrapper[LUA_INTERNAL];
        const fn=info.node;
        const env=new Environment(info.closureEnv);
        for(let i=0;i<fn.params.length;i++)env.define(fn.params[i],args[i]);
        env.define("...",new MultiReturn(args.slice(fn.params.length)));
        try{yield* this.execBlock(fn.body,env);return new MultiReturn([]);}catch(sig){if(sig instanceof ReturnSignal)return new MultiReturn(sig.values);throw sig;}
    }
    *callValue(callee,args,node=null) {
        this.watchdog(node);
        callee=unwrapSingle(callee);
        if(typeof callee!=="function")throw new LuaRuntimeError(`attempt to call a ${luaType(callee)} value`,node,this.chunkName);
        if(callee[LUA_INTERNAL])return yield* this.invokeLuaFunction(callee,args);
        if(callee[LUA_NATIVE])return yield* callee[LUA_NATIVE](this,args,callee);
        let result;
        try{result=callee(...args);}catch(e){throw e instanceof Error?e:new LuaRuntimeError(String(e),node,this.chunkName);}
        if(result instanceof SuspendRequest){const resumed=yield result;return resumed instanceof MultiReturn?resumed:resumed;}
        if(isPromise(result)){const resumed=yield new SuspendRequest("promise",{promise:result});return resumed instanceof MultiReturn?resumed:unwrapSingle(resumed);}
        return result;
    }
    makeCallGenerator(callable,args) {
        const runtime=this;
        return (function*(){return yield* runtime.callValue(callable,args,null);})();
    }
    dispatchExternal(callback,args=[],label="Lua callback") {
        if(typeof callback!=="function")return undefined;
        if(!callback[LUA_INTERNAL]&&!callback[LUA_NATIVE])return callback(...args);
        const task=this.scheduler.createTaskFromCallable(callback,args,{label});
        const out=this.scheduler.runTask(task);
        if(out.error)throw out.error;
        if(out.done)return unwrapSingle(out.value);
        return undefined;
    }
    resumeManualThread(th,args=[]) {
        if(!th?.[LUA_THREAD])throw new LuaRuntimeError("thread expected");
        if(th.status==="dead")return [false,"cannot resume dead coroutine"];
        if(!th.generator){th.generator=this.makeCallGenerator(th.func,args);th.status="running";}
        let r;
        try{r=th.generator.next(th.lastValues.length?new MultiReturn(th.lastValues):undefined);}catch(e){th.status="dead";return [false,e?.message||String(e)];}
        th.lastValues=[];
        if(r.done){th.status="dead";return asValues(r.value);}
        if(r.value instanceof SuspendRequest&&r.value.kind==="manualYield"){th.status="suspended";return r.value.values||[];}
        // A scheduler wait inside a manual coroutine is converted into suspension;
        // it can be resumed explicitly later rather than blocking the parent VM.
        th.status="suspended";return [];
    }
    *evalExprList(exprs,env) {
        const out=[];
        for(let i=0;i<exprs.length;i++){
            const v=yield* this.evalExpr(exprs[i],env);
            if(i===exprs.length-1&&v instanceof MultiReturn)out.push(...v.values);else out.push(unwrapSingle(v));
        }
        return out;
    }
    *evalExpr(node,env) {
        this.watchdog(node);
        switch(node.type){
            case "Literal": return node.value;
            case "Name": return env.get(node.name);
            case "Vararg": return env.get("...")||new MultiReturn([]);
            case "Function": return this.createLuaFunction(node,env,this.chunkName);
            case "Table": {
                const t=new LuaTable(this);let ai=1;
                for(const f of node.fields){
                    if(f.kind==="array"){const v=yield* this.evalExpr(f.value,env);if(v instanceof MultiReturn){for(const x of v.values)t.rawSet(ai++,x);}else t.rawSet(ai++,v);}
                    else if(f.kind==="name")t.rawSet(f.name,unwrapSingle(yield* this.evalExpr(f.value,env)));
                    else{const k=unwrapSingle(yield* this.evalExpr(f.key,env));const v=unwrapSingle(yield* this.evalExpr(f.value,env));t.rawSet(k,v);}
                }return t;
            }
            case "Member": {const b=unwrapSingle(yield* this.evalExpr(node.base,env));return yield* this.getIndex(b,node.key,node);}
            case "Index": {const b=unwrapSingle(yield* this.evalExpr(node.base,env));const k=unwrapSingle(yield* this.evalExpr(node.key,env));return yield* this.getIndex(b,k,node);}
            case "Call": {
                let callee,self=null;
                if(node.self){self=unwrapSingle(yield* this.evalExpr(node.self,env));callee=yield* this.getIndex(self,node.callee.key,node);}
                else callee=yield* this.evalExpr(node.callee,env);
                const args=[];
                for(let i=0;i<node.args.length;i++){
                    const v=yield* this.evalExpr(node.args[i],env);
                    if(i===node.args.length-1&&v instanceof MultiReturn)args.push(...v.values);else args.push(unwrapSingle(v));
                }
                if(node.self)args.unshift(self);
                return yield* this.callValue(callee,args,node);
            }
            case "Unary": {
                const v=unwrapSingle(yield* this.evalExpr(node.arg,env));
                if(node.op==="not")return !luaTruthy(v);
                if(node.op==="#")return this.luaLength(v);
                if(node.op==="~")return (~(Number(v)||0))>>>0;
                if(node.op==="-"){
                    if(isVectorLike(v))return makeVector3(-v.X,-v.Y,-v.Z);
                    const mm=this.rawMetamethod(v,"__unm");if(mm)return unwrapSingle(yield* this.callValue(mm,[v],node));
                    return -(Number(v)||0);
                }
                return null;
            }
            case "Binary": return yield* this.evalBinary(node,env);
            case "IfExpr": return luaTruthy(unwrapSingle(yield* this.evalExpr(node.test,env))) ? yield* this.evalExpr(node.consequent,env) : yield* this.evalExpr(node.alternate,env);
            default: throw new LuaRuntimeError(`unknown expression ${node.type}`,node,this.chunkName);
        }
    }
    *evalBinary(node,env) {
        const op=node.op;
        const a=unwrapSingle(yield* this.evalExpr(node.left,env));
        if(op==="and")return luaTruthy(a)?yield* this.evalExpr(node.right,env):a;
        if(op==="or")return luaTruthy(a)?a:yield* this.evalExpr(node.right,env);
        const b=unwrapSingle(yield* this.evalExpr(node.right,env));
        if(op==="==")return yield* this.luaEqual(a,b,node);
        if(op==="~=")return !(yield* this.luaEqual(a,b,node));
        if(["<",">","<=",">="].includes(op)){
            const mm=this.rawMetamethod(a,op==="<"?"__lt":op==="<="?"__le":null)||this.rawMetamethod(b,op==="<"?"__lt":op==="<="?"__le":null);
            if(mm){const r=luaTruthy(unwrapSingle(yield* this.callValue(mm,[a,b],node)));if(op===">")return !r&&!(yield* this.luaEqual(a,b,node));if(op===">=")return !r;return r;}
            if(op==="<")return a<b;if(op===">")return a>b;if(op==="<=")return a<=b;return a>=b;
        }
        if(op==="..")return this.toString(a)+this.toString(b);
        if(isCFrameLike(a)||isCFrameLike(b))return this.cframeBinary(op,a,b,node);
        if(isVectorLike(a)||isVectorLike(b))return this.vectorBinary(op,a,b,node);
        const metamap={"+":"__add","-":"__sub","*":"__mul","/":"__div","//":"__idiv","%":"__mod","^":"__pow","..":"__concat"};
        const mm=metamap[op]&&(this.rawMetamethod(a,metamap[op])||this.rawMetamethod(b,metamap[op]));
        if(mm)return unwrapSingle(yield* this.callValue(mm,[a,b],node));
        switch(op){case "+":return Number(a)+Number(b);case "-":return Number(a)-Number(b);case "*":return Number(a)*Number(b);case "/":return Number(a)/Number(b);case "//":return Math.floor(Number(a)/Number(b));case "%":return ((Number(a)%Number(b))+Number(b))%Number(b);case "^":return Number(a)**Number(b);case "|":return (Number(a)|Number(b))>>>0;case "&":return (Number(a)&Number(b))>>>0;case "~":return (Number(a)^Number(b))>>>0;case "<<":return (Number(a)<<Number(b))>>>0;case ">>":return Number(a)>>>Number(b);}
        throw new LuaRuntimeError(`unsupported binary operator ${op}`,node,this.chunkName);
    }
    *luaEqual(a,b,node) {
        if(a===b)return true;
        const mm=this.rawMetamethod(a,"__eq")||this.rawMetamethod(b,"__eq");if(mm)return luaTruthy(unwrapSingle(yield* this.callValue(mm,[a,b],node)));
        if(isVectorLike(a)&&isVectorLike(b))return a.X===b.X&&a.Y===b.Y&&a.Z===b.Z;
        return false;
    }
    cframeBinary(op,a,b,node) {
        if (isCFrameLike(a) && op === "*" && (isCFrameLike(b) || isVectorLike(b))) {
            const multiply = a.Multiply || a.mul || a.ToWorldSpace;
            if (typeof multiply === "function") return multiply(b);
        }
        if (isCFrameLike(a) && (op === "+" || op === "-") && isVectorLike(b)) {
            const cframeApi = this.global.get("CFrame");
            if (cframeApi && typeof cframeApi.new === "function") {
                const offset = op === "+" ? b : makeVector3(-b.X, -b.Y, -b.Z);
                const translation = cframeApi.new(offset);
                const multiply = translation?.Multiply || translation?.mul || translation?.ToWorldSpace;
                if (typeof multiply === "function") return multiply(a);
            }
        }
        throw new LuaRuntimeError(`attempt to ${op} incompatible CFrame value`,node,this.chunkName);
    }
    vectorBinary(op,a,b,node) {
        if(op==="+"&&isVectorLike(a)&&isVectorLike(b))return makeVector3(a.X+b.X,a.Y+b.Y,a.Z+b.Z);
        if(op==="-"&&isVectorLike(a)&&isVectorLike(b))return makeVector3(a.X-b.X,a.Y-b.Y,a.Z-b.Z);
        if(op==="*"&&isVectorLike(a)&&typeof b==="number")return makeVector3(a.X*b,a.Y*b,a.Z*b);
        if(op==="*"&&typeof a==="number"&&isVectorLike(b))return makeVector3(a*b.X,a*b.Y,a*b.Z);
        if(op==="*"&&isVectorLike(a)&&isVectorLike(b))return makeVector3(a.X*b.X,a.Y*b.Y,a.Z*b.Z);
        if(op==="/"&&isVectorLike(a)&&typeof b==="number")return makeVector3(a.X/b,a.Y/b,a.Z/b);
        if(op==="/"&&isVectorLike(a)&&isVectorLike(b))return makeVector3(a.X/b.X,a.Y/b.Y,a.Z/b.Z);
        throw new LuaRuntimeError(`attempt to ${op} incompatible Vector3 value`,node,this.chunkName);
    }
    *assignTarget(target,value,env) {
        if(target.type==="Name"){env.set(target.name,value);return;}
        if(target.type==="Member"){const b=unwrapSingle(yield* this.evalExpr(target.base,env));yield* this.setIndex(b,target.key,value,target);return;}
        if(target.type==="Index"){const b=unwrapSingle(yield* this.evalExpr(target.base,env));const k=unwrapSingle(yield* this.evalExpr(target.key,env));yield* this.setIndex(b,k,value,target);return;}
        throw new LuaRuntimeError("invalid assignment target",target,this.chunkName);
    }
    *execBlock(body,env) {
        for(const stmt of body){this.watchdog(stmt);yield* this.execStmt(stmt,env);}
    }
    *execStmt(stmt,env) {
        switch(stmt.type){
            case "Noop": return;
            case "Local": {const vals=yield* this.evalExprList(stmt.values,env);stmt.names.forEach((n,i)=>env.define(n,vals[i]));return;}
            case "LocalFunction": {env.define(stmt.name,null);const fn=this.createLuaFunction(stmt.func,env,this.chunkName);env.set(stmt.name,fn);return;}
            case "Assign": {const vals=yield* this.evalExprList(stmt.values,env);for(let i=0;i<stmt.targets.length;i++)yield* this.assignTarget(stmt.targets[i],vals[i],env);return;}
            case "CompoundAssign": {const current=unwrapSingle(yield* this.evalExpr(stmt.target,env));const right=unwrapSingle(yield* this.evalExpr(stmt.value,env));const fake={type:"Binary",op:stmt.op,left:{type:"Literal",value:current,line:stmt.line},right:{type:"Literal",value:right,line:stmt.line},line:stmt.line};const v=yield* this.evalBinary(fake,new Environment());yield* this.assignTarget(stmt.target,v,env);return;}
            case "CallStmt": {yield* this.evalExpr(stmt.expr,env);return;}
            case "If": {for(const b of stmt.branches){if(luaTruthy(unwrapSingle(yield* this.evalExpr(b.test,env)))){yield* this.execBlock(b.body,new Environment(env));return;}}if(stmt.elseBody.length)yield* this.execBlock(stmt.elseBody,new Environment(env));return;}
            case "While": {while(luaTruthy(unwrapSingle(yield* this.evalExpr(stmt.test,env)))){this.watchdog(stmt);try{yield* this.execBlock(stmt.body,new Environment(env));}catch(s){if(s instanceof BreakSignal)break;if(s instanceof ContinueSignal)continue;throw s;}}return;}
            case "Repeat": {while(true){this.watchdog(stmt);const loopEnv=new Environment(env);try{yield* this.execBlock(stmt.body,loopEnv);}catch(s){if(s instanceof BreakSignal)break;if(!(s instanceof ContinueSignal))throw s;}if(luaTruthy(unwrapSingle(yield* this.evalExpr(stmt.test,loopEnv))))break;}return;}
            case "NumericFor": {const start=Number(unwrapSingle(yield* this.evalExpr(stmt.start,env)))||0, finish=Number(unwrapSingle(yield* this.evalExpr(stmt.finish,env)))||0, step=Number(unwrapSingle(yield* this.evalExpr(stmt.step,env)))||1;if(step===0)throw new LuaRuntimeError("for step is zero",stmt,this.chunkName);for(let i=start;step>0?i<=finish:i>=finish;i+=step){this.watchdog(stmt);const loopEnv=new Environment(env);loopEnv.define(stmt.name,i);try{yield* this.execBlock(stmt.body,loopEnv);}catch(s){if(s instanceof BreakSignal)break;if(s instanceof ContinueSignal)continue;throw s;}}return;}
            case "GenericFor": {const vals=yield* this.evalExprList(stmt.iter,env);let iterable=null;if(vals[0]?.[LUA_ITERATOR])iterable=vals[0];else if(vals[0]&&typeof vals[0][Symbol.iterator]==="function"&&typeof vals[0]!=="string")iterable=vals[0];else if(typeof vals[0]==="function"){const fn=vals[0],state=vals[1],initial=vals[2];const arr=[];let control=initial;for(let guard=0;guard<100000;guard++){this.watchdog(stmt);const r=yield* this.callValue(fn,[state,control],stmt);const rv=asValues(r);control=rv[0];if(control==null)break;arr.push(rv);}iterable=arr;}else iterable=this.makePairs(vals[0]);for(const item of iterable){this.watchdog(stmt);const iv=Array.isArray(item)?item:asValues(item);const loopEnv=new Environment(env);stmt.names.forEach((n,i)=>loopEnv.define(n,iv[i]));try{yield* this.execBlock(stmt.body,loopEnv);}catch(s){if(s instanceof BreakSignal)break;if(s instanceof ContinueSignal)continue;throw s;}}return;}
            case "Do": yield* this.execBlock(stmt.body,new Environment(env));return;
            case "Return": {const vals=yield* this.evalExprList(stmt.values,env);throw new ReturnSignal(vals);}
            case "Break": throw new BreakSignal();
            case "Continue": throw new ContinueSignal();
            default: throw new LuaRuntimeError(`unknown statement ${stmt.type}`,stmt,this.chunkName);
        }
    }
    compile(source,chunkName="Luau") {
        const lexer=new Lexer(source,chunkName);const tokens=lexer.run();const parser=new Parser(tokens,chunkName);const ast=parser.parseChunk();
        const fnNode={type:"Function",params:[],vararg:true,body:ast.body,line:1};
        const fn=this.createLuaFunction(fnNode,this.global,chunkName);fn.__luaName=chunkName;return fn;
    }
}

class LuauState {
    static async createAsync(initialEnv = {}) {
        return new LuauState(initialEnv);
    }
    constructor(initialEnv = {}) {
        this.runtime = new InterpreterRuntime(initialEnv);
        this.destroyed = false;
        this.env = new Proxy({}, {
            get: (_t,p)=>this.runtime.global.get(p),
            set: (_t,p,v)=>{this.runtime.global.set(p,v);return true;},
            has: (_t,p)=>this.runtime.global.has(p),
        });
    }
    loadstring(source, chunkName = "Luau", throwOnCompilationError = false) {
        if (this.destroyed) throw new Error("Cannot use destroyed Luau state");
        try {
            this.runtime.chunkName = chunkName;
            return this.runtime.compile(source, chunkName);
        } catch (error) {
            if (throwOnCompilationError) throw error;
            return error?.message || String(error);
        }
    }
    getStats() { return this.runtime.scheduler.stats(); }
    step(now = nowSeconds()) { return this.runtime.scheduler.tick(now); }
    destroy() {
        this.destroyed = true;
        for (const t of Array.from(this.runtime.scheduler.tasks)) this.runtime.scheduler.cancelTask(t,"state destroyed");
        this.runtime.runService.Stepped._disconnectAll();
        this.runtime.runService.Heartbeat._disconnectAll();
        this.runtime.runService.RenderStepped._disconnectAll();
    }
}

function Mutable(value = {}) {
    // luau-web needed a special Map Proxy so WASM could mutate JS values. This
    // runtime executes in JavaScript and therefore needs no bridge wrapper at all.
    // Preserve object identity exactly; that also eliminates a major source of
    // proxy churn and stale references.
    if ((typeof value === "object" && value !== null) || typeof value === "function") {
        try { Object.defineProperty(value, MUTABLE_MARK, { value:true, configurable:true }); } catch {}
    }
    return value;
}

function getLuauRuntimeInfo() {
    return {
        name: "Blox JS Luau Runtime",
        implementation: "pure JavaScript interpreter",
        wasm: false,
        imports: 0,
        asyncify: false,
        jspi: false,
        version: "0.3.2-classic-waitfix",
        runtimeId: "BLOX_PURE_JS_VM_032_WAITFIX",
    };
}

export {
    LuauState,
    Mutable,
    CompileError,
    LuaRuntimeError,
    LuaMultiReturn,
    getLuauRuntimeInfo
};
