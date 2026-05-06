import * as React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { fetchProductHistory, type ProductHistoryEntry, type HistoryChange } from "../services/historyApi";
import humanDate from "../../common/utils/date/humanDate";

function formatValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.join(", ");
  if (typeof v === "string" && v.length > 40) return v.slice(0, 40) + "…";
  return String(v);
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    percentageLeft: "% left",
    defaultQuantity: "Quantity at full",
    measureType: "Measure",
    preferredStores: "Preferred stores",
    notes: "Notes",
    name: "Name",
    synonym: "Synonym",
    category: "Category",
    spaceId: "Section",
  };
  return map[field] || field;
}

function ChangeCell({ change }: { change: HistoryChange }) {
  return (
    <Box sx={{ fontSize: "0.78rem", lineHeight: 1.3 }}>
      <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
        {fieldLabel(change.field)}:
      </Typography>{" "}
      <Box component="span" sx={{ color: "text.secondary" }}>
        {formatValue(change.from)}
      </Box>{" "}
      → <Box component="span">{formatValue(change.to)}</Box>
    </Box>
  );
}

interface Props {
  productId: string;
}

export const ProductHistoryTable: React.FC<Props> = ({ productId }) => {
  const { firebaseUser } = useAuth();
  const [entries, setEntries] = React.useState<ProductHistoryEntry[] | null>(null);

  React.useEffect(() => {
    if (!firebaseUser || !productId) return;
    fetchProductHistory(productId, () => firebaseUser.getIdToken())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [firebaseUser, productId]);

  if (entries === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        No update history yet.
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Table size="small" sx={{ "& td, & th": { py: 1, px: 1.25 } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "background.default" }}>
            <TableCell sx={{ width: 130, fontWeight: 600 }}>When</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Changes</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 110 }}>By</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e._id} hover>
              <TableCell sx={{ verticalAlign: "top" }}>
                <Chip label={humanDate(e.createdAt)} size="small" variant="outlined" />
              </TableCell>
              <TableCell sx={{ verticalAlign: "top" }}>
                {e.changes.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    no diff captured
                  </Typography>
                ) : (
                  e.changes.map((c, i) => <ChangeCell key={i} change={c} />)
                )}
              </TableCell>
              <TableCell sx={{ verticalAlign: "top" }}>
                <Typography variant="caption">{e.userName || "—"}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};
