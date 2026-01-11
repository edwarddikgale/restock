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
} from "@mui/material";
import { CATEGORIES, MEASURE_TYPES, STORE_OPTIONS, TENANTS } from "../mockData";
import type { Product } from "../types";

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
    >
      <Stack spacing={1.5}>
        <FormControl fullWidth>
          <InputLabel id="tenant-label">Tenant</InputLabel>
          <Select
            labelId="tenant-label"
            value={value.tenantId}
            label="Tenant"
            onChange={(e) => update("tenantId", e.target.value)}
            input={<OutlinedInput label="Tenant" />}
            size="small"
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
          <Chip label={`Created ${new Date(value.createdOn).toLocaleString()}`} variant="outlined" />
          <Chip label={`Updated ${new Date(value.lastUpdatedOn).toLocaleString()}`} />
        </Stack>

        <Button type="submit" variant="contained" size="large" sx={{ mt: 1 }}>
          {submitLabel}
        </Button>
      </Stack>
    </Box>
  );
};
