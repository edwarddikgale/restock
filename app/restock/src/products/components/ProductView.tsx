import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProducts } from "../state/products";
import { Box, Stack, Typography, Chip, Button, Divider, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import humanDate from "../../common/utils/date/humanDate";
import { formatInventoryHint } from "../utils/inventory";
import { ProductHistoryTable } from "./ProductHistoryTable";

function stockColor(pct: number) {
  if (pct >= 75) return "success.main";
  if (pct <= 25) return "error.main";
  return "warning.main";
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="overline"
    color="text.secondary"
    sx={{ display: "block", lineHeight: 1.4, letterSpacing: 0.5 }}
  >
    {children}
  </Typography>
);

export const ProductView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, remove } = useProducts();
  const p = products.find((x) => x.id === id);

  if (!p) return <Typography>Not found.</Typography>;

  const pct = Number.isFinite(p.percentageLeft) ? p.percentageLeft : 0;

  return (
    <Box>
      {/* Back to list — uses browser history so the previous URL (with all
          filter params) is restored instead of a hard-navigated /. */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back" sx={{ ml: -1 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" color="text.secondary">
          Back to list
        </Typography>
      </Stack>

      {/* Header — name, optional synonym */}
      <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
        {p.name}
      </Typography>
      {p.synonym && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          aka {p.synonym}
        </Typography>
      )}

      <Stack direction="row" gap={0.75} sx={{ mt: 1, mb: 2.5, flexWrap: "wrap" }}>
        <Chip size="small" label={p.category} />
        <Chip size="small" label={p.measureType} variant="outlined" />
      </Stack>

      {/* Current stock — visual focal point */}
      <Box sx={{ mb: 2.5 }}>
        <Label>Current Stock</Label>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: stockColor(pct) }}>
            {Math.round(pct)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatInventoryHint(p.name, p.measureType, p.defaultQuantity, pct)}
          </Typography>
        </Stack>
      </Box>

      {/* Compact details */}
      <Stack spacing={1.25} sx={{ mb: 2.5 }}>
        <Box>
          <Label>Full at</Label>
          <Typography variant="body2">
            {p.defaultQuantity} {p.measureType}
          </Typography>
        </Box>

        {p.preferredStores.length > 0 && (
          <Box>
            <Label>Preferred stores</Label>
            <Stack direction="row" gap={0.5} sx={{ mt: 0.25, flexWrap: "wrap" }}>
              {p.preferredStores.map((s) => (
                <Chip key={s} size="small" label={s} variant="outlined" />
              ))}
            </Stack>
          </Box>
        )}

        {p.notes && (
          <Box>
            <Label>Notes</Label>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                pl: 1.25,
                borderLeft: "2px solid",
                borderColor: "divider",
                color: "text.primary",
              }}
            >
              {p.notes}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Subtle meta */}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        Created {humanDate(p.createdOn)} · Updated {humanDate(p.lastUpdatedOn)}
      </Typography>

      {/* Actions */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Button variant="contained" onClick={() => navigate(`/product/${p.id}/edit`)}>
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            remove(p.id);
            navigate("/");
          }}
        >
          Delete
        </Button>
      </Stack>

      <Divider sx={{ my: 1 }} />
      <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1, mb: 1 }}>
        Update history
      </Typography>
      <ProductHistoryTable productId={p.id} />
    </Box>
  );
};
