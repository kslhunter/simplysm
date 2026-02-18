import {
  g as ie,
  f as Ee,
  c as C,
  b as I,
  i as $,
  n as Ze,
  j as z,
  m as J,
  k as Ae,
  t as U,
  a as Zt,
  s as Ir,
  x as Er,
  y as Ar,
  h as Mr,
} from "./index-DaQvuWeP.js";
import { b as Me, o as G, a as A } from "./atoms.css-WCFmS3R-.js";
import { T as Tr, a as Lr } from "./topbar-DloMbu3D.js";
/* empty css                              */ /* empty css                              */ import "./IconMenu2-BvvTiCnB.js";
const as = Symbol.for("yaml.alias"),
  es = Symbol.for("yaml.document"),
  le = Symbol.for("yaml.map"),
  Xn = Symbol.for("yaml.pair"),
  se = Symbol.for("yaml.scalar"),
  Te = Symbol.for("yaml.seq"),
  Q = Symbol.for("yaml.node.type"),
  ue = (n) => !!n && typeof n == "object" && n[Q] === as,
  ge = (n) => !!n && typeof n == "object" && n[Q] === es,
  Le = (n) => !!n && typeof n == "object" && n[Q] === le,
  L = (n) => !!n && typeof n == "object" && n[Q] === Xn,
  T = (n) => !!n && typeof n == "object" && n[Q] === se,
  xe = (n) => !!n && typeof n == "object" && n[Q] === Te;
function x(n) {
  if (n && typeof n == "object")
    switch (n[Q]) {
      case le:
      case Te:
        return !0;
    }
  return !1;
}
function D(n) {
  if (n && typeof n == "object")
    switch (n[Q]) {
      case as:
      case le:
      case se:
      case Te:
        return !0;
    }
  return !1;
}
const Zn = (n) => (T(n) || x(n)) && !!n.anchor,
  H = Symbol("break visit"),
  ei = Symbol("skip children"),
  te = Symbol("remove node");
function ye(n, e) {
  const t = ti(e);
  ge(n)
    ? ve(null, n.contents, t, Object.freeze([n])) === te && (n.contents = null)
    : ve(null, n, t, Object.freeze([]));
}
ye.BREAK = H;
ye.SKIP = ei;
ye.REMOVE = te;
function ve(n, e, t, s) {
  const i = si(n, e, t, s);
  if (D(i) || L(i)) return (ni(n, s, i), ve(n, i, t, s));
  if (typeof i != "symbol") {
    if (x(e)) {
      s = Object.freeze(s.concat(e));
      for (let r = 0; r < e.items.length; ++r) {
        const a = ve(r, e.items[r], t, s);
        if (typeof a == "number") r = a - 1;
        else {
          if (a === H) return H;
          a === te && (e.items.splice(r, 1), (r -= 1));
        }
      }
    } else if (L(e)) {
      s = Object.freeze(s.concat(e));
      const r = ve("key", e.key, t, s);
      if (r === H) return H;
      r === te && (e.key = null);
      const a = ve("value", e.value, t, s);
      if (a === H) return H;
      a === te && (e.value = null);
    }
  }
  return i;
}
async function bt(n, e) {
  const t = ti(e);
  ge(n)
    ? (await ke(null, n.contents, t, Object.freeze([n]))) === te && (n.contents = null)
    : await ke(null, n, t, Object.freeze([]));
}
bt.BREAK = H;
bt.SKIP = ei;
bt.REMOVE = te;
async function ke(n, e, t, s) {
  const i = await si(n, e, t, s);
  if (D(i) || L(i)) return (ni(n, s, i), ke(n, i, t, s));
  if (typeof i != "symbol") {
    if (x(e)) {
      s = Object.freeze(s.concat(e));
      for (let r = 0; r < e.items.length; ++r) {
        const a = await ke(r, e.items[r], t, s);
        if (typeof a == "number") r = a - 1;
        else {
          if (a === H) return H;
          a === te && (e.items.splice(r, 1), (r -= 1));
        }
      }
    } else if (L(e)) {
      s = Object.freeze(s.concat(e));
      const r = await ke("key", e.key, t, s);
      if (r === H) return H;
      r === te && (e.key = null);
      const a = await ke("value", e.value, t, s);
      if (a === H) return H;
      a === te && (e.value = null);
    }
  }
  return i;
}
function ti(n) {
  return typeof n == "object" && (n.Collection || n.Node || n.Value)
    ? Object.assign(
        { Alias: n.Node, Map: n.Node, Scalar: n.Node, Seq: n.Node },
        n.Value && { Map: n.Value, Scalar: n.Value, Seq: n.Value },
        n.Collection && { Map: n.Collection, Seq: n.Collection },
        n,
      )
    : n;
}
function si(n, e, t, s) {
  if (typeof t == "function") return t(n, e, s);
  if (Le(e)) return t.Map?.(n, e, s);
  if (xe(e)) return t.Seq?.(n, e, s);
  if (L(e)) return t.Pair?.(n, e, s);
  if (T(e)) return t.Scalar?.(n, e, s);
  if (ue(e)) return t.Alias?.(n, e, s);
}
function ni(n, e, t) {
  const s = e[e.length - 1];
  if (x(s)) s.items[n] = t;
  else if (L(s)) n === "key" ? (s.key = t) : (s.value = t);
  else if (ge(s)) s.contents = t;
  else {
    const i = ue(s) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${i} parent`);
  }
}
const xr = { "!": "%21", ",": "%2C", "[": "%5B", "]": "%5D", "{": "%7B", "}": "%7D" },
  Dr = (n) => n.replace(/[!,[\]{}]/g, (e) => xr[e]);
class R {
  constructor(e, t) {
    ((this.docStart = null),
      (this.docEnd = !1),
      (this.yaml = Object.assign({}, R.defaultYaml, e)),
      (this.tags = Object.assign({}, R.defaultTags, t)));
  }
  clone() {
    const e = new R(this.yaml, this.tags);
    return ((e.docStart = this.docStart), e);
  }
  atDocument() {
    const e = new R(this.yaml, this.tags);
    switch (this.yaml.version) {
      case "1.1":
        this.atNextDocument = !0;
        break;
      case "1.2":
        ((this.atNextDocument = !1),
          (this.yaml = { explicit: R.defaultYaml.explicit, version: "1.2" }),
          (this.tags = Object.assign({}, R.defaultTags)));
        break;
    }
    return e;
  }
  add(e, t) {
    this.atNextDocument &&
      ((this.yaml = { explicit: R.defaultYaml.explicit, version: "1.1" }),
      (this.tags = Object.assign({}, R.defaultTags)),
      (this.atNextDocument = !1));
    const s = e.trim().split(/[ \t]+/),
      i = s.shift();
    switch (i) {
      case "%TAG": {
        if (
          s.length !== 2 &&
          (t(0, "%TAG directive should contain exactly two parts"), s.length < 2)
        )
          return !1;
        const [r, a] = s;
        return ((this.tags[r] = a), !0);
      }
      case "%YAML": {
        if (((this.yaml.explicit = !0), s.length !== 1))
          return (t(0, "%YAML directive should contain exactly one part"), !1);
        const [r] = s;
        if (r === "1.1" || r === "1.2") return ((this.yaml.version = r), !0);
        {
          const a = /^\d+\.\d+$/.test(r);
          return (t(6, `Unsupported YAML version ${r}`, a), !1);
        }
      }
      default:
        return (t(0, `Unknown directive ${i}`, !0), !1);
    }
  }
  tagName(e, t) {
    if (e === "!") return "!";
    if (e[0] !== "!") return (t(`Not a valid tag: ${e}`), null);
    if (e[1] === "<") {
      const a = e.slice(2, -1);
      return a === "!" || a === "!!"
        ? (t(`Verbatim tags aren't resolved, so ${e} is invalid.`), null)
        : (e[e.length - 1] !== ">" && t("Verbatim tags must end with a >"), a);
    }
    const [, s, i] = e.match(/^(.*!)([^!]*)$/s);
    i || t(`The ${e} tag has no suffix`);
    const r = this.tags[s];
    if (r)
      try {
        return r + decodeURIComponent(i);
      } catch (a) {
        return (t(String(a)), null);
      }
    return s === "!" ? e : (t(`Could not resolve tag: ${e}`), null);
  }
  tagString(e) {
    for (const [t, s] of Object.entries(this.tags))
      if (e.startsWith(s)) return t + Dr(e.substring(s.length));
    return e[0] === "!" ? e : `!<${e}>`;
  }
  toString(e) {
    const t = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [],
      s = Object.entries(this.tags);
    let i;
    if (e && s.length > 0 && D(e.contents)) {
      const r = {};
      (ye(e.contents, (a, o) => {
        D(o) && o.tag && (r[o.tag] = !0);
      }),
        (i = Object.keys(r)));
    } else i = [];
    for (const [r, a] of s)
      (r === "!!" && a === "tag:yaml.org,2002:") ||
        ((!e || i.some((o) => o.startsWith(a))) && t.push(`%TAG ${r} ${a}`));
    return t.join(`
`);
  }
}
R.defaultYaml = { explicit: !1, version: "1.2" };
R.defaultTags = { "!!": "tag:yaml.org,2002:" };
function ii(n) {
  if (/[\x00-\x19\s,[\]{}]/.test(n)) {
    const t = `Anchor must not contain whitespace or control characters: ${JSON.stringify(n)}`;
    throw new Error(t);
  }
  return !0;
}
function ri(n) {
  const e = new Set();
  return (
    ye(n, {
      Value(t, s) {
        s.anchor && e.add(s.anchor);
      },
    }),
    e
  );
}
function ai(n, e) {
  for (let t = 1; ; ++t) {
    const s = `${n}${t}`;
    if (!e.has(s)) return s;
  }
}
function Fr(n, e) {
  const t = [],
    s = new Map();
  let i = null;
  return {
    onAnchor: (r) => {
      (t.push(r), i ?? (i = ri(n)));
      const a = ai(e, i);
      return (i.add(a), a);
    },
    setAnchors: () => {
      for (const r of t) {
        const a = s.get(r);
        if (typeof a == "object" && a.anchor && (T(a.node) || x(a.node))) a.node.anchor = a.anchor;
        else {
          const o = new Error("Failed to resolve repeated object (this should not happen)");
          throw ((o.source = r), o);
        }
      }
    },
    sourceObjects: s,
  };
}
function Ne(n, e, t, s) {
  if (s && typeof s == "object")
    if (Array.isArray(s))
      for (let i = 0, r = s.length; i < r; ++i) {
        const a = s[i],
          o = Ne(n, s, String(i), a);
        o === void 0 ? delete s[i] : o !== a && (s[i] = o);
      }
    else if (s instanceof Map)
      for (const i of Array.from(s.keys())) {
        const r = s.get(i),
          a = Ne(n, s, i, r);
        a === void 0 ? s.delete(i) : a !== r && s.set(i, a);
      }
    else if (s instanceof Set)
      for (const i of Array.from(s)) {
        const r = Ne(n, s, i, i);
        r === void 0 ? s.delete(i) : r !== i && (s.delete(i), s.add(r));
      }
    else
      for (const [i, r] of Object.entries(s)) {
        const a = Ne(n, s, i, r);
        a === void 0 ? delete s[i] : a !== r && (s[i] = a);
      }
  return n.call(e, t, s);
}
function W(n, e, t) {
  if (Array.isArray(n)) return n.map((s, i) => W(s, String(i), t));
  if (n && typeof n.toJSON == "function") {
    if (!t || !Zn(n)) return n.toJSON(e, t);
    const s = { aliasCount: 0, count: 1, res: void 0 };
    (t.anchors.set(n, s),
      (t.onCreate = (r) => {
        ((s.res = r), delete t.onCreate);
      }));
    const i = n.toJSON(e, t);
    return (t.onCreate && t.onCreate(i), i);
  }
  return typeof n == "bigint" && !t?.keep ? Number(n) : n;
}
class os {
  constructor(e) {
    Object.defineProperty(this, Q, { value: e });
  }
  clone() {
    const e = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return (this.range && (e.range = this.range.slice()), e);
  }
  toJS(e, { mapAsMap: t, maxAliasCount: s, onAnchor: i, reviver: r } = {}) {
    if (!ge(e)) throw new TypeError("A document argument is required");
    const a = {
        anchors: new Map(),
        doc: e,
        keep: !0,
        mapAsMap: t === !0,
        mapKeyWarned: !1,
        maxAliasCount: typeof s == "number" ? s : 100,
      },
      o = W(this, "", a);
    if (typeof i == "function") for (const { count: l, res: u } of a.anchors.values()) i(u, l);
    return typeof r == "function" ? Ne(r, { "": o }, "", o) : o;
  }
}
class wt extends os {
  constructor(e) {
    (super(as),
      (this.source = e),
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        },
      }));
  }
  resolve(e, t) {
    let s;
    t?.aliasResolveCache
      ? (s = t.aliasResolveCache)
      : ((s = []),
        ye(e, {
          Node: (r, a) => {
            (ue(a) || Zn(a)) && s.push(a);
          },
        }),
        t && (t.aliasResolveCache = s));
    let i;
    for (const r of s) {
      if (r === this) break;
      r.anchor === this.source && (i = r);
    }
    return i;
  }
  toJSON(e, t) {
    if (!t) return { source: this.source };
    const { anchors: s, doc: i, maxAliasCount: r } = t,
      a = this.resolve(i, t);
    if (!a) {
      const l = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(l);
    }
    let o = s.get(a);
    if ((o || (W(a, null, t), (o = s.get(a))), o?.res === void 0)) {
      const l = "This should not happen: Alias anchor was not resolved?";
      throw new ReferenceError(l);
    }
    if (
      r >= 0 &&
      ((o.count += 1),
      o.aliasCount === 0 && (o.aliasCount = ut(i, a, s)),
      o.count * o.aliasCount > r)
    ) {
      const l = "Excessive alias count indicates a resource exhaustion attack";
      throw new ReferenceError(l);
    }
    return o.res;
  }
  toString(e, t, s) {
    const i = `*${this.source}`;
    if (e) {
      if ((ii(this.source), e.options.verifyAliasOrder && !e.anchors.has(this.source))) {
        const r = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(r);
      }
      if (e.implicitKey) return `${i} `;
    }
    return i;
  }
}
function ut(n, e, t) {
  if (ue(e)) {
    const s = e.resolve(n),
      i = t && s && t.get(s);
    return i ? i.count * i.aliasCount : 0;
  } else if (x(e)) {
    let s = 0;
    for (const i of e.items) {
      const r = ut(n, i, t);
      r > s && (s = r);
    }
    return s;
  } else if (L(e)) {
    const s = ut(n, e.key, t),
      i = ut(n, e.value, t);
    return Math.max(s, i);
  }
  return 1;
}
const oi = (n) => !n || (typeof n != "function" && typeof n != "object");
class O extends os {
  constructor(e) {
    (super(se), (this.value = e));
  }
  toJSON(e, t) {
    return t?.keep ? this.value : W(this.value, e, t);
  }
  toString() {
    return String(this.value);
  }
}
O.BLOCK_FOLDED = "BLOCK_FOLDED";
O.BLOCK_LITERAL = "BLOCK_LITERAL";
O.PLAIN = "PLAIN";
O.QUOTE_DOUBLE = "QUOTE_DOUBLE";
O.QUOTE_SINGLE = "QUOTE_SINGLE";
const Pr = "tag:yaml.org,2002:";
function Br(n, e, t) {
  if (e) {
    const s = t.filter((r) => r.tag === e),
      i = s.find((r) => !r.format) ?? s[0];
    if (!i) throw new Error(`Tag ${e} not found`);
    return i;
  }
  return t.find((s) => s.identify?.(n) && !s.format);
}
function Ge(n, e, t) {
  if ((ge(n) && (n = n.contents), D(n))) return n;
  if (L(n)) {
    const c = t.schema[le].createNode?.(t.schema, null, t);
    return (c.items.push(n), c);
  }
  (n instanceof String ||
    n instanceof Number ||
    n instanceof Boolean ||
    (typeof BigInt < "u" && n instanceof BigInt)) &&
    (n = n.valueOf());
  const { aliasDuplicateObjects: s, onAnchor: i, onTagObj: r, schema: a, sourceObjects: o } = t;
  let l;
  if (s && n && typeof n == "object") {
    if (((l = o.get(n)), l)) return (l.anchor ?? (l.anchor = i(n)), new wt(l.anchor));
    ((l = { anchor: null, node: null }), o.set(n, l));
  }
  e?.startsWith("!!") && (e = Pr + e.slice(2));
  let u = Br(n, e, a.tags);
  if (!u) {
    if ((n && typeof n.toJSON == "function" && (n = n.toJSON()), !n || typeof n != "object")) {
      const c = new O(n);
      return (l && (l.node = c), c);
    }
    u = n instanceof Map ? a[le] : Symbol.iterator in Object(n) ? a[Te] : a[le];
  }
  r && (r(u), delete t.onTagObj);
  const p = u?.createNode
    ? u.createNode(t.schema, n, t)
    : typeof u?.nodeClass?.from == "function"
      ? u.nodeClass.from(t.schema, n, t)
      : new O(n);
  return (e ? (p.tag = e) : u.default || (p.tag = u.tag), l && (l.node = p), p);
}
function pt(n, e, t) {
  let s = t;
  for (let i = e.length - 1; i >= 0; --i) {
    const r = e[i];
    if (typeof r == "number" && Number.isInteger(r) && r >= 0) {
      const a = [];
      ((a[r] = s), (s = a));
    } else s = new Map([[r, s]]);
  }
  return Ge(s, void 0, {
    aliasDuplicateObjects: !1,
    keepUndefined: !1,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: n,
    sourceObjects: new Map(),
  });
}
const ze = (n) => n == null || (typeof n == "object" && !!n[Symbol.iterator]().next().done);
class li extends os {
  constructor(e, t) {
    (super(e),
      Object.defineProperty(this, "schema", {
        value: t,
        configurable: !0,
        enumerable: !1,
        writable: !0,
      }));
  }
  clone(e) {
    const t = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return (
      e && (t.schema = e),
      (t.items = t.items.map((s) => (D(s) || L(s) ? s.clone(e) : s))),
      this.range && (t.range = this.range.slice()),
      t
    );
  }
  addIn(e, t) {
    if (ze(e)) this.add(t);
    else {
      const [s, ...i] = e,
        r = this.get(s, !0);
      if (x(r)) r.addIn(i, t);
      else if (r === void 0 && this.schema) this.set(s, pt(this.schema, i, t));
      else throw new Error(`Expected YAML collection at ${s}. Remaining path: ${i}`);
    }
  }
  deleteIn(e) {
    const [t, ...s] = e;
    if (s.length === 0) return this.delete(t);
    const i = this.get(t, !0);
    if (x(i)) return i.deleteIn(s);
    throw new Error(`Expected YAML collection at ${t}. Remaining path: ${s}`);
  }
  getIn(e, t) {
    const [s, ...i] = e,
      r = this.get(s, !0);
    return i.length === 0 ? (!t && T(r) ? r.value : r) : x(r) ? r.getIn(i, t) : void 0;
  }
  hasAllNullValues(e) {
    return this.items.every((t) => {
      if (!L(t)) return !1;
      const s = t.value;
      return (
        s == null || (e && T(s) && s.value == null && !s.commentBefore && !s.comment && !s.tag)
      );
    });
  }
  hasIn(e) {
    const [t, ...s] = e;
    if (s.length === 0) return this.has(t);
    const i = this.get(t, !0);
    return x(i) ? i.hasIn(s) : !1;
  }
  setIn(e, t) {
    const [s, ...i] = e;
    if (i.length === 0) this.set(s, t);
    else {
      const r = this.get(s, !0);
      if (x(r)) r.setIn(i, t);
      else if (r === void 0 && this.schema) this.set(s, pt(this.schema, i, t));
      else throw new Error(`Expected YAML collection at ${s}. Remaining path: ${i}`);
    }
  }
}
const jr = (n) => n.replace(/^(?!$)(?: $)?/gm, "#");
function re(n, e) {
  return /^\n+$/.test(n) ? n.substring(1) : e ? n.replace(/^(?! *$)/gm, e) : n;
}
const de = (n, e, t) =>
    n.endsWith(`
`)
      ? re(t, e)
      : t.includes(`
`)
        ? `
` + re(t, e)
        : (n.endsWith(" ") ? "" : " ") + t,
  ci = "flow",
  ts = "block",
  ft = "quoted";
function St(
  n,
  e,
  t = "flow",
  { indentAtStart: s, lineWidth: i = 80, minContentWidth: r = 20, onFold: a, onOverflow: o } = {},
) {
  if (!i || i < 0) return n;
  i < r && (r = 0);
  const l = Math.max(1 + r, 1 + i - e.length);
  if (n.length <= l) return n;
  const u = [],
    p = {};
  let c = i - e.length;
  typeof s == "number" && (s > i - Math.max(2, r) ? u.push(0) : (c = i - s));
  let d,
    m,
    g = !1,
    f = -1,
    h = -1,
    y = -1;
  t === ts && ((f = Kn(n, f, e.length)), f !== -1 && (c = f + l));
  for (let v; (v = n[(f += 1)]); ) {
    if (t === ft && v === "\\") {
      switch (((h = f), n[f + 1])) {
        case "x":
          f += 3;
          break;
        case "u":
          f += 5;
          break;
        case "U":
          f += 9;
          break;
        default:
          f += 1;
      }
      y = f;
    }
    if (
      v ===
      `
`
    )
      (t === ts && (f = Kn(n, f, e.length)), (c = f + e.length + l), (d = void 0));
    else {
      if (
        v === " " &&
        m &&
        m !== " " &&
        m !==
          `
` &&
        m !== "	"
      ) {
        const k = n[f + 1];
        k &&
          k !== " " &&
          k !==
            `
` &&
          k !== "	" &&
          (d = f);
      }
      if (f >= c)
        if (d) (u.push(d), (c = d + l), (d = void 0));
        else if (t === ft) {
          for (; m === " " || m === "	"; ) ((m = v), (v = n[(f += 1)]), (g = !0));
          const k = f > y + 1 ? f - 2 : h - 1;
          if (p[k]) return n;
          (u.push(k), (p[k] = !0), (c = k + l), (d = void 0));
        } else g = !0;
    }
    m = v;
  }
  if ((g && o && o(), u.length === 0)) return n;
  a && a();
  let b = n.slice(0, u[0]);
  for (let v = 0; v < u.length; ++v) {
    const k = u[v],
      N = u[v + 1] || n.length;
    k === 0
      ? (b = `
${e}${n.slice(0, N)}`)
      : (t === ft && p[k] && (b += `${n[k]}\\`),
        (b += `
${e}${n.slice(k + 1, N)}`));
  }
  return b;
}
function Kn(n, e, t) {
  let s = e,
    i = e + 1,
    r = n[i];
  for (; r === " " || r === "	"; )
    if (e < i + t) r = n[++e];
    else {
      do r = n[++e];
      while (
        r &&
        r !==
          `
`
      );
      ((s = e), (i = e + 1), (r = n[i]));
    }
  return s;
}
const vt = (n, e) => ({
    indentAtStart: e ? n.indent.length : n.indentAtStart,
    lineWidth: n.options.lineWidth,
    minContentWidth: n.options.minContentWidth,
  }),
  kt = (n) => /^(%|---|\.\.\.)/m.test(n);
function Kr(n, e, t) {
  if (!e || e < 0) return !1;
  const s = e - t,
    i = n.length;
  if (i <= s) return !1;
  for (let r = 0, a = 0; r < i; ++r)
    if (
      n[r] ===
      `
`
    ) {
      if (r - a > s) return !0;
      if (((a = r + 1), i - a <= s)) return !1;
    }
  return !0;
}
function Je(n, e) {
  const t = JSON.stringify(n);
  if (e.options.doubleQuotedAsJSON) return t;
  const { implicitKey: s } = e,
    i = e.options.doubleQuotedMinMultiLineLength,
    r = e.indent || (kt(n) ? "  " : "");
  let a = "",
    o = 0;
  for (let l = 0, u = t[l]; u; u = t[++l])
    if (
      (u === " " &&
        t[l + 1] === "\\" &&
        t[l + 2] === "n" &&
        ((a += t.slice(o, l) + "\\ "), (l += 1), (o = l), (u = "\\")),
      u === "\\")
    )
      switch (t[l + 1]) {
        case "u":
          {
            a += t.slice(o, l);
            const p = t.substr(l + 2, 4);
            switch (p) {
              case "0000":
                a += "\\0";
                break;
              case "0007":
                a += "\\a";
                break;
              case "000b":
                a += "\\v";
                break;
              case "001b":
                a += "\\e";
                break;
              case "0085":
                a += "\\N";
                break;
              case "00a0":
                a += "\\_";
                break;
              case "2028":
                a += "\\L";
                break;
              case "2029":
                a += "\\P";
                break;
              default:
                p.substr(0, 2) === "00" ? (a += "\\x" + p.substr(2)) : (a += t.substr(l, 6));
            }
            ((l += 5), (o = l + 1));
          }
          break;
        case "n":
          if (s || t[l + 2] === '"' || t.length < i) l += 1;
          else {
            for (
              a +=
                t.slice(o, l) +
                `

`;
              t[l + 2] === "\\" && t[l + 3] === "n" && t[l + 4] !== '"';
            )
              ((a += `
`),
                (l += 2));
            ((a += r), t[l + 2] === " " && (a += "\\"), (l += 1), (o = l + 1));
          }
          break;
        default:
          l += 1;
      }
  return ((a = o ? a + t.slice(o) : t), s ? a : St(a, r, ft, vt(e, !1)));
}
function ss(n, e) {
  if (
    e.options.singleQuote === !1 ||
    (e.implicitKey &&
      n.includes(`
`)) ||
    /[ \t]\n|\n[ \t]/.test(n)
  )
    return Je(n, e);
  const t = e.indent || (kt(n) ? "  " : ""),
    s =
      "'" +
      n.replace(/'/g, "''").replace(
        /\n+/g,
        `$&
${t}`,
      ) +
      "'";
  return e.implicitKey ? s : St(s, t, ci, vt(e, !1));
}
function _e(n, e) {
  const { singleQuote: t } = e.options;
  let s;
  if (t === !1) s = Je;
  else {
    const i = n.includes('"'),
      r = n.includes("'");
    i && !r ? (s = ss) : r && !i ? (s = Je) : (s = t ? ss : Je);
  }
  return s(n, e);
}
let ns;
try {
  ns = new RegExp(
    `(^|(?<!
))
+(?!
|$)`,
    "g",
  );
} catch {
  ns = /\n+(?!\n|$)/g;
}
function dt({ comment: n, type: e, value: t }, s, i, r) {
  const { blockQuote: a, commentString: o, lineWidth: l } = s.options;
  if (!a || /\n[\t ]+$/.test(t)) return _e(t, s);
  const u = s.indent || (s.forceBlockIndent || kt(t) ? "  " : ""),
    p =
      a === "literal"
        ? !0
        : a === "folded" || e === O.BLOCK_FOLDED
          ? !1
          : e === O.BLOCK_LITERAL
            ? !0
            : !Kr(t, l, u.length);
  if (!t)
    return p
      ? `|
`
      : `>
`;
  let c, d;
  for (d = t.length; d > 0; --d) {
    const N = t[d - 1];
    if (
      N !==
        `
` &&
      N !== "	" &&
      N !== " "
    )
      break;
  }
  let m = t.substring(d);
  const g = m.indexOf(`
`);
  (g === -1 ? (c = "-") : t === m || g !== m.length - 1 ? ((c = "+"), r && r()) : (c = ""),
    m &&
      ((t = t.slice(0, -m.length)),
      m[m.length - 1] ===
        `
` && (m = m.slice(0, -1)),
      (m = m.replace(ns, `$&${u}`))));
  let f = !1,
    h,
    y = -1;
  for (h = 0; h < t.length; ++h) {
    const N = t[h];
    if (N === " ") f = !0;
    else if (
      N ===
      `
`
    )
      y = h;
    else break;
  }
  let b = t.substring(0, y < h ? y + 1 : h);
  b && ((t = t.substring(b.length)), (b = b.replace(/\n+/g, `$&${u}`)));
  let k = (f ? (u ? "2" : "1") : "") + c;
  if ((n && ((k += " " + o(n.replace(/ ?[\r\n]+/g, " "))), i && i()), !p)) {
    const N = t
      .replace(
        /\n+/g,
        `
$&`,
      )
      .replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2")
      .replace(/\n+/g, `$&${u}`);
    let _ = !1;
    const E = vt(s, !0);
    a !== "folded" &&
      e !== O.BLOCK_FOLDED &&
      (E.onOverflow = () => {
        _ = !0;
      });
    const w = St(`${b}${N}${m}`, u, ts, E);
    if (!_)
      return `>${k}
${u}${w}`;
  }
  return (
    (t = t.replace(/\n+/g, `$&${u}`)),
    `|${k}
${u}${b}${t}${m}`
  );
}
function Vr(n, e, t, s) {
  const { type: i, value: r } = n,
    { actualString: a, implicitKey: o, indent: l, indentStep: u, inFlow: p } = e;
  if (
    (o &&
      r.includes(`
`)) ||
    (p && /[[\]{},]/.test(r))
  )
    return _e(r, e);
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(r))
    return o ||
      p ||
      !r.includes(`
`)
      ? _e(r, e)
      : dt(n, e, t, s);
  if (
    !o &&
    !p &&
    i !== O.PLAIN &&
    r.includes(`
`)
  )
    return dt(n, e, t, s);
  if (kt(r)) {
    if (l === "") return ((e.forceBlockIndent = !0), dt(n, e, t, s));
    if (o && l === u) return _e(r, e);
  }
  const c = r.replace(
    /\n+/g,
    `$&
${l}`,
  );
  if (a) {
    const d = (f) => f.default && f.tag !== "tag:yaml.org,2002:str" && f.test?.test(c),
      { compat: m, tags: g } = e.doc.schema;
    if (g.some(d) || m?.some(d)) return _e(r, e);
  }
  return o ? c : St(c, l, ci, vt(e, !1));
}
function et(n, e, t, s) {
  const { implicitKey: i, inFlow: r } = e,
    a = typeof n.value == "string" ? n : Object.assign({}, n, { value: String(n.value) });
  let { type: o } = n;
  o !== O.QUOTE_DOUBLE &&
    /[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(a.value) &&
    (o = O.QUOTE_DOUBLE);
  const l = (p) => {
    switch (p) {
      case O.BLOCK_FOLDED:
      case O.BLOCK_LITERAL:
        return i || r ? _e(a.value, e) : dt(a, e, t, s);
      case O.QUOTE_DOUBLE:
        return Je(a.value, e);
      case O.QUOTE_SINGLE:
        return ss(a.value, e);
      case O.PLAIN:
        return Vr(a, e, t, s);
      default:
        return null;
    }
  };
  let u = l(o);
  if (u === null) {
    const { defaultKeyType: p, defaultStringType: c } = e.options,
      d = (i && p) || c;
    if (((u = l(d)), u === null)) throw new Error(`Unsupported default string type ${d}`);
  }
  return u;
}
function ui(n, e) {
  const t = Object.assign(
    {
      blockQuote: !0,
      commentString: jr,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: !1,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: !0,
      indentSeq: !0,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: !1,
      singleQuote: null,
      trueStr: "true",
      verifyAliasOrder: !0,
    },
    n.schema.toStringOptions,
    e,
  );
  let s;
  switch (t.collectionStyle) {
    case "block":
      s = !1;
      break;
    case "flow":
      s = !0;
      break;
    default:
      s = null;
  }
  return {
    anchors: new Set(),
    doc: n,
    flowCollectionPadding: t.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof t.indent == "number" ? " ".repeat(t.indent) : "  ",
    inFlow: s,
    options: t,
  };
}
function qr(n, e) {
  if (e.tag) {
    const i = n.filter((r) => r.tag === e.tag);
    if (i.length > 0) return i.find((r) => r.format === e.format) ?? i[0];
  }
  let t, s;
  if (T(e)) {
    s = e.value;
    let i = n.filter((r) => r.identify?.(s));
    if (i.length > 1) {
      const r = i.filter((a) => a.test);
      r.length > 0 && (i = r);
    }
    t = i.find((r) => r.format === e.format) ?? i.find((r) => !r.format);
  } else ((s = e), (t = n.find((i) => i.nodeClass && s instanceof i.nodeClass)));
  if (!t) {
    const i = s?.constructor?.name ?? (s === null ? "null" : typeof s);
    throw new Error(`Tag not resolved for ${i} value`);
  }
  return t;
}
function Rr(n, e, { anchors: t, doc: s }) {
  if (!s.directives) return "";
  const i = [],
    r = (T(n) || x(n)) && n.anchor;
  r && ii(r) && (t.add(r), i.push(`&${r}`));
  const a = n.tag ?? (e.default ? null : e.tag);
  return (a && i.push(s.directives.tagString(a)), i.join(" "));
}
function Oe(n, e, t, s) {
  if (L(n)) return n.toString(e, t, s);
  if (ue(n)) {
    if (e.doc.directives) return n.toString(e);
    if (e.resolvedAliases?.has(n))
      throw new TypeError("Cannot stringify circular structure without alias nodes");
    (e.resolvedAliases ? e.resolvedAliases.add(n) : (e.resolvedAliases = new Set([n])),
      (n = n.resolve(e.doc)));
  }
  let i;
  const r = D(n) ? n : e.doc.createNode(n, { onTagObj: (l) => (i = l) });
  i ?? (i = qr(e.doc.schema.tags, r));
  const a = Rr(r, i, e);
  a.length > 0 && (e.indentAtStart = (e.indentAtStart ?? 0) + a.length + 1);
  const o =
    typeof i.stringify == "function"
      ? i.stringify(r, e, t, s)
      : T(r)
        ? et(r, e, t, s)
        : r.toString(e, t, s);
  return a
    ? T(r) || o[0] === "{" || o[0] === "["
      ? `${a} ${o}`
      : `${a}
${e.indent}${o}`
    : o;
}
function Hr({ key: n, value: e }, t, s, i) {
  const {
    allNullValues: r,
    doc: a,
    indent: o,
    indentStep: l,
    options: { commentString: u, indentSeq: p, simpleKeys: c },
  } = t;
  let d = (D(n) && n.comment) || null;
  if (c) {
    if (d) throw new Error("With simple keys, key nodes cannot have comments");
    if (x(n) || (!D(n) && typeof n == "object")) {
      const E = "With simple keys, collection cannot be used as a key value";
      throw new Error(E);
    }
  }
  let m =
    !c &&
    (!n ||
      (d && e == null && !t.inFlow) ||
      x(n) ||
      (T(n) ? n.type === O.BLOCK_FOLDED || n.type === O.BLOCK_LITERAL : typeof n == "object"));
  t = Object.assign({}, t, { allNullValues: !1, implicitKey: !m && (c || !r), indent: o + l });
  let g = !1,
    f = !1,
    h = Oe(
      n,
      t,
      () => (g = !0),
      () => (f = !0),
    );
  if (!m && !t.inFlow && h.length > 1024) {
    if (c)
      throw new Error(
        "With simple keys, single line scalar must not span more than 1024 characters",
      );
    m = !0;
  }
  if (t.inFlow) {
    if (r || e == null) return (g && s && s(), h === "" ? "?" : m ? `? ${h}` : h);
  } else if ((r && !c) || (e == null && m))
    return ((h = `? ${h}`), d && !g ? (h += de(h, t.indent, u(d))) : f && i && i(), h);
  (g && (d = null),
    m
      ? (d && (h += de(h, t.indent, u(d))),
        (h = `? ${h}
${o}:`))
      : ((h = `${h}:`), d && (h += de(h, t.indent, u(d)))));
  let y, b, v;
  (D(e)
    ? ((y = !!e.spaceBefore), (b = e.commentBefore), (v = e.comment))
    : ((y = !1), (b = null), (v = null), e && typeof e == "object" && (e = a.createNode(e))),
    (t.implicitKey = !1),
    !m && !d && T(e) && (t.indentAtStart = h.length + 1),
    (f = !1),
    !p &&
      l.length >= 2 &&
      !t.inFlow &&
      !m &&
      xe(e) &&
      !e.flow &&
      !e.tag &&
      !e.anchor &&
      (t.indent = t.indent.substring(2)));
  let k = !1;
  const N = Oe(
    e,
    t,
    () => (k = !0),
    () => (f = !0),
  );
  let _ = " ";
  if (d || y || b) {
    if (
      ((_ = y
        ? `
`
        : ""),
      b)
    ) {
      const E = u(b);
      _ += `
${re(E, t.indent)}`;
    }
    N === "" && !t.inFlow
      ? _ ===
          `
` &&
        v &&
        (_ = `

`)
      : (_ += `
${t.indent}`);
  } else if (!m && x(e)) {
    const E = N[0],
      w = N.indexOf(`
`),
      P = w !== -1,
      X = t.inFlow ?? e.flow ?? e.items.length === 0;
    if (P || !X) {
      let ne = !1;
      if (P && (E === "&" || E === "!")) {
        let B = N.indexOf(" ");
        (E === "&" && B !== -1 && B < w && N[B + 1] === "!" && (B = N.indexOf(" ", B + 1)),
          (B === -1 || w < B) && (ne = !0));
      }
      ne ||
        (_ = `
${t.indent}`);
    }
  } else
    (N === "" ||
      N[0] ===
        `
`) &&
      (_ = "");
  return (
    (h += _ + N),
    t.inFlow ? k && s && s() : v && !k ? (h += de(h, t.indent, u(v))) : f && i && i(),
    h
  );
}
function fi(n, e) {
  (n === "debug" || n === "warn") && console.warn(e);
}
const it = "<<",
  ae = {
    identify: (n) => n === it || (typeof n == "symbol" && n.description === it),
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new O(Symbol(it)), { addToJSMap: di }),
    stringify: () => it,
  },
  Ur = (n, e) =>
    (ae.identify(e) || (T(e) && (!e.type || e.type === O.PLAIN) && ae.identify(e.value))) &&
    n?.doc.schema.tags.some((t) => t.tag === ae.tag && t.default);
function di(n, e, t) {
  if (((t = n && ue(t) ? t.resolve(n.doc) : t), xe(t))) for (const s of t.items) Ut(n, e, s);
  else if (Array.isArray(t)) for (const s of t) Ut(n, e, s);
  else Ut(n, e, t);
}
function Ut(n, e, t) {
  const s = n && ue(t) ? t.resolve(n.doc) : t;
  if (!Le(s)) throw new Error("Merge sources must be maps or map aliases");
  const i = s.toJSON(null, n, Map);
  for (const [r, a] of i)
    e instanceof Map
      ? e.has(r) || e.set(r, a)
      : e instanceof Set
        ? e.add(r)
        : Object.prototype.hasOwnProperty.call(e, r) ||
          Object.defineProperty(e, r, { value: a, writable: !0, enumerable: !0, configurable: !0 });
  return e;
}
function hi(n, e, { key: t, value: s }) {
  if (D(t) && t.addToJSMap) t.addToJSMap(n, e, s);
  else if (Ur(n, t)) di(n, e, s);
  else {
    const i = W(t, "", n);
    if (e instanceof Map) e.set(i, W(s, i, n));
    else if (e instanceof Set) e.add(i);
    else {
      const r = Yr(t, i, n),
        a = W(s, r, n);
      r in e
        ? Object.defineProperty(e, r, { value: a, writable: !0, enumerable: !0, configurable: !0 })
        : (e[r] = a);
    }
  }
  return e;
}
function Yr(n, e, t) {
  if (e === null) return "";
  if (typeof e != "object") return String(e);
  if (D(n) && t?.doc) {
    const s = ui(t.doc, {});
    s.anchors = new Set();
    for (const r of t.anchors.keys()) s.anchors.add(r.anchor);
    ((s.inFlow = !0), (s.inStringifyKey = !0));
    const i = n.toString(s);
    if (!t.mapKeyWarned) {
      let r = JSON.stringify(i);
      (r.length > 40 && (r = r.substring(0, 36) + '..."'),
        fi(
          t.doc.options.logLevel,
          `Keys with collection values will be stringified due to JS Object restrictions: ${r}. Set mapAsMap: true to use object keys.`,
        ),
        (t.mapKeyWarned = !0));
    }
    return i;
  }
  return JSON.stringify(e);
}
function ls(n, e, t) {
  const s = Ge(n, void 0, t),
    i = Ge(e, void 0, t);
  return new q(s, i);
}
class q {
  constructor(e, t = null) {
    (Object.defineProperty(this, Q, { value: Xn }), (this.key = e), (this.value = t));
  }
  clone(e) {
    let { key: t, value: s } = this;
    return (D(t) && (t = t.clone(e)), D(s) && (s = s.clone(e)), new q(t, s));
  }
  toJSON(e, t) {
    const s = t?.mapAsMap ? new Map() : {};
    return hi(t, s, this);
  }
  toString(e, t, s) {
    return e?.doc ? Hr(this, e, t, s) : JSON.stringify(this);
  }
}
function pi(n, e, t) {
  return ((e.inFlow ?? n.flow) ? zr : Wr)(n, e, t);
}
function Wr(
  { comment: n, items: e },
  t,
  { blockItemPrefix: s, flowChars: i, itemIndent: r, onChompKeep: a, onComment: o },
) {
  const {
      indent: l,
      options: { commentString: u },
    } = t,
    p = Object.assign({}, t, { indent: r, type: null });
  let c = !1;
  const d = [];
  for (let g = 0; g < e.length; ++g) {
    const f = e[g];
    let h = null;
    if (D(f))
      (!c && f.spaceBefore && d.push(""),
        mt(t, d, f.commentBefore, c),
        f.comment && (h = f.comment));
    else if (L(f)) {
      const b = D(f.key) ? f.key : null;
      b && (!c && b.spaceBefore && d.push(""), mt(t, d, b.commentBefore, c));
    }
    c = !1;
    let y = Oe(
      f,
      p,
      () => (h = null),
      () => (c = !0),
    );
    (h && (y += de(y, r, u(h))), c && h && (c = !1), d.push(s + y));
  }
  let m;
  if (d.length === 0) m = i.start + i.end;
  else {
    m = d[0];
    for (let g = 1; g < d.length; ++g) {
      const f = d[g];
      m += f
        ? `
${l}${f}`
        : `
`;
    }
  }
  return (
    n
      ? ((m +=
          `
` + re(u(n), l)),
        o && o())
      : c && a && a(),
    m
  );
}
function zr({ items: n }, e, { flowChars: t, itemIndent: s }) {
  const {
    indent: i,
    indentStep: r,
    flowCollectionPadding: a,
    options: { commentString: o },
  } = e;
  s += r;
  const l = Object.assign({}, e, { indent: s, inFlow: !0, type: null });
  let u = !1,
    p = 0;
  const c = [];
  for (let g = 0; g < n.length; ++g) {
    const f = n[g];
    let h = null;
    if (D(f))
      (f.spaceBefore && c.push(""), mt(e, c, f.commentBefore, !1), f.comment && (h = f.comment));
    else if (L(f)) {
      const b = D(f.key) ? f.key : null;
      b && (b.spaceBefore && c.push(""), mt(e, c, b.commentBefore, !1), b.comment && (u = !0));
      const v = D(f.value) ? f.value : null;
      v
        ? (v.comment && (h = v.comment), v.commentBefore && (u = !0))
        : f.value == null && b?.comment && (h = b.comment);
    }
    h && (u = !0);
    let y = Oe(f, l, () => (h = null));
    (g < n.length - 1 && (y += ","),
      h && (y += de(y, s, o(h))),
      !u &&
        (c.length > p ||
          y.includes(`
`)) &&
        (u = !0),
      c.push(y),
      (p = c.length));
  }
  const { start: d, end: m } = t;
  if (c.length === 0) return d + m;
  if (!u) {
    const g = c.reduce((f, h) => f + h.length + 2, 2);
    u = e.options.lineWidth > 0 && g > e.options.lineWidth;
  }
  if (u) {
    let g = d;
    for (const f of c)
      g += f
        ? `
${r}${i}${f}`
        : `
`;
    return `${g}
${i}${m}`;
  } else return `${d}${a}${c.join(" ")}${a}${m}`;
}
function mt({ indent: n, options: { commentString: e } }, t, s, i) {
  if ((s && i && (s = s.replace(/^\n+/, "")), s)) {
    const r = re(e(s), n);
    t.push(r.trimStart());
  }
}
function he(n, e) {
  const t = T(e) ? e.value : e;
  for (const s of n)
    if (L(s) && (s.key === e || s.key === t || (T(s.key) && s.key.value === t))) return s;
}
class Y extends li {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(e) {
    (super(le, e), (this.items = []));
  }
  static from(e, t, s) {
    const { keepUndefined: i, replacer: r } = s,
      a = new this(e),
      o = (l, u) => {
        if (typeof r == "function") u = r.call(t, l, u);
        else if (Array.isArray(r) && !r.includes(l)) return;
        (u !== void 0 || i) && a.items.push(ls(l, u, s));
      };
    if (t instanceof Map) for (const [l, u] of t) o(l, u);
    else if (t && typeof t == "object") for (const l of Object.keys(t)) o(l, t[l]);
    return (typeof e.sortMapEntries == "function" && a.items.sort(e.sortMapEntries), a);
  }
  add(e, t) {
    let s;
    L(e)
      ? (s = e)
      : !e || typeof e != "object" || !("key" in e)
        ? (s = new q(e, e?.value))
        : (s = new q(e.key, e.value));
    const i = he(this.items, s.key),
      r = this.schema?.sortMapEntries;
    if (i) {
      if (!t) throw new Error(`Key ${s.key} already set`);
      T(i.value) && oi(s.value) ? (i.value.value = s.value) : (i.value = s.value);
    } else if (r) {
      const a = this.items.findIndex((o) => r(s, o) < 0);
      a === -1 ? this.items.push(s) : this.items.splice(a, 0, s);
    } else this.items.push(s);
  }
  delete(e) {
    const t = he(this.items, e);
    return t ? this.items.splice(this.items.indexOf(t), 1).length > 0 : !1;
  }
  get(e, t) {
    const i = he(this.items, e)?.value;
    return (!t && T(i) ? i.value : i) ?? void 0;
  }
  has(e) {
    return !!he(this.items, e);
  }
  set(e, t) {
    this.add(new q(e, t), !0);
  }
  toJSON(e, t, s) {
    const i = s ? new s() : t?.mapAsMap ? new Map() : {};
    t?.onCreate && t.onCreate(i);
    for (const r of this.items) hi(t, i, r);
    return i;
  }
  toString(e, t, s) {
    if (!e) return JSON.stringify(this);
    for (const i of this.items)
      if (!L(i)) throw new Error(`Map items must all be pairs; found ${JSON.stringify(i)} instead`);
    return (
      !e.allNullValues &&
        this.hasAllNullValues(!1) &&
        (e = Object.assign({}, e, { allNullValues: !0 })),
      pi(this, e, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: e.indent || "",
        onChompKeep: s,
        onComment: t,
      })
    );
  }
}
const De = {
  collection: "map",
  default: !0,
  nodeClass: Y,
  tag: "tag:yaml.org,2002:map",
  resolve(n, e) {
    return (Le(n) || e("Expected a mapping for this tag"), n);
  },
  createNode: (n, e, t) => Y.from(n, e, t),
};
class ce extends li {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(e) {
    (super(Te, e), (this.items = []));
  }
  add(e) {
    this.items.push(e);
  }
  delete(e) {
    const t = rt(e);
    return typeof t != "number" ? !1 : this.items.splice(t, 1).length > 0;
  }
  get(e, t) {
    const s = rt(e);
    if (typeof s != "number") return;
    const i = this.items[s];
    return !t && T(i) ? i.value : i;
  }
  has(e) {
    const t = rt(e);
    return typeof t == "number" && t < this.items.length;
  }
  set(e, t) {
    const s = rt(e);
    if (typeof s != "number") throw new Error(`Expected a valid index, not ${e}.`);
    const i = this.items[s];
    T(i) && oi(t) ? (i.value = t) : (this.items[s] = t);
  }
  toJSON(e, t) {
    const s = [];
    t?.onCreate && t.onCreate(s);
    let i = 0;
    for (const r of this.items) s.push(W(r, String(i++), t));
    return s;
  }
  toString(e, t, s) {
    return e
      ? pi(this, e, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (e.indent || "") + "  ",
          onChompKeep: s,
          onComment: t,
        })
      : JSON.stringify(this);
  }
  static from(e, t, s) {
    const { replacer: i } = s,
      r = new this(e);
    if (t && Symbol.iterator in Object(t)) {
      let a = 0;
      for (let o of t) {
        if (typeof i == "function") {
          const l = t instanceof Set ? o : String(a++);
          o = i.call(t, l, o);
        }
        r.items.push(Ge(o, void 0, s));
      }
    }
    return r;
  }
}
function rt(n) {
  let e = T(n) ? n.value : n;
  return (
    e && typeof e == "string" && (e = Number(e)),
    typeof e == "number" && Number.isInteger(e) && e >= 0 ? e : null
  );
}
const Fe = {
    collection: "seq",
    default: !0,
    nodeClass: ce,
    tag: "tag:yaml.org,2002:seq",
    resolve(n, e) {
      return (xe(n) || e("Expected a sequence for this tag"), n);
    },
    createNode: (n, e, t) => ce.from(n, e, t),
  },
  Nt = {
    identify: (n) => typeof n == "string",
    default: !0,
    tag: "tag:yaml.org,2002:str",
    resolve: (n) => n,
    stringify(n, e, t, s) {
      return ((e = Object.assign({ actualString: !0 }, e)), et(n, e, t, s));
    },
  },
  _t = {
    identify: (n) => n == null,
    createNode: () => new O(null),
    default: !0,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new O(null),
    stringify: ({ source: n }, e) =>
      typeof n == "string" && _t.test.test(n) ? n : e.options.nullStr,
  },
  cs = {
    identify: (n) => typeof n == "boolean",
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (n) => new O(n[0] === "t" || n[0] === "T"),
    stringify({ source: n, value: e }, t) {
      if (n && cs.test.test(n)) {
        const s = n[0] === "t" || n[0] === "T";
        if (e === s) return n;
      }
      return e ? t.options.trueStr : t.options.falseStr;
    },
  };
function ee({ format: n, minFractionDigits: e, tag: t, value: s }) {
  if (typeof s == "bigint") return String(s);
  const i = typeof s == "number" ? s : Number(s);
  if (!isFinite(i)) return isNaN(i) ? ".nan" : i < 0 ? "-.inf" : ".inf";
  let r = Object.is(s, -0) ? "-0" : JSON.stringify(s);
  if (!n && e && (!t || t === "tag:yaml.org,2002:float") && /^\d/.test(r)) {
    let a = r.indexOf(".");
    a < 0 && ((a = r.length), (r += "."));
    let o = e - (r.length - a - 1);
    for (; o-- > 0; ) r += "0";
  }
  return r;
}
const mi = {
    identify: (n) => typeof n == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (n) =>
      n.slice(-3).toLowerCase() === "nan"
        ? NaN
        : n[0] === "-"
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY,
    stringify: ee,
  },
  gi = {
    identify: (n) => typeof n == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (n) => parseFloat(n),
    stringify(n) {
      const e = Number(n.value);
      return isFinite(e) ? e.toExponential() : ee(n);
    },
  },
  yi = {
    identify: (n) => typeof n == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(n) {
      const e = new O(parseFloat(n)),
        t = n.indexOf(".");
      return (t !== -1 && n[n.length - 1] === "0" && (e.minFractionDigits = n.length - t - 1), e);
    },
    stringify: ee,
  },
  $t = (n) => typeof n == "bigint" || Number.isInteger(n),
  us = (n, e, t, { intAsBigInt: s }) => (s ? BigInt(n) : parseInt(n.substring(e), t));
function bi(n, e, t) {
  const { value: s } = n;
  return $t(s) && s >= 0 ? t + s.toString(e) : ee(n);
}
const wi = {
    identify: (n) => $t(n) && n >= 0,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (n, e, t) => us(n, 2, 8, t),
    stringify: (n) => bi(n, 8, "0o"),
  },
  Si = {
    identify: $t,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (n, e, t) => us(n, 0, 10, t),
    stringify: ee,
  },
  vi = {
    identify: (n) => $t(n) && n >= 0,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (n, e, t) => us(n, 2, 16, t),
    stringify: (n) => bi(n, 16, "0x"),
  },
  Jr = [De, Fe, Nt, _t, cs, wi, Si, vi, mi, gi, yi];
function Vn(n) {
  return typeof n == "bigint" || Number.isInteger(n);
}
const at = ({ value: n }) => JSON.stringify(n),
  Gr = [
    {
      identify: (n) => typeof n == "string",
      default: !0,
      tag: "tag:yaml.org,2002:str",
      resolve: (n) => n,
      stringify: at,
    },
    {
      identify: (n) => n == null,
      createNode: () => new O(null),
      default: !0,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: at,
    },
    {
      identify: (n) => typeof n == "boolean",
      default: !0,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (n) => n === "true",
      stringify: at,
    },
    {
      identify: Vn,
      default: !0,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (n, e, { intAsBigInt: t }) => (t ? BigInt(n) : parseInt(n, 10)),
      stringify: ({ value: n }) => (Vn(n) ? n.toString() : JSON.stringify(n)),
    },
    {
      identify: (n) => typeof n == "number",
      default: !0,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (n) => parseFloat(n),
      stringify: at,
    },
  ],
  Qr = {
    default: !0,
    tag: "",
    test: /^/,
    resolve(n, e) {
      return (e(`Unresolved plain scalar ${JSON.stringify(n)}`), n);
    },
  },
  Xr = [De, Fe].concat(Gr, Qr),
  fs = {
    identify: (n) => n instanceof Uint8Array,
    default: !1,
    tag: "tag:yaml.org,2002:binary",
    resolve(n, e) {
      if (typeof atob == "function") {
        const t = atob(n.replace(/[\n\r]/g, "")),
          s = new Uint8Array(t.length);
        for (let i = 0; i < t.length; ++i) s[i] = t.charCodeAt(i);
        return s;
      } else
        return (
          e(
            "This environment does not support reading binary tags; either Buffer or atob is required",
          ),
          n
        );
    },
    stringify({ comment: n, type: e, value: t }, s, i, r) {
      if (!t) return "";
      const a = t;
      let o;
      if (typeof btoa == "function") {
        let l = "";
        for (let u = 0; u < a.length; ++u) l += String.fromCharCode(a[u]);
        o = btoa(l);
      } else
        throw new Error(
          "This environment does not support writing binary tags; either Buffer or btoa is required",
        );
      if ((e ?? (e = O.BLOCK_LITERAL), e !== O.QUOTE_DOUBLE)) {
        const l = Math.max(s.options.lineWidth - s.indent.length, s.options.minContentWidth),
          u = Math.ceil(o.length / l),
          p = new Array(u);
        for (let c = 0, d = 0; c < u; ++c, d += l) p[c] = o.substr(d, l);
        o = p.join(
          e === O.BLOCK_LITERAL
            ? `
`
            : " ",
        );
      }
      return et({ comment: n, type: e, value: o }, s, i, r);
    },
  };
function ki(n, e) {
  if (xe(n))
    for (let t = 0; t < n.items.length; ++t) {
      let s = n.items[t];
      if (!L(s)) {
        if (Le(s)) {
          s.items.length > 1 && e("Each pair must have its own sequence indicator");
          const i = s.items[0] || new q(new O(null));
          if (
            (s.commentBefore &&
              (i.key.commentBefore = i.key.commentBefore
                ? `${s.commentBefore}
${i.key.commentBefore}`
                : s.commentBefore),
            s.comment)
          ) {
            const r = i.value ?? i.key;
            r.comment = r.comment
              ? `${s.comment}
${r.comment}`
              : s.comment;
          }
          s = i;
        }
        n.items[t] = L(s) ? s : new q(s);
      }
    }
  else e("Expected a sequence for this tag");
  return n;
}
function Ni(n, e, t) {
  const { replacer: s } = t,
    i = new ce(n);
  i.tag = "tag:yaml.org,2002:pairs";
  let r = 0;
  if (e && Symbol.iterator in Object(e))
    for (let a of e) {
      typeof s == "function" && (a = s.call(e, String(r++), a));
      let o, l;
      if (Array.isArray(a))
        if (a.length === 2) ((o = a[0]), (l = a[1]));
        else throw new TypeError(`Expected [key, value] tuple: ${a}`);
      else if (a && a instanceof Object) {
        const u = Object.keys(a);
        if (u.length === 1) ((o = u[0]), (l = a[o]));
        else throw new TypeError(`Expected tuple with one key, not ${u.length} keys`);
      } else o = a;
      i.items.push(ls(o, l, t));
    }
  return i;
}
const ds = {
  collection: "seq",
  default: !1,
  tag: "tag:yaml.org,2002:pairs",
  resolve: ki,
  createNode: Ni,
};
class $e extends ce {
  constructor() {
    (super(),
      (this.add = Y.prototype.add.bind(this)),
      (this.delete = Y.prototype.delete.bind(this)),
      (this.get = Y.prototype.get.bind(this)),
      (this.has = Y.prototype.has.bind(this)),
      (this.set = Y.prototype.set.bind(this)),
      (this.tag = $e.tag));
  }
  toJSON(e, t) {
    if (!t) return super.toJSON(e);
    const s = new Map();
    t?.onCreate && t.onCreate(s);
    for (const i of this.items) {
      let r, a;
      if ((L(i) ? ((r = W(i.key, "", t)), (a = W(i.value, r, t))) : (r = W(i, "", t)), s.has(r)))
        throw new Error("Ordered maps must not include duplicate keys");
      s.set(r, a);
    }
    return s;
  }
  static from(e, t, s) {
    const i = Ni(e, t, s),
      r = new this();
    return ((r.items = i.items), r);
  }
}
$e.tag = "tag:yaml.org,2002:omap";
const hs = {
  collection: "seq",
  identify: (n) => n instanceof Map,
  nodeClass: $e,
  default: !1,
  tag: "tag:yaml.org,2002:omap",
  resolve(n, e) {
    const t = ki(n, e),
      s = [];
    for (const { key: i } of t.items)
      T(i) &&
        (s.includes(i.value)
          ? e(`Ordered maps must not include duplicate keys: ${i.value}`)
          : s.push(i.value));
    return Object.assign(new $e(), t);
  },
  createNode: (n, e, t) => $e.from(n, e, t),
};
function _i({ value: n, source: e }, t) {
  return e && (n ? $i : Ci).test.test(e) ? e : n ? t.options.trueStr : t.options.falseStr;
}
const $i = {
    identify: (n) => n === !0,
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new O(!0),
    stringify: _i,
  },
  Ci = {
    identify: (n) => n === !1,
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new O(!1),
    stringify: _i,
  },
  Zr = {
    identify: (n) => typeof n == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (n) =>
      n.slice(-3).toLowerCase() === "nan"
        ? NaN
        : n[0] === "-"
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY,
    stringify: ee,
  },
  ea = {
    identify: (n) => typeof n == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (n) => parseFloat(n.replace(/_/g, "")),
    stringify(n) {
      const e = Number(n.value);
      return isFinite(e) ? e.toExponential() : ee(n);
    },
  },
  ta = {
    identify: (n) => typeof n == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(n) {
      const e = new O(parseFloat(n.replace(/_/g, ""))),
        t = n.indexOf(".");
      if (t !== -1) {
        const s = n.substring(t + 1).replace(/_/g, "");
        s[s.length - 1] === "0" && (e.minFractionDigits = s.length);
      }
      return e;
    },
    stringify: ee,
  },
  tt = (n) => typeof n == "bigint" || Number.isInteger(n);
function Ct(n, e, t, { intAsBigInt: s }) {
  const i = n[0];
  if (((i === "-" || i === "+") && (e += 1), (n = n.substring(e).replace(/_/g, "")), s)) {
    switch (t) {
      case 2:
        n = `0b${n}`;
        break;
      case 8:
        n = `0o${n}`;
        break;
      case 16:
        n = `0x${n}`;
        break;
    }
    const a = BigInt(n);
    return i === "-" ? BigInt(-1) * a : a;
  }
  const r = parseInt(n, t);
  return i === "-" ? -1 * r : r;
}
function ps(n, e, t) {
  const { value: s } = n;
  if (tt(s)) {
    const i = s.toString(e);
    return s < 0 ? "-" + t + i.substr(1) : t + i;
  }
  return ee(n);
}
const sa = {
    identify: tt,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (n, e, t) => Ct(n, 2, 2, t),
    stringify: (n) => ps(n, 2, "0b"),
  },
  na = {
    identify: tt,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (n, e, t) => Ct(n, 1, 8, t),
    stringify: (n) => ps(n, 8, "0"),
  },
  ia = {
    identify: tt,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (n, e, t) => Ct(n, 0, 10, t),
    stringify: ee,
  },
  ra = {
    identify: tt,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (n, e, t) => Ct(n, 2, 16, t),
    stringify: (n) => ps(n, 16, "0x"),
  };
class Ce extends Y {
  constructor(e) {
    (super(e), (this.tag = Ce.tag));
  }
  add(e) {
    let t;
    (L(e)
      ? (t = e)
      : e && typeof e == "object" && "key" in e && "value" in e && e.value === null
        ? (t = new q(e.key, null))
        : (t = new q(e, null)),
      he(this.items, t.key) || this.items.push(t));
  }
  get(e, t) {
    const s = he(this.items, e);
    return !t && L(s) ? (T(s.key) ? s.key.value : s.key) : s;
  }
  set(e, t) {
    if (typeof t != "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof t}`);
    const s = he(this.items, e);
    s && !t ? this.items.splice(this.items.indexOf(s), 1) : !s && t && this.items.push(new q(e));
  }
  toJSON(e, t) {
    return super.toJSON(e, t, Set);
  }
  toString(e, t, s) {
    if (!e) return JSON.stringify(this);
    if (this.hasAllNullValues(!0))
      return super.toString(Object.assign({}, e, { allNullValues: !0 }), t, s);
    throw new Error("Set items must all have null values");
  }
  static from(e, t, s) {
    const { replacer: i } = s,
      r = new this(e);
    if (t && Symbol.iterator in Object(t))
      for (let a of t)
        (typeof i == "function" && (a = i.call(t, a, a)), r.items.push(ls(a, null, s)));
    return r;
  }
}
Ce.tag = "tag:yaml.org,2002:set";
const ms = {
  collection: "map",
  identify: (n) => n instanceof Set,
  nodeClass: Ce,
  default: !1,
  tag: "tag:yaml.org,2002:set",
  createNode: (n, e, t) => Ce.from(n, e, t),
  resolve(n, e) {
    if (Le(n)) {
      if (n.hasAllNullValues(!0)) return Object.assign(new Ce(), n);
      e("Set items must all have null values");
    } else e("Expected a mapping for this tag");
    return n;
  },
};
function gs(n, e) {
  const t = n[0],
    s = t === "-" || t === "+" ? n.substring(1) : n,
    i = (a) => (e ? BigInt(a) : Number(a)),
    r = s
      .replace(/_/g, "")
      .split(":")
      .reduce((a, o) => a * i(60) + i(o), i(0));
  return t === "-" ? i(-1) * r : r;
}
function Oi(n) {
  let { value: e } = n,
    t = (a) => a;
  if (typeof e == "bigint") t = (a) => BigInt(a);
  else if (isNaN(e) || !isFinite(e)) return ee(n);
  let s = "";
  e < 0 && ((s = "-"), (e *= t(-1)));
  const i = t(60),
    r = [e % i];
  return (
    e < 60
      ? r.unshift(0)
      : ((e = (e - r[0]) / i), r.unshift(e % i), e >= 60 && ((e = (e - r[0]) / i), r.unshift(e))),
    s +
      r
        .map((a) => String(a).padStart(2, "0"))
        .join(":")
        .replace(/000000\d*$/, "")
  );
}
const Ii = {
    identify: (n) => typeof n == "bigint" || Number.isInteger(n),
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (n, e, { intAsBigInt: t }) => gs(n, t),
    stringify: Oi,
  },
  Ei = {
    identify: (n) => typeof n == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (n) => gs(n, !1),
    stringify: Oi,
  },
  Ot = {
    identify: (n) => n instanceof Date,
    default: !0,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp(
      "^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$",
    ),
    resolve(n) {
      const e = n.match(Ot.test);
      if (!e) throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, t, s, i, r, a, o] = e.map(Number),
        l = e[7] ? Number((e[7] + "00").substr(1, 3)) : 0;
      let u = Date.UTC(t, s - 1, i, r || 0, a || 0, o || 0, l);
      const p = e[8];
      if (p && p !== "Z") {
        let c = gs(p, !1);
        (Math.abs(c) < 30 && (c *= 60), (u -= 6e4 * c));
      }
      return new Date(u);
    },
    stringify: ({ value: n }) => n?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? "",
  },
  qn = [De, Fe, Nt, _t, $i, Ci, sa, na, ia, ra, Zr, ea, ta, fs, ae, hs, ds, ms, Ii, Ei, Ot],
  Rn = new Map([
    ["core", Jr],
    ["failsafe", [De, Fe, Nt]],
    ["json", Xr],
    ["yaml11", qn],
    ["yaml-1.1", qn],
  ]),
  Hn = {
    binary: fs,
    bool: cs,
    float: yi,
    floatExp: gi,
    floatNaN: mi,
    floatTime: Ei,
    int: Si,
    intHex: vi,
    intOct: wi,
    intTime: Ii,
    map: De,
    merge: ae,
    null: _t,
    omap: hs,
    pairs: ds,
    seq: Fe,
    set: ms,
    timestamp: Ot,
  },
  aa = {
    "tag:yaml.org,2002:binary": fs,
    "tag:yaml.org,2002:merge": ae,
    "tag:yaml.org,2002:omap": hs,
    "tag:yaml.org,2002:pairs": ds,
    "tag:yaml.org,2002:set": ms,
    "tag:yaml.org,2002:timestamp": Ot,
  };
function Yt(n, e, t) {
  const s = Rn.get(e);
  if (s && !n) return t && !s.includes(ae) ? s.concat(ae) : s.slice();
  let i = s;
  if (!i)
    if (Array.isArray(n)) i = [];
    else {
      const r = Array.from(Rn.keys())
        .filter((a) => a !== "yaml11")
        .map((a) => JSON.stringify(a))
        .join(", ");
      throw new Error(`Unknown schema "${e}"; use one of ${r} or define customTags array`);
    }
  if (Array.isArray(n)) for (const r of n) i = i.concat(r);
  else typeof n == "function" && (i = n(i.slice()));
  return (
    t && (i = i.concat(ae)),
    i.reduce((r, a) => {
      const o = typeof a == "string" ? Hn[a] : a;
      if (!o) {
        const l = JSON.stringify(a),
          u = Object.keys(Hn)
            .map((p) => JSON.stringify(p))
            .join(", ");
        throw new Error(`Unknown custom tag ${l}; use one of ${u}`);
      }
      return (r.includes(o) || r.push(o), r);
    }, [])
  );
}
const oa = (n, e) => (n.key < e.key ? -1 : n.key > e.key ? 1 : 0);
class It {
  constructor({
    compat: e,
    customTags: t,
    merge: s,
    resolveKnownTags: i,
    schema: r,
    sortMapEntries: a,
    toStringDefaults: o,
  }) {
    ((this.compat = Array.isArray(e) ? Yt(e, "compat") : e ? Yt(null, e) : null),
      (this.name = (typeof r == "string" && r) || "core"),
      (this.knownTags = i ? aa : {}),
      (this.tags = Yt(t, this.name, s)),
      (this.toStringOptions = o ?? null),
      Object.defineProperty(this, le, { value: De }),
      Object.defineProperty(this, se, { value: Nt }),
      Object.defineProperty(this, Te, { value: Fe }),
      (this.sortMapEntries = typeof a == "function" ? a : a === !0 ? oa : null));
  }
  clone() {
    const e = Object.create(It.prototype, Object.getOwnPropertyDescriptors(this));
    return ((e.tags = this.tags.slice()), e);
  }
}
function la(n, e) {
  const t = [];
  let s = e.directives === !0;
  if (e.directives !== !1 && n.directives) {
    const l = n.directives.toString(n);
    l ? (t.push(l), (s = !0)) : n.directives.docStart && (s = !0);
  }
  s && t.push("---");
  const i = ui(n, e),
    { commentString: r } = i.options;
  if (n.commentBefore) {
    t.length !== 1 && t.unshift("");
    const l = r(n.commentBefore);
    t.unshift(re(l, ""));
  }
  let a = !1,
    o = null;
  if (n.contents) {
    if (D(n.contents)) {
      if ((n.contents.spaceBefore && s && t.push(""), n.contents.commentBefore)) {
        const p = r(n.contents.commentBefore);
        t.push(re(p, ""));
      }
      ((i.forceBlockIndent = !!n.comment), (o = n.contents.comment));
    }
    const l = o ? void 0 : () => (a = !0);
    let u = Oe(n.contents, i, () => (o = null), l);
    (o && (u += de(u, "", r(o))),
      (u[0] === "|" || u[0] === ">") && t[t.length - 1] === "---"
        ? (t[t.length - 1] = `--- ${u}`)
        : t.push(u));
  } else t.push(Oe(n.contents, i));
  if (n.directives?.docEnd)
    if (n.comment) {
      const l = r(n.comment);
      l.includes(`
`)
        ? (t.push("..."), t.push(re(l, "")))
        : t.push(`... ${l}`);
    } else t.push("...");
  else {
    let l = n.comment;
    (l && a && (l = l.replace(/^\n+/, "")),
      l && ((!a || o) && t[t.length - 1] !== "" && t.push(""), t.push(re(r(l), ""))));
  }
  return (
    t.join(`
`) +
    `
`
  );
}
class Pe {
  constructor(e, t, s) {
    ((this.commentBefore = null),
      (this.comment = null),
      (this.errors = []),
      (this.warnings = []),
      Object.defineProperty(this, Q, { value: es }));
    let i = null;
    typeof t == "function" || Array.isArray(t)
      ? (i = t)
      : s === void 0 && t && ((s = t), (t = void 0));
    const r = Object.assign(
      {
        intAsBigInt: !1,
        keepSourceTokens: !1,
        logLevel: "warn",
        prettyErrors: !0,
        strict: !0,
        stringKeys: !1,
        uniqueKeys: !0,
        version: "1.2",
      },
      s,
    );
    this.options = r;
    let { version: a } = r;
    (s?._directives
      ? ((this.directives = s._directives.atDocument()),
        this.directives.yaml.explicit && (a = this.directives.yaml.version))
      : (this.directives = new R({ version: a })),
      this.setSchema(a, s),
      (this.contents = e === void 0 ? null : this.createNode(e, i, s)));
  }
  clone() {
    const e = Object.create(Pe.prototype, { [Q]: { value: es } });
    return (
      (e.commentBefore = this.commentBefore),
      (e.comment = this.comment),
      (e.errors = this.errors.slice()),
      (e.warnings = this.warnings.slice()),
      (e.options = Object.assign({}, this.options)),
      this.directives && (e.directives = this.directives.clone()),
      (e.schema = this.schema.clone()),
      (e.contents = D(this.contents) ? this.contents.clone(e.schema) : this.contents),
      this.range && (e.range = this.range.slice()),
      e
    );
  }
  add(e) {
    be(this.contents) && this.contents.add(e);
  }
  addIn(e, t) {
    be(this.contents) && this.contents.addIn(e, t);
  }
  createAlias(e, t) {
    if (!e.anchor) {
      const s = ri(this);
      e.anchor = !t || s.has(t) ? ai(t || "a", s) : t;
    }
    return new wt(e.anchor);
  }
  createNode(e, t, s) {
    let i;
    if (typeof t == "function") ((e = t.call({ "": e }, "", e)), (i = t));
    else if (Array.isArray(t)) {
      const h = (b) => typeof b == "number" || b instanceof String || b instanceof Number,
        y = t.filter(h).map(String);
      (y.length > 0 && (t = t.concat(y)), (i = t));
    } else s === void 0 && t && ((s = t), (t = void 0));
    const {
        aliasDuplicateObjects: r,
        anchorPrefix: a,
        flow: o,
        keepUndefined: l,
        onTagObj: u,
        tag: p,
      } = s ?? {},
      { onAnchor: c, setAnchors: d, sourceObjects: m } = Fr(this, a || "a"),
      g = {
        aliasDuplicateObjects: r ?? !0,
        keepUndefined: l ?? !1,
        onAnchor: c,
        onTagObj: u,
        replacer: i,
        schema: this.schema,
        sourceObjects: m,
      },
      f = Ge(e, p, g);
    return (o && x(f) && (f.flow = !0), d(), f);
  }
  createPair(e, t, s = {}) {
    const i = this.createNode(e, null, s),
      r = this.createNode(t, null, s);
    return new q(i, r);
  }
  delete(e) {
    return be(this.contents) ? this.contents.delete(e) : !1;
  }
  deleteIn(e) {
    return ze(e)
      ? this.contents == null
        ? !1
        : ((this.contents = null), !0)
      : be(this.contents)
        ? this.contents.deleteIn(e)
        : !1;
  }
  get(e, t) {
    return x(this.contents) ? this.contents.get(e, t) : void 0;
  }
  getIn(e, t) {
    return ze(e)
      ? !t && T(this.contents)
        ? this.contents.value
        : this.contents
      : x(this.contents)
        ? this.contents.getIn(e, t)
        : void 0;
  }
  has(e) {
    return x(this.contents) ? this.contents.has(e) : !1;
  }
  hasIn(e) {
    return ze(e) ? this.contents !== void 0 : x(this.contents) ? this.contents.hasIn(e) : !1;
  }
  set(e, t) {
    this.contents == null
      ? (this.contents = pt(this.schema, [e], t))
      : be(this.contents) && this.contents.set(e, t);
  }
  setIn(e, t) {
    ze(e)
      ? (this.contents = t)
      : this.contents == null
        ? (this.contents = pt(this.schema, Array.from(e), t))
        : be(this.contents) && this.contents.setIn(e, t);
  }
  setSchema(e, t = {}) {
    typeof e == "number" && (e = String(e));
    let s;
    switch (e) {
      case "1.1":
        (this.directives
          ? (this.directives.yaml.version = "1.1")
          : (this.directives = new R({ version: "1.1" })),
          (s = { resolveKnownTags: !1, schema: "yaml-1.1" }));
        break;
      case "1.2":
      case "next":
        (this.directives
          ? (this.directives.yaml.version = e)
          : (this.directives = new R({ version: e })),
          (s = { resolveKnownTags: !0, schema: "core" }));
        break;
      case null:
        (this.directives && delete this.directives, (s = null));
        break;
      default: {
        const i = JSON.stringify(e);
        throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${i}`);
      }
    }
    if (t.schema instanceof Object) this.schema = t.schema;
    else if (s) this.schema = new It(Object.assign(s, t));
    else throw new Error("With a null YAML version, the { schema: Schema } option is required");
  }
  toJS({ json: e, jsonArg: t, mapAsMap: s, maxAliasCount: i, onAnchor: r, reviver: a } = {}) {
    const o = {
        anchors: new Map(),
        doc: this,
        keep: !e,
        mapAsMap: s === !0,
        mapKeyWarned: !1,
        maxAliasCount: typeof i == "number" ? i : 100,
      },
      l = W(this.contents, t ?? "", o);
    if (typeof r == "function") for (const { count: u, res: p } of o.anchors.values()) r(p, u);
    return typeof a == "function" ? Ne(a, { "": l }, "", l) : l;
  }
  toJSON(e, t) {
    return this.toJS({ json: !0, jsonArg: e, mapAsMap: !1, onAnchor: t });
  }
  toString(e = {}) {
    if (this.errors.length > 0) throw new Error("Document with errors cannot be stringified");
    if ("indent" in e && (!Number.isInteger(e.indent) || Number(e.indent) <= 0)) {
      const t = JSON.stringify(e.indent);
      throw new Error(`"indent" option must be a positive integer, not ${t}`);
    }
    return la(this, e);
  }
}
function be(n) {
  if (x(n)) return !0;
  throw new Error("Expected a YAML collection as document contents");
}
class ys extends Error {
  constructor(e, t, s, i) {
    (super(), (this.name = e), (this.code = s), (this.message = i), (this.pos = t));
  }
}
class pe extends ys {
  constructor(e, t, s) {
    super("YAMLParseError", e, t, s);
  }
}
class Ai extends ys {
  constructor(e, t, s) {
    super("YAMLWarning", e, t, s);
  }
}
const gt = (n, e) => (t) => {
  if (t.pos[0] === -1) return;
  t.linePos = t.pos.map((o) => e.linePos(o));
  const { line: s, col: i } = t.linePos[0];
  t.message += ` at line ${s}, column ${i}`;
  let r = i - 1,
    a = n.substring(e.lineStarts[s - 1], e.lineStarts[s]).replace(/[\n\r]+$/, "");
  if (r >= 60 && a.length > 80) {
    const o = Math.min(r - 39, a.length - 79);
    ((a = "…" + a.substring(o)), (r -= o - 1));
  }
  if ((a.length > 80 && (a = a.substring(0, 79) + "…"), s > 1 && /^ *$/.test(a.substring(0, r)))) {
    let o = n.substring(e.lineStarts[s - 2], e.lineStarts[s - 1]);
    (o.length > 80 &&
      (o =
        o.substring(0, 79) +
        `…
`),
      (a = o + a));
  }
  if (/[^ ]/.test(a)) {
    let o = 1;
    const l = t.linePos[1];
    l?.line === s && l.col > i && (o = Math.max(1, Math.min(l.col - i, 80 - r)));
    const u = " ".repeat(r) + "^".repeat(o);
    t.message += `:

${a}
${u}
`;
  }
};
function Ie(
  n,
  { flow: e, indicator: t, next: s, offset: i, onError: r, parentIndent: a, startOnNewline: o },
) {
  let l = !1,
    u = o,
    p = o,
    c = "",
    d = "",
    m = !1,
    g = !1,
    f = null,
    h = null,
    y = null,
    b = null,
    v = null,
    k = null,
    N = null;
  for (const w of n)
    switch (
      (g &&
        (w.type !== "space" &&
          w.type !== "newline" &&
          w.type !== "comma" &&
          r(
            w.offset,
            "MISSING_CHAR",
            "Tags and anchors must be separated from the next token by white space",
          ),
        (g = !1)),
      f &&
        (u &&
          w.type !== "comment" &&
          w.type !== "newline" &&
          r(f, "TAB_AS_INDENT", "Tabs are not allowed as indentation"),
        (f = null)),
      w.type)
    ) {
      case "space":
        (!e &&
          (t !== "doc-start" || s?.type !== "flow-collection") &&
          w.source.includes("	") &&
          (f = w),
          (p = !0));
        break;
      case "comment": {
        p ||
          r(
            w,
            "MISSING_CHAR",
            "Comments must be separated from other tokens by white space characters",
          );
        const P = w.source.substring(1) || " ";
        (c ? (c += d + P) : (c = P), (d = ""), (u = !1));
        break;
      }
      case "newline":
        (u ? (c ? (c += w.source) : (!k || t !== "seq-item-ind") && (l = !0)) : (d += w.source),
          (u = !0),
          (m = !0),
          (h || y) && (b = w),
          (p = !0));
        break;
      case "anchor":
        (h && r(w, "MULTIPLE_ANCHORS", "A node can have at most one anchor"),
          w.source.endsWith(":") &&
            r(w.offset + w.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", !0),
          (h = w),
          N ?? (N = w.offset),
          (u = !1),
          (p = !1),
          (g = !0));
        break;
      case "tag": {
        (y && r(w, "MULTIPLE_TAGS", "A node can have at most one tag"),
          (y = w),
          N ?? (N = w.offset),
          (u = !1),
          (p = !1),
          (g = !0));
        break;
      }
      case t:
        ((h || y) &&
          r(w, "BAD_PROP_ORDER", `Anchors and tags must be after the ${w.source} indicator`),
          k && r(w, "UNEXPECTED_TOKEN", `Unexpected ${w.source} in ${e ?? "collection"}`),
          (k = w),
          (u = t === "seq-item-ind" || t === "explicit-key-ind"),
          (p = !1));
        break;
      case "comma":
        if (e) {
          (v && r(w, "UNEXPECTED_TOKEN", `Unexpected , in ${e}`), (v = w), (u = !1), (p = !1));
          break;
        }
      default:
        (r(w, "UNEXPECTED_TOKEN", `Unexpected ${w.type} token`), (u = !1), (p = !1));
    }
  const _ = n[n.length - 1],
    E = _ ? _.offset + _.source.length : i;
  return (
    g &&
      s &&
      s.type !== "space" &&
      s.type !== "newline" &&
      s.type !== "comma" &&
      (s.type !== "scalar" || s.source !== "") &&
      r(
        s.offset,
        "MISSING_CHAR",
        "Tags and anchors must be separated from the next token by white space",
      ),
    f &&
      ((u && f.indent <= a) || s?.type === "block-map" || s?.type === "block-seq") &&
      r(f, "TAB_AS_INDENT", "Tabs are not allowed as indentation"),
    {
      comma: v,
      found: k,
      spaceBefore: l,
      comment: c,
      hasNewline: m,
      anchor: h,
      tag: y,
      newlineAfterProp: b,
      end: E,
      start: N ?? E,
    }
  );
}
function Qe(n) {
  if (!n) return null;
  switch (n.type) {
    case "alias":
    case "scalar":
    case "double-quoted-scalar":
    case "single-quoted-scalar":
      if (
        n.source.includes(`
`)
      )
        return !0;
      if (n.end) {
        for (const e of n.end) if (e.type === "newline") return !0;
      }
      return !1;
    case "flow-collection":
      for (const e of n.items) {
        for (const t of e.start) if (t.type === "newline") return !0;
        if (e.sep) {
          for (const t of e.sep) if (t.type === "newline") return !0;
        }
        if (Qe(e.key) || Qe(e.value)) return !0;
      }
      return !1;
    default:
      return !0;
  }
}
function is(n, e, t) {
  if (e?.type === "flow-collection") {
    const s = e.end[0];
    s.indent === n &&
      (s.source === "]" || s.source === "}") &&
      Qe(e) &&
      t(s, "BAD_INDENT", "Flow end indicator should be more indented than parent", !0);
  }
}
function Mi(n, e, t) {
  const { uniqueKeys: s } = n.options;
  if (s === !1) return !1;
  const i = typeof s == "function" ? s : (r, a) => r === a || (T(r) && T(a) && r.value === a.value);
  return e.some((r) => i(r.key, t));
}
const Un = "All mapping items must start at the same column";
function ca({ composeNode: n, composeEmptyNode: e }, t, s, i, r) {
  const a = r?.nodeClass ?? Y,
    o = new a(t.schema);
  t.atRoot && (t.atRoot = !1);
  let l = s.offset,
    u = null;
  for (const p of s.items) {
    const { start: c, key: d, sep: m, value: g } = p,
      f = Ie(c, {
        indicator: "explicit-key-ind",
        next: d ?? m?.[0],
        offset: l,
        onError: i,
        parentIndent: s.indent,
        startOnNewline: !0,
      }),
      h = !f.found;
    if (h) {
      if (
        (d &&
          (d.type === "block-seq"
            ? i(
                l,
                "BLOCK_AS_IMPLICIT_KEY",
                "A block sequence may not be used as an implicit map key",
              )
            : "indent" in d && d.indent !== s.indent && i(l, "BAD_INDENT", Un)),
        !f.anchor && !f.tag && !m)
      ) {
        ((u = f.end),
          f.comment &&
            (o.comment
              ? (o.comment +=
                  `
` + f.comment)
              : (o.comment = f.comment)));
        continue;
      }
      (f.newlineAfterProp || Qe(d)) &&
        i(
          d ?? c[c.length - 1],
          "MULTILINE_IMPLICIT_KEY",
          "Implicit keys need to be on a single line",
        );
    } else f.found?.indent !== s.indent && i(l, "BAD_INDENT", Un);
    t.atKey = !0;
    const y = f.end,
      b = d ? n(t, d, f, i) : e(t, y, c, null, f, i);
    (t.schema.compat && is(s.indent, d, i),
      (t.atKey = !1),
      Mi(t, o.items, b) && i(y, "DUPLICATE_KEY", "Map keys must be unique"));
    const v = Ie(m ?? [], {
      indicator: "map-value-ind",
      next: g,
      offset: b.range[2],
      onError: i,
      parentIndent: s.indent,
      startOnNewline: !d || d.type === "block-scalar",
    });
    if (((l = v.end), v.found)) {
      h &&
        (g?.type === "block-map" &&
          !v.hasNewline &&
          i(l, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings"),
        t.options.strict &&
          f.start < v.found.offset - 1024 &&
          i(
            b.range,
            "KEY_OVER_1024_CHARS",
            "The : indicator must be at most 1024 chars after the start of an implicit block mapping key",
          ));
      const k = g ? n(t, g, v, i) : e(t, l, m, null, v, i);
      (t.schema.compat && is(s.indent, g, i), (l = k.range[2]));
      const N = new q(b, k);
      (t.options.keepSourceTokens && (N.srcToken = p), o.items.push(N));
    } else {
      (h && i(b.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values"),
        v.comment &&
          (b.comment
            ? (b.comment +=
                `
` + v.comment)
            : (b.comment = v.comment)));
      const k = new q(b);
      (t.options.keepSourceTokens && (k.srcToken = p), o.items.push(k));
    }
  }
  return (
    u && u < l && i(u, "IMPOSSIBLE", "Map comment with trailing content"),
    (o.range = [s.offset, l, u ?? l]),
    o
  );
}
function ua({ composeNode: n, composeEmptyNode: e }, t, s, i, r) {
  const a = r?.nodeClass ?? ce,
    o = new a(t.schema);
  (t.atRoot && (t.atRoot = !1), t.atKey && (t.atKey = !1));
  let l = s.offset,
    u = null;
  for (const { start: p, value: c } of s.items) {
    const d = Ie(p, {
      indicator: "seq-item-ind",
      next: c,
      offset: l,
      onError: i,
      parentIndent: s.indent,
      startOnNewline: !0,
    });
    if (!d.found)
      if (d.anchor || d.tag || c)
        c?.type === "block-seq"
          ? i(d.end, "BAD_INDENT", "All sequence items must start at the same column")
          : i(l, "MISSING_CHAR", "Sequence item without - indicator");
      else {
        ((u = d.end), d.comment && (o.comment = d.comment));
        continue;
      }
    const m = c ? n(t, c, d, i) : e(t, d.end, p, null, d, i);
    (t.schema.compat && is(s.indent, c, i), (l = m.range[2]), o.items.push(m));
  }
  return ((o.range = [s.offset, l, u ?? l]), o);
}
function st(n, e, t, s) {
  let i = "";
  if (n) {
    let r = !1,
      a = "";
    for (const o of n) {
      const { source: l, type: u } = o;
      switch (u) {
        case "space":
          r = !0;
          break;
        case "comment": {
          t &&
            !r &&
            s(
              o,
              "MISSING_CHAR",
              "Comments must be separated from other tokens by white space characters",
            );
          const p = l.substring(1) || " ";
          (i ? (i += a + p) : (i = p), (a = ""));
          break;
        }
        case "newline":
          (i && (a += l), (r = !0));
          break;
        default:
          s(o, "UNEXPECTED_TOKEN", `Unexpected ${u} at node end`);
      }
      e += l.length;
    }
  }
  return { comment: i, offset: e };
}
const Wt = "Block collections are not allowed within flow collections",
  zt = (n) => n && (n.type === "block-map" || n.type === "block-seq");
function fa({ composeNode: n, composeEmptyNode: e }, t, s, i, r) {
  const a = s.start.source === "{",
    o = a ? "flow map" : "flow sequence",
    l = r?.nodeClass ?? (a ? Y : ce),
    u = new l(t.schema);
  u.flow = !0;
  const p = t.atRoot;
  (p && (t.atRoot = !1), t.atKey && (t.atKey = !1));
  let c = s.offset + s.start.source.length;
  for (let h = 0; h < s.items.length; ++h) {
    const y = s.items[h],
      { start: b, key: v, sep: k, value: N } = y,
      _ = Ie(b, {
        flow: o,
        indicator: "explicit-key-ind",
        next: v ?? k?.[0],
        offset: c,
        onError: i,
        parentIndent: s.indent,
        startOnNewline: !1,
      });
    if (!_.found) {
      if (!_.anchor && !_.tag && !k && !N) {
        (h === 0 && _.comma
          ? i(_.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${o}`)
          : h < s.items.length - 1 &&
            i(_.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${o}`),
          _.comment &&
            (u.comment
              ? (u.comment +=
                  `
` + _.comment)
              : (u.comment = _.comment)),
          (c = _.end));
        continue;
      }
      !a &&
        t.options.strict &&
        Qe(v) &&
        i(
          v,
          "MULTILINE_IMPLICIT_KEY",
          "Implicit keys of flow sequence pairs need to be on a single line",
        );
    }
    if (h === 0) _.comma && i(_.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${o}`);
    else if ((_.comma || i(_.start, "MISSING_CHAR", `Missing , between ${o} items`), _.comment)) {
      let E = "";
      e: for (const w of b)
        switch (w.type) {
          case "comma":
          case "space":
            break;
          case "comment":
            E = w.source.substring(1);
            break e;
          default:
            break e;
        }
      if (E) {
        let w = u.items[u.items.length - 1];
        (L(w) && (w = w.value ?? w.key),
          w.comment
            ? (w.comment +=
                `
` + E)
            : (w.comment = E),
          (_.comment = _.comment.substring(E.length + 1)));
      }
    }
    if (!a && !k && !_.found) {
      const E = N ? n(t, N, _, i) : e(t, _.end, k, null, _, i);
      (u.items.push(E), (c = E.range[2]), zt(N) && i(E.range, "BLOCK_IN_FLOW", Wt));
    } else {
      t.atKey = !0;
      const E = _.end,
        w = v ? n(t, v, _, i) : e(t, E, b, null, _, i);
      (zt(v) && i(w.range, "BLOCK_IN_FLOW", Wt), (t.atKey = !1));
      const P = Ie(k ?? [], {
        flow: o,
        indicator: "map-value-ind",
        next: N,
        offset: w.range[2],
        onError: i,
        parentIndent: s.indent,
        startOnNewline: !1,
      });
      if (P.found) {
        if (!a && !_.found && t.options.strict) {
          if (k)
            for (const B of k) {
              if (B === P.found) break;
              if (B.type === "newline") {
                i(
                  B,
                  "MULTILINE_IMPLICIT_KEY",
                  "Implicit keys of flow sequence pairs need to be on a single line",
                );
                break;
              }
            }
          _.start < P.found.offset - 1024 &&
            i(
              P.found,
              "KEY_OVER_1024_CHARS",
              "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key",
            );
        }
      } else
        N &&
          ("source" in N && N.source?.[0] === ":"
            ? i(N, "MISSING_CHAR", `Missing space after : in ${o}`)
            : i(P.start, "MISSING_CHAR", `Missing , or : between ${o} items`));
      const X = N ? n(t, N, P, i) : P.found ? e(t, P.end, k, null, P, i) : null;
      X
        ? zt(N) && i(X.range, "BLOCK_IN_FLOW", Wt)
        : P.comment &&
          (w.comment
            ? (w.comment +=
                `
` + P.comment)
            : (w.comment = P.comment));
      const ne = new q(w, X);
      if ((t.options.keepSourceTokens && (ne.srcToken = y), a)) {
        const B = u;
        (Mi(t, B.items, w) && i(E, "DUPLICATE_KEY", "Map keys must be unique"), B.items.push(ne));
      } else {
        const B = new Y(t.schema);
        ((B.flow = !0), B.items.push(ne));
        const fe = (X ?? w).range;
        ((B.range = [w.range[0], fe[1], fe[2]]), u.items.push(B));
      }
      c = X ? X.range[2] : P.end;
    }
  }
  const d = a ? "}" : "]",
    [m, ...g] = s.end;
  let f = c;
  if (m?.source === d) f = m.offset + m.source.length;
  else {
    const h = o[0].toUpperCase() + o.substring(1),
      y = p
        ? `${h} must end with a ${d}`
        : `${h} in block collection must be sufficiently indented and end with a ${d}`;
    (i(c, p ? "MISSING_CHAR" : "BAD_INDENT", y), m && m.source.length !== 1 && g.unshift(m));
  }
  if (g.length > 0) {
    const h = st(g, f, t.options.strict, i);
    (h.comment &&
      (u.comment
        ? (u.comment +=
            `
` + h.comment)
        : (u.comment = h.comment)),
      (u.range = [s.offset, f, h.offset]));
  } else u.range = [s.offset, f, f];
  return u;
}
function Jt(n, e, t, s, i, r) {
  const a =
      t.type === "block-map"
        ? ca(n, e, t, s, r)
        : t.type === "block-seq"
          ? ua(n, e, t, s, r)
          : fa(n, e, t, s, r),
    o = a.constructor;
  return i === "!" || i === o.tagName ? ((a.tag = o.tagName), a) : (i && (a.tag = i), a);
}
function da(n, e, t, s, i) {
  const r = s.tag,
    a = r ? e.directives.tagName(r.source, (d) => i(r, "TAG_RESOLVE_FAILED", d)) : null;
  if (t.type === "block-seq") {
    const { anchor: d, newlineAfterProp: m } = s,
      g = d && r ? (d.offset > r.offset ? d : r) : (d ?? r);
    g &&
      (!m || m.offset < g.offset) &&
      i(g, "MISSING_CHAR", "Missing newline after block sequence props");
  }
  const o =
    t.type === "block-map"
      ? "map"
      : t.type === "block-seq"
        ? "seq"
        : t.start.source === "{"
          ? "map"
          : "seq";
  if (
    !r ||
    !a ||
    a === "!" ||
    (a === Y.tagName && o === "map") ||
    (a === ce.tagName && o === "seq")
  )
    return Jt(n, e, t, i, a);
  let l = e.schema.tags.find((d) => d.tag === a && d.collection === o);
  if (!l) {
    const d = e.schema.knownTags[a];
    if (d?.collection === o) (e.schema.tags.push(Object.assign({}, d, { default: !1 })), (l = d));
    else
      return (
        d
          ? i(
              r,
              "BAD_COLLECTION_TYPE",
              `${d.tag} used for ${o} collection, but expects ${d.collection ?? "scalar"}`,
              !0,
            )
          : i(r, "TAG_RESOLVE_FAILED", `Unresolved tag: ${a}`, !0),
        Jt(n, e, t, i, a)
      );
  }
  const u = Jt(n, e, t, i, a, l),
    p = l.resolve?.(u, (d) => i(r, "TAG_RESOLVE_FAILED", d), e.options) ?? u,
    c = D(p) ? p : new O(p);
  return ((c.range = u.range), (c.tag = a), l?.format && (c.format = l.format), c);
}
function Ti(n, e, t) {
  const s = e.offset,
    i = ha(e, n.options.strict, t);
  if (!i) return { value: "", type: null, comment: "", range: [s, s, s] };
  const r = i.mode === ">" ? O.BLOCK_FOLDED : O.BLOCK_LITERAL,
    a = e.source ? pa(e.source) : [];
  let o = a.length;
  for (let f = a.length - 1; f >= 0; --f) {
    const h = a[f][1];
    if (h === "" || h === "\r") o = f;
    else break;
  }
  if (o === 0) {
    const f =
      i.chomp === "+" && a.length > 0
        ? `
`.repeat(Math.max(1, a.length - 1))
        : "";
    let h = s + i.length;
    return (
      e.source && (h += e.source.length),
      { value: f, type: r, comment: i.comment, range: [s, h, h] }
    );
  }
  let l = e.indent + i.indent,
    u = e.offset + i.length,
    p = 0;
  for (let f = 0; f < o; ++f) {
    const [h, y] = a[f];
    if (y === "" || y === "\r") i.indent === 0 && h.length > l && (l = h.length);
    else {
      (h.length < l &&
        t(
          u + h.length,
          "MISSING_CHAR",
          "Block scalars with more-indented leading empty lines must use an explicit indentation indicator",
        ),
        i.indent === 0 && (l = h.length),
        (p = f),
        l === 0 &&
          !n.atRoot &&
          t(u, "BAD_INDENT", "Block scalar values in collections must be indented"));
      break;
    }
    u += h.length + y.length + 1;
  }
  for (let f = a.length - 1; f >= o; --f) a[f][0].length > l && (o = f + 1);
  let c = "",
    d = "",
    m = !1;
  for (let f = 0; f < p; ++f)
    c +=
      a[f][0].slice(l) +
      `
`;
  for (let f = p; f < o; ++f) {
    let [h, y] = a[f];
    u += h.length + y.length + 1;
    const b = y[y.length - 1] === "\r";
    if ((b && (y = y.slice(0, -1)), y && h.length < l)) {
      const k = `Block scalar lines must not be less indented than their ${i.indent ? "explicit indentation indicator" : "first line"}`;
      (t(u - y.length - (b ? 2 : 1), "BAD_INDENT", k), (h = ""));
    }
    r === O.BLOCK_LITERAL
      ? ((c += d + h.slice(l) + y),
        (d = `
`))
      : h.length > l || y[0] === "	"
        ? (d === " "
            ? (d = `
`)
            : !m &&
              d ===
                `
` &&
              (d = `

`),
          (c += d + h.slice(l) + y),
          (d = `
`),
          (m = !0))
        : y === ""
          ? d ===
            `
`
            ? (c += `
`)
            : (d = `
`)
          : ((c += d + y), (d = " "), (m = !1));
  }
  switch (i.chomp) {
    case "-":
      break;
    case "+":
      for (let f = o; f < a.length; ++f)
        c +=
          `
` + a[f][0].slice(l);
      c[c.length - 1] !==
        `
` &&
        (c += `
`);
      break;
    default:
      c += `
`;
  }
  const g = s + i.length + e.source.length;
  return { value: c, type: r, comment: i.comment, range: [s, g, g] };
}
function ha({ offset: n, props: e }, t, s) {
  if (e[0].type !== "block-scalar-header")
    return (s(e[0], "IMPOSSIBLE", "Block scalar header not found"), null);
  const { source: i } = e[0],
    r = i[0];
  let a = 0,
    o = "",
    l = -1;
  for (let d = 1; d < i.length; ++d) {
    const m = i[d];
    if (!o && (m === "-" || m === "+")) o = m;
    else {
      const g = Number(m);
      !a && g ? (a = g) : l === -1 && (l = n + d);
    }
  }
  l !== -1 && s(l, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${i}`);
  let u = !1,
    p = "",
    c = i.length;
  for (let d = 1; d < e.length; ++d) {
    const m = e[d];
    switch (m.type) {
      case "space":
        u = !0;
      case "newline":
        c += m.source.length;
        break;
      case "comment":
        (t &&
          !u &&
          s(
            m,
            "MISSING_CHAR",
            "Comments must be separated from other tokens by white space characters",
          ),
          (c += m.source.length),
          (p = m.source.substring(1)));
        break;
      case "error":
        (s(m, "UNEXPECTED_TOKEN", m.message), (c += m.source.length));
        break;
      default: {
        const g = `Unexpected token in block scalar header: ${m.type}`;
        s(m, "UNEXPECTED_TOKEN", g);
        const f = m.source;
        f && typeof f == "string" && (c += f.length);
      }
    }
  }
  return { mode: r, indent: a, chomp: o, comment: p, length: c };
}
function pa(n) {
  const e = n.split(/\n( *)/),
    t = e[0],
    s = t.match(/^( *)/),
    r = [s?.[1] ? [s[1], t.slice(s[1].length)] : ["", t]];
  for (let a = 1; a < e.length; a += 2) r.push([e[a], e[a + 1]]);
  return r;
}
function Li(n, e, t) {
  const { offset: s, type: i, source: r, end: a } = n;
  let o, l;
  const u = (d, m, g) => t(s + d, m, g);
  switch (i) {
    case "scalar":
      ((o = O.PLAIN), (l = ma(r, u)));
      break;
    case "single-quoted-scalar":
      ((o = O.QUOTE_SINGLE), (l = ga(r, u)));
      break;
    case "double-quoted-scalar":
      ((o = O.QUOTE_DOUBLE), (l = ya(r, u)));
      break;
    default:
      return (
        t(n, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${i}`),
        { value: "", type: null, comment: "", range: [s, s + r.length, s + r.length] }
      );
  }
  const p = s + r.length,
    c = st(a, p, e, t);
  return { value: l, type: o, comment: c.comment, range: [s, p, c.offset] };
}
function ma(n, e) {
  let t = "";
  switch (n[0]) {
    case "	":
      t = "a tab character";
      break;
    case ",":
      t = "flow indicator character ,";
      break;
    case "%":
      t = "directive indicator character %";
      break;
    case "|":
    case ">": {
      t = `block scalar indicator ${n[0]}`;
      break;
    }
    case "@":
    case "`": {
      t = `reserved character ${n[0]}`;
      break;
    }
  }
  return (t && e(0, "BAD_SCALAR_START", `Plain value cannot start with ${t}`), xi(n));
}
function ga(n, e) {
  return (
    (n[n.length - 1] !== "'" || n.length === 1) &&
      e(n.length, "MISSING_CHAR", "Missing closing 'quote"),
    xi(n.slice(1, -1)).replace(/''/g, "'")
  );
}
function xi(n) {
  let e, t;
  try {
    ((e = new RegExp(
      `(.*?)(?<![ 	])[ 	]*\r?
`,
      "sy",
    )),
      (t = new RegExp(
        `[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`,
        "sy",
      )));
  } catch {
    ((e = /(.*?)[ \t]*\r?\n/sy), (t = /[ \t]*(.*?)[ \t]*\r?\n/sy));
  }
  let s = e.exec(n);
  if (!s) return n;
  let i = s[1],
    r = " ",
    a = e.lastIndex;
  for (t.lastIndex = a; (s = t.exec(n)); )
    (s[1] === ""
      ? r ===
        `
`
        ? (i += r)
        : (r = `
`)
      : ((i += r + s[1]), (r = " ")),
      (a = t.lastIndex));
  const o = /[ \t]*(.*)/sy;
  return ((o.lastIndex = a), (s = o.exec(n)), i + r + (s?.[1] ?? ""));
}
function ya(n, e) {
  let t = "";
  for (let s = 1; s < n.length - 1; ++s) {
    const i = n[s];
    if (
      !(
        i === "\r" &&
        n[s + 1] ===
          `
`
      )
    )
      if (
        i ===
        `
`
      ) {
        const { fold: r, offset: a } = ba(n, s);
        ((t += r), (s = a));
      } else if (i === "\\") {
        let r = n[++s];
        const a = wa[r];
        if (a) t += a;
        else if (
          r ===
          `
`
        )
          for (r = n[s + 1]; r === " " || r === "	"; ) r = n[++s + 1];
        else if (
          r === "\r" &&
          n[s + 1] ===
            `
`
        )
          for (r = n[++s + 1]; r === " " || r === "	"; ) r = n[++s + 1];
        else if (r === "x" || r === "u" || r === "U") {
          const o = { x: 2, u: 4, U: 8 }[r];
          ((t += Sa(n, s + 1, o, e)), (s += o));
        } else {
          const o = n.substr(s - 1, 2);
          (e(s - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${o}`), (t += o));
        }
      } else if (i === " " || i === "	") {
        const r = s;
        let a = n[s + 1];
        for (; a === " " || a === "	"; ) a = n[++s + 1];
        a !==
          `
` &&
          !(
            a === "\r" &&
            n[s + 2] ===
              `
`
          ) &&
          (t += s > r ? n.slice(r, s + 1) : i);
      } else t += i;
  }
  return (
    (n[n.length - 1] !== '"' || n.length === 1) &&
      e(n.length, "MISSING_CHAR", 'Missing closing "quote'),
    t
  );
}
function ba(n, e) {
  let t = "",
    s = n[e + 1];
  for (
    ;
    (s === " " ||
      s === "	" ||
      s ===
        `
` ||
      s === "\r") &&
    !(
      s === "\r" &&
      n[e + 2] !==
        `
`
    );
  )
    (s ===
      `
` &&
      (t += `
`),
      (e += 1),
      (s = n[e + 1]));
  return (t || (t = " "), { fold: t, offset: e });
}
const wa = {
  "0": "\0",
  "a": "\x07",
  "b": "\b",
  "e": "\x1B",
  "f": "\f",
  "n": `
`,
  "r": "\r",
  "t": "	",
  "v": "\v",
  "N": "",
  "_": " ",
  "L": "\u2028",
  "P": "\u2029",
  " ": " ",
  '"': '"',
  "/": "/",
  "\\": "\\",
  "	": "	",
};
function Sa(n, e, t, s) {
  const i = n.substr(e, t),
    a = i.length === t && /^[0-9a-fA-F]+$/.test(i) ? parseInt(i, 16) : NaN;
  if (isNaN(a)) {
    const o = n.substr(e - 2, t + 2);
    return (s(e - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${o}`), o);
  }
  return String.fromCodePoint(a);
}
function Di(n, e, t, s) {
  const {
      value: i,
      type: r,
      comment: a,
      range: o,
    } = e.type === "block-scalar" ? Ti(n, e, s) : Li(e, n.options.strict, s),
    l = t ? n.directives.tagName(t.source, (c) => s(t, "TAG_RESOLVE_FAILED", c)) : null;
  let u;
  n.options.stringKeys && n.atKey
    ? (u = n.schema[se])
    : l
      ? (u = va(n.schema, i, l, t, s))
      : e.type === "scalar"
        ? (u = ka(n, i, e, s))
        : (u = n.schema[se]);
  let p;
  try {
    const c = u.resolve(i, (d) => s(t ?? e, "TAG_RESOLVE_FAILED", d), n.options);
    p = T(c) ? c : new O(c);
  } catch (c) {
    const d = c instanceof Error ? c.message : String(c);
    (s(t ?? e, "TAG_RESOLVE_FAILED", d), (p = new O(i)));
  }
  return (
    (p.range = o),
    (p.source = i),
    r && (p.type = r),
    l && (p.tag = l),
    u.format && (p.format = u.format),
    a && (p.comment = a),
    p
  );
}
function va(n, e, t, s, i) {
  if (t === "!") return n[se];
  const r = [];
  for (const o of n.tags)
    if (!o.collection && o.tag === t)
      if (o.default && o.test) r.push(o);
      else return o;
  for (const o of r) if (o.test?.test(e)) return o;
  const a = n.knownTags[t];
  return a && !a.collection
    ? (n.tags.push(Object.assign({}, a, { default: !1, test: void 0 })), a)
    : (i(s, "TAG_RESOLVE_FAILED", `Unresolved tag: ${t}`, t !== "tag:yaml.org,2002:str"), n[se]);
}
function ka({ atKey: n, directives: e, schema: t }, s, i, r) {
  const a =
    t.tags.find((o) => (o.default === !0 || (n && o.default === "key")) && o.test?.test(s)) ||
    t[se];
  if (t.compat) {
    const o = t.compat.find((l) => l.default && l.test?.test(s)) ?? t[se];
    if (a.tag !== o.tag) {
      const l = e.tagString(a.tag),
        u = e.tagString(o.tag),
        p = `Value may be parsed as either ${l} or ${u}`;
      r(i, "TAG_RESOLVE_FAILED", p, !0);
    }
  }
  return a;
}
function Na(n, e, t) {
  if (e) {
    t ?? (t = e.length);
    for (let s = t - 1; s >= 0; --s) {
      let i = e[s];
      switch (i.type) {
        case "space":
        case "comment":
        case "newline":
          n -= i.source.length;
          continue;
      }
      for (i = e[++s]; i?.type === "space"; ) ((n += i.source.length), (i = e[++s]));
      break;
    }
  }
  return n;
}
const _a = { composeNode: Fi, composeEmptyNode: bs };
function Fi(n, e, t, s) {
  const i = n.atKey,
    { spaceBefore: r, comment: a, anchor: o, tag: l } = t;
  let u,
    p = !0;
  switch (e.type) {
    case "alias":
      ((u = $a(n, e, s)),
        (o || l) && s(e, "ALIAS_PROPS", "An alias node must not specify any properties"));
      break;
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "block-scalar":
      ((u = Di(n, e, l, s)), o && (u.anchor = o.source.substring(1)));
      break;
    case "block-map":
    case "block-seq":
    case "flow-collection":
      ((u = da(_a, n, e, t, s)), o && (u.anchor = o.source.substring(1)));
      break;
    default: {
      const c = e.type === "error" ? e.message : `Unsupported token (type: ${e.type})`;
      (s(e, "UNEXPECTED_TOKEN", c), (u = bs(n, e.offset, void 0, null, t, s)), (p = !1));
    }
  }
  return (
    o && u.anchor === "" && s(o, "BAD_ALIAS", "Anchor cannot be an empty string"),
    i &&
      n.options.stringKeys &&
      (!T(u) || typeof u.value != "string" || (u.tag && u.tag !== "tag:yaml.org,2002:str")) &&
      s(l ?? e, "NON_STRING_KEY", "With stringKeys, all keys must be strings"),
    r && (u.spaceBefore = !0),
    a && (e.type === "scalar" && e.source === "" ? (u.comment = a) : (u.commentBefore = a)),
    n.options.keepSourceTokens && p && (u.srcToken = e),
    u
  );
}
function bs(n, e, t, s, { spaceBefore: i, comment: r, anchor: a, tag: o, end: l }, u) {
  const p = { type: "scalar", offset: Na(e, t, s), indent: -1, source: "" },
    c = Di(n, p, o, u);
  return (
    a &&
      ((c.anchor = a.source.substring(1)),
      c.anchor === "" && u(a, "BAD_ALIAS", "Anchor cannot be an empty string")),
    i && (c.spaceBefore = !0),
    r && ((c.comment = r), (c.range[2] = l)),
    c
  );
}
function $a({ options: n }, { offset: e, source: t, end: s }, i) {
  const r = new wt(t.substring(1));
  (r.source === "" && i(e, "BAD_ALIAS", "Alias cannot be an empty string"),
    r.source.endsWith(":") &&
      i(e + t.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", !0));
  const a = e + t.length,
    o = st(s, a, n.strict, i);
  return ((r.range = [e, a, o.offset]), o.comment && (r.comment = o.comment), r);
}
function Ca(n, e, { offset: t, start: s, value: i, end: r }, a) {
  const o = Object.assign({ _directives: e }, n),
    l = new Pe(void 0, o),
    u = { atKey: !1, atRoot: !0, directives: l.directives, options: l.options, schema: l.schema },
    p = Ie(s, {
      indicator: "doc-start",
      next: i ?? r?.[0],
      offset: t,
      onError: a,
      parentIndent: 0,
      startOnNewline: !0,
    });
  (p.found &&
    ((l.directives.docStart = !0),
    i &&
      (i.type === "block-map" || i.type === "block-seq") &&
      !p.hasNewline &&
      a(
        p.end,
        "MISSING_CHAR",
        "Block collection cannot start on same line with directives-end marker",
      )),
    (l.contents = i ? Fi(u, i, p, a) : bs(u, p.end, s, null, p, a)));
  const c = l.contents.range[2],
    d = st(r, c, !1, a);
  return (d.comment && (l.comment = d.comment), (l.range = [t, c, d.offset]), l);
}
function je(n) {
  if (typeof n == "number") return [n, n + 1];
  if (Array.isArray(n)) return n.length === 2 ? n : [n[0], n[1]];
  const { offset: e, source: t } = n;
  return [e, e + (typeof t == "string" ? t.length : 1)];
}
function Yn(n) {
  let e = "",
    t = !1,
    s = !1;
  for (let i = 0; i < n.length; ++i) {
    const r = n[i];
    switch (r[0]) {
      case "#":
        ((e +=
          (e === ""
            ? ""
            : s
              ? `

`
              : `
`) + (r.substring(1) || " ")),
          (t = !0),
          (s = !1));
        break;
      case "%":
        (n[i + 1]?.[0] !== "#" && (i += 1), (t = !1));
        break;
      default:
        (t || (s = !0), (t = !1));
    }
  }
  return { comment: e, afterEmptyLine: s };
}
class ws {
  constructor(e = {}) {
    ((this.doc = null),
      (this.atDirectives = !1),
      (this.prelude = []),
      (this.errors = []),
      (this.warnings = []),
      (this.onError = (t, s, i, r) => {
        const a = je(t);
        r ? this.warnings.push(new Ai(a, s, i)) : this.errors.push(new pe(a, s, i));
      }),
      (this.directives = new R({ version: e.version || "1.2" })),
      (this.options = e));
  }
  decorate(e, t) {
    const { comment: s, afterEmptyLine: i } = Yn(this.prelude);
    if (s) {
      const r = e.contents;
      if (t)
        e.comment = e.comment
          ? `${e.comment}
${s}`
          : s;
      else if (i || e.directives.docStart || !r) e.commentBefore = s;
      else if (x(r) && !r.flow && r.items.length > 0) {
        let a = r.items[0];
        L(a) && (a = a.key);
        const o = a.commentBefore;
        a.commentBefore = o
          ? `${s}
${o}`
          : s;
      } else {
        const a = r.commentBefore;
        r.commentBefore = a
          ? `${s}
${a}`
          : s;
      }
    }
    (t
      ? (Array.prototype.push.apply(e.errors, this.errors),
        Array.prototype.push.apply(e.warnings, this.warnings))
      : ((e.errors = this.errors), (e.warnings = this.warnings)),
      (this.prelude = []),
      (this.errors = []),
      (this.warnings = []));
  }
  streamInfo() {
    return {
      comment: Yn(this.prelude).comment,
      directives: this.directives,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
  *compose(e, t = !1, s = -1) {
    for (const i of e) yield* this.next(i);
    yield* this.end(t, s);
  }
  *next(e) {
    switch (e.type) {
      case "directive":
        (this.directives.add(e.source, (t, s, i) => {
          const r = je(e);
          ((r[0] += t), this.onError(r, "BAD_DIRECTIVE", s, i));
        }),
          this.prelude.push(e.source),
          (this.atDirectives = !0));
        break;
      case "document": {
        const t = Ca(this.options, this.directives, e, this.onError);
        (this.atDirectives &&
          !t.directives.docStart &&
          this.onError(e, "MISSING_CHAR", "Missing directives-end/doc-start indicator line"),
          this.decorate(t, !1),
          this.doc && (yield this.doc),
          (this.doc = t),
          (this.atDirectives = !1));
        break;
      }
      case "byte-order-mark":
      case "space":
        break;
      case "comment":
      case "newline":
        this.prelude.push(e.source);
        break;
      case "error": {
        const t = e.source ? `${e.message}: ${JSON.stringify(e.source)}` : e.message,
          s = new pe(je(e), "UNEXPECTED_TOKEN", t);
        this.atDirectives || !this.doc ? this.errors.push(s) : this.doc.errors.push(s);
        break;
      }
      case "doc-end": {
        if (!this.doc) {
          const s = "Unexpected doc-end without preceding document";
          this.errors.push(new pe(je(e), "UNEXPECTED_TOKEN", s));
          break;
        }
        this.doc.directives.docEnd = !0;
        const t = st(e.end, e.offset + e.source.length, this.doc.options.strict, this.onError);
        if ((this.decorate(this.doc, !0), t.comment)) {
          const s = this.doc.comment;
          this.doc.comment = s
            ? `${s}
${t.comment}`
            : t.comment;
        }
        this.doc.range[2] = t.offset;
        break;
      }
      default:
        this.errors.push(new pe(je(e), "UNEXPECTED_TOKEN", `Unsupported token ${e.type}`));
    }
  }
  *end(e = !1, t = -1) {
    if (this.doc) (this.decorate(this.doc, !0), yield this.doc, (this.doc = null));
    else if (e) {
      const s = Object.assign({ _directives: this.directives }, this.options),
        i = new Pe(void 0, s);
      (this.atDirectives &&
        this.onError(t, "MISSING_CHAR", "Missing directives-end indicator line"),
        (i.range = [0, t, t]),
        this.decorate(i, !1),
        yield i);
    }
  }
}
function Oa(n, e = !0, t) {
  if (n) {
    const s = (i, r, a) => {
      const o = typeof i == "number" ? i : Array.isArray(i) ? i[0] : i.offset;
      if (t) t(o, r, a);
      else throw new pe([o, o + 1], r, a);
    };
    switch (n.type) {
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return Li(n, e, s);
      case "block-scalar":
        return Ti({ options: { strict: e } }, n, s);
    }
  }
  return null;
}
function Ia(n, e) {
  const { implicitKey: t = !1, indent: s, inFlow: i = !1, offset: r = -1, type: a = "PLAIN" } = e,
    o = et(
      { type: a, value: n },
      {
        implicitKey: t,
        indent: s > 0 ? " ".repeat(s) : "",
        inFlow: i,
        options: { blockQuote: !0, lineWidth: -1 },
      },
    ),
    l = e.end ?? [
      {
        type: "newline",
        offset: -1,
        indent: s,
        source: `
`,
      },
    ];
  switch (o[0]) {
    case "|":
    case ">": {
      const u = o.indexOf(`
`),
        p = o.substring(0, u),
        c =
          o.substring(u + 1) +
          `
`,
        d = [{ type: "block-scalar-header", offset: r, indent: s, source: p }];
      return (
        Pi(d, l) ||
          d.push({
            type: "newline",
            offset: -1,
            indent: s,
            source: `
`,
          }),
        { type: "block-scalar", offset: r, indent: s, props: d, source: c }
      );
    }
    case '"':
      return { type: "double-quoted-scalar", offset: r, indent: s, source: o, end: l };
    case "'":
      return { type: "single-quoted-scalar", offset: r, indent: s, source: o, end: l };
    default:
      return { type: "scalar", offset: r, indent: s, source: o, end: l };
  }
}
function Ea(n, e, t = {}) {
  let { afterKey: s = !1, implicitKey: i = !1, inFlow: r = !1, type: a } = t,
    o = "indent" in n ? n.indent : null;
  if ((s && typeof o == "number" && (o += 2), !a))
    switch (n.type) {
      case "single-quoted-scalar":
        a = "QUOTE_SINGLE";
        break;
      case "double-quoted-scalar":
        a = "QUOTE_DOUBLE";
        break;
      case "block-scalar": {
        const u = n.props[0];
        if (u.type !== "block-scalar-header") throw new Error("Invalid block scalar header");
        a = u.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
        break;
      }
      default:
        a = "PLAIN";
    }
  const l = et(
    { type: a, value: e },
    {
      implicitKey: i || o === null,
      indent: o !== null && o > 0 ? " ".repeat(o) : "",
      inFlow: r,
      options: { blockQuote: !0, lineWidth: -1 },
    },
  );
  switch (l[0]) {
    case "|":
    case ">":
      Aa(n, l);
      break;
    case '"':
      Gt(n, l, "double-quoted-scalar");
      break;
    case "'":
      Gt(n, l, "single-quoted-scalar");
      break;
    default:
      Gt(n, l, "scalar");
  }
}
function Aa(n, e) {
  const t = e.indexOf(`
`),
    s = e.substring(0, t),
    i =
      e.substring(t + 1) +
      `
`;
  if (n.type === "block-scalar") {
    const r = n.props[0];
    if (r.type !== "block-scalar-header") throw new Error("Invalid block scalar header");
    ((r.source = s), (n.source = i));
  } else {
    const { offset: r } = n,
      a = "indent" in n ? n.indent : -1,
      o = [{ type: "block-scalar-header", offset: r, indent: a, source: s }];
    Pi(o, "end" in n ? n.end : void 0) ||
      o.push({
        type: "newline",
        offset: -1,
        indent: a,
        source: `
`,
      });
    for (const l of Object.keys(n)) l !== "type" && l !== "offset" && delete n[l];
    Object.assign(n, { type: "block-scalar", indent: a, props: o, source: i });
  }
}
function Pi(n, e) {
  if (e)
    for (const t of e)
      switch (t.type) {
        case "space":
        case "comment":
          n.push(t);
          break;
        case "newline":
          return (n.push(t), !0);
      }
  return !1;
}
function Gt(n, e, t) {
  switch (n.type) {
    case "scalar":
    case "double-quoted-scalar":
    case "single-quoted-scalar":
      ((n.type = t), (n.source = e));
      break;
    case "block-scalar": {
      const s = n.props.slice(1);
      let i = e.length;
      n.props[0].type === "block-scalar-header" && (i -= n.props[0].source.length);
      for (const r of s) r.offset += i;
      (delete n.props, Object.assign(n, { type: t, source: e, end: s }));
      break;
    }
    case "block-map":
    case "block-seq": {
      const i = {
        type: "newline",
        offset: n.offset + e.length,
        indent: n.indent,
        source: `
`,
      };
      (delete n.items, Object.assign(n, { type: t, source: e, end: [i] }));
      break;
    }
    default: {
      const s = "indent" in n ? n.indent : -1,
        i =
          "end" in n && Array.isArray(n.end)
            ? n.end.filter(
                (r) => r.type === "space" || r.type === "comment" || r.type === "newline",
              )
            : [];
      for (const r of Object.keys(n)) r !== "type" && r !== "offset" && delete n[r];
      Object.assign(n, { type: t, indent: s, source: e, end: i });
    }
  }
}
const Ma = (n) => ("type" in n ? yt(n) : ht(n));
function yt(n) {
  switch (n.type) {
    case "block-scalar": {
      let e = "";
      for (const t of n.props) e += yt(t);
      return e + n.source;
    }
    case "block-map":
    case "block-seq": {
      let e = "";
      for (const t of n.items) e += ht(t);
      return e;
    }
    case "flow-collection": {
      let e = n.start.source;
      for (const t of n.items) e += ht(t);
      for (const t of n.end) e += t.source;
      return e;
    }
    case "document": {
      let e = ht(n);
      if (n.end) for (const t of n.end) e += t.source;
      return e;
    }
    default: {
      let e = n.source;
      if ("end" in n && n.end) for (const t of n.end) e += t.source;
      return e;
    }
  }
}
function ht({ start: n, key: e, sep: t, value: s }) {
  let i = "";
  for (const r of n) i += r.source;
  if ((e && (i += yt(e)), t)) for (const r of t) i += r.source;
  return (s && (i += yt(s)), i);
}
const rs = Symbol("break visit"),
  Ta = Symbol("skip children"),
  Bi = Symbol("remove item");
function me(n, e) {
  ("type" in n && n.type === "document" && (n = { start: n.start, value: n.value }),
    ji(Object.freeze([]), n, e));
}
me.BREAK = rs;
me.SKIP = Ta;
me.REMOVE = Bi;
me.itemAtPath = (n, e) => {
  let t = n;
  for (const [s, i] of e) {
    const r = t?.[s];
    if (r && "items" in r) t = r.items[i];
    else return;
  }
  return t;
};
me.parentCollection = (n, e) => {
  const t = me.itemAtPath(n, e.slice(0, -1)),
    s = e[e.length - 1][0],
    i = t?.[s];
  if (i && "items" in i) return i;
  throw new Error("Parent collection not found");
};
function ji(n, e, t) {
  let s = t(e, n);
  if (typeof s == "symbol") return s;
  for (const i of ["key", "value"]) {
    const r = e[i];
    if (r && "items" in r) {
      for (let a = 0; a < r.items.length; ++a) {
        const o = ji(Object.freeze(n.concat([[i, a]])), r.items[a], t);
        if (typeof o == "number") a = o - 1;
        else {
          if (o === rs) return rs;
          o === Bi && (r.items.splice(a, 1), (a -= 1));
        }
      }
      typeof s == "function" && i === "key" && (s = s(e, n));
    }
  }
  return typeof s == "function" ? s(e, n) : s;
}
const Et = "\uFEFF",
  At = "",
  Mt = "",
  Xe = "",
  La = (n) => !!n && "items" in n,
  xa = (n) =>
    !!n &&
    (n.type === "scalar" ||
      n.type === "single-quoted-scalar" ||
      n.type === "double-quoted-scalar" ||
      n.type === "block-scalar");
function Da(n) {
  switch (n) {
    case Et:
      return "<BOM>";
    case At:
      return "<DOC>";
    case Mt:
      return "<FLOW_END>";
    case Xe:
      return "<SCALAR>";
    default:
      return JSON.stringify(n);
  }
}
function Ki(n) {
  switch (n) {
    case Et:
      return "byte-order-mark";
    case At:
      return "doc-mode";
    case Mt:
      return "flow-error-end";
    case Xe:
      return "scalar";
    case "---":
      return "doc-start";
    case "...":
      return "doc-end";
    case "":
    case `
`:
    case `\r
`:
      return "newline";
    case "-":
      return "seq-item-ind";
    case "?":
      return "explicit-key-ind";
    case ":":
      return "map-value-ind";
    case "{":
      return "flow-map-start";
    case "}":
      return "flow-map-end";
    case "[":
      return "flow-seq-start";
    case "]":
      return "flow-seq-end";
    case ",":
      return "comma";
  }
  switch (n[0]) {
    case " ":
    case "	":
      return "space";
    case "#":
      return "comment";
    case "%":
      return "directive-line";
    case "*":
      return "alias";
    case "&":
      return "anchor";
    case "!":
      return "tag";
    case "'":
      return "single-quoted-scalar";
    case '"':
      return "double-quoted-scalar";
    case "|":
    case ">":
      return "block-scalar-header";
  }
  return null;
}
const Fa = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      BOM: Et,
      DOCUMENT: At,
      FLOW_END: Mt,
      SCALAR: Xe,
      createScalarToken: Ia,
      isCollection: La,
      isScalar: xa,
      prettyToken: Da,
      resolveAsScalar: Oa,
      setScalarValue: Ea,
      stringify: Ma,
      tokenType: Ki,
      visit: me,
    },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
function Z(n) {
  switch (n) {
    case void 0:
    case " ":
    case `
`:
    case "\r":
    case "	":
      return !0;
    default:
      return !1;
  }
}
const Wn = new Set("0123456789ABCDEFabcdef"),
  Pa = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()"),
  ot = new Set(",[]{}"),
  Ba = new Set(` ,[]{}
\r	`),
  Qt = (n) => !n || Ba.has(n);
class Vi {
  constructor() {
    ((this.atEnd = !1),
      (this.blockScalarIndent = -1),
      (this.blockScalarKeep = !1),
      (this.buffer = ""),
      (this.flowKey = !1),
      (this.flowLevel = 0),
      (this.indentNext = 0),
      (this.indentValue = 0),
      (this.lineEndPos = null),
      (this.next = null),
      (this.pos = 0));
  }
  *lex(e, t = !1) {
    if (e) {
      if (typeof e != "string") throw TypeError("source is not a string");
      ((this.buffer = this.buffer ? this.buffer + e : e), (this.lineEndPos = null));
    }
    this.atEnd = !t;
    let s = this.next ?? "stream";
    for (; s && (t || this.hasChars(1)); ) s = yield* this.parseNext(s);
  }
  atLineEnd() {
    let e = this.pos,
      t = this.buffer[e];
    for (; t === " " || t === "	"; ) t = this.buffer[++e];
    return !t ||
      t === "#" ||
      t ===
        `
`
      ? !0
      : t === "\r"
        ? this.buffer[e + 1] ===
          `
`
        : !1;
  }
  charAt(e) {
    return this.buffer[this.pos + e];
  }
  continueScalar(e) {
    let t = this.buffer[e];
    if (this.indentNext > 0) {
      let s = 0;
      for (; t === " "; ) t = this.buffer[++s + e];
      if (t === "\r") {
        const i = this.buffer[s + e + 1];
        if (
          i ===
            `
` ||
          (!i && !this.atEnd)
        )
          return e + s + 1;
      }
      return t ===
        `
` ||
        s >= this.indentNext ||
        (!t && !this.atEnd)
        ? e + s
        : -1;
    }
    if (t === "-" || t === ".") {
      const s = this.buffer.substr(e, 3);
      if ((s === "---" || s === "...") && Z(this.buffer[e + 3])) return -1;
    }
    return e;
  }
  getLine() {
    let e = this.lineEndPos;
    return (
      (typeof e != "number" || (e !== -1 && e < this.pos)) &&
        ((e = this.buffer.indexOf(
          `
`,
          this.pos,
        )),
        (this.lineEndPos = e)),
      e === -1
        ? this.atEnd
          ? this.buffer.substring(this.pos)
          : null
        : (this.buffer[e - 1] === "\r" && (e -= 1), this.buffer.substring(this.pos, e))
    );
  }
  hasChars(e) {
    return this.pos + e <= this.buffer.length;
  }
  setNext(e) {
    return (
      (this.buffer = this.buffer.substring(this.pos)),
      (this.pos = 0),
      (this.lineEndPos = null),
      (this.next = e),
      null
    );
  }
  peek(e) {
    return this.buffer.substr(this.pos, e);
  }
  *parseNext(e) {
    switch (e) {
      case "stream":
        return yield* this.parseStream();
      case "line-start":
        return yield* this.parseLineStart();
      case "block-start":
        return yield* this.parseBlockStart();
      case "doc":
        return yield* this.parseDocument();
      case "flow":
        return yield* this.parseFlowCollection();
      case "quoted-scalar":
        return yield* this.parseQuotedScalar();
      case "block-scalar":
        return yield* this.parseBlockScalar();
      case "plain-scalar":
        return yield* this.parsePlainScalar();
    }
  }
  *parseStream() {
    let e = this.getLine();
    if (e === null) return this.setNext("stream");
    if ((e[0] === Et && (yield* this.pushCount(1), (e = e.substring(1))), e[0] === "%")) {
      let t = e.length,
        s = e.indexOf("#");
      for (; s !== -1; ) {
        const r = e[s - 1];
        if (r === " " || r === "	") {
          t = s - 1;
          break;
        } else s = e.indexOf("#", s + 1);
      }
      for (;;) {
        const r = e[t - 1];
        if (r === " " || r === "	") t -= 1;
        else break;
      }
      const i = (yield* this.pushCount(t)) + (yield* this.pushSpaces(!0));
      return (yield* this.pushCount(e.length - i), this.pushNewline(), "stream");
    }
    if (this.atLineEnd()) {
      const t = yield* this.pushSpaces(!0);
      return (yield* this.pushCount(e.length - t), yield* this.pushNewline(), "stream");
    }
    return (yield At, yield* this.parseLineStart());
  }
  *parseLineStart() {
    const e = this.charAt(0);
    if (!e && !this.atEnd) return this.setNext("line-start");
    if (e === "-" || e === ".") {
      if (!this.atEnd && !this.hasChars(4)) return this.setNext("line-start");
      const t = this.peek(3);
      if ((t === "---" || t === "...") && Z(this.charAt(3)))
        return (
          yield* this.pushCount(3),
          (this.indentValue = 0),
          (this.indentNext = 0),
          t === "---" ? "doc" : "stream"
        );
    }
    return (
      (this.indentValue = yield* this.pushSpaces(!1)),
      this.indentNext > this.indentValue &&
        !Z(this.charAt(1)) &&
        (this.indentNext = this.indentValue),
      yield* this.parseBlockStart()
    );
  }
  *parseBlockStart() {
    const [e, t] = this.peek(2);
    if (!t && !this.atEnd) return this.setNext("block-start");
    if ((e === "-" || e === "?" || e === ":") && Z(t)) {
      const s = (yield* this.pushCount(1)) + (yield* this.pushSpaces(!0));
      return (
        (this.indentNext = this.indentValue + 1),
        (this.indentValue += s),
        yield* this.parseBlockStart()
      );
    }
    return "doc";
  }
  *parseDocument() {
    yield* this.pushSpaces(!0);
    const e = this.getLine();
    if (e === null) return this.setNext("doc");
    let t = yield* this.pushIndicators();
    switch (e[t]) {
      case "#":
        yield* this.pushCount(e.length - t);
      case void 0:
        return (yield* this.pushNewline(), yield* this.parseLineStart());
      case "{":
      case "[":
        return (yield* this.pushCount(1), (this.flowKey = !1), (this.flowLevel = 1), "flow");
      case "}":
      case "]":
        return (yield* this.pushCount(1), "doc");
      case "*":
        return (yield* this.pushUntil(Qt), "doc");
      case '"':
      case "'":
        return yield* this.parseQuotedScalar();
      case "|":
      case ">":
        return (
          (t += yield* this.parseBlockScalarHeader()),
          (t += yield* this.pushSpaces(!0)),
          yield* this.pushCount(e.length - t),
          yield* this.pushNewline(),
          yield* this.parseBlockScalar()
        );
      default:
        return yield* this.parsePlainScalar();
    }
  }
  *parseFlowCollection() {
    let e,
      t,
      s = -1;
    do
      ((e = yield* this.pushNewline()),
        e > 0 ? ((t = yield* this.pushSpaces(!1)), (this.indentValue = s = t)) : (t = 0),
        (t += yield* this.pushSpaces(!0)));
    while (e + t > 0);
    const i = this.getLine();
    if (i === null) return this.setNext("flow");
    if (
      ((s !== -1 && s < this.indentNext && i[0] !== "#") ||
        (s === 0 && (i.startsWith("---") || i.startsWith("...")) && Z(i[3]))) &&
      !(s === this.indentNext - 1 && this.flowLevel === 1 && (i[0] === "]" || i[0] === "}"))
    )
      return ((this.flowLevel = 0), yield Mt, yield* this.parseLineStart());
    let r = 0;
    for (; i[r] === ","; )
      ((r += yield* this.pushCount(1)), (r += yield* this.pushSpaces(!0)), (this.flowKey = !1));
    switch (((r += yield* this.pushIndicators()), i[r])) {
      case void 0:
        return "flow";
      case "#":
        return (yield* this.pushCount(i.length - r), "flow");
      case "{":
      case "[":
        return (yield* this.pushCount(1), (this.flowKey = !1), (this.flowLevel += 1), "flow");
      case "}":
      case "]":
        return (
          yield* this.pushCount(1),
          (this.flowKey = !0),
          (this.flowLevel -= 1),
          this.flowLevel ? "flow" : "doc"
        );
      case "*":
        return (yield* this.pushUntil(Qt), "flow");
      case '"':
      case "'":
        return ((this.flowKey = !0), yield* this.parseQuotedScalar());
      case ":": {
        const a = this.charAt(1);
        if (this.flowKey || Z(a) || a === ",")
          return (
            (this.flowKey = !1),
            yield* this.pushCount(1),
            yield* this.pushSpaces(!0),
            "flow"
          );
      }
      default:
        return ((this.flowKey = !1), yield* this.parsePlainScalar());
    }
  }
  *parseQuotedScalar() {
    const e = this.charAt(0);
    let t = this.buffer.indexOf(e, this.pos + 1);
    if (e === "'")
      for (; t !== -1 && this.buffer[t + 1] === "'"; ) t = this.buffer.indexOf("'", t + 2);
    else
      for (; t !== -1; ) {
        let r = 0;
        for (; this.buffer[t - 1 - r] === "\\"; ) r += 1;
        if (r % 2 === 0) break;
        t = this.buffer.indexOf('"', t + 1);
      }
    const s = this.buffer.substring(0, t);
    let i = s.indexOf(
      `
`,
      this.pos,
    );
    if (i !== -1) {
      for (; i !== -1; ) {
        const r = this.continueScalar(i + 1);
        if (r === -1) break;
        i = s.indexOf(
          `
`,
          r,
        );
      }
      i !== -1 && (t = i - (s[i - 1] === "\r" ? 2 : 1));
    }
    if (t === -1) {
      if (!this.atEnd) return this.setNext("quoted-scalar");
      t = this.buffer.length;
    }
    return (yield* this.pushToIndex(t + 1, !1), this.flowLevel ? "flow" : "doc");
  }
  *parseBlockScalarHeader() {
    ((this.blockScalarIndent = -1), (this.blockScalarKeep = !1));
    let e = this.pos;
    for (;;) {
      const t = this.buffer[++e];
      if (t === "+") this.blockScalarKeep = !0;
      else if (t > "0" && t <= "9") this.blockScalarIndent = Number(t) - 1;
      else if (t !== "-") break;
    }
    return yield* this.pushUntil((t) => Z(t) || t === "#");
  }
  *parseBlockScalar() {
    let e = this.pos - 1,
      t = 0,
      s;
    e: for (let r = this.pos; (s = this.buffer[r]); ++r)
      switch (s) {
        case " ":
          t += 1;
          break;
        case `
`:
          ((e = r), (t = 0));
          break;
        case "\r": {
          const a = this.buffer[r + 1];
          if (!a && !this.atEnd) return this.setNext("block-scalar");
          if (
            a ===
            `
`
          )
            break;
        }
        default:
          break e;
      }
    if (!s && !this.atEnd) return this.setNext("block-scalar");
    if (t >= this.indentNext) {
      this.blockScalarIndent === -1
        ? (this.indentNext = t)
        : (this.indentNext =
            this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext));
      do {
        const r = this.continueScalar(e + 1);
        if (r === -1) break;
        e = this.buffer.indexOf(
          `
`,
          r,
        );
      } while (e !== -1);
      if (e === -1) {
        if (!this.atEnd) return this.setNext("block-scalar");
        e = this.buffer.length;
      }
    }
    let i = e + 1;
    for (s = this.buffer[i]; s === " "; ) s = this.buffer[++i];
    if (s === "	") {
      for (
        ;
        s === "	" ||
        s === " " ||
        s === "\r" ||
        s ===
          `
`;
      )
        s = this.buffer[++i];
      e = i - 1;
    } else if (!this.blockScalarKeep)
      do {
        let r = e - 1,
          a = this.buffer[r];
        a === "\r" && (a = this.buffer[--r]);
        const o = r;
        for (; a === " "; ) a = this.buffer[--r];
        if (
          a ===
            `
` &&
          r >= this.pos &&
          r + 1 + t > o
        )
          e = r;
        else break;
      } while (!0);
    return (yield Xe, yield* this.pushToIndex(e + 1, !0), yield* this.parseLineStart());
  }
  *parsePlainScalar() {
    const e = this.flowLevel > 0;
    let t = this.pos - 1,
      s = this.pos - 1,
      i;
    for (; (i = this.buffer[++s]); )
      if (i === ":") {
        const r = this.buffer[s + 1];
        if (Z(r) || (e && ot.has(r))) break;
        t = s;
      } else if (Z(i)) {
        let r = this.buffer[s + 1];
        if (
          (i === "\r" &&
            (r ===
            `
`
              ? ((s += 1),
                (i = `
`),
                (r = this.buffer[s + 1]))
              : (t = s)),
          r === "#" || (e && ot.has(r)))
        )
          break;
        if (
          i ===
          `
`
        ) {
          const a = this.continueScalar(s + 1);
          if (a === -1) break;
          s = Math.max(s, a - 2);
        }
      } else {
        if (e && ot.has(i)) break;
        t = s;
      }
    return !i && !this.atEnd
      ? this.setNext("plain-scalar")
      : (yield Xe, yield* this.pushToIndex(t + 1, !0), e ? "flow" : "doc");
  }
  *pushCount(e) {
    return e > 0 ? (yield this.buffer.substr(this.pos, e), (this.pos += e), e) : 0;
  }
  *pushToIndex(e, t) {
    const s = this.buffer.slice(this.pos, e);
    return s ? (yield s, (this.pos += s.length), s.length) : (t && (yield ""), 0);
  }
  *pushIndicators() {
    switch (this.charAt(0)) {
      case "!":
        return (
          (yield* this.pushTag()) + (yield* this.pushSpaces(!0)) + (yield* this.pushIndicators())
        );
      case "&":
        return (
          (yield* this.pushUntil(Qt)) +
          (yield* this.pushSpaces(!0)) +
          (yield* this.pushIndicators())
        );
      case "-":
      case "?":
      case ":": {
        const e = this.flowLevel > 0,
          t = this.charAt(1);
        if (Z(t) || (e && ot.has(t)))
          return (
            e ? this.flowKey && (this.flowKey = !1) : (this.indentNext = this.indentValue + 1),
            (yield* this.pushCount(1)) +
              (yield* this.pushSpaces(!0)) +
              (yield* this.pushIndicators())
          );
      }
    }
    return 0;
  }
  *pushTag() {
    if (this.charAt(1) === "<") {
      let e = this.pos + 2,
        t = this.buffer[e];
      for (; !Z(t) && t !== ">"; ) t = this.buffer[++e];
      return yield* this.pushToIndex(t === ">" ? e + 1 : e, !1);
    } else {
      let e = this.pos + 1,
        t = this.buffer[e];
      for (; t; )
        if (Pa.has(t)) t = this.buffer[++e];
        else if (t === "%" && Wn.has(this.buffer[e + 1]) && Wn.has(this.buffer[e + 2]))
          t = this.buffer[(e += 3)];
        else break;
      return yield* this.pushToIndex(e, !1);
    }
  }
  *pushNewline() {
    const e = this.buffer[this.pos];
    return e ===
      `
`
      ? yield* this.pushCount(1)
      : e === "\r" &&
          this.charAt(1) ===
            `
`
        ? yield* this.pushCount(2)
        : 0;
  }
  *pushSpaces(e) {
    let t = this.pos - 1,
      s;
    do s = this.buffer[++t];
    while (s === " " || (e && s === "	"));
    const i = t - this.pos;
    return (i > 0 && (yield this.buffer.substr(this.pos, i), (this.pos = t)), i);
  }
  *pushUntil(e) {
    let t = this.pos,
      s = this.buffer[t];
    for (; !e(s); ) s = this.buffer[++t];
    return yield* this.pushToIndex(t, !1);
  }
}
class qi {
  constructor() {
    ((this.lineStarts = []),
      (this.addNewLine = (e) => this.lineStarts.push(e)),
      (this.linePos = (e) => {
        let t = 0,
          s = this.lineStarts.length;
        for (; t < s; ) {
          const r = (t + s) >> 1;
          this.lineStarts[r] < e ? (t = r + 1) : (s = r);
        }
        if (this.lineStarts[t] === e) return { line: t + 1, col: 1 };
        if (t === 0) return { line: 0, col: e };
        const i = this.lineStarts[t - 1];
        return { line: t, col: e - i + 1 };
      }));
  }
}
function oe(n, e) {
  for (let t = 0; t < n.length; ++t) if (n[t].type === e) return !0;
  return !1;
}
function zn(n) {
  for (let e = 0; e < n.length; ++e)
    switch (n[e].type) {
      case "space":
      case "comment":
      case "newline":
        break;
      default:
        return e;
    }
  return -1;
}
function Ri(n) {
  switch (n?.type) {
    case "alias":
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "flow-collection":
      return !0;
    default:
      return !1;
  }
}
function lt(n) {
  switch (n.type) {
    case "document":
      return n.start;
    case "block-map": {
      const e = n.items[n.items.length - 1];
      return e.sep ?? e.start;
    }
    case "block-seq":
      return n.items[n.items.length - 1].start;
    default:
      return [];
  }
}
function we(n) {
  if (n.length === 0) return [];
  let e = n.length;
  e: for (; --e >= 0; )
    switch (n[e].type) {
      case "doc-start":
      case "explicit-key-ind":
      case "map-value-ind":
      case "seq-item-ind":
      case "newline":
        break e;
    }
  for (; n[++e]?.type === "space"; );
  return n.splice(e, n.length);
}
function Jn(n) {
  if (n.start.type === "flow-seq-start")
    for (const e of n.items)
      e.sep &&
        !e.value &&
        !oe(e.start, "explicit-key-ind") &&
        !oe(e.sep, "map-value-ind") &&
        (e.key && (e.value = e.key),
        delete e.key,
        Ri(e.value)
          ? e.value.end
            ? Array.prototype.push.apply(e.value.end, e.sep)
            : (e.value.end = e.sep)
          : Array.prototype.push.apply(e.start, e.sep),
        delete e.sep);
}
class Ss {
  constructor(e) {
    ((this.atNewLine = !0),
      (this.atScalar = !1),
      (this.indent = 0),
      (this.offset = 0),
      (this.onKeyLine = !1),
      (this.stack = []),
      (this.source = ""),
      (this.type = ""),
      (this.lexer = new Vi()),
      (this.onNewLine = e));
  }
  *parse(e, t = !1) {
    this.onNewLine && this.offset === 0 && this.onNewLine(0);
    for (const s of this.lexer.lex(e, t)) yield* this.next(s);
    t || (yield* this.end());
  }
  *next(e) {
    if (((this.source = e), this.atScalar)) {
      ((this.atScalar = !1), yield* this.step(), (this.offset += e.length));
      return;
    }
    const t = Ki(e);
    if (t)
      if (t === "scalar") ((this.atNewLine = !1), (this.atScalar = !0), (this.type = "scalar"));
      else {
        switch (((this.type = t), yield* this.step(), t)) {
          case "newline":
            ((this.atNewLine = !0),
              (this.indent = 0),
              this.onNewLine && this.onNewLine(this.offset + e.length));
            break;
          case "space":
            this.atNewLine && e[0] === " " && (this.indent += e.length);
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            this.atNewLine && (this.indent += e.length);
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = !1;
        }
        this.offset += e.length;
      }
    else {
      const s = `Not a YAML token: ${e}`;
      (yield* this.pop({ type: "error", offset: this.offset, message: s, source: e }),
        (this.offset += e.length));
    }
  }
  *end() {
    for (; this.stack.length > 0; ) yield* this.pop();
  }
  get sourceToken() {
    return { type: this.type, offset: this.offset, indent: this.indent, source: this.source };
  }
  *step() {
    const e = this.peek(1);
    if (this.type === "doc-end" && e?.type !== "doc-end") {
      for (; this.stack.length > 0; ) yield* this.pop();
      this.stack.push({ type: "doc-end", offset: this.offset, source: this.source });
      return;
    }
    if (!e) return yield* this.stream();
    switch (e.type) {
      case "document":
        return yield* this.document(e);
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return yield* this.scalar(e);
      case "block-scalar":
        return yield* this.blockScalar(e);
      case "block-map":
        return yield* this.blockMap(e);
      case "block-seq":
        return yield* this.blockSequence(e);
      case "flow-collection":
        return yield* this.flowCollection(e);
      case "doc-end":
        return yield* this.documentEnd(e);
    }
    yield* this.pop();
  }
  peek(e) {
    return this.stack[this.stack.length - e];
  }
  *pop(e) {
    const t = e ?? this.stack.pop();
    if (!t)
      yield {
        type: "error",
        offset: this.offset,
        source: "",
        message: "Tried to pop an empty stack",
      };
    else if (this.stack.length === 0) yield t;
    else {
      const s = this.peek(1);
      switch (
        (t.type === "block-scalar"
          ? (t.indent = "indent" in s ? s.indent : 0)
          : t.type === "flow-collection" && s.type === "document" && (t.indent = 0),
        t.type === "flow-collection" && Jn(t),
        s.type)
      ) {
        case "document":
          s.value = t;
          break;
        case "block-scalar":
          s.props.push(t);
          break;
        case "block-map": {
          const i = s.items[s.items.length - 1];
          if (i.value) {
            (s.items.push({ start: [], key: t, sep: [] }), (this.onKeyLine = !0));
            return;
          } else if (i.sep) i.value = t;
          else {
            (Object.assign(i, { key: t, sep: [] }), (this.onKeyLine = !i.explicitKey));
            return;
          }
          break;
        }
        case "block-seq": {
          const i = s.items[s.items.length - 1];
          i.value ? s.items.push({ start: [], value: t }) : (i.value = t);
          break;
        }
        case "flow-collection": {
          const i = s.items[s.items.length - 1];
          !i || i.value
            ? s.items.push({ start: [], key: t, sep: [] })
            : i.sep
              ? (i.value = t)
              : Object.assign(i, { key: t, sep: [] });
          return;
        }
        default:
          (yield* this.pop(), yield* this.pop(t));
      }
      if (
        (s.type === "document" || s.type === "block-map" || s.type === "block-seq") &&
        (t.type === "block-map" || t.type === "block-seq")
      ) {
        const i = t.items[t.items.length - 1];
        i &&
          !i.sep &&
          !i.value &&
          i.start.length > 0 &&
          zn(i.start) === -1 &&
          (t.indent === 0 || i.start.every((r) => r.type !== "comment" || r.indent < t.indent)) &&
          (s.type === "document" ? (s.end = i.start) : s.items.push({ start: i.start }),
          t.items.splice(-1, 1));
      }
    }
  }
  *stream() {
    switch (this.type) {
      case "directive-line":
        yield { type: "directive", offset: this.offset, source: this.source };
        return;
      case "byte-order-mark":
      case "space":
      case "comment":
      case "newline":
        yield this.sourceToken;
        return;
      case "doc-mode":
      case "doc-start": {
        const e = { type: "document", offset: this.offset, start: [] };
        (this.type === "doc-start" && e.start.push(this.sourceToken), this.stack.push(e));
        return;
      }
    }
    yield {
      type: "error",
      offset: this.offset,
      message: `Unexpected ${this.type} token in YAML stream`,
      source: this.source,
    };
  }
  *document(e) {
    if (e.value) return yield* this.lineEnd(e);
    switch (this.type) {
      case "doc-start": {
        zn(e.start) !== -1
          ? (yield* this.pop(), yield* this.step())
          : e.start.push(this.sourceToken);
        return;
      }
      case "anchor":
      case "tag":
      case "space":
      case "comment":
      case "newline":
        e.start.push(this.sourceToken);
        return;
    }
    const t = this.startBlockValue(e);
    t
      ? this.stack.push(t)
      : yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source,
        };
  }
  *scalar(e) {
    if (this.type === "map-value-ind") {
      const t = lt(this.peek(2)),
        s = we(t);
      let i;
      e.end ? ((i = e.end), i.push(this.sourceToken), delete e.end) : (i = [this.sourceToken]);
      const r = {
        type: "block-map",
        offset: e.offset,
        indent: e.indent,
        items: [{ start: s, key: e, sep: i }],
      };
      ((this.onKeyLine = !0), (this.stack[this.stack.length - 1] = r));
    } else yield* this.lineEnd(e);
  }
  *blockScalar(e) {
    switch (this.type) {
      case "space":
      case "comment":
      case "newline":
        e.props.push(this.sourceToken);
        return;
      case "scalar":
        if (((e.source = this.source), (this.atNewLine = !0), (this.indent = 0), this.onNewLine)) {
          let t =
            this.source.indexOf(`
`) + 1;
          for (; t !== 0; )
            (this.onNewLine(this.offset + t),
              (t =
                this.source.indexOf(
                  `
`,
                  t,
                ) + 1));
        }
        yield* this.pop();
        break;
      default:
        (yield* this.pop(), yield* this.step());
    }
  }
  *blockMap(e) {
    const t = e.items[e.items.length - 1];
    switch (this.type) {
      case "newline":
        if (((this.onKeyLine = !1), t.value)) {
          const s = "end" in t.value ? t.value.end : void 0;
          (Array.isArray(s) ? s[s.length - 1] : void 0)?.type === "comment"
            ? s?.push(this.sourceToken)
            : e.items.push({ start: [this.sourceToken] });
        } else t.sep ? t.sep.push(this.sourceToken) : t.start.push(this.sourceToken);
        return;
      case "space":
      case "comment":
        if (t.value) e.items.push({ start: [this.sourceToken] });
        else if (t.sep) t.sep.push(this.sourceToken);
        else {
          if (this.atIndentedComment(t.start, e.indent)) {
            const i = e.items[e.items.length - 2]?.value?.end;
            if (Array.isArray(i)) {
              (Array.prototype.push.apply(i, t.start), i.push(this.sourceToken), e.items.pop());
              return;
            }
          }
          t.start.push(this.sourceToken);
        }
        return;
    }
    if (this.indent >= e.indent) {
      const s = !this.onKeyLine && this.indent === e.indent,
        i = s && (t.sep || t.explicitKey) && this.type !== "seq-item-ind";
      let r = [];
      if (i && t.sep && !t.value) {
        const a = [];
        for (let o = 0; o < t.sep.length; ++o) {
          const l = t.sep[o];
          switch (l.type) {
            case "newline":
              a.push(o);
              break;
            case "space":
              break;
            case "comment":
              l.indent > e.indent && (a.length = 0);
              break;
            default:
              a.length = 0;
          }
        }
        a.length >= 2 && (r = t.sep.splice(a[1]));
      }
      switch (this.type) {
        case "anchor":
        case "tag":
          i || t.value
            ? (r.push(this.sourceToken), e.items.push({ start: r }), (this.onKeyLine = !0))
            : t.sep
              ? t.sep.push(this.sourceToken)
              : t.start.push(this.sourceToken);
          return;
        case "explicit-key-ind":
          (!t.sep && !t.explicitKey
            ? (t.start.push(this.sourceToken), (t.explicitKey = !0))
            : i || t.value
              ? (r.push(this.sourceToken), e.items.push({ start: r, explicitKey: !0 }))
              : this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: !0 }],
                }),
            (this.onKeyLine = !0));
          return;
        case "map-value-ind":
          if (t.explicitKey)
            if (t.sep)
              if (t.value) e.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (oe(t.sep, "map-value-ind"))
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: r, key: null, sep: [this.sourceToken] }],
                });
              else if (Ri(t.key) && !oe(t.sep, "newline")) {
                const a = we(t.start),
                  o = t.key,
                  l = t.sep;
                (l.push(this.sourceToken),
                  delete t.key,
                  delete t.sep,
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: a, key: o, sep: l }],
                  }));
              } else
                r.length > 0
                  ? (t.sep = t.sep.concat(r, this.sourceToken))
                  : t.sep.push(this.sourceToken);
            else if (oe(t.start, "newline"))
              Object.assign(t, { key: null, sep: [this.sourceToken] });
            else {
              const a = we(t.start);
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: a, key: null, sep: [this.sourceToken] }],
              });
            }
          else
            t.sep
              ? t.value || i
                ? e.items.push({ start: r, key: null, sep: [this.sourceToken] })
                : oe(t.sep, "map-value-ind")
                  ? this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: [], key: null, sep: [this.sourceToken] }],
                    })
                  : t.sep.push(this.sourceToken)
              : Object.assign(t, { key: null, sep: [this.sourceToken] });
          this.onKeyLine = !0;
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const a = this.flowScalar(this.type);
          i || t.value
            ? (e.items.push({ start: r, key: a, sep: [] }), (this.onKeyLine = !0))
            : t.sep
              ? this.stack.push(a)
              : (Object.assign(t, { key: a, sep: [] }), (this.onKeyLine = !0));
          return;
        }
        default: {
          const a = this.startBlockValue(e);
          if (a) {
            if (a.type === "block-seq") {
              if (!t.explicitKey && t.sep && !oe(t.sep, "newline")) {
                yield* this.pop({
                  type: "error",
                  offset: this.offset,
                  message: "Unexpected block-seq-ind on same line with key",
                  source: this.source,
                });
                return;
              }
            } else s && e.items.push({ start: r });
            this.stack.push(a);
            return;
          }
        }
      }
    }
    (yield* this.pop(), yield* this.step());
  }
  *blockSequence(e) {
    const t = e.items[e.items.length - 1];
    switch (this.type) {
      case "newline":
        if (t.value) {
          const s = "end" in t.value ? t.value.end : void 0;
          (Array.isArray(s) ? s[s.length - 1] : void 0)?.type === "comment"
            ? s?.push(this.sourceToken)
            : e.items.push({ start: [this.sourceToken] });
        } else t.start.push(this.sourceToken);
        return;
      case "space":
      case "comment":
        if (t.value) e.items.push({ start: [this.sourceToken] });
        else {
          if (this.atIndentedComment(t.start, e.indent)) {
            const i = e.items[e.items.length - 2]?.value?.end;
            if (Array.isArray(i)) {
              (Array.prototype.push.apply(i, t.start), i.push(this.sourceToken), e.items.pop());
              return;
            }
          }
          t.start.push(this.sourceToken);
        }
        return;
      case "anchor":
      case "tag":
        if (t.value || this.indent <= e.indent) break;
        t.start.push(this.sourceToken);
        return;
      case "seq-item-ind":
        if (this.indent !== e.indent) break;
        t.value || oe(t.start, "seq-item-ind")
          ? e.items.push({ start: [this.sourceToken] })
          : t.start.push(this.sourceToken);
        return;
    }
    if (this.indent > e.indent) {
      const s = this.startBlockValue(e);
      if (s) {
        this.stack.push(s);
        return;
      }
    }
    (yield* this.pop(), yield* this.step());
  }
  *flowCollection(e) {
    const t = e.items[e.items.length - 1];
    if (this.type === "flow-error-end") {
      let s;
      do (yield* this.pop(), (s = this.peek(1)));
      while (s?.type === "flow-collection");
    } else if (e.end.length === 0) {
      switch (this.type) {
        case "comma":
        case "explicit-key-ind":
          !t || t.sep
            ? e.items.push({ start: [this.sourceToken] })
            : t.start.push(this.sourceToken);
          return;
        case "map-value-ind":
          !t || t.value
            ? e.items.push({ start: [], key: null, sep: [this.sourceToken] })
            : t.sep
              ? t.sep.push(this.sourceToken)
              : Object.assign(t, { key: null, sep: [this.sourceToken] });
          return;
        case "space":
        case "comment":
        case "newline":
        case "anchor":
        case "tag":
          !t || t.value
            ? e.items.push({ start: [this.sourceToken] })
            : t.sep
              ? t.sep.push(this.sourceToken)
              : t.start.push(this.sourceToken);
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const i = this.flowScalar(this.type);
          !t || t.value
            ? e.items.push({ start: [], key: i, sep: [] })
            : t.sep
              ? this.stack.push(i)
              : Object.assign(t, { key: i, sep: [] });
          return;
        }
        case "flow-map-end":
        case "flow-seq-end":
          e.end.push(this.sourceToken);
          return;
      }
      const s = this.startBlockValue(e);
      s ? this.stack.push(s) : (yield* this.pop(), yield* this.step());
    } else {
      const s = this.peek(2);
      if (
        s.type === "block-map" &&
        ((this.type === "map-value-ind" && s.indent === e.indent) ||
          (this.type === "newline" && !s.items[s.items.length - 1].sep))
      )
        (yield* this.pop(), yield* this.step());
      else if (this.type === "map-value-ind" && s.type !== "flow-collection") {
        const i = lt(s),
          r = we(i);
        Jn(e);
        const a = e.end.splice(1, e.end.length);
        a.push(this.sourceToken);
        const o = {
          type: "block-map",
          offset: e.offset,
          indent: e.indent,
          items: [{ start: r, key: e, sep: a }],
        };
        ((this.onKeyLine = !0), (this.stack[this.stack.length - 1] = o));
      } else yield* this.lineEnd(e);
    }
  }
  flowScalar(e) {
    if (this.onNewLine) {
      let t =
        this.source.indexOf(`
`) + 1;
      for (; t !== 0; )
        (this.onNewLine(this.offset + t),
          (t =
            this.source.indexOf(
              `
`,
              t,
            ) + 1));
    }
    return { type: e, offset: this.offset, indent: this.indent, source: this.source };
  }
  startBlockValue(e) {
    switch (this.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return this.flowScalar(this.type);
      case "block-scalar-header":
        return {
          type: "block-scalar",
          offset: this.offset,
          indent: this.indent,
          props: [this.sourceToken],
          source: "",
        };
      case "flow-map-start":
      case "flow-seq-start":
        return {
          type: "flow-collection",
          offset: this.offset,
          indent: this.indent,
          start: this.sourceToken,
          items: [],
          end: [],
        };
      case "seq-item-ind":
        return {
          type: "block-seq",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: [this.sourceToken] }],
        };
      case "explicit-key-ind": {
        this.onKeyLine = !0;
        const t = lt(e),
          s = we(t);
        return (
          s.push(this.sourceToken),
          {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: s, explicitKey: !0 }],
          }
        );
      }
      case "map-value-ind": {
        this.onKeyLine = !0;
        const t = lt(e),
          s = we(t);
        return {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: s, key: null, sep: [this.sourceToken] }],
        };
      }
    }
    return null;
  }
  atIndentedComment(e, t) {
    return this.type !== "comment" || this.indent <= t
      ? !1
      : e.every((s) => s.type === "newline" || s.type === "space");
  }
  *documentEnd(e) {
    this.type !== "doc-mode" &&
      (e.end ? e.end.push(this.sourceToken) : (e.end = [this.sourceToken]),
      this.type === "newline" && (yield* this.pop()));
  }
  *lineEnd(e) {
    switch (this.type) {
      case "comma":
      case "doc-start":
      case "doc-end":
      case "flow-seq-end":
      case "flow-map-end":
      case "map-value-ind":
        (yield* this.pop(), yield* this.step());
        break;
      case "newline":
        this.onKeyLine = !1;
      default:
        (e.end ? e.end.push(this.sourceToken) : (e.end = [this.sourceToken]),
          this.type === "newline" && (yield* this.pop()));
    }
  }
}
function Hi(n) {
  const e = n.prettyErrors !== !1;
  return { lineCounter: n.lineCounter || (e && new qi()) || null, prettyErrors: e };
}
function ja(n, e = {}) {
  const { lineCounter: t, prettyErrors: s } = Hi(e),
    i = new Ss(t?.addNewLine),
    r = new ws(e),
    a = Array.from(r.compose(i.parse(n)));
  if (s && t) for (const o of a) (o.errors.forEach(gt(n, t)), o.warnings.forEach(gt(n, t)));
  return a.length > 0 ? a : Object.assign([], { empty: !0 }, r.streamInfo());
}
function Ui(n, e = {}) {
  const { lineCounter: t, prettyErrors: s } = Hi(e),
    i = new Ss(t?.addNewLine),
    r = new ws(e);
  let a = null;
  for (const o of r.compose(i.parse(n), !0, n.length))
    if (!a) a = o;
    else if (a.options.logLevel !== "silent") {
      a.errors.push(
        new pe(
          o.range.slice(0, 2),
          "MULTIPLE_DOCS",
          "Source contains multiple documents; please use YAML.parseAllDocuments()",
        ),
      );
      break;
    }
  return (s && t && (a.errors.forEach(gt(n, t)), a.warnings.forEach(gt(n, t))), a);
}
function Ka(n, e, t) {
  let s;
  typeof e == "function" ? (s = e) : t === void 0 && e && typeof e == "object" && (t = e);
  const i = Ui(n, t);
  if (!i) return null;
  if ((i.warnings.forEach((r) => fi(i.options.logLevel, r)), i.errors.length > 0)) {
    if (i.options.logLevel !== "silent") throw i.errors[0];
    i.errors = [];
  }
  return i.toJS(Object.assign({ reviver: s }, t));
}
function Va(n, e, t) {
  let s = null;
  if (
    (typeof e == "function" || Array.isArray(e) ? (s = e) : t === void 0 && e && (t = e),
    typeof t == "string" && (t = t.length),
    typeof t == "number")
  ) {
    const i = Math.round(t);
    t = i < 1 ? void 0 : i > 8 ? { indent: 8 } : { indent: i };
  }
  if (n === void 0) {
    const { keepUndefined: i } = t ?? e ?? {};
    if (!i) return;
  }
  return ge(n) && !s ? n.toString(t) : new Pe(n, s, t).toString(t);
}
const qa = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      Alias: wt,
      CST: Fa,
      Composer: ws,
      Document: Pe,
      Lexer: Vi,
      LineCounter: qi,
      Pair: q,
      Parser: Ss,
      Scalar: O,
      Schema: It,
      YAMLError: ys,
      YAMLMap: Y,
      YAMLParseError: pe,
      YAMLSeq: ce,
      YAMLWarning: Ai,
      isAlias: ue,
      isCollection: x,
      isDocument: ge,
      isMap: Le,
      isNode: D,
      isPair: L,
      isScalar: T,
      isSeq: xe,
      parse: Ka,
      parseAllDocuments: ja,
      parseDocument: Ui,
      stringify: Va,
      visit: ye,
      visitAsync: bt,
    },
    Symbol.toStringTag,
    { value: "Module" },
  ),
);
class Ra extends Error {
  cause;
  constructor(e, ...t) {
    const i = [
        e instanceof Error ? e.message : typeof e == "string" ? e : e != null ? String(e) : void 0,
        ...t,
      ]
        .filter((a) => a != null)
        .reverse()
        .join(" => "),
      r = e instanceof Error ? e : void 0;
    (super(i, { cause: r }),
      Object.setPrototypeOf(this, new.target.prototype),
      (this.name = "SdError"),
      "captureStackTrace" in Error && Error.captureStackTrace(this, new.target),
      r?.stack != null &&
        (this.stack += `
---- cause stack ----
${r.stack}`));
  }
}
class vs extends Ra {
  constructor(e, t) {
    const s = typeof e == "string" ? e : void 0,
      i = typeof e == "string" ? t : e;
    (i != null
      ? super(
          (s ?? "인수가 잘못되었습니다.") +
            `

` +
            qa.stringify(i),
        )
      : super(s ?? "인수가 잘못되었습니다."),
      (this.name = "ArgumentError"));
  }
}
function Yi(n, e, t) {
  const s = n + Math.floor((e - 1) / 12),
    i = ((((e - 1) % 12) + 12) % 12) + 1,
    r = new Date(s, i, 0).getDate(),
    a = Math.min(t, r);
  return { year: s, month: i, day: a };
}
const F = {
    yyyy: /yyyy/g,
    yy: /yy/g,
    MM: /MM/g,
    M: /M/g,
    ddd: /ddd/g,
    dd: /dd/g,
    d: /d/g,
    tt: /tt/g,
    hh: /hh/g,
    h: /h/g,
    HH: /HH/g,
    H: /H/g,
    mm: /mm/g,
    m: /m/g,
    ss: /ss/g,
    s: /s/g,
    fff: /fff/g,
    ff: /ff/g,
    f: /f/g,
    zzz: /zzz/g,
    zz: /zz/g,
    z: /z/g,
  },
  Ha = ["일", "월", "화", "수", "목", "금", "토"];
function ks(n, e) {
  const {
      year: t,
      month: s,
      day: i,
      hour: r,
      minute: a,
      second: o,
      millisecond: l,
      timezoneOffsetMinutes: u,
    } = e,
    p = u !== void 0 ? Math.abs(u) : void 0,
    c = p !== void 0 ? Math.floor(p / 60) : void 0,
    d = p !== void 0 ? p % 60 : void 0,
    m = u !== void 0 ? (u >= 0 ? "+" : "-") : void 0,
    g = t !== void 0 && s !== void 0 && i !== void 0 ? new Date(t, s - 1, i).getDay() : void 0;
  let f = n;
  if (t !== void 0) {
    const h = t.toString();
    ((f = f.replace(F.yyyy, h)), (f = f.replace(F.yy, h.substring(2, 4))));
  }
  if (s !== void 0) {
    const h = s.toString();
    ((f = f.replace(F.MM, h.padStart(2, "0"))), (f = f.replace(F.M, h)));
  }
  if ((g !== void 0 && (f = f.replace(F.ddd, Ha[g])), i !== void 0)) {
    const h = i.toString();
    ((f = f.replace(F.dd, h.padStart(2, "0"))), (f = f.replace(F.d, h)));
  }
  if (r !== void 0) {
    f = f.replace(F.tt, r < 12 ? "오전" : "오후");
    const y = (r % 12 || 12).toString();
    ((f = f.replace(F.hh, y.padStart(2, "0"))), (f = f.replace(F.h, y)));
    const b = r.toString();
    ((f = f.replace(F.HH, b.padStart(2, "0"))), (f = f.replace(F.H, b)));
  }
  if (a !== void 0) {
    const h = a.toString();
    ((f = f.replace(F.mm, h.padStart(2, "0"))), (f = f.replace(F.m, h)));
  }
  if (o !== void 0) {
    const h = o.toString();
    ((f = f.replace(F.ss, h.padStart(2, "0"))), (f = f.replace(F.s, h)));
  }
  if (l !== void 0) {
    const h = l.toString().padStart(3, "0");
    ((f = f.replace(F.fff, h)),
      (f = f.replace(F.ff, h.substring(0, 2))),
      (f = f.replace(F.f, h.substring(0, 1))));
  }
  return (
    m !== void 0 &&
      c !== void 0 &&
      d !== void 0 &&
      ((f = f.replace(
        F.zzz,
        `${m}${c.toString().padStart(2, "0")}:${d.toString().padStart(2, "0")}`,
      )),
      (f = f.replace(F.zz, `${m}${c.toString().padStart(2, "0")}`)),
      (f = f.replace(F.z, `${m}${c}`))),
    f
  );
}
class j {
  date;
  constructor(e, t, s, i, r, a, o) {
    e === void 0
      ? (this.date = new Date())
      : t !== void 0 && s !== void 0
        ? (this.date = new Date(e, t - 1, s, i ?? 0, r ?? 0, a ?? 0, o ?? 0))
        : e instanceof Date
          ? (this.date = new Date(e.getTime()))
          : (this.date = new Date(e));
  }
  static parse(e) {
    const t = Date.parse(e);
    if (!Number.isNaN(t)) return new j(t);
    const s =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) (오전|오후) ([0-9]{1,2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/.exec(
        e,
      );
    if (s != null) {
      const a = Number(s[5]),
        o = s[4] === "오후";
      let l;
      return (
        a === 12 ? (l = o ? 12 : 0) : (l = o ? a + 12 : a),
        new j(
          Number(s[1]),
          Number(s[2]),
          Number(s[3]),
          l,
          Number(s[6]),
          Number(s[7]),
          s[9] ? Number(s[9].padEnd(3, "0")) : void 0,
        )
      );
    }
    if (/^[0-9]{14}$/.exec(e) != null)
      return new j(
        Number(e.substring(0, 4)),
        Number(e.substring(4, 6)),
        Number(e.substring(6, 8)),
        Number(e.substring(8, 10)),
        Number(e.substring(10, 12)),
        Number(e.substring(12, 14)),
      );
    const r =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/.exec(
        e,
      );
    if (r != null)
      return new j(
        Number(r[1]),
        Number(r[2]),
        Number(r[3]),
        Number(r[4]),
        Number(r[5]),
        Number(r[6]),
        r[8] ? Number(r[8].padEnd(3, "0")) : void 0,
      );
    throw new vs(
      "날짜시간 형식을 파싱할 수 없습니다. 지원 형식: 'yyyy-MM-dd HH:mm:ss', 'yyyyMMddHHmmss', 'yyyy-MM-dd 오전/오후 HH:mm:ss', ISO 8601",
      { input: e },
    );
  }
  get year() {
    return this.date.getFullYear();
  }
  get month() {
    return this.date.getMonth() + 1;
  }
  get day() {
    return this.date.getDate();
  }
  get hour() {
    return this.date.getHours();
  }
  get minute() {
    return this.date.getMinutes();
  }
  get second() {
    return this.date.getSeconds();
  }
  get millisecond() {
    return this.date.getMilliseconds();
  }
  get tick() {
    return this.date.getTime();
  }
  get dayOfWeek() {
    return this.date.getDay();
  }
  get timezoneOffsetMinutes() {
    return -this.date.getTimezoneOffset();
  }
  get isValid() {
    return this.date instanceof Date && !Number.isNaN(this.date.getTime());
  }
  setYear(e) {
    return new j(e, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
  }
  setMonth(e) {
    const t = Yi(this.year, e, this.day);
    return new j(t.year, t.month, t.day, this.hour, this.minute, this.second, this.millisecond);
  }
  setDay(e) {
    return new j(this.year, this.month, e, this.hour, this.minute, this.second, this.millisecond);
  }
  setHour(e) {
    return new j(this.year, this.month, this.day, e, this.minute, this.second, this.millisecond);
  }
  setMinute(e) {
    return new j(this.year, this.month, this.day, this.hour, e, this.second, this.millisecond);
  }
  setSecond(e) {
    return new j(this.year, this.month, this.day, this.hour, this.minute, e, this.millisecond);
  }
  setMillisecond(e) {
    return new j(this.year, this.month, this.day, this.hour, this.minute, this.second, e);
  }
  addYears(e) {
    return this.setYear(this.year + e);
  }
  addMonths(e) {
    return this.setMonth(this.month + e);
  }
  addDays(e) {
    return new j(this.tick + e * 24 * 60 * 60 * 1e3);
  }
  addHours(e) {
    return new j(this.tick + e * 60 * 60 * 1e3);
  }
  addMinutes(e) {
    return new j(this.tick + e * 60 * 1e3);
  }
  addSeconds(e) {
    return new j(this.tick + e * 1e3);
  }
  addMilliseconds(e) {
    return new j(this.tick + e);
  }
  toFormatString(e) {
    return ks(e, {
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
      timezoneOffsetMinutes: this.timezoneOffsetMinutes,
    });
  }
  toString() {
    return this.toFormatString("yyyy-MM-ddTHH:mm:ss.fffzzz");
  }
}
class K {
  static MS_PER_DAY = 1440 * 60 * 1e3;
  date;
  constructor(e, t, s) {
    if (e === void 0) {
      const i = Date.now(),
        r = new Date(i);
      this.date = new Date(r.getFullYear(), r.getMonth(), r.getDate());
    } else if (t !== void 0 && s !== void 0) this.date = new Date(e, t - 1, s);
    else if (e instanceof Date) {
      const i = e;
      this.date = new Date(i.getFullYear(), i.getMonth(), i.getDate());
    } else {
      const i = new Date(e);
      this.date = new Date(i.getFullYear(), i.getMonth(), i.getDate());
    }
  }
  static parse(e) {
    const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e);
    if (t != null) return new K(Number(t[1]), Number(t[2]), Number(t[3]));
    const s = /^(\d{4})(\d{2})(\d{2})$/.exec(e);
    if (s != null) return new K(Number(s[1]), Number(s[2]), Number(s[3]));
    const i = Date.parse(e);
    if (!Number.isNaN(i)) {
      const a = new Date(i).getTimezoneOffset(),
        o = i - a * 60 * 1e3;
      return new K(o);
    }
    throw new vs(
      "날짜 형식을 파싱할 수 없습니다. 지원 형식: 'yyyy-MM-dd', 'yyyyMMdd', ISO 8601 날짜",
      { input: e },
    );
  }
  getBaseYearMonthSeqForWeekSeq(e = 1, t = 4) {
    const i = 7 - ((this.dayOfWeek + 7 - e) % 7);
    if (i < t) {
      const r = this.addDays(-7);
      return { year: r.year, monthSeq: r.month };
    } else {
      const a = (this.addMonths(1).setDay(1).tick - this.tick) / K.MS_PER_DAY;
      if (Math.min(i, a) < t) {
        const l = this.addDays(7);
        return { year: l.year, monthSeq: l.month };
      } else return { year: this.year, monthSeq: this.month };
    }
  }
  getWeekSeqStartDate(e = 1, t = 4) {
    const s = (this.dayOfWeek + 7 - e) % 7;
    return 7 - s < t ? this.addDays(-s + 7) : this.addDays(-s);
  }
  getWeekSeqOfYear(e = 1, t = 4) {
    const s = this.getBaseYearMonthSeqForWeekSeq(e, t),
      i = new K(s.year, 1, 1).getWeekSeqStartDate(e, t),
      r = (this.tick - i.tick) / K.MS_PER_DAY;
    return { year: s.year, weekSeq: Math.floor(r / 7) + 1 };
  }
  getWeekSeqOfMonth(e = 1, t = 4) {
    const s = this.getBaseYearMonthSeqForWeekSeq(e, t),
      i = new K(s.year, s.monthSeq, 1).getWeekSeqStartDate(e, t),
      r = (this.tick - i.tick) / K.MS_PER_DAY;
    return { year: s.year, monthSeq: s.monthSeq, weekSeq: Math.floor(r / 7) + 1 };
  }
  static getDateByYearWeekSeq(e, t = 1, s = 4) {
    return new K(e.year, e.month ?? 1, (e.weekSeq - 1) * 7 + 1).getWeekSeqStartDate(t, s);
  }
  get isValid() {
    return this.date instanceof Date && !Number.isNaN(this.date.getTime());
  }
  get year() {
    return this.date.getFullYear();
  }
  get month() {
    return this.date.getMonth() + 1;
  }
  get day() {
    return this.date.getDate();
  }
  get tick() {
    return this.date.getTime();
  }
  get dayOfWeek() {
    return this.date.getDay();
  }
  setYear(e) {
    return new K(e, this.month, this.day);
  }
  setMonth(e) {
    const t = Yi(this.year, e, this.day);
    return new K(t.year, t.month, t.day);
  }
  setDay(e) {
    return new K(this.year, this.month, e);
  }
  addYears(e) {
    return this.setYear(this.year + e);
  }
  addMonths(e) {
    return this.setMonth(this.month + e);
  }
  addDays(e) {
    return new K(this.tick + e * K.MS_PER_DAY);
  }
  toFormatString(e) {
    return ks(e, { year: this.year, month: this.month, day: this.day });
  }
  toString() {
    return this.toFormatString("yyyy-MM-dd");
  }
}
class M {
  static MS_PER_DAY = 1440 * 60 * 1e3;
  _tick;
  constructor(e, t, s, i) {
    if (e === void 0) {
      const r = new Date();
      this._tick =
        (r.getMilliseconds() +
          r.getSeconds() * 1e3 +
          r.getMinutes() * 60 * 1e3 +
          r.getHours() * 60 * 60 * 1e3) %
        M.MS_PER_DAY;
    } else if (t !== void 0) {
      let r = ((i ?? 0) + (s ?? 0) * 1e3 + t * 60 * 1e3 + e * 60 * 60 * 1e3) % M.MS_PER_DAY;
      (r < 0 && (r += M.MS_PER_DAY), (this._tick = r));
    } else if (e instanceof Date)
      this._tick =
        (e.getMilliseconds() +
          e.getSeconds() * 1e3 +
          e.getMinutes() * 60 * 1e3 +
          e.getHours() * 60 * 60 * 1e3) %
        M.MS_PER_DAY;
    else {
      let r = e % M.MS_PER_DAY;
      (r < 0 && (r += M.MS_PER_DAY), (this._tick = r));
    }
  }
  static parse(e) {
    const t = /(오전|오후) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/.exec(e);
    if (t != null) {
      const r = Number(t[2]),
        a = t[1] === "오후";
      let o;
      return (
        r === 12 ? (o = a ? 12 : 0) : (o = a ? r + 12 : r),
        new M(o, Number(t[3]), Number(t[4]), Number(t[6] ? t[6].padEnd(3, "0") : "0"))
      );
    }
    const s = /([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/.exec(e);
    if (s != null)
      return new M(
        Number(s[1]),
        Number(s[2]),
        Number(s[3]),
        Number(s[5] ? s[5].padEnd(3, "0") : "0"),
      );
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.exec(e) != null) {
      const r = new Date(e);
      if (!Number.isNaN(r.getTime()))
        return new M(r.getHours(), r.getMinutes(), r.getSeconds(), r.getMilliseconds());
    }
    throw new vs(
      "시간 형식을 파싱할 수 없습니다. 지원 형식: 'HH:mm:ss', 'HH:mm:ss.fff', '오전/오후 HH:mm:ss', ISO 8601",
      { input: e },
    );
  }
  get hour() {
    return Math.floor(this._tick / (3600 * 1e3));
  }
  get minute() {
    return Math.floor(this._tick / (60 * 1e3)) % 60;
  }
  get second() {
    return Math.floor(this._tick / 1e3) % 60;
  }
  get millisecond() {
    return this._tick % 1e3;
  }
  get tick() {
    return this._tick;
  }
  get isValid() {
    return !Number.isNaN(this._tick);
  }
  setHour(e) {
    return new M(e, this.minute, this.second, this.millisecond);
  }
  setMinute(e) {
    return new M(this.hour, e, this.second, this.millisecond);
  }
  setSecond(e) {
    return new M(this.hour, this.minute, e, this.millisecond);
  }
  setMillisecond(e) {
    return new M(this.hour, this.minute, this.second, e);
  }
  addHours(e) {
    let t = (this._tick + e * 60 * 60 * 1e3) % M.MS_PER_DAY;
    return (t < 0 && (t += M.MS_PER_DAY), new M(t));
  }
  addMinutes(e) {
    let t = (this._tick + e * 60 * 1e3) % M.MS_PER_DAY;
    return (t < 0 && (t += M.MS_PER_DAY), new M(t));
  }
  addSeconds(e) {
    let t = (this._tick + e * 1e3) % M.MS_PER_DAY;
    return (t < 0 && (t += M.MS_PER_DAY), new M(t));
  }
  addMilliseconds(e) {
    let t = (this._tick + e) % M.MS_PER_DAY;
    return (t < 0 && (t += M.MS_PER_DAY), new M(t));
  }
  toFormatString(e) {
    return ks(e, {
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
    });
  }
  toString() {
    return this.toFormatString("HH:mm:ss.fff");
  }
}
function Ua(n) {
  if (typeof n == "number") return n;
  if (typeof n != "string") return;
  const e = n.replace(/[^0-9.\-]/g, "").trim();
  if (e === "") return;
  const t = Number.parseFloat(e);
  if (!Number.isNaN(t)) return t;
}
function Be(n) {
  const [e, t] = ie(n.value()),
    s = () => n.onChange() !== void 0;
  return {
    currentValue: () => (s() ? n.value() : e()),
    setValue: (a) => {
      s() ? n.onChange()?.(a) : t(() => a);
    },
    isControlled: s,
  };
}
var Ke = Me({
    defaultClassName: "_1p9corm0",
    variantClassNames: {
      size: { sm: "_1p9corm1", lg: "_1p9corm2" },
      inset: { true: "_1p9corm3" },
      inline: { true: "_1p9corm4" },
    },
    defaultVariants: {},
    compoundVariants: [],
  }),
  Ya = "_1p9corm5",
  Wa = "_1p9corm6",
  za = "_1p9corm7",
  Ja = U("<div><div></div><input>"),
  Ga = U("<input>");
const Ns = /[0Xx*]/,
  Qa = { "0": /[0-9]/, "X": /[A-Z0-9]/, "x": /[a-z0-9]/, "*": /./ };
function Xa(n, e) {
  let t = "",
    s = 0;
  for (const i of e) {
    if (s >= n.length) break;
    Ns.test(i) ? (t += n[s++]) : (t += i);
  }
  return t;
}
function Za(n, e) {
  let t = "",
    s = 0;
  for (const i of n) {
    for (; s < e.length && !Ns.test(e[s]); ) s++;
    if (s >= e.length) break;
    const r = e[s],
      a = Qa[r];
    a != null && a.test(i) && ((t += i), s++);
  }
  return t;
}
function eo(n) {
  for (const e of n) if (Ns.test(e) && e !== "0") return !1;
  return !0;
}
const V = (n) => {
  const [e, t] = Ee(n, [
      ...Ke.variants(),
      "class",
      "value",
      "onChange",
      "type",
      "format",
      "placeholder",
    ]),
    [s, i] = ie(!1),
    r = Be({ value: () => e.value, onChange: () => e.onChange }),
    a = () => {
      const d = r.currentValue() ?? "";
      return e.format === void 0 || e.format === "" || s() ? d : Xa(d, e.format);
    },
    o = () => {
      if (e.type === "email") return "email";
      if (e.format !== void 0 && e.format !== "" && eo(e.format)) return "numeric";
    },
    l = (d) => {
      let g = d.currentTarget.value;
      (e.format !== void 0 && e.format !== "" && (g = Za(g, e.format)),
        g === "" && (g = void 0),
        r.setValue(g));
    },
    u = (d) => {
      (i(!0), typeof t.onFocus == "function" && t.onFocus(d));
    },
    p = (d) => {
      (i(!1), typeof t.onBlur == "function" && t.onBlur(d));
    },
    c = () => ({
      "type": e.type ?? "text",
      "value": a(),
      "onInput": l,
      "onFocus": u,
      "onBlur": p,
      "placeholder": e.placeholder,
      "inputMode": o(),
      "aria-disabled": t.disabled ? "true" : void 0,
      "aria-readonly": t.readOnly ? "true" : void 0,
    });
  return C(Ae, {
    get when() {
      return e.inline;
    },
    get fallback() {
      return (() => {
        var d = Ga();
        return (
          z(
            d,
            J(t, c, {
              get class() {
                return [Ke(G(e, Ke.variants())), e.class].filterExists().join(" ");
              },
            }),
            !1,
            !1,
          ),
          d
        );
      })();
    },
    get children() {
      var d = Ja(),
        m = d.firstChild,
        g = m.nextSibling;
      return (
        I(d, Ya),
        I(m, Wa),
        $(
          m,
          (() => {
            var f = Ze(() => a() !== "");
            return () => (f() ? a() : (e.placeholder ?? " "));
          })(),
        ),
        z(
          g,
          J(t, c, {
            get class() {
              return [za, Ke(G(e, Ke.variants())), e.class].filterExists().join(" ");
            },
          }),
          !1,
          !1,
        ),
        d
      );
    },
  });
};
var to = "_1p9corm5",
  so = "_1p9corm6",
  no = "_1p9corm7",
  Ve = Me({
    defaultClassName: "_19g2lud0",
    variantClassNames: {
      size: { sm: "_19g2lud1", lg: "_19g2lud2" },
      inset: { true: "_19g2lud3" },
      inline: { true: "_19g2lud4" },
    },
    defaultVariants: {},
    compoundVariants: [],
  }),
  io = U("<div><div></div><input>"),
  ro = U("<input>");
const ct = (n) => {
  const [e, t] = Ee(n, [
      ...Ve.variants(),
      "class",
      "value",
      "onChange",
      "useNumberComma",
      "minDigits",
      "placeholder",
    ]),
    [s, i] = ie(!1),
    r = Be({ value: () => e.value, onChange: () => e.onChange }),
    a = () => {
      const c = r.currentValue();
      if (c === void 0) return "";
      if (s()) return String(c);
      let d;
      if (e.minDigits !== void 0 && e.minDigits > 0) {
        const m = c < 0,
          f = String(Math.abs(c)).split(".");
        let h = f[0].padStart(e.minDigits, "0");
        const y = f[1];
        e.useNumberComma && (h = Number(h).toLocaleString());
        const b = y != null ? `${h}.${y}` : h;
        d = m ? `-${b}` : b;
      } else
        e.useNumberComma
          ? (d = c.toLocaleString(void 0, { maximumFractionDigits: 10 }))
          : (d = String(c));
      return d;
    },
    o = (c) => {
      const m = c.currentTarget.value;
      if (m === "" || m === "-") {
        r.setValue(void 0);
        return;
      }
      const g = Ua(m);
      g !== void 0 && r.setValue(g);
    },
    l = (c) => {
      (i(!0), typeof t.onFocus == "function" && t.onFocus(c));
    },
    u = (c) => {
      (i(!1), typeof t.onBlur == "function" && t.onBlur(c));
    },
    p = () => ({
      "type": "text",
      "inputMode": "decimal",
      "value": a(),
      "onInput": o,
      "onFocus": l,
      "onBlur": u,
      "placeholder": e.placeholder,
      "aria-disabled": t.disabled ? "true" : void 0,
      "aria-readonly": t.readOnly ? "true" : void 0,
    });
  return C(Ae, {
    get when() {
      return e.inline;
    },
    get fallback() {
      return (() => {
        var c = ro();
        return (
          z(
            c,
            J(t, p, {
              get class() {
                return [Ve(G(e, Ve.variants())), e.class].filterExists().join(" ");
              },
            }),
            !1,
            !1,
          ),
          c
        );
      })();
    },
    get children() {
      var c = io(),
        d = c.firstChild,
        m = d.nextSibling;
      return (
        I(c, to),
        I(d, so),
        $(
          d,
          (() => {
            var g = Ze(() => a() !== "");
            return () => (g() ? a() : (e.placeholder ?? " "));
          })(),
        ),
        z(
          m,
          J(t, p, {
            get class() {
              return [no, Ve(G(e, Ve.variants())), e.class].filterExists().join(" ");
            },
          }),
          !1,
          !1,
        ),
        c
      );
    },
  });
};
var qe = Me({
    defaultClassName: "_1p9corm0",
    variantClassNames: {
      size: { sm: "_1p9corm1", lg: "_1p9corm2" },
      inset: { true: "_1p9corm3" },
      inline: { true: "_1p9corm4" },
    },
    defaultVariants: {},
    compoundVariants: [],
  }),
  ao = "_1p9corm5",
  oo = "_1p9corm6",
  lo = "_1p9corm7",
  co = U("<div><div></div><input>"),
  uo = U("<input>");
const Se = (n) => {
  const [e, t] = Ee(n, [
      ...qe.variants(),
      "class",
      "value",
      "onChange",
      "type",
      "min",
      "max",
      "placeholder",
    ]),
    s = Be({ value: () => e.value, onChange: () => e.onChange }),
    i = () => {
      switch (e.type) {
        case "month":
          return "month";
        case "year":
          return "number";
        default:
          return "date";
      }
    },
    r = () => {
      const c = s.currentValue();
      if (c === void 0) return "";
      switch (e.type) {
        case "month":
          return c.toFormatString("yyyy-MM");
        case "year":
          return String(c.year);
        default:
          return c.toFormatString("yyyy-MM-dd");
      }
    },
    a = () => {
      const c = s.currentValue();
      if (c === void 0) return "";
      switch (e.type) {
        case "month":
          return c.toFormatString("yyyy-MM");
        case "year":
          return String(c.year);
        default:
          return c.toFormatString("yyyy-MM-dd");
      }
    },
    o = () => {
      if (e.min !== void 0)
        switch (e.type) {
          case "month":
            return e.min.toFormatString("yyyy-MM");
          case "year":
            return String(e.min.year);
          default:
            return e.min.toFormatString("yyyy-MM-dd");
        }
    },
    l = () => {
      if (e.max !== void 0)
        switch (e.type) {
          case "month":
            return e.max.toFormatString("yyyy-MM");
          case "year":
            return String(e.max.year);
          default:
            return e.max.toFormatString("yyyy-MM-dd");
        }
    },
    u = (c) => {
      const d = c.currentTarget;
      if (d.value === "") {
        s.setValue(void 0);
        return;
      }
      try {
        let m;
        switch (e.type) {
          case "month": {
            const g = d.value.split("-").map(Number),
              f = g[0],
              h = g[1];
            f != null &&
              h != null &&
              !Number.isNaN(f) &&
              !Number.isNaN(h) &&
              h >= 1 &&
              h <= 12 &&
              (m = new K(f, h, 1));
            break;
          }
          case "year": {
            const g = Number(d.value);
            !Number.isNaN(g) && g > 0 && g <= 9999 && (m = new K(g, 1, 1));
            break;
          }
          default:
            m = K.parse(d.value);
        }
        m !== void 0 && s.setValue(m);
      } catch {}
    },
    p = () => ({
      "type": i(),
      "value": r(),
      "onChange": u,
      "min": o(),
      "max": l(),
      "placeholder": e.placeholder,
      "aria-disabled": t.disabled ? "true" : void 0,
      "aria-readonly": t.readOnly ? "true" : void 0,
    });
  return C(Ae, {
    get when() {
      return e.inline;
    },
    get fallback() {
      return (() => {
        var c = uo();
        return (
          z(
            c,
            J(t, p, {
              get class() {
                return [qe(G(e, qe.variants())), e.class].filterExists().join(" ");
              },
            }),
            !1,
            !1,
          ),
          c
        );
      })();
    },
    get children() {
      var c = co(),
        d = c.firstChild,
        m = d.nextSibling;
      return (
        I(c, ao),
        I(d, oo),
        $(
          d,
          (() => {
            var g = Ze(() => a() !== "");
            return () => (g() ? a() : (e.placeholder ?? " "));
          })(),
        ),
        z(
          m,
          J(t, p, {
            get class() {
              return [lo, qe(G(e, qe.variants())), e.class].filterExists().join(" ");
            },
          }),
          !1,
          !1,
        ),
        c
      );
    },
  });
};
var Re = Me({
    defaultClassName: "_1p9corm0",
    variantClassNames: {
      size: { sm: "_1p9corm1", lg: "_1p9corm2" },
      inset: { true: "_1p9corm3" },
      inline: { true: "_1p9corm4" },
    },
    defaultVariants: {},
    compoundVariants: [],
  }),
  fo = "_1p9corm5",
  ho = "_1p9corm6",
  po = "_1p9corm7",
  mo = U("<div><div></div><input>"),
  go = U("<input>");
const He = (n) => {
  const [e, t] = Ee(n, [
      ...Re.variants(),
      "class",
      "value",
      "onChange",
      "type",
      "min",
      "max",
      "placeholder",
    ]),
    s = Be({ value: () => e.value, onChange: () => e.onChange }),
    i = () => (e.type === "time-sec" ? "1" : void 0),
    r = () => {
      const c = s.currentValue();
      return c === void 0
        ? ""
        : e.type === "time-sec"
          ? c.toFormatString("HH:mm:ss")
          : c.toFormatString("HH:mm");
    },
    a = () => {
      const c = s.currentValue();
      return c === void 0
        ? ""
        : e.type === "time-sec"
          ? c.toFormatString("HH:mm:ss")
          : c.toFormatString("HH:mm");
    },
    o = () => {
      if (e.min !== void 0)
        return e.type === "time-sec"
          ? e.min.toFormatString("HH:mm:ss")
          : e.min.toFormatString("HH:mm");
    },
    l = () => {
      if (e.max !== void 0)
        return e.type === "time-sec"
          ? e.max.toFormatString("HH:mm:ss")
          : e.max.toFormatString("HH:mm");
    },
    u = (c) => {
      const d = c.currentTarget;
      if (d.value === "") {
        s.setValue(void 0);
        return;
      }
      try {
        const m = d.value.split(":").map(Number);
        if (m.length >= 2) {
          const g = m[0],
            f = m[1],
            h = m[2] ?? 0;
          if (
            g !== void 0 &&
            f !== void 0 &&
            !Number.isNaN(g) &&
            !Number.isNaN(f) &&
            !Number.isNaN(h) &&
            g >= 0 &&
            g <= 23 &&
            f >= 0 &&
            f <= 59 &&
            h >= 0 &&
            h <= 59
          ) {
            const y = new M(g, f, h);
            s.setValue(y);
          }
        }
      } catch {}
    },
    p = () => ({
      "type": "time",
      "value": r(),
      "onChange": u,
      "min": o(),
      "max": l(),
      "step": i(),
      "placeholder": e.placeholder,
      "aria-disabled": t.disabled ? "true" : void 0,
      "aria-readonly": t.readOnly ? "true" : void 0,
    });
  return C(Ae, {
    get when() {
      return e.inline;
    },
    get fallback() {
      return (() => {
        var c = go();
        return (
          z(
            c,
            J(t, p, {
              get class() {
                return [Re(G(e, Re.variants())), e.class].filterExists().join(" ");
              },
            }),
            !1,
            !1,
          ),
          c
        );
      })();
    },
    get children() {
      var c = mo(),
        d = c.firstChild,
        m = d.nextSibling;
      return (
        I(c, fo),
        I(d, ho),
        $(
          d,
          (() => {
            var g = Ze(() => a() !== "");
            return () => (g() ? a() : (e.placeholder ?? " "));
          })(),
        ),
        z(
          m,
          J(t, p, {
            get class() {
              return [po, Re(G(e, Re.variants())), e.class].filterExists().join(" ");
            },
          }),
          !1,
          !1,
        ),
        c
      );
    },
  });
};
var Ue = Me({
    defaultClassName: "_1p9corm0",
    variantClassNames: {
      size: { sm: "_1p9corm1", lg: "_1p9corm2" },
      inset: { true: "_1p9corm3" },
      inline: { true: "_1p9corm4" },
    },
    defaultVariants: {},
    compoundVariants: [],
  }),
  yo = "_1p9corm5",
  bo = "_1p9corm6",
  wo = "_1p9corm7",
  So = U("<div><div></div><input>"),
  vo = U("<input>");
const Ye = (n) => {
  const [e, t] = Ee(n, [
      ...Ue.variants(),
      "class",
      "value",
      "onChange",
      "type",
      "min",
      "max",
      "placeholder",
    ]),
    s = Be({ value: () => e.value, onChange: () => e.onChange }),
    i = () => (e.type === "datetime-sec" ? "1" : void 0),
    r = () => {
      const c = s.currentValue();
      return c === void 0
        ? ""
        : e.type === "datetime-sec"
          ? c.toFormatString("yyyy-MM-ddTHH:mm:ss")
          : c.toFormatString("yyyy-MM-ddTHH:mm");
    },
    a = () => {
      const c = s.currentValue();
      return c === void 0
        ? ""
        : e.type === "datetime-sec"
          ? c.toFormatString("yyyy-MM-dd HH:mm:ss")
          : c.toFormatString("yyyy-MM-dd HH:mm");
    },
    o = () => {
      if (e.min !== void 0)
        return e.type === "datetime-sec"
          ? e.min.toFormatString("yyyy-MM-ddTHH:mm:ss")
          : e.min.toFormatString("yyyy-MM-ddTHH:mm");
    },
    l = () => {
      if (e.max !== void 0)
        return e.type === "datetime-sec"
          ? e.max.toFormatString("yyyy-MM-ddTHH:mm:ss")
          : e.max.toFormatString("yyyy-MM-ddTHH:mm");
    },
    u = (c) => {
      const d = c.currentTarget;
      if (d.value === "") {
        s.setValue(void 0);
        return;
      }
      try {
        const m = d.value.split("T"),
          g = m[0],
          f = m[1];
        if (g != null && g !== "" && f != null && f !== "") {
          const h = g.split("-").map(Number),
            y = h[0],
            b = h[1],
            v = h[2],
            k = f.split(":").map(Number),
            N = k[0],
            _ = k[1],
            E = k[2] ?? 0;
          if (
            y !== void 0 &&
            b !== void 0 &&
            v !== void 0 &&
            N !== void 0 &&
            _ !== void 0 &&
            !Number.isNaN(y) &&
            !Number.isNaN(b) &&
            !Number.isNaN(v) &&
            !Number.isNaN(N) &&
            !Number.isNaN(_) &&
            !Number.isNaN(E) &&
            b >= 1 &&
            b <= 12 &&
            v >= 1 &&
            v <= 31 &&
            N >= 0 &&
            N <= 23 &&
            _ >= 0 &&
            _ <= 59 &&
            E >= 0 &&
            E <= 59
          ) {
            const w = new j(y, b, v, N, _, E);
            s.setValue(w);
          }
        }
      } catch {}
    },
    p = () => ({
      "type": "datetime-local",
      "value": r(),
      "onChange": u,
      "min": o(),
      "max": l(),
      "step": i(),
      "placeholder": e.placeholder,
      "aria-disabled": t.disabled ? "true" : void 0,
      "aria-readonly": t.readOnly ? "true" : void 0,
    });
  return C(Ae, {
    get when() {
      return e.inline;
    },
    get fallback() {
      return (() => {
        var c = vo();
        return (
          z(
            c,
            J(t, p, {
              get class() {
                return [Ue(G(e, Ue.variants())), e.class].filterExists().join(" ");
              },
            }),
            !1,
            !1,
          ),
          c
        );
      })();
    },
    get children() {
      var c = So(),
        d = c.firstChild,
        m = d.nextSibling;
      return (
        I(c, yo),
        I(d, bo),
        $(
          d,
          (() => {
            var g = Ze(() => a() !== "");
            return () => (g() ? a() : (e.placeholder ?? " "));
          })(),
        ),
        z(
          m,
          J(t, p, {
            get class() {
              return [wo, Ue(G(e, Ue.variants())), e.class].filterExists().join(" ");
            },
          }),
          !1,
          !1,
        ),
        c
      );
    },
  });
};
var ko = "_1p9corm5",
  No = "_1p9corm6",
  _o = "_1p9corm7",
  We = Me({
    defaultClassName: "_1v1ttik0",
    variantClassNames: {
      size: { sm: "_1v1ttik1", lg: "_1v1ttik2" },
      inset: { true: "_1v1ttik3" },
      inline: { true: "_1v1ttik4" },
    },
    defaultVariants: {},
    compoundVariants: [],
  }),
  $o = U("<div><div></div><input>"),
  Co = U("<input>");
const Gn = (n) => {
  const [e, t] = Ee(n, [...We.variants(), "class", "value", "onChange"]),
    s = Be({ value: () => e.value ?? "#000000", onChange: () => e.onChange }),
    i = () => s.currentValue(),
    r = (o) => {
      const l = o.currentTarget,
        u = l.value !== "" ? l.value : void 0;
      s.setValue(u);
    },
    a = () => ({
      "type": "color",
      "value": i(),
      "onChange": r,
      "aria-disabled": t.disabled ? "true" : void 0,
      "aria-readonly": t.readOnly ? "true" : void 0,
    });
  return C(Ae, {
    get when() {
      return e.inline;
    },
    get fallback() {
      return (() => {
        var o = Co();
        return (
          z(
            o,
            J(t, a, {
              get class() {
                return [We(G(e, We.variants())), e.class].filterExists().join(" ");
              },
            }),
            !1,
            !1,
          ),
          o
        );
      })();
    },
    get children() {
      var o = $o(),
        l = o.firstChild,
        u = l.nextSibling;
      return (
        I(o, ko),
        I(l, No),
        z(
          u,
          J(t, a, {
            get class() {
              return [_o, We(G(e, We.variants())), e.class].filterExists().join(" ");
            },
          }),
          !1,
          !1,
        ),
        Zt((p) => Ir(l, "background", i())),
        o
      );
    },
  });
};
var Qn = "_1h4g1j60",
  Xt = "_1h4g1j61",
  Oo = "_1h4g1j62";
const Io = (n, e) => {
  n.classList.add(Qn);
  const t = document.createElement("input");
  ((t.type = "text"),
    (t.className = Oo),
    (t.tabIndex = -1),
    t.setAttribute("aria-hidden", "true"),
    n.appendChild(t),
    Er(() => {
      const s = e()();
      (t.setCustomValidity(s),
        s !== ""
          ? (n.classList.add(Xt), n.setAttribute("aria-invalid", "true"))
          : (n.classList.remove(Xt), n.setAttribute("aria-invalid", "false")));
    }),
    Ar(() => {
      (t.parentNode === n && n.removeChild(t),
        n.classList.remove(Qn, Xt),
        n.removeAttribute("aria-invalid"));
    }));
};
var Eo = "_186k25m0",
  Ao = U("<h1>Field"),
  Mo = U(
    "<div style=overflow:auto;flex:1><h2>TextField</h2><section><h3>Default (Uncontrolled)</h3><div></div></section><section><h3>Controlled (현재 값 표시)</h3><div><span>현재 값: </span></div></section><section><h3>Type</h3><div></div></section><section><h3>Format</h3><div></div></section><section><h3>Size</h3><div></div></section><section><h3>Inset (in Table)</h3><table><tbody><tr><td>이름</td><td></td></tr><tr><td>이메일</td><td></td></tr></tbody></table></section><section><h3>Inline</h3><div><span>인라인 필드: </span><span> 텍스트와 함께</span></div></section><section><h3>Disabled / ReadOnly</h3><div></div></section><section><h3>Placeholder</h3><div></div></section><section><h3>Invalid</h3><div><div></div></div></section><h2>NumberField</h2><section><h3>Default (Uncontrolled)</h3><div></div></section><section><h3>Controlled (현재 값 표시)</h3><div><span>현재 값: </span></div></section><section><h3>useNumberComma</h3><div></div></section><section><h3>minDigits</h3><div></div></section><h2>DateField</h2><section><h3>Default (Uncontrolled)</h3><div></div></section><section><h3>Controlled (현재 값 표시)</h3><div><span>현재 값: </span></div></section><section><h3>Type</h3><div></div></section><section><h3>Min / Max</h3><div></div></section><h2>TimeField</h2><section><h3>Default (Uncontrolled)</h3><div></div></section><section><h3>Controlled (현재 값 표시)</h3><div><span>현재 값: </span></div></section><section><h3>Type</h3><div></div></section><section><h3>Min / Max</h3><div></div></section><h2>DateTimeField</h2><section><h3>Default (Uncontrolled)</h3><div></div></section><section><h3>Controlled (현재 값 표시)</h3><div><span>현재 값: </span></div></section><section><h3>Type</h3><div></div></section><section><h3>Min / Max</h3><div></div></section><h2>ColorField</h2><section><h3>Default (Uncontrolled)</h3><div></div></section><section><h3>Controlled (현재 값 표시)</h3><div><span>현재 값: ",
  );
function Bo() {
  const [n, e] = ie(void 0),
    [t, s] = ie(void 0),
    [i, r] = ie(void 0),
    [a, o] = ie(void 0),
    [l, u] = ie(void 0),
    [p, c] = ie("#ff0000");
  return C(Lr, {
    get children() {
      return [
        C(Tr, {
          get children() {
            var d = Ao();
            return (Zt(() => I(d, A({ m: "none", fontSize: "base" }))), d);
          },
        }),
        (() => {
          var d = Mo(),
            m = d.firstChild,
            g = m.nextSibling,
            f = g.firstChild,
            h = f.nextSibling,
            y = g.nextSibling,
            b = y.firstChild,
            v = b.nextSibling,
            k = v.firstChild;
          k.firstChild;
          var N = y.nextSibling,
            _ = N.firstChild,
            E = _.nextSibling,
            w = N.nextSibling,
            P = w.firstChild,
            X = P.nextSibling,
            ne = w.nextSibling,
            B = ne.firstChild,
            fe = B.nextSibling,
            _s = ne.nextSibling,
            Wi = _s.firstChild,
            $s = Wi.nextSibling,
            zi = $s.firstChild,
            Cs = zi.firstChild,
            Os = Cs.firstChild,
            Ji = Os.nextSibling,
            Gi = Cs.nextSibling,
            Is = Gi.firstChild,
            Qi = Is.nextSibling,
            Es = _s.nextSibling,
            Xi = Es.firstChild,
            As = Xi.nextSibling,
            Zi = As.firstChild,
            er = Zi.nextSibling,
            Ms = Es.nextSibling,
            tr = Ms.firstChild,
            Tt = tr.nextSibling,
            Ts = Ms.nextSibling,
            sr = Ts.firstChild,
            Ls = sr.nextSibling,
            xs = Ts.nextSibling,
            nr = xs.firstChild,
            Ds = nr.nextSibling,
            Fs = Ds.firstChild,
            ir = xs.nextSibling,
            Ps = ir.nextSibling,
            rr = Ps.firstChild,
            Bs = rr.nextSibling,
            js = Ps.nextSibling,
            ar = js.firstChild,
            Lt = ar.nextSibling,
            xt = Lt.firstChild;
          xt.firstChild;
          var Ks = js.nextSibling,
            or = Ks.firstChild,
            Vs = or.nextSibling,
            qs = Ks.nextSibling,
            lr = qs.firstChild,
            Rs = lr.nextSibling,
            cr = qs.nextSibling,
            Hs = cr.nextSibling,
            ur = Hs.firstChild,
            Us = ur.nextSibling,
            Ys = Hs.nextSibling,
            fr = Ys.firstChild,
            Dt = fr.nextSibling,
            Ft = Dt.firstChild;
          Ft.firstChild;
          var Ws = Ys.nextSibling,
            dr = Ws.firstChild,
            nt = dr.nextSibling,
            zs = Ws.nextSibling,
            hr = zs.firstChild,
            Js = hr.nextSibling,
            pr = zs.nextSibling,
            Gs = pr.nextSibling,
            mr = Gs.firstChild,
            Qs = mr.nextSibling,
            Xs = Gs.nextSibling,
            gr = Xs.firstChild,
            Pt = gr.nextSibling,
            Bt = Pt.firstChild;
          Bt.firstChild;
          var Zs = Xs.nextSibling,
            yr = Zs.firstChild,
            jt = yr.nextSibling,
            en = Zs.nextSibling,
            br = en.firstChild,
            tn = br.nextSibling,
            wr = en.nextSibling,
            sn = wr.nextSibling,
            Sr = sn.firstChild,
            nn = Sr.nextSibling,
            rn = sn.nextSibling,
            vr = rn.firstChild,
            Kt = vr.nextSibling,
            Vt = Kt.firstChild;
          Vt.firstChild;
          var an = rn.nextSibling,
            kr = an.firstChild,
            qt = kr.nextSibling,
            on = an.nextSibling,
            Nr = on.firstChild,
            ln = Nr.nextSibling,
            _r = on.nextSibling,
            cn = _r.nextSibling,
            $r = cn.firstChild,
            un = $r.nextSibling,
            Cr = cn.nextSibling,
            Or = Cr.firstChild,
            Rt = Or.nextSibling,
            Ht = Rt.firstChild;
          return (
            Ht.firstChild,
            $(h, C(V, {})),
            $(
              v,
              C(V, {
                get value() {
                  return n();
                },
                onChange: e,
                placeholder: "입력하세요",
              }),
              k,
            ),
            $(k, () => n() ?? "(없음)", null),
            $(E, C(V, { type: "text", placeholder: "text" }), null),
            $(E, C(V, { type: "password", placeholder: "password" }), null),
            $(E, C(V, { type: "email", placeholder: "email" }), null),
            $(X, C(V, { format: "000-0000-0000", placeholder: "전화번호" })),
            $(fe, C(V, { size: "sm", placeholder: "sm" }), null),
            $(fe, C(V, { placeholder: "default" }), null),
            $(fe, C(V, { size: "lg", placeholder: "lg" }), null),
            I($s, Eo),
            $(Ji, C(V, { inset: !0, placeholder: "이름 입력" })),
            $(Qi, C(V, { inset: !0, type: "email", placeholder: "이메일 입력" })),
            $(As, C(V, { inline: !0, placeholder: "inline" }), er),
            $(Tt, C(V, { disabled: !0, placeholder: "Disabled 상태" }), null),
            $(Tt, C(V, { readOnly: !0, placeholder: "ReadOnly 상태" }), null),
            $(Ls, C(V, { placeholder: "플레이스홀더 텍스트" })),
            Mr(Io, Fs, () => () => "에러 메시지"),
            $(Fs, C(V, { placeholder: "에러 상태" })),
            $(Bs, C(ct, { placeholder: "숫자 입력" })),
            $(
              Lt,
              C(ct, {
                get value() {
                  return t();
                },
                onChange: s,
                placeholder: "숫자 입력",
              }),
              xt,
            ),
            $(xt, () => t() ?? "(없음)", null),
            $(Vs, C(ct, { useNumberComma: !0, placeholder: "1234567 → 1,234,567" })),
            $(Rs, C(ct, { minDigits: 5, placeholder: "123 → 00123" })),
            $(Us, C(Se, {})),
            $(
              Dt,
              C(Se, {
                get value() {
                  return i();
                },
                onChange: r,
              }),
              Ft,
            ),
            $(Ft, () => i()?.toFormatString("yyyy-MM-dd") ?? "(없음)", null),
            $(nt, C(Se, { type: "date" }), null),
            $(nt, C(Se, { type: "month" }), null),
            $(nt, C(Se, { type: "year" }), null),
            $(Js, C(Se, { min: new K(2024, 1, 1), max: new K(2026, 12, 31) })),
            $(Qs, C(He, {})),
            $(
              Pt,
              C(He, {
                get value() {
                  return a();
                },
                onChange: o,
              }),
              Bt,
            ),
            $(Bt, () => a()?.toFormatString("HH:mm") ?? "(없음)", null),
            $(jt, C(He, { type: "time" }), null),
            $(jt, C(He, { type: "time-sec" }), null),
            $(tn, C(He, { min: new M(9, 0, 0), max: new M(18, 0, 0) })),
            $(nn, C(Ye, {})),
            $(
              Kt,
              C(Ye, {
                get value() {
                  return l();
                },
                onChange: u,
              }),
              Vt,
            ),
            $(Vt, () => l()?.toFormatString("yyyy-MM-dd HH:mm") ?? "(없음)", null),
            $(qt, C(Ye, { type: "datetime" }), null),
            $(qt, C(Ye, { type: "datetime-sec" }), null),
            $(ln, C(Ye, { min: new j(2024, 1, 1, 0, 0, 0), max: new j(2026, 12, 31, 23, 59, 59) })),
            $(un, C(Gn, {})),
            $(
              Rt,
              C(Gn, {
                get value() {
                  return p();
                },
                onChange: c,
              }),
              Ht,
            ),
            $(Ht, () => p() ?? "(없음)", null),
            Zt(
              (S) => {
                var fn = A({ p: "xxl" }),
                  dn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  hn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  pn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  mn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  gn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  yn = A({ p: "sm" }),
                  bn = A({ p: "sm" }),
                  wn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Sn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  vn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  kn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Nn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  _n = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  $n = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Cn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  On = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  In = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  En = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  An = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Mn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Tn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Ln = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  xn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Dn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Fn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Pn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Bn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  jn = A({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" });
                return (
                  fn !== S.e && I(d, (S.e = fn)),
                  dn !== S.t && I(h, (S.t = dn)),
                  hn !== S.a && I(v, (S.a = hn)),
                  pn !== S.o && I(E, (S.o = pn)),
                  mn !== S.i && I(X, (S.i = mn)),
                  gn !== S.n && I(fe, (S.n = gn)),
                  yn !== S.s && I(Os, (S.s = yn)),
                  bn !== S.h && I(Is, (S.h = bn)),
                  wn !== S.r && I(Tt, (S.r = wn)),
                  Sn !== S.d && I(Ls, (S.d = Sn)),
                  vn !== S.l && I(Ds, (S.l = vn)),
                  kn !== S.u && I(Bs, (S.u = kn)),
                  Nn !== S.c && I(Lt, (S.c = Nn)),
                  _n !== S.w && I(Vs, (S.w = _n)),
                  $n !== S.m && I(Rs, (S.m = $n)),
                  Cn !== S.f && I(Us, (S.f = Cn)),
                  On !== S.y && I(Dt, (S.y = On)),
                  In !== S.g && I(nt, (S.g = In)),
                  En !== S.p && I(Js, (S.p = En)),
                  An !== S.b && I(Qs, (S.b = An)),
                  Mn !== S.T && I(Pt, (S.T = Mn)),
                  Tn !== S.A && I(jt, (S.A = Tn)),
                  Ln !== S.O && I(tn, (S.O = Ln)),
                  xn !== S.I && I(nn, (S.I = xn)),
                  Dn !== S.S && I(Kt, (S.S = Dn)),
                  Fn !== S.W && I(qt, (S.W = Fn)),
                  Pn !== S.C && I(ln, (S.C = Pn)),
                  Bn !== S.B && I(un, (S.B = Bn)),
                  jn !== S.v && I(Rt, (S.v = jn)),
                  S
                );
              },
              {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0,
                i: void 0,
                n: void 0,
                s: void 0,
                h: void 0,
                r: void 0,
                d: void 0,
                l: void 0,
                u: void 0,
                c: void 0,
                w: void 0,
                m: void 0,
                f: void 0,
                y: void 0,
                g: void 0,
                p: void 0,
                b: void 0,
                T: void 0,
                A: void 0,
                O: void 0,
                I: void 0,
                S: void 0,
                W: void 0,
                C: void 0,
                B: void 0,
                v: void 0,
              },
            ),
            d
          );
        })(),
      ];
    },
  });
}
export { Bo as default };
