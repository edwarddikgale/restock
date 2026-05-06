import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Slider,
  Box,
  Stack,
  IconButton,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import type { Product } from "../types";
import { formatInventoryHint } from "../utils/inventory";

function stockColor(pct: number) {
  if (pct >= 75) return "success.main";
  if (pct <= 25) return "error.main";
  return "warning.main";
}

interface Props {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (id: string, percentageLeft: number) => Promise<void>;
}

export const StockEditDialog: React.FC<Props> = ({ open, product, onClose, onSave }) => {
  const [pct, setPct] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // Re-seed local state when the dialog opens with a new product
  React.useEffect(() => {
    if (open && product) setPct(product.percentageLeft);
  }, [open, product]);

  if (!product) return null;

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const bump = (delta: number) => setPct((v) => clamp(Math.round((v + delta) / 5) * 5));

  const save = async () => {
    setBusy(true);
    try {
      await onSave(product.id, pct);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 0.5 }}>
        {product.name}
        {product.synonym && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            aka {product.synonym}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Stack alignItems="center" spacing={0.5} sx={{ mt: 1, mb: 1.5 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: stockColor(pct), lineHeight: 1 }}>
            {pct}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatInventoryHint(product.name, product.measureType, product.defaultQuantity, pct)}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            onClick={() => bump(-5)}
            disabled={pct <= 0}
            size="small"
            sx={{ border: 1, borderColor: "divider" }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>

          <Slider
            value={pct}
            min={0}
            max={100}
            step={5}
            onChange={(_, v) => setPct(v as number)}
            sx={{
              flex: 1,
              height: 10,
              "& .MuiSlider-track": { bgcolor: stockColor(pct), border: "none" },
              "& .MuiSlider-thumb": { width: 22, height: 22 },
            }}
          />

          <IconButton
            onClick={() => bump(5)}
            disabled={pct >= 100}
            size="small"
            sx={{ border: 1, borderColor: "divider" }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Quick-set buttons for common values */}
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          {[0, 25, 50, 75, 100].map((v) => (
            <Button
              key={v}
              size="small"
              variant={pct === v ? "contained" : "outlined"}
              onClick={() => setPct(v)}
              sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: "0.7rem" }}
            >
              {v}%
            </Button>
          ))}
        </Stack>

        <Box sx={{ height: 8 }} />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={save} disabled={busy} variant="contained">
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
