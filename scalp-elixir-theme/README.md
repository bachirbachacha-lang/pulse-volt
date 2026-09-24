# Scalp Elixir: Shopify theme

A bilingual (English and Arabic) single-product Shopify theme (Online Store 2.0) for the Scalp Elixir hair & scalp serum. The home page is the sales page: product and bundle picker at the top, then benefits, ingredients, how to use, a 90-day timeline, a comparison table, FAQ and a money-back guarantee banner.

Everything is editable in **Online Store → Themes → Customize**. No apps needed.

## Install (5 minutes)

1. Download `scalp-elixir-theme.zip` from this repo (on GitHub: open the file → **Download raw file**).
2. In Shopify admin: **Online Store → Themes → Add theme → Upload zip file**, and pick the zip.
3. Click **Customize** to preview it, then **Publish** when you're happy.

## Set up the product (this is what makes the bundle cards work)

In **Products → Add product**:

- **Title:** Scalp Elixir (or the name you want customers to see)
- **Media:** upload at least 4 to 6 photos: the bottle on a plain background first, then texture, someone applying it, and lifestyle shots. Square images (2048 × 2048) look best.
- **Variants:** add one option called **Bundle** with the values `1 Bottle`, `2 Bottles`, `3 Bottles`. Give each its own price. On the 2 and 3 bottle options, set **Compare-at price** to what that many single bottles would cost, so the "Save X%" badges show the real bundle saving.

  Example in SAR (check against your costs, shipping and ad spend):

  | Variant   | Price   | Compare-at |
  |-----------|---------|------------|
  | 1 Bottle  | 99 SAR  | (empty)    |
  | 2 Bottles | 179 SAR | 198 SAR    |
  | 3 Bottles | 239 SAR | 297 SAR    |

  Shortcut: import `scalp-elixir-product.csv` (in the repo root) under **Products → Import** and this product is created for you with these prices. Then just add the photos.

- **Description:** it shows in the "Description" tab on the product page.

The home page automatically shows your first product. To choose a specific one: **Customize → Product section → Product**.

Products with other kinds of options (like Size and Scent) fall back to normal dropdowns automatically.

## Arabic and English

The theme ships with every text on the site in both English and Arabic. Arabic pages read right to left and use Arabic fonts (Noto Naskh Arabic for headings, IBM Plex Sans Arabic for text). A language button (🌐 العربية / English) appears in the header, the mobile menu and the footer.

### Turn it on (2 minutes)

1. Shopify admin → **Settings → Languages → Add language → Arabic**.
2. Click **Publish** next to Arabic.

The language button appears as soon as Arabic is published. Shopify's checkout and order emails switch to Arabic automatically.

### Translate your product, menu and policies

The theme's own text is already translated. Things you type in Shopify admin (the product, the menu, your policies) need their Arabic version added once. Install the free **Translate & Adapt** app (by Shopify), open it, pick Arabic, and paste:

**Product**

- Title: `سكالب إليكسير – سيروم الشعر وفروة الرأس`
- Option name `Bundle`: `الباقة`
- Option values: `1 Bottle` → `عبوة واحدة`, `2 Bottles` → `عبوتان`, `3 Bottles` → `3 عبوات`
- Description:

  ```html
  <p>سكالب إليكسير سيروم نباتي خفيف يُدلَّك على فروة الرأس في ثوانٍ. يغذّي الجذور، ويهدّئ الجفاف والقشرة، ويساعد على تقليل التقصّف ليبدو شعرك أكثف وأكثر امتلاءً.</p>
  <ul><li>يغذّي فروة الرأس الجافة والمتهيّجة والمتقشّرة</li><li>يساعد على تقليل التقصّف لشعر يبدو أكثف</li><li>لا يترك ملمسًا دهنيًا ويُغسل بسهولة</li><li>مناسب لجميع أنواع الشعر، بما فيها المصبوغ</li></ul>
  <p><strong>طريقة الاستخدام:</strong> ضع 3 إلى 5 قطرات مباشرة على فروة الرأس مرة يوميًا، ودلّكها لمدة دقيقة إلى دقيقتين. لا حاجة للشطف. اختبر المنتج على جزء صغير من البشرة قبل أول استخدام بـ 24 ساعة.</p>
  <p>منتج تجميلي. تختلف النتائج من شخص لآخر.</p>
  ```

**Menu links:** Shop → `تسوّق`, How it works → `طريقة الاستخدام`, Ingredients → `المكوّنات`, FAQ → `الأسئلة الشائعة`, Contact → `تواصل معنا`

### Changing text later

- **English:** Online Store → Themes → **Customize**, as usual.
- **Arabic:** Online Store → Themes → **⋯ → Edit default theme content** → pick **Arabic** at the top, then search for the text you want to change. Everything on the home page is under **Content**.

So if you change a sentence in English, also update it in Arabic there.

### What's it called in Arabic?

The brand is written **سكالب إليكسير** (the English name, spelled in Arabic letters, the way most brands do it in Saudi Arabia). It shows as the logo text on Arabic pages. To use a different Arabic name, change `logo_text` under Content → header in Edit default theme content.

## Things to change before you launch

These are placeholders. Please check each one so everything on the site is true for your product. Each one exists in English and Arabic, so change both (see *Changing text later* above):

- **Ingredients:** the site lists rosemary, coconut oil and olive oil, taken from the supplier's photos (PURC Rosemary Hair Growth Essential Oil, 50 mL). Check the label on the bottle you receive and paste the full ingredient list into the "Ingredients" tab.
- **Guarantee:** the site promises a 30-day money-back guarantee. Make sure your refund policy (**Settings → Policies**) says the same, or change the text.
- **Free shipping:** the announcement bar and cart progress bar say free shipping over 150 SAR. Set the amount in **Customize → Theme settings → Cart**, and create the matching rate in **Settings → Shipping and delivery**.
- **Shipping times** in the FAQ: set them to what your supplier actually delivers.
- **Claims:** the copy is written as a cosmetic ("fuller-looking", "helps reduce breakage"). Don't add claims like "cures hair loss" or "regrows hair". Those are medical claims and can get your ads and payments blocked.

## Reviews

The **Customer reviews** section stays hidden until you add a review. Two options:

- Install **Judge.me** (free plan). Stars appear under the product title automatically, and you can add its widget to the reviews section.
- Or add real customer reviews by hand as blocks in the reviews section.

Only use real reviews. Made-up reviews break Shopify's terms and consumer protection law.

## Menus

The header uses the **main-menu** menu and the footer uses the **footer** menu (**Content → Menus**). Good home page links: `#benefits`, `#ingredients`, `#how-to-use`, `#results`, `#faq`. For example, link "How it works" to `/#how-to-use`.

## What's in the theme

| Folder | What's in it |
|--------|--------------|
| `layout/` | Page shell, fonts, SEO tags |
| `templates/index.json` | Home page: section order and all the copy |
| `templates/product.json` | Product page: same sections plus info tabs |
| `sections/main-product.liquid` | Gallery, bundle cards, add to cart, sticky mobile bar |
| `sections/*.liquid` | Every other section (all reusable from the editor) |
| `snippets/cart-drawer.liquid` + `assets/theme.js` | Slide-out cart with free shipping progress bar |
| `assets/theme.css` | All styling. Colors come from **Theme settings → Colors** |
| `locales/en.default.json`, `locales/ar.json` | All English and Arabic text |
| `snippets/language-switcher.liquid` | The English / العربية button |

Also included: working cart page, collection, search, blog, customer accounts, password page and gift card templates, plus product and FAQ structured data for Google.

The zip is built from this folder:

```bash
cd scalp-elixir-theme && zip -r ../scalp-elixir-theme.zip . -x README.md
```

Fonts: Fraunces, Inter, Noto Naskh Arabic and IBM Plex Sans Arabic (all SIL Open Font License), self-hosted in `assets/`.
