import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  FormLabel,
} from "@mui/material";
import { CATEGORIES, MEASURE_TYPES } from "../mockData";
import type { Product, ProductCriticality } from "../types";
import humanDate from "../../common/utils/date/humanDate";
import { fetchMyStores, type Store as StoreOption } from "../services/storesApi";
import { useAuth } from "../../auth/AuthContext";
import { formatInventoryHint } from "../utils/inventory";

export interface SectionOption {
  _id: string;
  name: string;
}

export interface ProductFormProps {
  value: Product;
  onChange: (p: Product) => void;
  onSubmit: () => void;
  submitLabel?: string;
  /** Sections (Spaces) the user can move this product into. Empty array hides the picker. */
  sections?: SectionOption[];
}

export const ProductForm: React.FC<ProductFormProps> = ({
  value,
  onChange,
  onSubmit,
  submitLabel = "Save",
  sections = [],
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

        {sections.length > 1 && (
          <TextField
            select
            label="Section"
            size="small"
            value={value.spaceId}
            onChange={(e) => update("spaceId", e.target.value)}
            SelectProps={{ native: true }}
            fullWidth
          >
            {sections.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </TextField>
        )}

        <TextField
          label="Synonym (optional)"
          size="small"
          value={value.synonym ?? ""}
          onChange={(e) => update("synonym", e.target.value)}
          fullWidth
        />

        <TextField
          select
          label="Category"
          size="small"
          value={value.category}
          onChange={(e) => update("category", e.target.value as any)}
          SelectProps={{ native: true }}
          fullWidth
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </TextField>

        <TextField
          select
          label="Measure Type"
          size="small"
          value={value.measureType}
          onChange={(e) => update("measureType", e.target.value as any)}
          SelectProps={{ native: true }}
          fullWidth
        >
          {MEASURE_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </TextField>

        <TextField
          label={`How many in ${value.measureType} is full?`}
          type="number"
          size="small"
          inputProps={{ min: 0, step: 1 }}
          value={value.defaultQuantity}
          onChange={(e) => update("defaultQuantity", Number(e.target.value))}
          fullWidth
        />

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

        {/* Criticality picker */}
        <Box>
          <FormLabel sx={{ fontSize: "0.82rem" }}>How important is this?</FormLabel>
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
            {(
              [
                { value: "critical", label: "Critical", tooltip: "Must always have. Included in the default digest." },
                { value: "normal",   label: "Normal",   tooltip: "Important but not urgent." },
                { value: "low",      label: "Optional", tooltip: "Default. Only in digest when 'All items' is enabled." },
              ] as { value: ProductCriticality; label: string; tooltip: string }[]
            ).map((o) => (
              <Tooltip key={o.value} title={o.tooltip} arrow disableInteractive>
                <Chip
                  label={o.label}
                  size="small"
                  variant={(value.criticality ?? "low") === o.value ? "filled" : "outlined"}
                  color={(value.criticality ?? "low") === o.value ? "primary" : "default"}
                  onClick={() => update("criticality", o.value)}
                  sx={{ cursor: "pointer" }}
                />
              </Tooltip>
            ))}
          </Stack>
        </Box>

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
