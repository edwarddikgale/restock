import * as React from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Collapse,
  CircularProgress,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import RefreshIcon from "@mui/icons-material/Refresh";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchRecentHistory, type ProductHistoryEntry } from "../services/historyApi";
import humanDate from "../../common/utils/date/humanDate";

function summarizeChanges(entry: ProductHistoryEntry): string {
  if (!entry.changes || entry.changes.length === 0) return "updated";
  const pct = entry.changes.find((c) => c.field === "percentageLeft");
  if (pct) {
    const from = Math.round(Number(pct.from ?? 0));
    const to = Math.round(Number(pct.to ?? 0));
    return `% left ${from}→${to}`;
  }
  return entry.changes.map((c) => c.field).join(", ");
}

const ActivityRow: React.FC<{ entry: ProductHistoryEntry; onClick: () => void }> = ({
  entry,
  onClick,
}) => (
  <Box
    onClick={onClick}
    sx={{
      cursor: "pointer",
      fontSize: "0.78rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 1,
      py: 0.25,
      "&:hover": { textDecoration: "underline" },
    }}
  >
    <Box
      sx={{
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      <strong>{entry.productName}</strong>{" "}
      <Box component="span" sx={{ color: "text.secondary" }}>
        — {summarizeChanges(entry)}
      </Box>
    </Box>
    <Chip
      label={humanDate(entry.createdAt)}
      size="small"
      variant="outlined"
      sx={{ fontSize: "0.65rem", height: 20, flexShrink: 0 }}
    />
  </Box>
);

interface Props {
  limit?: number;
}

export const RecentActivity: React.FC<Props> = ({ limit = 5 }) => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = React.useState<ProductHistoryEntry[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    try {
      const next = await fetchRecentHistory(limit, () => firebaseUser.getIdToken());
      setEntries(next);
    } catch {
      // surface nothing — feed just stays as-is
    } finally {
      setRefreshing(false);
    }
  }, [firebaseUser, limit]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  if (entries.length === 0 && !refreshing) return null;

  const [first, ...rest] = entries;
  const moreCount = rest.length;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <HistoryIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flex: 1 }}>
          Recent activity
        </Typography>
        <IconButton
          size="small"
          onClick={reload}
          disabled={refreshing}
          aria-label="Refresh activity"
          sx={{ p: 0.5 }}
        >
          {refreshing ? (
            <CircularProgress size={14} />
          ) : (
            <RefreshIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
        {moreCount > 0 && (
          <IconButton
            size="small"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            sx={{ p: 0.5 }}
          >
            <KeyboardArrowDownIcon
              sx={{
                fontSize: 18,
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </IconButton>
        )}
      </Stack>

      {/* Always-visible: latest entry */}
      {first && <ActivityRow entry={first} onClick={() => navigate(`/product/${first.productId}`)} />}

      {/* Hint when there's more, only when collapsed */}
      {!expanded && moreCount > 0 && (
        <Box
          onClick={() => setExpanded(true)}
          sx={{
            cursor: "pointer",
            mt: 0.25,
            color: "primary.main",
            fontSize: "0.72rem",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Show {moreCount} more
        </Box>
      )}

      {/* Expanded entries with smooth animation */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Stack spacing={0} sx={{ mt: 0.25 }}>
          {rest.map((e) => (
            <ActivityRow key={e._id} entry={e} onClick={() => navigate(`/product/${e.productId}`)} />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};
