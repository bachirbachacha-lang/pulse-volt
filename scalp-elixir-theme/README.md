# Scalp Elixir: Shopify theme

A single-product Shopify theme (Online Store 2.0) for the Scalp Elixir hair & scalp serum. The home page is the sales page: product and bundle picker at the top, then benefits, ingredients, how to use, a 90-day timeline, a comparison table, FAQ and a money-back guarantee banner.

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
  | 1 Bottle  | 119 SAR | (empty)    |
  | 2 Bottles | 199 SAR | 238 SAR    |
  | 3 Bottles | 259 SAR | 357 SAR    |

- **Description:** it shows in the "Description" tab on the product page.

The home page automatically shows your first product. To choose a specific one: **Customize → Product section → Product**.

Products with other kinds of options (like Size and Scent) fall back to normal dropdowns automatically.

## Things to change before you launch

These are placeholders. Please check each one so everything on the site is true for your product:

- **Ingredients section:** the four cards (Rosemary, Ginger root, Biotin, Castor oil) are common ingredients in this type of serum. Replace them with what's actually on your bottle's label, and paste the full ingredient list into the "Ingredients" tab on the product page.
- **"Vegan", "Cruelty free", "Sulfate & paraben free":** keep these only if your supplier confirms them.
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

Also included: working cart page, collection, search, blog, customer accounts, password page and gift card templates, plus product and FAQ structured data for Google.

The zip is built from this folder:

```bash
cd scalp-elixir-theme && zip -r ../scalp-elixir-theme.zip . -x README.md
```

Fonts: Fraunces and Inter (SIL Open Font License), self-hosted in `assets/`.
