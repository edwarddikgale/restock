import * as React from "react";
import { Alert, Stack, Button, Box, Typography } from "@mui/material";
import { useAuth } from "./AuthContext";
import {
  fetchPendingInvitations,
  respondToInvitation,
  type Invitation,
} from "./invitationsApi";

export const InvitationBanner: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [pending, setPending] = React.useState<Invitation[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const getToken = React.useCallback(
    () => (firebaseUser ? firebaseUser.getIdToken() : Promise.resolve(null)),
    [firebaseUser]
  );

  const reload = React.useCallback(async () => {
    if (!firebaseUser) return;
    try {
      setPending(await fetchPendingInvitations(getToken));
    } catch {
      // silent — banner just hides
    }
  }, [firebaseUser, getToken]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const respond = async (inv: Invitation, accept: boolean) => {
    setBusyId(inv._id);
    try {
      await respondToInvitation(inv._id, accept, getToken);
      setPending((prev) => prev.filter((p) => p._id !== inv._id));
      if (accept) {
        // Acceptance changes which tenant the user belongs to. Easiest way to
        // refresh the rest of the app's tenant-scoped state is a reload.
        window.location.reload();
      }
    } catch (e) {
      console.error("Invitation response failed", e);
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack spacing={1}>
        {pending.map((inv) => (
          <Alert
            key={inv._id}
            severity="info"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={busyId === inv._id}
                  onClick={() => respond(inv, true)}
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  disabled={busyId === inv._id}
                  onClick={() => respond(inv, false)}
                >
                  Reject
                </Button>
              </Stack>
            }
          >
            <Typography variant="body2">
              <strong>{inv.invitedByName}</strong> invited you to join{" "}
              <strong>{inv.tenantName}</strong> as <em>{inv.role}</em>.
            </Typography>
          </Alert>
        ))}
      </Stack>
    </Box>
  );
};
