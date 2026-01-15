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
  ToggleButton,
  ToggleButtonGroup,
  TextField,
} from "@mui/material";
import { useProducts } from "../state/products";
import { TENANTS } from "../mockData";
import humanDate from "../../common/utils/date/humanDate";

const ALL = "__ALL__";
const HARDCODED_SPACE_ID = "6967a16e85d8be6485d2dfbc";

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
  const [tenantFilter, setTenantFilter] = React.useState<string>(ALL);
  const { products, loadBySpace, loading, error } = useProducts();

  React.useEffect(() => {
    console.log("Calling loadBySpace", HARDCODED_SPACE_ID);
    loadBySpace(HARDCODED_SPACE_ID);
  }, [loadBySpace]);

  const filtered = products
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => (tenantFilter === ALL ? true : p.tenantId === tenantFilter))
    .filter((p) =>
      query
        ? p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.synonym?.toLowerCase().includes(query.toLowerCase())
        : true
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading) return <div>Loading products…</div>;
  if (error) return <div>{error}</div>;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Stack>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={tenantFilter}
        onChange={(_, v) => v && setTenantFilter(v)}
        sx={{ mb: 1, flexWrap: "wrap" }}
      >
        <ToggleButton value={ALL}>All</ToggleButton>
        {TENANTS.map((t) => (
          <ToggleButton key={t.id} value={t.id}>
            {t.name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Stack spacing={1} sx={{ pb: 7 }}>
        {filtered.map((p) => {
          const pct = Number.isFinite(p.percentageLeft) ? p.percentageLeft : 0;
          const trackColor = pctColor(pct);

          return (
            <Card key={p.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/product/${p.id}`)}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {p.name}
                      </Typography>

                      {p.synonym && (
                        <Typography variant="caption" color="text.secondary">
                          aka {p.synonym}
                        </Typography>
                      )}

                      <Stack direction="row" gap={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                        <Chip size="small" label={p.category} variant="outlined" />
                        <Chip
                          label={`Updated ${humanDate(p.lastUpdatedOn)}`}
                          sx={{
                            height: 22, // smaller than default (~75%)
                            fontSize: "0.7rem",
                            fontWeight: 500,
                            px: 0.75,
                            color: "text.secondary",
                            backgroundColor: (theme) =>
                              theme.palette.mode === "light"
                                ? "rgba(0, 0, 0, 0.04)"
                                : "rgba(255, 255, 255, 0.08)",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                            border: "none",
                            "& .MuiChip-label": {
                              px: 0.75,
                            },
                          }}
                        />

                      </Stack>
                    </Box>

                    <Box sx={{ minWidth: 160 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="caption" color="text.secondary">
                          % left
                        </Typography>
                        <Typography variant="caption" fontWeight={700}>
                          {Math.round(pct)}%
                        </Typography>
                      </Stack>

                      <Slider
                        size="small"
                        value={pct}
                        disabled
                        aria-label="percentage left"
                        sx={{
                          "& .MuiSlider-track": { bgcolor: trackColor },
                          "& .MuiSlider-rail": { opacity: 0.25 },
                          "& .MuiSlider-thumb": { display: "none" }, // optional: cleaner for read-only
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
            No products match your filters.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
