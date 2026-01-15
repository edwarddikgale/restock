import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
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
import { CATEGORIES, MEASURE_TYPES, STORE_OPTIONS, TENANTS } from "../mockData";
import type { Product } from "../types";
import humanDate from "../../common/utils/date/humanDate";

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
        <FormControl fullWidth>
          <InputLabel id="tenant-label">Tenant</InputLabel>
          <Select
            labelId="tenant-label"
            value={value.tenantId ?? ""}
            label="Tenant"
            onChange={(e) => update("tenantId", e.target.value)}
            input={<OutlinedInput label="Tenant" />}
            size="small"
            displayEmpty
            MenuProps={{ disablePortal: true, disableScrollLock: true }}
          >
            {TENANTS.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
            displayEmpty
            MenuProps={{ disablePortal: true, disableScrollLock: true }}
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
            displayEmpty
            MenuProps={{ disablePortal: true, disableScrollLock: true }}
          >
            {MEASURE_TYPES.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2">Preferred purchase stores</Typography>
        <FormGroup>
          {STORE_OPTIONS.map((s) => (
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

        <TextField
          label="Default quantity"
          type="number"
          size="small"
          inputProps={{ min: 0, step: 1 }}
          value={value.defaultQuantity}
          onChange={(e) => update("defaultQuantity", Number(e.target.value))}
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
