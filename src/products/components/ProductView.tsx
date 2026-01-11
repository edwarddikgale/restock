import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProducts } from "../state/products";
import { Box, Stack, Typography, Chip, Button } from "@mui/material";

export const ProductView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, remove } = useProducts();
  const p = products.find((x) => x.id === id);

  if (!p) return <Typography>Not found.</Typography>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {p.name}
      </Typography>

      <Stack direction="row" gap={1} sx={{ mb: 1 }}>
        <Chip label={p.category} />
        <Chip label={p.measureType} variant="outlined" />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Synonym: {p.synonym || "—"}
      </Typography>

      <Typography variant="body2" sx={{ mb: 1 }}>
        Preferred stores: {p.preferredStores.join(", ") || "—"}
      </Typography>

      <Typography variant="body2" sx={{ mb: 1 }}>
        Default quantity: {p.defaultQuantity}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Created: {new Date(p.createdOn).toLocaleString()}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Last updated: {new Date(p.lastUpdatedOn).toLocaleString()}
      </Typography>

      <Stack direction="row" spacing={1}>
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
    </Box>
  );
};
