// Page UI: energy flavor switcher, prices, nutrition panels, shop and cart.
import { ENERGY, PRODUCTS, productById, money, FREE_SHIPPING_OVER } from './products.js';

const SWATCH = {
  arctic: '#2b93f0',
  solar: '#ff7a00',
  venom: '#9fe000',
  cherry: '#e8132f',
  night: '#ff2975',
  citrus: '#f5b400',
  mango: '#ff8a1f',
  berry: '#e0409a',
  watermelon: '#3fae4b',
};

let selectedEnergy = 'arctic';
export const getSelectedEnergy = () => selectedEnergy;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------------- Cart ---------------- */

const CART_KEY = 'pulse-cart-v1';
let cart = [];
try {
  cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]').filter((l) => productById(l.id));
} catch {
  cart = [];
}
const saveCart = () => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* storage unavailable: cart still works for this visit */
  }
};

function packOf(line) {
  const p = productById(line.id);
  return { product: p, pack: p.packs.find((k) => k.id === line.pack) || p.packs[0] };
}

function addToCart(id, packId) {
  const line = cart.find((l) => l.id === id && l.pack === packId);
  if (line) line.qty += 1;
  else cart.push({ id, pack: packId, qty: 1 });
  saveCart();
  renderCart();
  const { product, pack } = packOf({ id, pack: packId });
  toast(`Added ${product.name} ${pack.label.toLowerCase()} to your cart`);
}

function cartTotals() {
  let items = 0;
  let subtotal = 0;
  cart.forEach((l) => {
    const { pack } = packOf(l);
    items += l.qty;
    subtotal += pack.price * l.qty;
  });
  return { items, subtotal };
}

function renderCart() {
  const { items, subtotal } = cartTotals();
  $$('[data-cart-count]').forEach((el) => {
    el.textContent = items;
    el.hidden = items === 0;
  });
  const list = $('#cart-lines');
  if (!list) return;
  const checkoutMsg = $('#checkout-msg');
  if (checkoutMsg) checkoutMsg.textContent = '';
  if (!cart.length) {
    list.innerHTML = '<p class="cart-empty">Your cart is empty. Pick a flavor to get started.</p>';
  } else {
    list.innerHTML = cart
      .map((l, i) => {
        const { product, pack } = packOf(l);
        return `<li class="cart-line" style="--c:${SWATCH[l.id]}">
          <span class="dot" aria-hidden="true"></span>
          <div class="cart-info">
            <b>${esc(product.name)}</b>
            <small>${product.line === 'energy' ? 'Energy' : 'Sparkling'} · ${esc(pack.label)} · ${money(pack.price)}</small>
          </div>
          <div class="qty" role="group" aria-label="Quantity of ${esc(product.name)} ${esc(pack.label)}">
            <button type="button" data-qty="${i}" data-step="-1" aria-label="Remove one">−</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-qty="${i}" data-step="1" aria-label="Add one">+</button>
          </div>
          <span class="line-total">${money(pack.price * l.qty)}</span>
        </li>`;
      })
      .join('');
  }
  $('#cart-subtotal').textContent = money(subtotal);
  const left = Math.max(0, FREE_SHIPPING_OVER - subtotal);
  $('#ship-msg').textContent =
    left > 0 ? `Add ${money(left)} more for free shipping` : 'You unlocked free shipping';
  $('#ship-bar').style.setProperty('--p', `${Math.min(100, (subtotal / FREE_SHIPPING_OVER) * 100)}%`);
  $('#checkout').disabled = cart.length === 0;
}

function initCart() {
  const dialog = $('#cart');
  $$('[data-open-cart]').forEach((b) =>
    b.addEventListener('click', () => {
      renderCart();
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    })
  );
  $('#cart-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  $('#cart-lines').addEventListener('click', (e) => {
    const b = e.target.closest('[data-qty]');
    if (!b) return;
    const line = cart[+b.dataset.qty];
    line.qty += +b.dataset.step;
    if (line.qty <= 0) cart.splice(+b.dataset.qty, 1);
    saveCart();
    renderCart();
  });
  $('#checkout').addEventListener('click', () => {
    $('#checkout-msg').textContent =
      'Checkout opens at launch. Your cart is saved on this device, and we’ll email you when orders go live.';
  });
  renderCart();
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------------- Buy boxes ---------------- */

function buyBox(el, product, { compact = false } = {}) {
  const name = `pack-${el.dataset.buy}-${Math.random().toString(36).slice(2, 7)}`;
  el.innerHTML = `
    <fieldset class="packs">
      <legend class="sr-only">Pack size for ${esc(product.name)}</legend>
      ${product.packs
        .map(
          (k, i) => `<label><input type="radio" name="${name}" value="${k.id}" ${i === 0 ? 'checked' : ''} />
          <span>${compact ? (k.count === 1 ? '1 can' : `${k.count}-pk`) : esc(k.label)}</span></label>`
        )
        .join('')}
    </fieldset>
    <div class="buy-row">
      <p class="price"><b data-price></b><small data-each></small></p>
      <button class="btn" type="button" data-add>Add to cart</button>
    </div>`;
  const update = () => {
    const packId = $('input:checked', el).value;
    const k = product.packs.find((p) => p.id === packId);
    $('[data-price]', el).textContent = money(k.price);
    $('[data-each]', el).textContent = k.count > 1 ? `${money(k.price / k.count)} per can` : product.size;
  };
  el.addEventListener('change', update);
  $('[data-add]', el).addEventListener('click', () => addToCart(product.id, $('input:checked', el).value));
  update();
}

/* ---------------- Nutrition ---------------- */

function factsHTML(p) {
  return `
    <h4>Ingredients</h4>
    <p class="ingredients">${esc(p.ingredients)}</p>
    <h4>Nutrition <small>per ${esc(p.nutrition.per)}</small></h4>
    <dl class="nutrition">
      ${p.nutrition.rows
        .map(([k, v, sub]) => `<div${sub ? ' class="sub"' : ''}><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
        .join('')}
    </dl>
    ${p.nutrition.note ? `<p class="fine">${esc(p.nutrition.note)}</p>` : ''}`;
}

/* ---------------- Energy switcher ---------------- */

function setEnergy(id, { focus = false } = {}) {
  const f = ENERGY.find((e) => e.id === id);
  if (!f) return;
  selectedEnergy = id;
  const idx = ENERGY.indexOf(f);
  document.documentElement.style.setProperty('--flavor', f.accent);
  document.documentElement.style.setProperty('--flavor-2', f.accent2);
  $$('[data-e]').forEach((el) => {
    const k = el.dataset.e;
    if (k === 'index') el.textContent = `Energy · ${idx + 1} of ${ENERGY.length}`;
    else if (k === 'inside') el.textContent = `What's inside ${f.name}`;
    else el.textContent = f[k];
  });
  $$('.flavor-tabs button').forEach((b) => {
    const on = b.dataset.id === id;
    b.setAttribute('aria-pressed', on);
    if (on && focus) b.focus();
  });
  const buy = $('[data-buy="energy"]');
  if (buy) buyBox(buy, productById(id));
  const facts = $('[data-facts="energy"]');
  if (facts) facts.innerHTML = factsHTML(f);
}

function initEnergy() {
  const tabs = $('.flavor-tabs');
  if (!tabs) return;
  tabs.innerHTML = ENERGY.map(
    (f) => `<button type="button" data-id="${f.id}" style="--c:${SWATCH[f.id]}"><span class="dot" aria-hidden="true"></span>${esc(f.name)}</button>`
  ).join('');
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setEnergy(b.dataset.id);
  });
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = ENERGY.findIndex((f) => f.id === selectedEnergy);
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + ENERGY.length) % ENERGY.length;
    setEnergy(ENERGY[n].id, { focus: true });
    e.preventDefault();
  });
  $$('[data-energy-step]').forEach((b) =>
    b.addEventListener('click', () => {
      const i = ENERGY.findIndex((f) => f.id === selectedEnergy);
      const n = (i + +b.dataset.energyStep + ENERGY.length) % ENERGY.length;
      setEnergy(ENERGY[n].id);
    })
  );
  // Links like href="#energy" data-pick="venom" jump to the chapter with that flavor showing.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pick]');
    if (a) setEnergy(a.dataset.pick);
  });
  setEnergy(selectedEnergy);
}

/* ---------------- Shop ---------------- */

let thumbs = {};
const cardHTML = (p) => `<li class="card" style="--c:${SWATCH[p.id]}">
    <div class="card-shot">${
      thumbs[p.id]
        ? `<img src="${thumbs[p.id]}" alt="${esc(p.name)} can" width="300" height="420" />`
        : `<span class="card-swatch" aria-hidden="true"></span>`
    }</div>
    <p class="card-line">${p.line === 'energy' ? 'Energy' : 'Sparkling'} · ${esc(p.size)}</p>
    <h3>${esc(p.name)}</h3>
    <p class="card-notes">${esc(p.notes)}</p>
    <div class="buy" data-buy="${p.id}"></div>
    ${
      p.line === 'energy'
        ? `<a class="card-more" href="#inside" data-pick="${p.id}">Ingredients &amp; nutrition</a>`
        : `<a class="card-more" href="#${p.id}">Ingredients &amp; nutrition</a>`
    }
  </li>`;

function renderShop(filter = 'all') {
  const root = $('#shop-grid');
  if (!root) return;
  const groups = [
    { line: 'energy', title: 'Energy', sub: '500 mL · zero sugar · 160 mg caffeine' },
    { line: 'sparkling', title: 'Sparkling', sub: '330 mL · real fruit · caffeine free' },
  ].filter((g) => filter === 'all' || g.line === filter);
  root.innerHTML = groups
    .map(
      (g) => `<section class="shop-group" aria-label="${g.title}">
        <h3 class="group-title">${g.title} <small>${g.sub}</small></h3>
        <ul class="shop-grid">${PRODUCTS.filter((p) => p.line === g.line).map(cardHTML).join('')}</ul>
      </section>`
    )
    .join('');
  $$('.buy', root).forEach((el) => buyBox(el, productById(el.dataset.buy), { compact: true }));
}

function initShop() {
  const chips = $('.shop-filter');
  if (!chips) return;
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', chips).forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderShop(b.dataset.filter);
  });
  document.addEventListener('pulse:thumbs', (e) => {
    thumbs = e.detail;
    const active = $('button[aria-pressed="true"]', chips);
    renderShop(active ? active.dataset.filter : 'all');
  });
  renderShop();
}

/* ---------------- Sparkling chapters ---------------- */

function initSparkling() {
  $$('[data-buy]').forEach((el) => {
    const p = productById(el.dataset.buy);
    if (p && p.line === 'sparkling' && !el.closest('#shop-grid')) buyBox(el, p);
  });
  $$('[data-facts]').forEach((el) => {
    const p = productById(el.dataset.facts);
    if (p) el.innerHTML = factsHTML(p);
  });
}

/* ---------------- Notify form ---------------- */

function initNotify() {
  const form = $('.notify-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input[type=email]', form);
    const msg = $('.form-msg', form);
    if (!input.checkValidity()) {
      msg.textContent = 'Enter a valid email so we can reach you.';
      msg.dataset.state = 'error';
      input.focus();
      return;
    }
    msg.textContent = "You're on the list. We'll ping you at launch.";
    msg.dataset.state = 'ok';
    form.reset();
  });
}

// Give the nav a backdrop once the page scrolls under it.
function initNavBackdrop() {
  const nav = $('.nav');
  let on = false;
  const check = () => {
    const next = window.scrollY > 40;
    if (next !== on) nav.classList.toggle('scrolled', (on = next));
  };
  window.addEventListener('scroll', check, { passive: true });
  check();
}

export function initUI() {
  initNavBackdrop();
  initEnergy();
  initSparkling();
  initShop();
  initCart();
  initNotify();
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
}
