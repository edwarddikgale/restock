import * as React from "react";
import { Chip, Stack, Typography } from "@mui/material";
import { CATEGORIES } from "../mockData";
import { useNavigate } from "react-router-dom";

export const ProductCategories: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Categories
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            onClick={() => navigate(`/?tab=list&category=${encodeURIComponent(c)}`)}
            clickable
            variant="outlined"
          />
        ))}
      </Stack>
    </>
  );
};
