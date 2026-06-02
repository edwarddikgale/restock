# Product criticality + shopping stock signals + digest tiers

Implementation plan for Sonnet. The increment touches four threads that share the same data shape (`criticality` on Product) so they are bundled.

## Goal

1. Let users mark how essential each product is to everyday life.
2. In the shopping list, surface how much of each item is *currently* left so the user can re-judge urgency at shopping time.
3. Backfill every existing product to the lowest criticality so the user opts items up manually.
4. Let users scope the daily digest to "only critical" (default) or "all running low".

## Key decisions (locked)

- **Criticality values.** Three-level enum stored on `Product.criticality`:
  - `critical` — must always have. Going to zero is a real problem (toilet paper, baby formula, daily meds).
  - `normal` — should have most of the time.
  - `low` — *default*. Nice to have, easily skipped.
  
  Rationale: matches the user's stated default ("mark all having low day-to-day criticality") and gives "most critical" a clean meaning for the digest (= `critical` only). Three buckets is the minimum that produces useful filtering without forcing users into binary choices on the UI.
  
- **Digest scope values.** Two-level enum stored on `UserProfile.digestScope`:
  - `critical` — default; only products with `criticality === "critical"` AND `percentageLeft <= LOW_THRESHOLD`.
  - `all` — every product with `percentageLeft <= LOW_THRESHOLD`, regardless of criticality.

- **Backfill strategy.** One-shot script + schema default. New products get `criticality: "low"` automatically; existing products are bulk-updated by the script on next deploy. The script is **idempotent** — it only writes to products that have no `criticality` field yet (no `{ $exists: false }`-aware update of already-set rows). See [scripts/backfillCriticality.ts](#backend-changes) below.

- **Shopping row stock display.** A small caption line under the product name, no color, just typography. Format:
  - `"2.4 / 6 L left · 40%"` when bought-measure matches product measureType.
  - `"40% left"` when there is no defaultQuantity to compute against.
  - Free-text shopping items (no `productId`) get no caption.
  
  Aligned right via `Stack justifyContent="space-between"` so the readout sits flush right of the row.

- **No criticality changes in receipt/voice/text intake.** Intake never sets criticality — only the dedicated edit form does. Receipts can refill or create products; the created product keeps the schema default `"low"`.

## Files Sonnet will touch

Use these as starting points. If a feature requires a file you don't see listed, grep first.

### Backend (api/restock-api submodule)

| File | Change |
| --- | --- |
| `models/product/IProduct.ts` | Add `criticality?: "critical" \| "normal" \| "low"` to the interface. |
| `models/schemas/product/Product.ts` | Add `criticality` field with enum `["critical","normal","low"]`, default `"low"`, `index: true` for digest queries. |
| `controllers/product/products.ts` | Accept `criticality` in `createProduct`/`updateProduct` (validate against the enum); add it to `TRACKED_FIELDS` so history rows show transitions. |
| `models/IUserProfile.ts` + `models/schemas/UserProfile.ts` | Add `digestScope?: "critical" \| "all"`, default `"critical"`. |
| `controllers/auth.ts` | `PATCH /api/auth/me` accepts and validates `digestScope`. |
| `services/digestService.ts` | When fetching low products, read the requesting user's `digestScope`. If `critical`, add `criticality: "critical"` to the Product query. |
| `scripts/backfillCriticality.ts` (new) | One-shot script: `Product.updateMany({ criticality: { $exists: false } }, { $set: { criticality: "low" } })`. Logs the count. Mirror the structure of `scripts/dailyDigest.ts` (env loader + mongoose connect). |
| `package.json` (backend) | Add `"job:backfill-criticality": "node dist/scripts/backfillCriticality.js"`. |

### Frontend (app/restock)

| File | Change |
| --- | --- |
| `src/products/services/productsApi.ts` (or wherever the Product type lives — find it) | Add `criticality?: "critical" \| "normal" \| "low"` to the Product type. |
| `src/products/components/ProductForm.tsx` | Add a criticality picker (3 chips, no dropdown) below measureType. Order: `critical · normal · low`. Default to current value or `"low"`. See "Criticality UX" below. |
| `src/products/components/ProductList.tsx` and `ProductView.tsx` | Show a small criticality marker next to the product name *only* when criticality is `critical` (a single `*` or star icon). Don't badge `normal` or `low` — too noisy. |
| `src/products/components/ShoppingPage.tsx` | For each line with a `productId`, render a right-aligned caption showing remaining stock. Use the existing product context (already loaded for the cart). No color. |
| `src/settings/SettingsPage.tsx` | In the Notifications section, after the Days picker and before Timezone, add a "Send" radio/toggle: "Critical items only" (default) vs "All low items". Save through the existing `updateProfile` call. |
| `src/auth/AuthContext.tsx` + `src/auth/tenantApi.ts` | Add `digestScope?: "critical" \| "all"` to `UserProfile`, `UserProfileFull`, `UserProfilePatch`. |

## Backend changes — detail

### 1. Product schema

```ts
// models/schemas/product/Product.ts
criticality: {
  type: String,
  enum: ["critical", "normal", "low"],
  default: "low",
  index: true, // digest query filters on this
},
```

```ts
// models/product/IProduct.ts
export type ProductCriticality = "critical" | "normal" | "low";
criticality?: ProductCriticality;
```

### 2. updateProduct validation

In `controllers/product/products.ts`:
- Add `"criticality"` to `TRACKED_FIELDS` so changes appear on the timeline.
- In `createProduct` / `updateProduct`, validate the incoming value against `["critical","normal","low"]`. Reject with 400 if invalid.

### 3. Backfill script

`scripts/backfillCriticality.ts` — copy the env-load + mongoose-connect boilerplate from `dailyDigest.ts`. Then:

```ts
const res = await Product.updateMany(
  { criticality: { $exists: false } },
  { $set: { criticality: "low" } }
);
console.log(`Backfilled ${res.modifiedCount} products to criticality=low`);
```

Idempotent — re-running is a no-op. Run once locally + once on Heroku post-deploy:
```
heroku run npm run job:backfill-criticality -a stokify-api
```

### 4. UserProfile.digestScope

```ts
// schemas/UserProfile.ts
digestScope: {
  type: String,
  enum: ["critical", "all"],
  default: "critical",
},
```

PATCH handler:
```ts
if (typeof req.body?.digestScope === "string") {
  const v = req.body.digestScope.trim();
  if (v === "critical" || v === "all") profile.set("digestScope", v);
}
```

### 5. digestService

In `services/digestService.ts` where it currently does:
```ts
const lowProducts = await Product.find({
  tenantId,
  percentageLeft: { $lte: LOW_THRESHOLD },
})
```

Thread the user's `digestScope` through `sendDigestForUser` to this query. The "Send digest now" controller and the cron path both go through this function, so adding the filter in one place covers both.

```ts
const scope = profile?.digestScope || "critical";
const query: any = { tenantId, percentageLeft: { $lte: LOW_THRESHOLD } };
if (scope === "critical") query.criticality = "critical";
```

Also include the criticality on each digest line item the email template renders — when "all" is chosen, group the critical items first.

## Frontend changes — detail

### Criticality UX in ProductForm

A 3-chip row, NOT a dropdown. Order is `critical · normal · low`. Selected chip is `variant="filled" color="primary"`, others `variant="outlined"`. Labels:

| Value | Label | Tooltip |
| --- | --- | --- |
| `critical` | "Critical" | Always keep stocked. Appears in the default digest. |
| `normal` | "Normal" | Important but not urgent. |
| `low` | "Optional" | Default. Only shown in the digest if you opt into "All low items". |

Display label is "Optional" even though the value is `"low"` — internally it's the bottom tier, but "Optional" reads better in UI than "Low criticality".

```tsx
<FormLabel>How important is this?</FormLabel>
<Stack direction="row" spacing={0.75}>
  {OPTIONS.map((o) => (
    <Chip
      key={o.value}
      label={o.label}
      variant={value === o.value ? "filled" : "outlined"}
      color={value === o.value ? "primary" : "default"}
      onClick={() => onChange(o.value)}
      size="small"
    />
  ))}
</Stack>
```

### Critical marker on product cards / view

In ProductList rows and ProductView header, render `<StarIcon fontSize="small" color="action" />` (or similar) inline with the name **only when** `criticality === "critical"`. Skip the marker for `normal` and `low`. Tooltip: "Critical item — must keep stocked".

No badges, no chips on the list — single subtle icon. The user explicitly said "no colors", so use `color="action"` (the default greyscale icon tone).

### Shopping cart stock readout

`ShoppingPage.tsx` already renders shopping list items. For each row with a `productId`:

1. Look up the product (the page must already have access — the cart context loads products).
2. Compute remaining absolute amount:
   ```ts
   const remainingAbs = (product.percentageLeft / 100) * product.defaultQuantity;
   ```
3. Render caption right-aligned within the row:
   ```
   2.4 / 6 L left · 40%
   ```
   Where `6` is `defaultQuantity`, `L` is the short form of measureType (`L`/`mL`/`kg`/`g`/`pack`/`unit`), and `40%` is `percentageLeft`.

   Format `remainingAbs` to at most one decimal. If `defaultQuantity` is missing or zero, fall back to just `40% left`.

4. Use `Typography variant="caption" color="text.secondary"` with `fontVariantNumeric: "tabular-nums"` so numbers align cleanly across rows.

5. Free-text rows (no `productId`) show no caption.

Layout sketch:
```
[checkbox] Bananas              2.4 / 6 kg left · 40%
[checkbox] Sourdough             1 / 2 packs left · 50%
[checkbox] Bring back wine                    (no caption)
```

### Settings digest scope

In `SettingsPage.tsx` Notifications section, after the Days picker:

```tsx
<Box>
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>
    Include in digest
  </Typography>
  <RadioGroup
    value={digestScope}
    onChange={(e) => setDigestScope(e.target.value as "critical" | "all")}
  >
    <FormControlLabel value="critical" control={<Radio size="small" />} label="Only critical items running low" />
    <FormControlLabel value="all" control={<Radio size="small" />} label="All items running low" />
  </RadioGroup>
</Box>
```

Wire into the existing `saveNotifications` call. Default state hydrates from `userProfile?.digestScope || "critical"`.

## Deployment order

1. Merge backend changes (schema + endpoints + digestService + backfill script). Backend deploys.
2. Run `heroku run npm run job:backfill-criticality -a <app>` once.
3. Merge frontend. Settings + ProductForm + ShoppingPage update.

This order matters so existing products don't display blank criticality before backfill.

## Test plan

### Backend
- [ ] Unit-ish: posting a product with `criticality: "critical"` saves it.
- [ ] Invalid value (e.g. `"foo"`) returns 400.
- [ ] Backfill script run twice: second run sets `modifiedCount === 0`.
- [ ] Manual: edit a product from `low` → `critical` and verify the change shows up in `ProductHistory`.
- [ ] Manual: with `digestScope === "critical"`, request `/api/digest/send-now` — only critical low items appear.
- [ ] Manual: switch to `digestScope === "all"`, send again — every low item appears.

### Frontend
- [ ] ProductForm shows the 3 chips, defaults to "Optional" for a new product.
- [ ] Editing an existing product preserves its current criticality.
- [ ] ProductList shows the star marker on critical items only.
- [ ] Shopping list shows the remaining-stock caption for every linked productId.
- [ ] Free-text shopping items show no caption.
- [ ] Settings has the new radio group; saving persists and re-loads correctly.

## Out of scope

- No bulk criticality editing in the UI (users do it product by product).
- No per-section criticality default — every new product is "low", regardless of section.
- No criticality-aware sorting of the product list (alphabetical/section ordering stays).
- No criticality on `ProductHistory.changes[]` field-level display upgrades beyond the existing diff renderer.
- No criticality on intake-created products beyond the schema default.

## Open questions

None — the user has confirmed:
- 3 tiers, default low
- digest binary (critical | all), default critical
- shopping cart shows both absolute and % with no colors
