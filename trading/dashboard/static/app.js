/* Paper Desk - PAPER / SIMULATION dashboard.
 * Reads the read-only JSON API; holds no trading state of its own. */
"use strict";

const REFRESH_MS = 5000;
const S = { symbol: null, overview: null, market: null, trades: [], analytics: null, decisions: [],
            selectedDecision: null, trade: null, lastOk: null };

// ------------------------------------------------------------------ helpers
const $ = (id) => document.getElementById(id);
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}
const isNum = (v) => typeof v === "number" && isFinite(v);
function money(v, { sign = false, dp = 2 } = {}) {
  if (!isNum(v)) return "—";
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return (v < 0 ? "−$" : sign && v > 0 ? "+$" : "$") + s;
}
const pct = (v, dp = 1) => (isNum(v) ? (v * 100).toFixed(dp) + "%" : "—");
const num = (v, dp = 2) => (isNum(v) ? v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) : "—");
const signCls = (v) => (isNum(v) ? (v > 0 ? "pos" : v < 0 ? "neg" : "") : "");
const ET = { timeZone: "America/New_York" };
function tFmt(s, withDate = true) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  const time = d.toLocaleTimeString("en-US", { ...ET, hour: "2-digit", minute: "2-digit", hour12: false });
  if (!withDate) return time;
  return d.toLocaleDateString("en-US", { ...ET, month: "short", day: "numeric" }) + " " + time;
}
function dur(from, to = Date.now()) {
  const ms = new Date(to) - new Date(from);
  if (!isFinite(ms) || ms < 0) return "—";
  const m = Math.round(ms / 60000);
  return m < 60 ? m + "m" : m < 1440 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : Math.floor(m / 1440) + "d " + Math.floor((m % 1440) / 60) + "h";
}
async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok && r.status !== 404) throw new Error(url + " " + r.status);
  return r.json();
}
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ------------------------------------------------------------------ canvas basics
function canvasCtx(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.font = "11px " + css("--font");
  return { ctx, w, h };
}
function niceTicks(lo, hi, n = 5) {
  const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || mag * 10;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
function placeTip(tip, wrap, x, y) {
  tip.hidden = false;
  const W = wrap.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = x + 14; if (left + tw > W - 4) left = x - tw - 14;
  let top = Math.max(4, Math.min(y - th / 2, wrap.clientHeight - th - 4));
  tip.style.left = Math.max(4, left) + "px"; tip.style.top = top + "px";
}
function tipRows(tip, title, rows, tag) {
  tip.replaceChildren(el("div", { class: "t", text: title }),
    ...rows.map(([k, v, color]) => el("div", { class: "row" },
      el("span", {}, color ? el("i", { class: "key", style: `background:${color}` }) : null, k), el("b", { text: v }))),
    ...(tag ? [el("div", { class: "tag", text: tag })] : []));
}

// ------------------------------------------------------------------ candlestick chart
function drawMarket(canvas, tip, data, opts = {}) {
  const wrap = canvas.parentElement;
  const { ctx, w, h } = canvasCtx(canvas);
  const C = data && data.candles ? data.candles : [];
  if (!C.length) return;
  const pad = { l: 6, r: 62, t: 14, b: 22 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const n = C.length, bw = pw / n;
  const times = C.map((c) => new Date(c.t).getTime());
  const idxOf = (t) => {
    const v = new Date(t).getTime(); let lo = 0, hi = n - 1;
    if (v <= times[0]) return 0;
    if (v >= times[n - 1]) return v > times[n - 1] + data.bar_seconds * 1000 ? null : n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (times[m] <= v) lo = m; else hi = m - 1; }
    return lo;
  };
  const inView = (t) => { const v = new Date(t).getTime(); return v >= times[0] && v <= times[n - 1] + data.bar_seconds * 1000; };
  const trades = (data.trades || []).filter((t) => !opts.onlyTrade || t.id === opts.onlyTrade);
  let lo = Math.min(...C.map((c) => c.l)), hi = Math.max(...C.map((c) => c.h));
  const levels = [];
  trades.forEach((t) => { const s = (data.signals || []).find((x) => x.id === t.signal_id); if (s) levels.push(s.stop, s.target); });
  (data.positions || []).forEach((p) => levels.push(p.stop, p.target));
  (data.pending || []).forEach((o) => levels.push(o.stop_loss, o.take_profit, o.limit_price));
  levels.filter(isNum).forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
  const padY = (hi - lo) * 0.06 || 1; lo -= padY; hi += padY;
  const X = (i) => pad.l + bw * (i + 0.5), Y = (v) => pad.t + ((hi - v) / (hi - lo)) * ph;

  // grid + price axis
  ctx.lineWidth = 1; ctx.strokeStyle = css("--grid"); ctx.fillStyle = css("--text-muted"); ctx.textBaseline = "middle";
  for (const v of niceTicks(lo, hi, 6)) {
    const y = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
    ctx.fillText(num(v, v < 10 ? 4 : 2), pad.l + pw + 8, y);
  }
  // time axis
  ctx.textBaseline = "top"; ctx.textAlign = "center";
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 90))));
  for (let i = 0; i < n; i += every) {
    ctx.textAlign = i === 0 ? "left" : "center";
    ctx.fillText(tFmt(C[i].t, i === 0 || new Date(C[i].t).getDate() !== new Date(C[Math.max(0, i - every)].t).getDate()), i === 0 ? pad.l : X(i), h - pad.b + 6);
  }
  ctx.textAlign = "left";

  // flagged bars (data-quality)
  ctx.fillStyle = "rgba(250,178,25,0.10)";
  C.forEach((c, i) => { if (c.flag) ctx.fillRect(pad.l + bw * i, pad.t, bw, ph); });

  // structure level
  if (data.protective) {
    ctx.strokeStyle = css("--orange"); ctx.lineWidth = 1.5; ctx.beginPath(); let on = false;
    data.protective.forEach((v, i) => {
      if (!isNum(v)) { on = false; return; }
      const x0 = pad.l + bw * i, x1 = x0 + bw, y = Y(v);
      if (!on) { ctx.moveTo(x0, y); on = true; } else ctx.lineTo(x0, y);
      ctx.lineTo(x1, y);
    });
    ctx.stroke();
  }

  // candles
  const cw = Math.max(1, Math.min(9, bw * 0.62));
  C.forEach((c, i) => {
    const up = c.c >= c.o, col = up ? css("--up") : css("--down"), x = X(i);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Y(c.h)); ctx.lineTo(Math.round(x) + 0.5, Y(c.l)); ctx.stroke();
    const y0 = Y(Math.max(c.o, c.c)), y1 = Y(Math.min(c.o, c.c));
    ctx.fillRect(x - cw / 2, y0, cw, Math.max(1, y1 - y0));
  });

  // structure events (sparse labels)
  ctx.font = "600 9.5px " + css("--font"); ctx.fillStyle = css("--text-muted"); ctx.textAlign = "center";
  (data.events || []).forEach((e) => {
    const i = idxOf(e.t); if (i == null) return;
    const label = e.kind === "CHOCH" ? "CHoCH" : e.kind === "BOS" ? "BOS" : "";
    if (!label) return;
    const y = e.direction === "bullish" ? Y(C[i].h) - 8 : Y(C[i].l) + 9;
    ctx.fillText(label, X(i), y);
  });
  ctx.textAlign = "left"; ctx.font = "11px " + css("--font");

  const hline = (v, i0, i1, color, width = 1.5, label) => {
    if (!isNum(v)) return;
    const y = Math.round(Y(v)) + 0.5, x0 = pad.l + bw * i0, x1 = i1 == null ? pad.l + pw : pad.l + bw * (i1 + 1);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    if (label) { ctx.fillStyle = css("--text-secondary"); ctx.textBaseline = "bottom"; ctx.fillText(label, x0 + 2, y - 2); ctx.textBaseline = "middle"; }
  };
  const ring = (x, y, r) => { ctx.lineWidth = 2; ctx.strokeStyle = css("--surface-1"); ctx.stroke(); };
  const markers = []; // for hover

  // strategy setups (not traded by themselves)
  (data.setups || []).forEach((s) => {
    const i = idxOf(s.t); if (i == null) return;
    const y = Y(s.entry); ctx.beginPath(); ctx.arc(X(i), y, 4, 0, Math.PI * 2);
    ctx.strokeStyle = css("--text-muted"); ctx.lineWidth = 1.5; ctx.globalAlpha = s.status === "rejected" ? 0.45 : 1;
    ctx.stroke(); ctx.globalAlpha = 1;
    markers.push({ i, kind: "setup", text: `Strategy setup · ${s.category}${s.s_setup ? " + S" : ""} ${s.direction} · ${s.status}${s.reason ? " (" + s.reason + ")" : ""}` });
  });
  // pending paper orders
  (data.pending || []).forEach((o) => {
    const i = idxOf(o.created_at) ?? 0;
    hline(o.limit_price, i, null, css("--violet"), 1, "PENDING LIMIT"); hline(o.stop_loss, i, null, css("--critical"), 1);
    hline(o.take_profit, i, null, css("--good"), 1);
  });
  // signals (agent-approved)
  (data.signals || []).forEach((s) => {
    const i = idxOf(s.t); if (i == null) return;
    const x = X(i), y = Y(s.price), r = 6;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
    ring(); ctx.strokeStyle = css("--violet"); ctx.lineWidth = 2; ctx.stroke();
    markers.push({ i, kind: "signal", text: `SIGNAL · ${s.action.replace("enter_", "")} @ ${num(s.price)} · SL ${num(s.stop)} · TP ${num(s.target)}` });
  });
  // filled paper trades
  trades.forEach((t) => {
    const i0 = idxOf(t.entry_time), i1 = idxOf(t.exit_time);
    const sig = (data.signals || []).find((x) => x.id === t.signal_id);
    const a = i0 ?? 0, b = i1 ?? n - 1;
    if (sig) { hline(sig.stop, a, b, css("--critical"), 1.5, opts.onlyTrade ? "STOP" : null);
               hline(sig.target, a, b, css("--good"), 1.5, opts.onlyTrade ? "TARGET" : null); }
    if (i0 != null && i1 != null) {
      ctx.strokeStyle = t.net_pnl >= 0 ? css("--good") : css("--critical"); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(i0), Y(t.entry)); ctx.lineTo(X(i1), Y(t.exit)); ctx.stroke();
    }
    if (i0 != null) {
      const x = X(i0), y = Y(t.entry), up = t.direction === "long";
      ctx.beginPath(); ctx.moveTo(x, up ? y - 1 : y + 1); ctx.lineTo(x - 6, up ? y + 9 : y - 9); ctx.lineTo(x + 6, up ? y + 9 : y - 9); ctx.closePath();
      ring(); ctx.fillStyle = css("--accent"); ctx.fill();
      markers.push({ i: i0, kind: "entry", text: `FILLED paper entry · ${t.direction} ${t.quantity} @ ${num(t.entry)}` });
    }
    if (i1 != null) {
      ctx.fillStyle = css("--text-primary"); ctx.fillRect(X(i1) - 4.5, Y(t.exit) - 4.5, 9, 9);
      markers.push({ i: i1, kind: "exit", text: `Paper exit · ${t.exit_reason} @ ${num(t.exit)} · ${money(t.net_pnl, { sign: true })}` });
    }
  });
  // open positions
  (data.positions || []).forEach((p) => {
    const i = idxOf(p.opened_at) ?? 0;
    hline(p.stop, i, null, css("--critical"), 1.5, "STOP"); hline(p.target, i, null, css("--good"), 1.5, "TARGET");
    const x = X(i), y = Y(p.entry), up = p.direction === "long";
    ctx.beginPath(); ctx.moveTo(x, up ? y - 1 : y + 1); ctx.lineTo(x - 6, up ? y + 9 : y - 9); ctx.lineTo(x + 6, up ? y + 9 : y - 9); ctx.closePath();
    ctx.fillStyle = css("--accent"); ctx.fill();
    markers.push({ i, kind: "entry", text: `OPEN paper position · ${p.direction} ${p.quantity} @ ${num(p.entry)}` });
  });
  // last price tag
  const last = C[n - 1];
  const ly = Y(last.c);
  ctx.fillStyle = last.c >= last.o ? css("--up") : css("--down");
  ctx.fillRect(pad.l + pw + 2, ly - 8, pad.r - 4, 16);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(num(last.c, last.c < 10 ? 4 : 2), pad.l + pw + 6, ly);

  // hover layer
  canvas.onpointermove = (ev) => {
    const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left;
    const i = Math.max(0, Math.min(n - 1, Math.floor((x - pad.l) / bw)));
    drawMarket(canvas, tip, data, { ...opts, hover: i });
    const c = C[i];
    const rows = [["Open", num(c.o)], ["High", num(c.h)], ["Low", num(c.l)], ["Close", num(c.c)]];
    if (isNum((data.protective || [])[i])) rows.push(["Stop level", num(data.protective[i]), css("--orange")]);
    const tags = markers.filter((m) => m.i === i).map((m) => m.text);
    tipRows(tip, tFmt(c.t) + " ET" + (c.flag ? " · data flagged" : ""), rows, tags.join("\n") || null);
    placeTip(tip, wrap, X(i), ev.clientY - r.top);
  };
  canvas.onpointerleave = () => { tip.hidden = true; drawMarket(canvas, tip, data, { ...opts, hover: null }); };
  if (opts.hover != null) {
    const x = Math.round(X(opts.hover)) + 0.5;
    ctx.strokeStyle = css("--baseline"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
  }
}

// ------------------------------------------------------------------ line + bar charts
function drawLine(canvas, tip, pts, { value, color, fill, fmt, baseline, title }) {
  const wrap = canvas.parentElement;
  const { ctx, w, h } = canvasCtx(canvas);
  if (!pts.length) { ctx.fillStyle = css("--text-muted"); ctx.fillText("No paper activity yet", 10, 20); return; }
  const pad = { l: 6, r: 64, t: 10, b: 20 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const vals = pts.map(value);
  let lo = Math.min(...vals, baseline ?? Infinity), hi = Math.max(...vals, baseline ?? -Infinity);
  if (lo === hi) { lo -= 1; hi += 1; }
  const p = (hi - lo) * 0.08; lo -= p; hi += p;
  const X = (i) => pad.l + (pts.length === 1 ? pw / 2 : (pw * i) / (pts.length - 1)), Y = (v) => pad.t + ((hi - v) / (hi - lo)) * ph;
  ctx.strokeStyle = css("--grid"); ctx.fillStyle = css("--text-muted"); ctx.lineWidth = 1; ctx.textBaseline = "middle";
  for (const v of niceTicks(lo, hi, 4)) { const y = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke(); ctx.fillText(fmt(v), pad.l + pw + 8, y); }
  if (baseline != null) { ctx.strokeStyle = css("--baseline"); const y = Math.round(Y(baseline)) + 0.5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke(); }
  ctx.textBaseline = "top"; ctx.textAlign = "center";
  const every = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(pw / 110))));
  for (let i = 0; i < pts.length; i += every) { ctx.textAlign = i === 0 ? "left" : "center"; ctx.fillText(tFmt(pts[i].t), i === 0 ? pad.l : X(i), h - pad.b + 5); }
  ctx.textAlign = "left";
  ctx.beginPath(); vals.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  if (fill) { const base = Y(baseline ?? lo); ctx.lineTo(X(vals.length - 1), base); ctx.lineTo(X(0), base); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  const li = vals.length - 1;
  ctx.beginPath(); ctx.arc(X(li), Y(vals[li]), 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = css("--surface-1"); ctx.stroke();
  canvas.onpointermove = (ev) => {
    const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(((x - pad.l) / pw) * (pts.length - 1))));
    drawLine(canvas, tip, pts, { value, color, fill, fmt, baseline, title });
    const c2 = canvas.getContext("2d"); const xx = Math.round(X(i)) + 0.5;
    c2.strokeStyle = css("--baseline"); c2.lineWidth = 1; c2.beginPath(); c2.moveTo(xx, pad.t); c2.lineTo(xx, pad.t + ph); c2.stroke();
    c2.beginPath(); c2.arc(X(i), Y(vals[i]), 4, 0, Math.PI * 2); c2.fillStyle = color; c2.fill();
    tipRows(tip, tFmt(pts[i].t) + " ET", [[title, fmt(vals[i]), color], ...(pts[i].balance != null && title === "Equity" ? [["Balance", money(pts[i].balance)]] : [])]);
    placeTip(tip, wrap, X(i), ev.clientY - r.top);
  };
  canvas.onpointerleave = () => { tip.hidden = true; drawLine(canvas, tip, pts, { value, color, fill, fmt, baseline, title }); };
}

function drawBars(canvas, tip, items) {
  const wrap = canvas.parentElement;
  const { ctx, w, h } = canvasCtx(canvas);
  if (!items.length) { ctx.fillStyle = css("--text-muted"); ctx.fillText("No closed paper trades yet", 10, 20); return; }
  const vals = items.map((t) => (isNum(t.r) ? t.r : 0));
  const pad = { l: 6, r: 44, t: 10, b: 18 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals); const p = (hi - lo) * 0.1 || 1; lo -= p; hi += p;
  const Y = (v) => pad.t + ((hi - v) / (hi - lo)) * ph, slot = pw / items.length, bw = Math.min(24, slot * 0.7);
  ctx.strokeStyle = css("--grid"); ctx.fillStyle = css("--text-muted"); ctx.lineWidth = 1; ctx.textBaseline = "middle";
  for (const v of niceTicks(lo, hi, 4)) { const y = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke(); ctx.fillText(v.toFixed(1) + "R", pad.l + pw + 6, y); }
  const y0 = Y(0);
  ctx.strokeStyle = css("--baseline"); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(y0) + 0.5); ctx.lineTo(pad.l + pw, Math.round(y0) + 0.5); ctx.stroke();
  const bars = items.map((t, i) => {
    const v = vals[i], x = pad.l + slot * i + (slot - bw) / 2, y = Y(Math.max(v, 0)), hh = Math.max(1, Math.abs(Y(v) - y0));
    ctx.fillStyle = t.net_pnl > 0 ? css("--good") : t.net_pnl < 0 ? css("--critical") : css("--text-muted");
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, v >= 0 ? y : y0, bw, hh, v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]); else ctx.rect(x, v >= 0 ? y : y0, bw, hh);
    ctx.fill();
    return { x, w: bw, t };
  });
  canvas.onpointermove = (ev) => {
    const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left;
    const i = Math.max(0, Math.min(items.length - 1, Math.floor((x - pad.l) / slot)));
    const t = items[i];
    tipRows(tip, tFmt(t.exit_time) + " ET", [["Net R", isNum(t.r) ? t.r.toFixed(2) + "R" : "—"], ["Net P&L", money(t.net_pnl, { sign: true })]], t.result);
    placeTip(tip, wrap, bars[i].x + bars[i].w / 2, ev.clientY - r.top);
  };
  canvas.onpointerleave = () => { tip.hidden = true; };
  canvas.onclick = (ev) => {
    const r = canvas.getBoundingClientRect(), i = Math.floor((ev.clientX - r.left - pad.l) / slot);
    if (items[i]) openTrade(items[i].id);
  };
}

// ------------------------------------------------------------------ renderers
function renderAccount(a) {
  $("equity").textContent = money(a.equity);
  const tp = a.total_pnl, tpp = a.starting_balance ? tp / a.starting_balance : null;
  $("equity-delta").replaceChildren(el("span", { class: signCls(tp), text: `${money(tp, { sign: true })} (${isNum(tpp) ? (tpp >= 0 ? "+" : "") + pct(tpp) : "—"})` }), " since start");
  $("as-of").textContent = a.as_of ? "as of " + tFmt(a.as_of) + " ET" : a.has_state ? "" : "no paper activity recorded yet";
  const pf = a.profit_factor_infinite ? "∞" : isNum(a.profit_factor) ? a.profit_factor.toFixed(2) : "—";
  const tiles = [
    ["Starting balance", money(a.starting_balance)],
    ["Current virtual balance", money(a.balance)],
    ["Today's P&L", money(a.today_pnl, { sign: true }), signCls(a.today_pnl)],
    ["Total P&L", money(a.total_pnl, { sign: true }), signCls(a.total_pnl)],
    ["Current drawdown", money(a.drawdown), a.drawdown < 0 ? "neg" : "", pct(a.drawdown_pct) + " from peak"],
    ["Maximum drawdown", money(a.max_drawdown), a.max_drawdown < 0 ? "neg" : "", pct(a.max_drawdown_pct) + " worst"],
    ["Win rate", a.total_trades ? pct(a.win_rate) : "—", "", a.total_trades ? `${a.wins} of ${a.total_trades} trades` : null],
    ["Profit factor", pf],
    ["Average win", money(a.avg_win), "pos"],
    ["Average loss", money(a.avg_loss), "neg"],
    ["Total trades", String(a.total_trades)],
    ["Open exposure", money(a.open_exposure, { dp: 0 })],
  ];
  $("tiles").replaceChildren(...tiles.map(([k, v, cls, sub]) => el("div", { class: "tile" }, el("div", { class: "label", text: k }),
    el("div", { class: "v " + (cls || ""), text: v }), sub ? el("div", { class: "s", text: sub }) : null)));
}

function renderSymbols(symbols) {
  const nav = $("symbol-tabs");
  if (!S.symbol || !symbols.includes(S.symbol)) S.symbol = symbols[0] || null;
  nav.replaceChildren(...symbols.map((s) => el("button", { type: "button", "aria-pressed": String(s === S.symbol), text: s,
    onclick: () => { S.symbol = s; S.selectedDecision = null; renderSymbols(symbols); refresh(); } })));
}

function verdictMark(v) { return v === "approve" ? "✓" : v === "reject" ? "✕" : "–"; }
function checksList(checks) {
  if (!checks || !checks.length) return null;
  return el("ul", {}, checks.map((c) => el("li", { class: c.passed ? "pass" : "fail" }, el("b", { text: c.name.replaceAll("_", " ") }), c.detail ? " — " + c.detail : "")));
}
function agentRow(title, role, v, reason, checks, open) {
  return el("details", { class: "agent", open },
    el("summary", {}, el("span", { class: "mark " + (v || "not_run"), text: verdictMark(v) }),
      el("span", {}, el("div", { class: "name", text: title }), el("div", { class: "role", text: role })),
      el("span", { class: "verdict", text: v === "approve" ? "APPROVE" : v === "reject" ? "REJECT" : "NOT RUN" })),
    el("div", { class: "reason" }, el("div", { text: reason || "—" }), checksList(checks)));
}
function renderAgentsInto(container, e, full, open = false) {
  const ag = full && full.agents ? full.agents : null;
  const out = (name) => (ag && ag[name] && ag[name].output) || {};
  const sigChecks = out("signal_analyst").conditions_checked;
  const riskChecks = (out("risk_manager").details || {}).checks;
  const execChecks = (out("execution_validator").details || {}).checks;
  const consensusCls = e.outcome === "PAPER_TRADE_APPROVED" ? "approved" : e.outcome === "NO_DATA" ? "no_data" : "no_trade";
  container.replaceChildren(
    agentRow("SIGNAL AGENT", "Agent 1 · does the strategy have a valid signal?", e.signal.verdict, e.signal.reason, sigChecks, open),
    agentRow("RISK AGENT", "Agent 2 · simulated-account risk", e.risk.verdict, e.risk.reason, riskChecks, open),
    agentRow("EXECUTION AGENT", "Agent 3 · is the paper order valid?", e.execution.verdict, e.execution.reason, execChecks, open),
    el("div", { class: "consensus " + consensusCls },
      el("div", { class: "votes-line" }, [["Signal", e.signal.verdict], ["Risk", e.risk.verdict], ["Execution", e.execution.verdict]].map(([k, v]) =>
        el("span", {}, el("span", { class: v === "approve" ? "y" : v === "reject" ? "n" : "s", text: verdictMark(v) + " " }), k))),
      el("div", { class: "outcome", text: e.outcome === "PAPER_TRADE_APPROVED" ? "PAPER TRADE APPROVED" : e.outcome === "NO_DATA" ? "NO DATA" : "NO TRADE" }),
      el("div", { class: "why", text: e.outcome === "PAPER_TRADE_APPROVED" ? "All three agents approved. The paper order was sent to the simulated broker." : e.consensus_reason })));
}
async function selectDecision(e) {
  S.selectedDecision = e.id;
  $("agent-bar").textContent = `${e.symbol} · bar ${tFmt(e.bar_time)} ET`;
  renderAgentsInto($("agent-panel"), e, null);
  [...$("decision-feed").children].forEach((li) => li.setAttribute("aria-current", String(li.dataset.id === e.id)));
  try { const full = await getJSON("/api/decision/" + encodeURIComponent(e.id)); if (S.selectedDecision === e.id) renderAgentsInto($("agent-panel"), e, full); } catch (_) { /* summary stays */ }
}
function renderDecisions(list) {
  const feed = $("decision-feed");
  if (!list.length) { feed.replaceChildren(el("li", { class: "muted", text: "No decisions recorded yet." })); $("agent-panel").replaceChildren(); return; }
  feed.replaceChildren(...list.map((e) => {
    const vs = [e.signal, e.risk, e.execution].map((a) => el("span", { class: a.verdict === "approve" ? "y" : a.verdict === "reject" ? "n" : "s", text: verdictMark(a.verdict) }));
    const outTxt = e.outcome === "PAPER_TRADE_APPROVED" ? "PAPER TRADE APPROVED" : e.outcome === "NO_DATA" ? "NO DATA" : "NO TRADE";
    const li = el("li", { "data-id": e.id, tabindex: "0", onclick: () => selectDecision(e), onkeydown: (k) => { if (k.key === "Enter") selectDecision(e); } },
      el("span", { class: "ts", text: tFmt(e.bar_time, false) }), el("span", { class: "votes" }, vs),
      el("span", { class: "out" }, el("b", { text: outTxt }), e.setup ? ` · ${e.setup} ${e.direction || ""}` : ""));
    return li;
  }));
  const current = list.find((e) => e.id === S.selectedDecision) || list[0];
  if (current.id !== S.selectedDecision || !$("agent-panel").children.length) selectDecision(current);
  else [...feed.children].forEach((li) => li.setAttribute("aria-current", String(li.dataset.id === current.id)));
}

function renderPositions(pos, pending) {
  $("pos-count").textContent = pos.length;
  $("positions-body").replaceChildren(...(pos.length ? pos.map((p) => el("tr", {},
    el("td", { class: "mono", text: p.symbol }), el("td", {}, el("span", { class: "side", text: p.direction.toUpperCase() })),
    el("td", { class: "num", text: num(p.entry) }), el("td", { class: "num", text: num(p.current) }),
    el("td", { class: "num", text: num(p.stop) }), el("td", { class: "num", text: num(p.target) }),
    el("td", { class: "num " + signCls(p.unrealized_pnl), text: money(p.unrealized_pnl, { sign: true }) }),
    el("td", { class: "num", text: dur(p.opened_at, S.overview?.account?.as_of || Date.now()) })))
    : [el("tr", { class: "empty-row" }, el("td", { colspan: 8, text: "No open paper positions." }))]));
  const box = $("pending");
  box.replaceChildren(...(pending.length ? [el("div", { class: "muted small", text: "Pending paper orders (not filled yet)" }),
    ...pending.map((o) => el("div", { class: "po" }, el("b", { text: o.symbol }), `${o.side.toUpperCase()} ${o.quantity} ${o.order_type.toUpperCase()}`,
      `entry ${num(o.limit_price)}`, `SL ${num(o.stop_loss)}`, `TP ${num(o.take_profit)}`,
      o.expires_after_bars ? `bar ${o.bars_waited}/${o.expires_after_bars}` : ""))] : []));
}

function strategyLabel(name) { return name === "ORIGINAL_YOUTUBE_STRATEGY" ? "Original (YouTube)" : (name || "?").replace(/^EXPERIMENT_/, "Experiment "); }
function renderTrades(trades) {
  $("trade-count").textContent = trades.length;
  $("trades-body").replaceChildren(...(trades.length ? trades.map((t) => el("tr", { tabindex: "0", onclick: () => openTrade(t.id), onkeydown: (k) => { if (k.key === "Enter") openTrade(t.id); } },
    el("td", { text: tFmt(t.exit_time) }), el("td", { class: "mono", text: t.symbol }),
    el("td", { title: t.strategy }, el("div", { text: t.setup || "—" }), el("div", { class: "muted small", text: strategyLabel(t.strategy) })),
    el("td", {}, el("span", { class: "side", text: t.direction.toUpperCase() })),
    el("td", { class: "num", text: num(t.entry) }), el("td", { class: "num", text: num(t.exit) }),
    el("td", {}, el("span", { class: "res " + t.result, text: t.result })),
    el("td", { class: "num " + signCls(t.net_pnl), text: money(t.net_pnl, { sign: true }) }),
    el("td", { class: "num", text: isNum(t.r) ? (t.r > 0 ? "+" : "") + t.r.toFixed(2) : "—" }),
    el("td", { text: t.exit_reason })))
    : [el("tr", { class: "empty-row" }, el("td", { colspan: 10, text: "No closed paper trades yet." }))]));
}

function statTable(rows, keyLabel) {
  return rows.map((g) => el("tr", {}, el("td", { text: keyLabel ? keyLabel(g.key) : g.key }),
    el("td", { class: "num", text: String(g.total_trades) }), el("td", { class: "num", text: pct(g.win_rate) }),
    el("td", { class: "num", text: g.profit_factor_infinite ? "∞" : isNum(g.profit_factor) ? g.profit_factor.toFixed(2) : "—" }),
    el("td", { class: "num " + signCls(g.net_pnl), text: money(g.net_pnl, { sign: true }) })));
}
function renderAnalytics(an, acct) {
  const eq = an.equity || [];
  drawLine($("equity-canvas"), $("equity-tip"), eq, { value: (p) => p.equity, color: css("--accent"), fill: css("--wash"), fmt: (v) => money(v, { dp: 0 }), baseline: acct.starting_balance, title: "Equity" });
  drawLine($("dd-canvas"), $("dd-tip"), eq, { value: (p) => p.drawdown, color: css("--critical"), fill: "rgba(208,59,59,0.12)", fmt: (v) => money(v, { dp: 0 }), baseline: 0, title: "Drawdown" });
  const w = acct.wins || 0, l = acct.losses || 0, b = acct.breakeven || 0, tot = w + l + b;
  const seg = (n, color) => (n ? el("span", { style: `flex:${n};background:${color}` }) : null);
  $("winloss").replaceChildren(
    el("div", { class: "winloss-bar", role: "img", "aria-label": `${w} wins, ${l} losses, ${b} breakeven` },
      tot ? [seg(w, css("--good")), seg(b, css("--text-muted")), seg(l, css("--critical"))] : el("span", { style: `flex:1;background:${css("--grid")}` })),
    el("div", { class: "wl-legend" },
      el("span", {}, el("i", { class: "sw", style: `background:${css("--good")}` }), "Wins ", el("b", { text: String(w) })),
      el("span", {}, el("i", { class: "sw", style: `background:${css("--critical")}` }), "Losses ", el("b", { text: String(l) })),
      el("span", {}, el("i", { class: "sw", style: `background:${css("--text-muted")}` }), "Breakeven ", el("b", { text: String(b) }))));
  $("setup-body").replaceChildren(...(an.by_setup.length ? statTable(an.by_setup) : [el("tr", { class: "empty-row" }, el("td", { colspan: 5, text: "—" }))]));
  $("dir-body").replaceChildren(...statTable(an.by_direction, (k) => k.toUpperCase()));
  drawBars($("recent-canvas"), $("recent-tip"), an.recent || []);
  const rs = an.recent_stats || {};
  const netR = (an.recent || []).reduce((s, t) => s + (isNum(t.r) ? t.r : 0), 0);
  $("recent-stats").replaceChildren(...[["Win rate", pct(rs.win_rate)], ["Net R", (netR >= 0 ? "+" : "") + netR.toFixed(2) + "R"], ["Net P&L", money((an.recent || []).reduce((s, t) => s + t.net_pnl, 0), { sign: true })]]
    .map(([k, v]) => el("div", { class: "tile" }, el("div", { class: "label", text: k }), el("div", { class: "v", text: v }))));
}

function renderMarket(m) {
  S.market = m;
  const has = m && m.candles && m.candles.length;
  $("market-empty").hidden = !!has;
  $("market-symbol").textContent = (m && m.symbol) || "—";
  const q = $("market-quality");
  q.textContent = has ? m.data_quality : "no data";
  q.className = "chip quality " + (has && m.data_quality === "OK" ? "ok" : "warn");
  q.title = has && m.issues.length ? "Validator findings: " + m.issues.join(", ") : "";
  $("market-last").textContent = has ? `last validated bar ${tFmt(m.last_bar)} ET · ${m.interval}` : "";
  if (has) drawMarket($("market-canvas"), $("market-tip"), m);
  else canvasCtx($("market-canvas"));
}

// ------------------------------------------------------------------ trade inspector
function kv(pairs) { return el("div", { class: "kv" }, pairs.map(([k, v]) => el("div", {}, el("span", { text: k }), el("span", { class: /^(ord|sig|fill|trd)_/.test(String(v)) ? "id" : null, text: v ?? "—" })))); }
function sect(title, ...kids) { return el("section", { class: "sect" }, el("h3", { text: title }), ...kids); }
async function openTrade(id) {
  const d = await getJSON("/api/trade/" + encodeURIComponent(id));
  if (d.error) return;
  S.trade = d;
  const t = d.trade, ev = d.evaluation, sig = d.signal || {};
  $("drawer-title").textContent = `${t.symbol} ${t.direction.toUpperCase()} · ${t.result.toUpperCase()} ${money(t.net_pnl, { sign: true })}`;
  $("drawer-sub").textContent = `${t.strategy} · ${t.setup} · entered ${tFmt(t.entry_time)} ET · exited ${tFmt(t.exit_time)} ET`;
  const drawerEl = $("drawer");
  drawerEl.classList.add("open"); drawerEl.setAttribute("aria-hidden", "false"); $("scrim").hidden = false;
  const conds = ev ? (ev.agents.signal_analyst.output.conditions_checked || []) : [];
  const entryOrder = d.orders.find((o) => o.setup_key) || d.orders[0];
  const exitOrder = d.orders.find((o) => o !== entryOrder && o.status === "filled");
  const sections = [
    sect("Result", kv([["Net P&L", money(t.net_pnl, { sign: true })], ["Gross P&L", money(t.gross_pnl, { sign: true })], ["Commission", money(t.commission)],
      ["Net R", isNum(t.r) ? t.r.toFixed(2) + "R" : "—"], ["Quantity", String(t.quantity)], ["Exit reason", t.exit_reason]])),
    sect("Strategy conditions (Agent 1)", conds.length ? el("ul", { class: "conds" }, conds.map((c) => el("li", {},
      el("span", { class: c.passed ? "ok" : "no", text: c.passed ? "✓" : "✕" }), el("span", { text: c.name.replaceAll("_", " ") }), el("span", { class: "d", text: c.detail }))))
      : el("div", { class: "muted small", text: "No evaluation stored for this trade." })),
  ];
  if (ev) {
    const agentsBox = el("div", { class: "agent-panel" });
    renderAgentsInto(agentsBox, { signal: { verdict: ev.agents.signal_analyst.output.decision, reason: ev.agents.signal_analyst.output.reason },
      risk: { verdict: ev.agents.risk_manager.output?.verdict, reason: ev.agents.risk_manager.output?.reason },
      execution: { verdict: ev.agents.execution_validator.output?.verdict, reason: ev.agents.execution_validator.output?.reason },
      outcome: ev.outcome, consensus_reason: ev.consensus?.reason }, ev, false);
    sections.push(sect("Three agent decisions · bar " + tFmt(ev.bar_time) + " ET", agentsBox));
  }
  sections.push(sect("Signal", kv([["Action", sig.action], ["Entry type", sig.entry_type], ["Entry", num(sig.price)], ["Stop", num(sig.stop)], ["Target", num(sig.target)], ["Signal bar", tFmt(sig.timestamp)]])));
  if (entryOrder) sections.push(sect("Paper order", kv([["Order", entryOrder.id], ["Side", entryOrder.side.toUpperCase()], ["Type", entryOrder.order_type.toUpperCase()],
    ["Quantity", String(entryOrder.quantity)], ["Limit", num(entryOrder.limit_price)], ["Stop", num(entryOrder.stop_loss)], ["Target", num(entryOrder.take_profit)],
    ["Status", entryOrder.status], ["Created", tFmt(entryOrder.created_at)], ["Filled", tFmt(entryOrder.filled_at)], ["Expiry", entryOrder.expires_after_bars ? entryOrder.expires_after_bars + " bars" : "—"]])));
  const fillRows = d.fills.map((f) => el("tr", {}, el("td", { text: tFmt(f.timestamp) }), el("td", { text: f.side.toUpperCase() }), el("td", { class: "num", text: String(f.quantity) }),
    el("td", { class: "num", text: num(f.reference_price) }), el("td", { class: "num", text: num(f.price) }), el("td", { class: "num", text: num(f.slippage) }), el("td", { class: "num", text: money(f.commission) })));
  sections.push(sect("Simulated fills", el("div", { class: "table-wrap" }, el("table", {}, el("thead", {}, el("tr", {}, ["Time", "Side", "Qty", "Reference", "Fill", "Slippage", "Commission"].map((h, i) => el("th", { class: i > 1 ? "num" : null, text: h })))), el("tbody", {}, fillRows)))));
  sections.push(sect("Exit", kv([["Reason", t.exit_reason], ["Exit price", num(t.exit)], ["Exit time", tFmt(t.exit_time)], ["Exit order", exitOrder ? exitOrder.id : "—"]])));
  $("drawer-sections").replaceChildren(...sections);
  requestAnimationFrame(() => { if (d.chart) drawMarket($("trade-canvas"), $("trade-tip"), d.chart, { onlyTrade: t.id }); else canvasCtx($("trade-canvas")); });
}
function closeDrawer() { $("drawer").classList.remove("open"); $("drawer").setAttribute("aria-hidden", "true"); $("scrim").hidden = true; S.trade = null; }

// ------------------------------------------------------------------ refresh loop
async function refresh() {
  try {
    const sym = S.symbol;
    const [ov, tr, an] = await Promise.all([getJSON("/api/overview"), getJSON("/api/trades"), getJSON("/api/analytics")]);
    S.overview = ov; S.trades = tr.trades; S.analytics = an;
    renderSymbols(ov.symbols);
    renderAccount(ov.account);
    renderPositions(ov.positions, ov.pending);
    renderTrades(tr.trades);
    renderAnalytics(an, ov.account);
    if (S.symbol) {
      const [m, dec] = await Promise.all([getJSON("/api/market?symbol=" + encodeURIComponent(S.symbol)), getJSON("/api/decisions?limit=30&symbol=" + encodeURIComponent(S.symbol))]);
      if (sym === S.symbol || !sym) { renderMarket(m); renderDecisions(dec.decisions); }
    } else { renderMarket(null); renderDecisions([]); }
    S.lastOk = new Date();
    $("live-dot").className = "live-dot ok";
    $("status-text").textContent = "updated " + S.lastOk.toLocaleTimeString("en-US", { hour12: false });
  } catch (err) {
    $("live-dot").className = "live-dot err";
    $("status-text").textContent = "connection lost — retrying" + (S.lastOk ? " (last update " + S.lastOk.toLocaleTimeString("en-US", { hour12: false }) + ")" : "");
  }
}
function redrawAll() {
  if (S.market && S.market.candles && S.market.candles.length) drawMarket($("market-canvas"), $("market-tip"), S.market);
  if (S.analytics && S.overview) renderAnalytics(S.analytics, S.overview.account);
  if (S.trade && S.trade.chart) drawMarket($("trade-canvas"), $("trade-tip"), S.trade.chart, { onlyTrade: S.trade.trade.id });
}

// theme
function applyTheme(t) { if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); }
try { applyTheme(localStorage.getItem("paperdesk-theme")); } catch (_) { /* storage unavailable */ }
$("theme-toggle").addEventListener("click", () => {
  const dark = document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "light" : "dark"; applyTheme(next);
  try { localStorage.setItem("paperdesk-theme", next); } catch (_) { /* ignore */ }
  redrawAll();
});
$("drawer-close").addEventListener("click", closeDrawer);
$("scrim").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
new ResizeObserver(() => redrawAll()).observe(document.body);
$("refresh-s").textContent = REFRESH_MS / 1000;
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
