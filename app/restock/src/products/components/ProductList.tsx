import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Stack,
  Slider,
  Chip,
  TextField,
} from "@mui/material";
import { useProducts } from "../state/products";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySpaces, type Space } from "../services/spacesApi";
import { fetchMyStores, type Store as StoreOption } from "../services/storesApi";
import humanDate from "../../common/utils/date/humanDate";
import { formatInventoryHint } from "../utils/inventory";
import { RecentActivity } from "./RecentActivity";

const RUNNING_OUT_THRESHOLD = 25; // % at or below which a product counts as running out
const STORE_ANY = "__ANY_STORE__";

import "../styles/product-list.css";

function pctColor(pct: number) {
  if (pct >= 70) return "success.main";
  if (pct <= 25) return "error.main";
  return "warning.main";
}

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const category = params.get("category");
  const [query, setQuery] = React.useState("");
  const { products, loadBySpace, loading, error, update } = useProducts();
  const { firebaseUser } = useAuth();

  // Local override of percentageLeft while user drags so the slider stays
  // smooth even before the API responds. Keyed by product id.
  const [localPct, setLocalPct] = React.useState<Record<string, number>>({});

  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = React.useState<Space | null>(null);

  // Filters
  const [runningOutOnly, setRunningOutOnly] = React.useState(false);
  const [storeFilter, setStoreFilter] = React.useState<string>(STORE_ANY);
  const [storeOptions, setStoreOptions] = React.useState<StoreOption[]>([]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMyStores(() => firebaseUser.getIdToken())
      .then(setStoreOptions)
      .catch(() => setStoreOptions([]));
  }, [firebaseUser]);

  const sectionIdFromUrl = params.get("sectionId");

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

  // Load products whenever active space changes
  React.useEffect(() => {
    if (activeSpace) loadBySpace(activeSpace._id);
  }, [activeSpace, loadBySpace]);

  const filtered = products
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => (runningOutOnly ? p.percentageLeft <= RUNNING_OUT_THRESHOLD : true))
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

  const runningOutCount = products.filter((p) => p.percentageLeft <= RUNNING_OUT_THRESHOLD).length;

  if (loading) return <div>Loading products…</div>;
  if (error) return <div>{error}</div>;

  return (
    <Box>
      <RecentActivity />

      <Stack direction="row" spacing={1} sx={{ mb: 0.75 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
        <Chip
          size="small"
          label={runningOutCount > 0 ? `Running out (${runningOutCount})` : "Running out"}
          color={runningOutOnly ? "error" : "default"}
          variant={runningOutOnly ? "filled" : "outlined"}
          onClick={() => setRunningOutOnly((v) => !v)}
        />
        {storeOptions.length > 0 && (
          <>
            <Chip
              size="small"
              label="Any store"
              color={storeFilter === STORE_ANY ? "primary" : "default"}
              variant={storeFilter === STORE_ANY ? "filled" : "outlined"}
              onClick={() => setStoreFilter(STORE_ANY)}
            />
            {storeOptions.map((s) => (
              <Chip
                key={s._id}
                size="small"
                label={s.name}
                color={storeFilter === s.name ? "primary" : "default"}
                variant={storeFilter === s.name ? "filled" : "outlined"}
                onClick={() => setStoreFilter(s.name)}
              />
            ))}
          </>
        )}
      </Stack>

      {spaces.length > 1 && (
        <Stack direction="row" spacing={0.5} sx={{ mb: 0.75, flexWrap: "wrap" }}>
          {spaces.map((s) => (
            <Chip
              key={s._id}
              label={s.name}
              onClick={() => setActiveSpace(s)}
              color={activeSpace?._id === s._id ? "primary" : "default"}
              variant={activeSpace?._id === s._id ? "filled" : "outlined"}
              size="small"
            />
          ))}
        </Stack>
      )}

      <Stack spacing={0.75} sx={{ pb: 7 }}>
        {filtered.map((p) => {
          const pctRaw = localPct[p.id] ?? p.percentageLeft;
          const pct = Number.isFinite(pctRaw) ? pctRaw : 0;
          const trackColor = pctColor(pct);

          return (
            <Card key={p.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/product/${p.id}`)}>
                <CardContent sx={{ py: 0.75, px: 1.25 }}>
                  <Stack spacing={0.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        className="productName"
                        noWrap
                        title={p.name}
                        sx={{
                          lineHeight: 1.2,
                          color: p.percentageLeft === 0 ? "error.main" : "text.primary",
                          textDecoration: p.percentageLeft === 0 ? "line-through" : "none",
                          opacity: p.percentageLeft === 0 ? 0.75 : 1,
                        }}
                      >
                        {p.name}
                      </Typography>

                      {p.synonym && (
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                          aka {p.synonym}
                        </Typography>
                      )}

                      <Stack direction="row" gap={0.5} sx={{ mt: 0.25, flexWrap: "wrap", alignItems: "center" }}>
                        <Chip size="small" label={p.category} variant="outlined" />
                        <Chip label={`Updated ${humanDate(p.lastUpdatedOn)}`} className="updatedChip" />
                      </Stack>
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: -0.25 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                          {formatInventoryHint(p.name, p.measureType, p.defaultQuantity, pct) || "% left"}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.65rem" }}>
                          {Math.round(pct)}%
                        </Typography>
                      </Stack>

                      <Slider
                        value={pct}
                        aria-label="percentage left"
                        step={5}
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                        // Stop the click bubbling so the card doesn't navigate
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
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
                          height: 6,
                          py: 0,
                          "& .MuiSlider-track": { bgcolor: trackColor, border: "none" },
                          "& .MuiSlider-rail": { opacity: 0.22 },
                          "& .MuiSlider-thumb": {
                            width: 14,
                            height: 14,
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            No products found.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
