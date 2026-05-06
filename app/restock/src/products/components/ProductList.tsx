import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  Typography,
  Stack,
  Slider,
  Chip,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useProducts } from "../state/products";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySpaces, type Space } from "../services/spacesApi";
import { fetchMyStores, type Store as StoreOption } from "../services/storesApi";
import humanDate from "../../common/utils/date/humanDate";
import { formatInventoryHint } from "../utils/inventory";
import { RecentActivity } from "./RecentActivity";

import "../styles/product-list.css";

type StockFilter = "all" | "low" | "mid" | "full";
const STORE_ANY = "__ANY_STORE__";

function pctColor(pct: number) {
  if (pct >= 75) return "success.main";
  if (pct <= 25) return "error.main";
  return "warning.main";
}

function bucket(pct: number): Exclude<StockFilter, "all"> {
  if (pct <= 25) return "low";
  if (pct >= 75) return "full";
  return "mid";
}

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const category = params.get("category");
  const sectionIdFromUrl = params.get("sectionId");

  const [query, setQuery] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [storeFilter, setStoreFilter] = React.useState<string>(STORE_ANY);

  const { products, loadBySpace, loading, error, update } = useProducts();
  const { firebaseUser } = useAuth();

  // Local override of percentageLeft while user drags so the slider stays
  // smooth even before the API responds. Keyed by product id.
  const [localPct, setLocalPct] = React.useState<Record<string, number>>({});

  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = React.useState<Space | null>(null);
  const [storeOptions, setStoreOptions] = React.useState<StoreOption[]>([]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMyStores(() => firebaseUser.getIdToken())
      .then(setStoreOptions)
      .catch(() => setStoreOptions([]));
  }, [firebaseUser]);

  // Load the user's spaces once on mount; honour sectionId from the URL
  // (deep-link from the Sections dashboard) when picking the initial active space.
  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken()).then((loaded) => {
      setSpaces(loaded);
      if (loaded.length === 0) return;
      const target =
        (sectionIdFromUrl && loaded.find((s) => s._id === sectionIdFromUrl)) || loaded[0];
      setActiveSpace(target);
    });
  }, [firebaseUser, sectionIdFromUrl]);

  React.useEffect(() => {
    if (activeSpace) loadBySpace(activeSpace._id);
  }, [activeSpace, loadBySpace]);

  // Counts for filter chip badges (computed before search/category to be useful)
  const stockCounts = React.useMemo(() => {
    const c = { low: 0, mid: 0, full: 0 };
    for (const p of products) c[bucket(p.percentageLeft)]++;
    return c;
  }, [products]);

  const filtered = products
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => (stockFilter === "all" ? true : bucket(p.percentageLeft) === stockFilter))
    .filter((p) =>
      storeFilter !== STORE_ANY ? p.preferredStores.includes(storeFilter) : true
    )
    .filter((p) =>
      query
        ? p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.synonym?.toLowerCase().includes(query.toLowerCase())
        : true
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading) return <Typography variant="body2">Loading products…</Typography>;
  if (error) return <Typography variant="body2" color="error">{error}</Typography>;

  return (
    <Box>
      <RecentActivity />

      {/* Search */}
      <TextField
        size="small"
        fullWidth
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 1 }}
      />

      {/* Stock-level filter — segmented, single source of truth */}
      <ToggleButtonGroup
        size="small"
        exclusive
        value={stockFilter}
        onChange={(_, v) => v && setStockFilter(v)}
        fullWidth
        sx={{ mb: 1, "& .MuiToggleButton-root": { fontSize: "0.72rem", py: 0.4 } }}
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="low">Low {stockCounts.low ? `(${stockCounts.low})` : ""}</ToggleButton>
        <ToggleButton value="mid">On hand {stockCounts.mid ? `(${stockCounts.mid})` : ""}</ToggleButton>
        <ToggleButton value="full">Full {stockCounts.full ? `(${stockCounts.full})` : ""}</ToggleButton>
      </ToggleButtonGroup>

      {/* Store filter — horizontally scrollable on phones */}
      {storeOptions.length > 0 && (
        <Box sx={{ overflowX: "auto", mx: -1, px: 1, mb: 1 }}>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "nowrap" }}>
            <Chip
              size="small"
              label="Any store"
              color={storeFilter === STORE_ANY ? "primary" : "default"}
              variant={storeFilter === STORE_ANY ? "filled" : "outlined"}
              onClick={() => setStoreFilter(STORE_ANY)}
              sx={{ flexShrink: 0 }}
            />
            {storeOptions.map((s) => (
              <Chip
                key={s._id}
                size="small"
                label={s.name}
                color={storeFilter === s.name ? "primary" : "default"}
                variant={storeFilter === s.name ? "filled" : "outlined"}
                onClick={() => setStoreFilter(s.name)}
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Section switcher — only when there's more than one */}
      {spaces.length > 1 && (
        <Box sx={{ overflowX: "auto", mx: -1, px: 1, mb: 1 }}>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "nowrap" }}>
            {spaces.map((s) => (
              <Chip
                key={s._id}
                label={s.name}
                onClick={() => setActiveSpace(s)}
                color={activeSpace?._id === s._id ? "primary" : "default"}
                variant={activeSpace?._id === s._id ? "filled" : "outlined"}
                size="small"
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Cards — compact, name+% on top row, slider, hint+date row */}
      <Stack spacing={0.5} sx={{ pb: 9 }}>
        {filtered.map((p) => {
          const pctRaw = localPct[p.id] ?? p.percentageLeft;
          const pct = Number.isFinite(pctRaw) ? pctRaw : 0;
          const trackColor = pctColor(pct);
          const isOut = p.percentageLeft === 0;

          const goToProduct = () => navigate(`/product/${p.id}`);

          return (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
              {/* Row 1: name + % — clickable for navigation */}
              <Box
                onClick={goToProduct}
                sx={{
                  px: 1.25,
                  pt: 0.75,
                  pb: 0.5,
                  cursor: "pointer",
                  "&:active": { bgcolor: "action.hover" },
                }}
              >
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography
                    variant="subtitle2"
                    noWrap
                    title={p.name}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: 600,
                      color: isOut ? "error.main" : "text.primary",
                      textDecoration: isOut ? "line-through" : "none",
                      opacity: isOut ? 0.7 : 1,
                    }}
                  >
                    {p.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: trackColor, flexShrink: 0 }}
                  >
                    {Math.round(pct)}%
                  </Typography>
                </Stack>
              </Box>

              {/* Row 2: slider — its own dedicated touch zone, NOT clickable for nav */}
              <Box sx={{ px: 1.25, py: 0.5 }}>
                <Slider
                  value={pct}
                  aria-label="percentage left"
                  step={5}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                  onChange={(_, v) =>
                    setLocalPct((prev) => ({ ...prev, [p.id]: v as number }))
                  }
                  onChangeCommitted={async (_, v) => {
                    const next = v as number;
                    try {
                      await update(p.id, { percentageLeft: next });
                    } finally {
                      setLocalPct((prev) => {
                        const { [p.id]: _omit, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  sx={{
                    height: 10,
                    py: 1.25, // bigger invisible touch target than the visual track
                    "& .MuiSlider-track": { bgcolor: trackColor, border: "none" },
                    "& .MuiSlider-rail": { opacity: 0.22 },
                    "& .MuiSlider-thumb": {
                      width: 18,
                      height: 18,
                      "&:hover, &.Mui-focusVisible": {
                        boxShadow: "0 0 0 8px rgba(0,0,0,0.06)",
                      },
                    },
                  }}
                />
              </Box>

              {/* Row 3: hint + relative time — also clickable for navigation */}
              <Box
                onClick={goToProduct}
                sx={{
                  px: 1.25,
                  pt: 0.5,
                  pb: 0.75,
                  cursor: "pointer",
                  "&:active": { bgcolor: "action.hover" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ flex: 1, minWidth: 0, fontSize: "0.7rem" }}
                  >
                    {formatInventoryHint(p.name, p.measureType, p.defaultQuantity, pct) ||
                      (p.synonym ? `aka ${p.synonym}` : p.category)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0, fontSize: "0.7rem" }}
                  >
                    {humanDate(p.lastUpdatedOn)}
                  </Typography>
                </Stack>
              </Box>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            No products match these filters.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
