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
  Button,
  Stack,
} from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import {
  fetchProductHistory,
  type ProductHistoryEntry,
  type HistoryChange,
  type ProductHistorySource,
} from "../services/historyApi";
import humanDate from "../../common/utils/date/humanDate";

const PAGE_SIZE = 5;

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

const SOURCE_LABELS: Record<ProductHistorySource, string> = {
  human: "manual",
  receipt: "receipt",
  voice: "voice",
  text: "list",
  shopping: "shopping",
};

const SOURCE_COLORS: Record<
  ProductHistorySource,
  "default" | "info" | "success" | "warning"
> = {
  human: "default",
  receipt: "info",
  voice: "info",
  text: "info",
  shopping: "success",
};

function SourceChip({ entry }: { entry: ProductHistoryEntry }) {
  if (!entry.source) return null;
  const label = SOURCE_LABELS[entry.source] || entry.source;
  const color = SOURCE_COLORS[entry.source] || "default";
  const full = entry.store ? `${label} · ${entry.store}` : label;
  return (
    <Chip
      size="small"
      icon={entry.store ? <StorefrontOutlinedIcon sx={{ fontSize: 14 }} /> : undefined}
      label={full}
      color={color}
      variant="outlined"
      sx={{ fontSize: "0.65rem", height: 20, mt: 0.25 }}
    />
  );
}

function MetaLine({ entry }: { entry: ProductHistoryEntry }) {
  const bits: string[] = [];
  if (typeof entry.quantity === "number" && entry.quantity > 0) {
    bits.push(`qty ${entry.quantity}`);
  }
  if (typeof entry.price === "number" && entry.price > 0) {
    bits.push(`@ ${entry.price.toFixed(2)}`);
  }
  if (bits.length === 0) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
      {bits.join(" ")}
    </Typography>
  );
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
  const [entries, setEntries] = React.useState<ProductHistoryEntry[]>([]);
  const [page, setPage] = React.useState<number | null>(null); // null while we don't know
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busyMore, setBusyMore] = React.useState(false);

  const loadFirstPage = React.useCallback(async () => {
    if (!firebaseUser || !productId) return;
    setLoading(true);
    try {
      const next = await fetchProductHistory(productId, () => firebaseUser.getIdToken(), PAGE_SIZE);
      setEntries(next);
      setPage(1);
      // We can't know hasMore from this endpoint shape unless we got a full page back —
      // assume more exist when we got exactly PAGE_SIZE rows.
      setHasMore(next.length === PAGE_SIZE);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, productId]);

  React.useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const showMore = async () => {
    if (!firebaseUser || page === null) return;
    setBusyMore(true);
    try {
      // Fetch the next page; the API doesn't accept a `from` cursor so we
      // request the next sliced page and append.
      const url = page + 1;
      const more = await fetchProductHistory(
        productId,
        () => firebaseUser.getIdToken(),
        PAGE_SIZE * url // cumulative window — simpler than per-page paging on this endpoint
      );
      setEntries(more);
      setPage(url);
      setHasMore(more.length === PAGE_SIZE * url);
    } finally {
      setBusyMore(false);
    }
  };

  const showLess = () => {
    setEntries((prev) => prev.slice(0, PAGE_SIZE));
    setPage(1);
    setHasMore(true);
  };

  if (loading) {
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
    <>
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
                  <MetaLine entry={e} />
                  <SourceChip entry={e} />
                </TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>
                  <Typography variant="caption">{e.userName || "—"}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" justifyContent="center" sx={{ mt: 1.25 }}>
        {hasMore && (
          <Button size="small" onClick={showMore} disabled={busyMore}>
            {busyMore ? "Loading…" : "Show more"}
          </Button>
        )}
        {!hasMore && page !== null && page > 1 && (
          <Button size="small" onClick={showLess}>
            Show less
          </Button>
        )}
      </Stack>
    </>
  );
};
