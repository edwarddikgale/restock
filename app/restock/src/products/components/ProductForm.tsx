import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
} from "@mui/material";
import { CATEGORIES, MEASURE_TYPES } from "../mockData";
import type { Product } from "../types";
import humanDate from "../../common/utils/date/humanDate";
import { fetchMyStores, type Store as StoreOption } from "../services/storesApi";
import { useAuth } from "../../auth/AuthContext";
import { formatInventoryHint } from "../utils/inventory";

export interface ProductFormProps {
  value: Product;
  onChange: (p: Product) => void;
  onSubmit: () => void;
  submitLabel?: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  value,
  onChange,
  onSubmit,
  submitLabel = "Save",
}) => {
  const update = <K extends keyof Product>(key: K, v: Product[K]) =>
    onChange({ ...value, [key]: v });

  const { firebaseUser } = useAuth();
  const [storeOptions, setStoreOptions] = React.useState<StoreOption[]>([]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMyStores(() => firebaseUser.getIdToken())
      .then(setStoreOptions)
      .catch(() => setStoreOptions([]));
  }, [firebaseUser]);

  // Make sure any stores the product already has — even if not in the user's list — still show up.
  const renderedStores = React.useMemo(() => {
    const names = new Set(storeOptions.map((s) => s.name));
    const extras = value.preferredStores.filter((n) => !names.has(n));
    return [...storeOptions.map((s) => s.name), ...extras].sort((a, b) => a.localeCompare(b));
  }, [storeOptions, value.preferredStores]);

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      sx={{
        // Make space so the bottom button is not hidden behind bottom nav
        pb: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
    }}
    >
      <Stack spacing={1.5}>
        <TextField
          label="Name"
          size="small"
          value={value.name}
          onChange={(e) => update("name", e.target.value)}
          required
          fullWidth
        />

        <TextField
          label="Synonym (optional)"
          size="small"
          value={value.synonym ?? ""}
          onChange={(e) => update("synonym", e.target.value)}
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            value={value.category}
            label="Category"
            onChange={(e) => update("category", e.target.value as any)}
            size="small"
            MenuProps={{
              disableAutoFocusItem: true,
              slotProps: { paper: { sx: { maxHeight: 320 } } },
            }}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="measure-label">Measure Type</InputLabel>
          <Select
            labelId="measure-label"
            value={value.measureType}
            label="Measure Type"
            onChange={(e) => update("measureType", e.target.value as any)}
            size="small"
            MenuProps={{
              disableAutoFocusItem: true,
              slotProps: { paper: { sx: { maxHeight: 320 } } },
            }}
          >
            {MEASURE_TYPES.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2">Preferred purchase stores</Typography>
        {renderedStores.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No stores configured yet. Add some in Settings.
          </Typography>
        ) : (
          <FormGroup>
            {renderedStores.map((s) => (
              <FormControlLabel
                key={s}
                control={
                  <Checkbox
                    checked={value.preferredStores.includes(s)}
                    onChange={(e) => {
                      const current = new Set(value.preferredStores);
                      e.target.checked ? current.add(s) : current.delete(s);
                      update("preferredStores", Array.from(current));
                    }}
                  />
                }
                label={s}
              />
            ))}
          </FormGroup>
        )}

        <TextField
          label={`How many in ${value.measureType} is full?`}
          type="number"
          size="small"
          inputProps={{ min: 0, step: 1 }}
          value={value.defaultQuantity}
          onChange={(e) => update("defaultQuantity", Number(e.target.value))}
          fullWidth
        />

        <TextField
          label="Notes"
          size="small"
          multiline
          minRows={2}
          maxRows={6}
          value={value.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Brand preference, allergens, prep tips..."
          fullWidth
        />

        <Typography variant="body2">Percentage left: {value.percentageLeft}%</Typography>
        <Slider
          value={value.percentageLeft}
          onChange={(_, v) => update("percentageLeft", v as number)}
          valueLabelDisplay="auto"
          step={5}
          marks
          min={0}
          max={100}
        />
        {value.defaultQuantity > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {formatInventoryHint(
              value.name || "items",
              value.measureType,
              value.defaultQuantity,
              value.percentageLeft
            )}
          </Typography>
        )}

        <Divider />

        <Stack direction="row" gap={1}>
          <Tooltip title={new Date(value.createdOn).toLocaleString()}>
            <Chip label={`Created: ${humanDate(value.createdOn)}`} variant="outlined" />
          </Tooltip>
          <Tooltip title={new Date(value.lastUpdatedOn).toLocaleString()}>
            <Chip label={`Updated: ${humanDate(value.lastUpdatedOn)}`} />
          </Tooltip>
        </Stack>

        <Button type="submit" variant="contained" size="large" 
            sx={{
              mt: 1,
              position: "sticky",
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)", // keep above bottom nav
              zIndex: 1,
            }}>
          {submitLabel}
        </Button>
      </Stack>
    </Box>
  );
};
