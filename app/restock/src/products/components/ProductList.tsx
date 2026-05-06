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
import humanDate from "../../common/utils/date/humanDate";

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
  const { products, loadBySpace, loading, error } = useProducts();
  const { firebaseUser } = useAuth();

  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = React.useState<Space | null>(null);

  // Load the user's spaces once on mount
  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken()).then((loaded) => {
      setSpaces(loaded);
      if (loaded.length > 0) setActiveSpace(loaded[0]);
    });
  }, [firebaseUser]);

  // Load products whenever active space changes
  React.useEffect(() => {
    if (activeSpace) loadBySpace(activeSpace._id);
  }, [activeSpace, loadBySpace]);

  const filtered = products
    .filter((p) => (category ? p.category === category : true))
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
      <Stack direction="row" spacing={1} sx={{ mb: 0.75 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
          const pct = Number.isFinite(p.percentageLeft) ? p.percentageLeft : 0;
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
                          % left
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.65rem" }}>
                          {Math.round(pct)}%
                        </Typography>
                      </Stack>

                      <Slider
                        value={pct}
                        disabled
                        aria-label="percentage left"
                        sx={{
                          height: 6,
                          py: 0,
                          "& .MuiSlider-track": { bgcolor: trackColor, border: "none" },
                          "& .MuiSlider-rail": { opacity: 0.22 },
                          "& .MuiSlider-thumb": { display: "none" },
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
