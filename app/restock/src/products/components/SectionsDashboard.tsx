import * as React from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySectionsSummary, type SectionSummary } from "../services/spacesApi";
import humanDate from "../../common/utils/date/humanDate";

const StatPill: React.FC<{
  label: string;
  count: number;
  color: "error" | "warning" | "success" | "default";
}> = ({ label, count, color }) => {
  const palette: Record<string, string> = {
    error: "error.main",
    warning: "warning.main",
    success: "success.main",
    default: "text.secondary",
  };
  return (
    <Stack direction="row" spacing={0.5} alignItems="baseline">
      <Typography variant="body2" sx={{ fontWeight: 700, color: palette[color] }}>
        {count}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
};

export const SectionsDashboard: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = React.useState<SectionSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySectionsSummary(() => firebaseUser.getIdToken())
      .then(setSections)
      .catch((e) => setError(e?.message || "Failed to load sections"));
  }, [firebaseUser]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    );
  }

  if (sections === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (sections.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
        No sections yet. Create one in Settings.
      </Typography>
    );
  }

  const openSection = (s: SectionSummary) => {
    navigate(`/?tab=list&sectionId=${encodeURIComponent(s._id)}`);
  };

  return (
    <Box sx={{ pb: 9 }}>
      <Stack spacing={1}>
        {sections.map((s) => (
          <Card key={s._id} variant="outlined">
            <CardActionArea onClick={() => openSection(s)}>
              <CardContent sx={{ py: 1.25, px: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: s.color || "primary.light",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.contrastText",
                    }}
                  >
                    <InventoryIcon fontSize="small" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {s.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.stats.items} {s.stats.items === 1 ? "item" : "items"}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mb: 0.5, flexWrap: "wrap", rowGap: 0.5 }}>
                  <StatPill label="running low" count={s.stats.runningLow} color="error" />
                  <StatPill label="on hand" count={s.stats.onHand} color="warning" />
                  <StatPill label="fully stocked" count={s.stats.fullyStocked} color="success" />
                </Stack>

                {s.lastActivity ? (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap" }}>
                    <Typography variant="caption" color="text.secondary">
                      Last activity:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {s.lastActivity.productName}
                    </Typography>
                    <Chip
                      label={humanDate(s.lastActivity.lastUpdatedOn)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.65rem", height: 18 }}
                    />
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No activity yet
                  </Typography>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};
