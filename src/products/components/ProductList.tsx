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

const ALL = "__ALL__";
const HARDCODED_SPACE_ID = "6967a16e85d8be6485d2dfbc";

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
        {filtered.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardActionArea onClick={() => navigate(`/product/${p.id}`)}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {p.name}
                    </Typography>
                    {p.synonym && (
                      <Typography variant="caption" color="text.secondary">
                        aka {p.synonym}
                      </Typography>
                    )}
                    <Stack direction="row" gap={1} sx={{ mt: 0.5 }}>
                      <Chip size="small" label={p.category} variant="outlined" />
                    </Stack>
                  </Box>
                  <Box sx={{ minWidth: 140 }}>
                    <Typography variant="caption">% left</Typography>
                    <Slider size="small" value={p.percentageLeft} disabled aria-label="percentage left" />
                  </Box>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            No products match your filters.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
