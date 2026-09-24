/* Scalp Elixir theme script. No dependencies. */
(() => {
  const theme = window.theme || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const t = Object.assign({
    addToCart: 'Add to cart', soldOut: 'Sold out', unavailable: 'Unavailable', save: 'Save [percent]%',
    addError: 'Could not add to cart. Please try again.',
    shippingAway: "You're <strong>[amount]</strong> away from free shipping", shippingUnlocked: '<strong>You unlocked free shipping</strong>',
    empty: 'Your cart is empty.', shopNow: 'Shop now', remove: 'Remove', quantity: 'Quantity',
    decrease: 'Decrease quantity', increase: 'Increase quantity'
  }, theme.strings || {});
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Money ---------- */
  function formatMoney(cents, format = theme.moneyFormat || '${{amount}}') {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = Number(cents) || 0;
    const fmt = (n, decimals, thousands = ',', decimal = '.') => {
      const [whole, frac] = (n / 100).toFixed(decimals).split('.');
      return whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (frac ? decimal + frac : '');
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return fmt(value, 0);
        case 'amount_with_comma_separator': return fmt(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmt(value, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return fmt(value, 2, "'", '.');
        case 'amount_no_decimals_with_space_separator': return fmt(value, 0, ' ');
        case 'amount_with_space_separator': return fmt(value, 2, ' ', ',');
        default: return fmt(value, 2);
      }
    });
  }
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Announcement rotation ---------- */
  $$('[data-announcement]').forEach((bar) => {
    const items = $$('.announcement__item', bar);
    if (items.length < 2) return;
    let i = 0;
    setInterval(() => {
      items[i].classList.remove('is-active');
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }, 4000);
  });

  /* ---------- Mobile menu: close on link click / outside click ---------- */
  const menu = $('[data-menu-drawer]');
  if (menu) {
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  }

  /* ---------- Cart drawer ---------- */
  const drawer = $('[data-cart-drawer]');
  let lastFocus = null;

  function setCount(count) {
    $$('[data-cart-count]').forEach((el) => { el.textContent = count; el.hidden = count === 0; });
  }

  function renderCart(cart) {
    if (!drawer) return;
    setCount(cart.item_count);
    const body = $('[data-cart-items]', drawer);
    const foot = $('[data-cart-foot]', drawer);
    $('[data-cart-subtotal]', drawer).textContent = formatMoney(cart.total_price);
    foot.hidden = cart.item_count === 0;

    const threshold = Number(theme.freeShippingThreshold) || 0;
    const bar = $('[data-ship-bar]', drawer);
    if (bar && threshold > 0) {
      const remaining = threshold - cart.total_price;
      const pct = Math.min(100, (cart.total_price / threshold) * 100);
      $('[data-ship-fill]', bar).style.width = pct + '%';
      $('[data-ship-text]', bar).innerHTML = remaining > 0
        ? t.shippingAway.replace('[amount]', escapeHtml(formatMoney(remaining)))
        : t.shippingUnlocked;
    }

    if (cart.item_count === 0) {
      body.innerHTML = `<div class="cart-empty"><p>${escapeHtml(t.empty)}</p><a class="btn btn--dark" href="${theme.routes.root}#shop" data-cart-close>${escapeHtml(t.shopNow)}</a></div>`;
      return;
    }

    body.innerHTML = cart.items.map((item, index) => {
      const line = index + 1;
      const img = item.image ? `${item.image}${item.image.includes('?') ? '&' : '?'}width=160` : '';
      const variant = item.variant_title && !item.product_has_only_default_variant ? `<p class="drawer-item__variant">${escapeHtml(item.variant_title)}</p>` : '';
      const was = item.original_line_price > item.final_line_price ? `<s>${formatMoney(item.original_line_price)}</s>` : '';
      return `
        <div class="drawer-item" data-line="${line}">
          <a class="drawer-item__img" href="${item.url}">${img ? `<img src="${img}" alt="" width="80" height="80" loading="lazy">` : ''}</a>
          <div>
            <a class="drawer-item__title" href="${item.url}">${escapeHtml(item.product_title)}</a>
            ${variant}
            <div class="qty qty--drawer">
              <button type="button" data-line-change="${line}" data-qty="${item.quantity - 1}" aria-label="${escapeHtml(t.decrease)}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
              <input type="number" value="${item.quantity}" min="0" data-line-input="${line}" aria-label="${escapeHtml(t.quantity)}" inputmode="numeric">
              <button type="button" data-line-change="${line}" data-qty="${item.quantity + 1}" aria-label="${escapeHtml(t.increase)}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
            </div>
          </div>
          <div class="drawer-item__price">
            <strong>${formatMoney(item.final_line_price)}</strong>
            ${was}
            <button type="button" class="drawer-item__remove" data-line-change="${line}" data-qty="0">${escapeHtml(t.remove)}</button>
          </div>
        </div>`;
    }).join('');
  }

  async function fetchCart() {
    const res = await fetch(`${theme.routes.cart}.js`, { headers: { Accept: 'application/json' } });
    return res.json();
  }

  async function changeLine(line, quantity) {
    drawer.classList.add('is-busy');
    try {
      const res = await fetch(`${theme.routes.cartChange}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity: Math.max(0, quantity) })
      });
      const cart = await res.json();
      if (res.ok) renderCart(cart);
      else renderCart(await fetchCart());
    } finally {
      drawer.classList.remove('is-busy');
    }
  }

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.body.classList.add('no-scroll');
    $('.cart-drawer__panel', drawer).focus();
  }

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { drawer.hidden = true; }, 350);
    if (lastFocus) lastFocus.focus();
  }

  if (drawer && theme.routes) {
    document.addEventListener('click', async (e) => {
      const opener = e.target.closest('[data-cart-open]');
      if (opener && !document.body.classList.contains('template-cart')) {
        e.preventDefault();
        openDrawer();
        renderCart(await fetchCart());
        return;
      }
      if (e.target.closest('[data-cart-close]')) { closeDrawer(); return; }
      const change = e.target.closest('[data-line-change]');
      if (change) changeLine(Number(change.dataset.lineChange), Number(change.dataset.qty));
    });
    drawer.addEventListener('change', (e) => {
      const input = e.target.closest('[data-line-input]');
      if (input) changeLine(Number(input.dataset.lineInput), parseInt(input.value, 10) || 0);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    // Keep the cart in sync when the page is restored from the back/forward cache.
    window.addEventListener('pageshow', (e) => { if (e.persisted) fetchCart().then(renderCart); });
  }

  /* ---------- Product sections ---------- */
  $$('[data-product-section]').forEach((section) => {
    const form = $('[data-product-form]', section);
    const jsonEl = $('[data-product-json]', section);
    const data = jsonEl ? JSON.parse(jsonEl.textContent) : { variants: [] };
    const idInput = $('[data-variant-input]', section);
    const addBtn = $('[data-add-button]', section);
    const addLabel = addBtn ? $('[data-add-label]', addBtn) : null;
    const defaultLabel = addLabel ? addLabel.textContent.trim() : t.addToCart;
    const errorEl = $('[data-form-error]', section);
    const slides = $$('.product-gallery__slide', section);
    const thumbs = $$('[data-thumb]', section);
    const onProductPage = document.body.classList.contains('template-product');

    function showMedia(id) {
      if (!id) return;
      const target = slides.find((s) => s.dataset.mediaId === String(id));
      if (!target) return;
      slides.forEach((s) => s.classList.toggle('is-active', s === target));
      thumbs.forEach((t) => t.classList.toggle('is-active', t.dataset.thumb === String(id)));
    }
    thumbs.forEach((t) => t.addEventListener('click', () => showMedia(t.dataset.thumb)));

    function updateVariant(variant) {
      if (!variant) {
        if (addBtn) addBtn.disabled = true;
        if (addLabel) addLabel.textContent = t.unavailable;
        return;
      }
      idInput.value = variant.id;
      if (addBtn) addBtn.disabled = !variant.available;
      if (addLabel) addLabel.textContent = variant.available ? defaultLabel : t.soldOut;

      const now = $('[data-price-now]', section);
      const was = $('[data-price-was]', section);
      const badge = $('[data-price-badge]', section);
      if (now) now.textContent = formatMoney(variant.price);
      const onSale = variant.compare_at_price > variant.price;
      if (was) { was.hidden = !onSale; was.textContent = onSale ? formatMoney(variant.compare_at_price) : ''; }
      if (badge) {
        badge.hidden = !onSale;
        if (onSale) badge.textContent = t.save.replace('[percent]', Math.floor(((variant.compare_at_price - variant.price) * 100) / variant.compare_at_price));
      }
      const sticky = $('[data-sticky-price]', section);
      if (sticky) sticky.textContent = formatMoney(variant.price);

      showMedia(variant.media_id);
      if (onProductPage) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);
      }
    }

    $$('[data-offer]', section).forEach((radio) => {
      radio.addEventListener('change', () => {
        updateVariant(data.variants.find((v) => String(v.id) === radio.value));
      });
    });

    const selects = $$('[data-option-index]', section);
    selects.forEach((select) => {
      select.addEventListener('change', () => {
        const chosen = selects.map((s) => s.value);
        updateVariant(data.variants.find((v) => v.options.every((o, i) => o === chosen[i])));
      });
    });

    const qty = $('[data-qty]', section);
    if (qty) {
      const input = $('input', qty);
      $('[data-qty-minus]', qty).addEventListener('click', () => { input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1); });
      $('[data-qty-plus]', qty).addEventListener('click', () => { input.value = (parseInt(input.value, 10) || 1) + 1; });
    }

    if (form && drawer) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!addBtn || addBtn.disabled) return;
        errorEl.hidden = true;
        addBtn.classList.add('is-loading');
        addBtn.setAttribute('aria-busy', 'true');
        const formData = new FormData(form);
        // The bundle radios only drive the hidden variant id; don't send them to the cart.
        [...formData.keys()].filter((k) => k.startsWith('offer-')).forEach((k) => formData.delete(k));
        try {
          const res = await fetch(`${theme.routes.cartAdd}.js`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: formData
          });
          const result = await res.json();
          if (!res.ok) {
            errorEl.textContent = result.description || result.message || t.addError;
            errorEl.hidden = false;
            return;
          }
          openDrawer();
          renderCart(await fetchCart());
        } catch (err) {
          // Network or script failure: fall back to a normal form post so the sale still happens.
          form.submit();
        } finally {
          addBtn.classList.remove('is-loading');
          addBtn.removeAttribute('aria-busy');
        }
      });
    }

    // Sticky add-to-cart bar: visible once the main button scrolls out of view.
    const sticky = $('[data-sticky-atc]', section);
    if (sticky && addBtn && 'IntersectionObserver' in window) {
      sticky.hidden = false;
      let pastButton = false;
      let footerVisible = false;
      const sync = () => sticky.classList.toggle('is-visible', pastButton && !footerVisible);
      new IntersectionObserver(([entry]) => {
        pastButton = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        sync();
      }).observe(addBtn);
      const footer = $('.site-footer');
      if (footer) new IntersectionObserver(([entry]) => { footerVisible = entry.isIntersecting; sync(); }).observe(footer);
      $('[data-sticky-add]', sticky).addEventListener('click', () => {
        if (addBtn.disabled) { addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        form.requestSubmit ? form.requestSubmit(addBtn) : addBtn.click();
      });
    }
  });

  /* ---------- Reveal on scroll ---------- */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window && !window.Shopify?.designMode) {
    const targets = $$('.feature-card, .step, .point, .review, .comparison__table, .iwt__media, .cta-banner__card');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${(i % 4) * 70}ms`;
      io.observe(el);
    });
  }
})();
