import * as React from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Stack,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  ButtonBase,
  Tooltip,
} from "@mui/material";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import HomeIcon from "@mui/icons-material/Home";
import { useAuth } from "../auth/AuthContext";
import {
  fetchTenantMembers,
  updateTenant,
  removeTenantMember,
  type TenantWithMembers,
  type TenantMember,
  type TenantType,
  type CompanySize,
} from "../auth/tenantApi";
import humanDate from "../common/utils/date/humanDate";
import { requestDigestNow } from "../auth/notificationsApi";
import {
  fetchSentInvitations,
  createInvitation,
  revokeInvitation,
  type Invitation,
  type InvitationRole,
} from "../auth/invitationsApi";
import {
  fetchMyStores,
  createStore,
  updateStore,
  deleteStore,
  type Store,
} from "../products/services/storesApi";
import {
  fetchMySpaces,
  createSpace,
  updateSpace as updateSpaceApi,
  deleteSpace as deleteSpaceApi,
  type Space,
} from "../products/services/spacesApi";

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 3, mb: 1 }}>
    {children}
  </Typography>
);

/**
 * Weekday picker that renders the 7 days of the week as round, tappable
 * pills with a one-letter label, plus a row of preset shortcuts
 * (Weekdays / Weekends / Every day). Values are 0..6 where 0 = Sunday,
 * matching the existing storage convention on UserProfile.
 */
const WEEKDAYS: { value: number; letter: string; label: string }[] = [
  { value: 1, letter: "M", label: "Monday" },
  { value: 2, letter: "T", label: "Tuesday" },
  { value: 3, letter: "W", label: "Wednesday" },
  { value: 4, letter: "T", label: "Thursday" },
  { value: 5, letter: "F", label: "Friday" },
  { value: 6, letter: "S", label: "Saturday" },
  { value: 0, letter: "S", label: "Sunday" },
];

const WEEKDAYS_SET = [1, 2, 3, 4, 5];
const WEEKEND_SET = [0, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y).join(",");
  const sb = [...b].sort((x, y) => x - y).join(",");
  return sa === sb;
}

function summarizeDays(days: number[]): string {
  if (days.length === 0) return "No days selected";
  if (sameSet(days, EVERY_DAY)) return "Every day";
  if (sameSet(days, WEEKDAYS_SET)) return "Weekdays (Mon–Fri)";
  if (sameSet(days, WEEKEND_SET)) return "Weekends (Sat–Sun)";
  const ordered = [...days].sort((a, b) => {
    // Display ordering: Mon..Sun
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a) - order.indexOf(b);
  });
  const labels = ordered.map(
    (d) => WEEKDAYS.find((w) => w.value === d)?.label.slice(0, 3) || ""
  );
  return labels.join(", ");
}

const WeekdayPicker: React.FC<{
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const toggle = (day: number) => {
    if (disabled) return;
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day]
    );
  };
  const setPreset = (next: number[]) => {
    if (disabled) return;
    onChange(next);
  };

  const presets = [
    { label: "Weekdays", set: WEEKDAYS_SET },
    { label: "Weekends", set: WEEKEND_SET },
    { label: "Every day", set: EVERY_DAY },
  ];

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        sx={{ mb: 0.75 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Days to send
        </Typography>
        <Typography
          variant="caption"
          color={disabled ? "text.disabled" : "text.primary"}
          sx={{ fontWeight: 500 }}
        >
          {summarizeDays(value)}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ justifyContent: "space-between", mb: 1 }}
      >
        {WEEKDAYS.map((d) => {
          const selected = value.includes(d.value);
          return (
            <Tooltip key={d.value} title={d.label} arrow disableInteractive>
              <ButtonBase
                disabled={disabled}
                onClick={() => toggle(d.value)}
                aria-label={d.label}
                aria-pressed={selected}
                sx={(theme) => ({
                  flex: 1,
                  maxWidth: 44,
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  cursor: disabled ? "default" : "pointer",
                  transition: theme.transitions.create(
                    ["background-color", "color", "border-color", "transform", "box-shadow"],
                    { duration: 140 }
                  ),
                  border: "1.5px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "primary.main" : "transparent",
                  color: selected
                    ? "primary.contrastText"
                    : disabled
                    ? "text.disabled"
                    : "text.primary",
                  opacity: disabled ? 0.5 : 1,
                  boxShadow: selected ? 2 : 0,
                  "&:hover": disabled
                    ? {}
                    : {
                        bgcolor: selected ? "primary.dark" : "action.hover",
                        transform: "translateY(-1px)",
                      },
                  "&:active": disabled ? {} : { transform: "translateY(0)" },
                  "&:focus-visible": {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                  },
                })}
              >
                {d.letter}
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Stack>

      <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
        {presets.map((p) => {
          const active = sameSet(value, p.set);
          return (
            <Chip
              key={p.label}
              label={p.label}
              size="small"
              variant={active ? "filled" : "outlined"}
              color={active ? "primary" : "default"}
              onClick={() => setPreset(p.set)}
              disabled={disabled}
              sx={{ fontSize: "0.72rem", height: 24, cursor: disabled ? "default" : "pointer" }}
            />
          );
        })}
      </Stack>
    </Box>
  );
};

const COMPANY_SIZES: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

// A small, browser-native list of common timezones is fine for now;
// we can replace with Intl.supportedValuesOf("timeZone") on browsers that support it.
const COMMON_TIMEZONES = [
  "Africa/Johannesburg",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Madrid",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export const SettingsPage: React.FC = () => {
  const { firebaseUser, tenant: tenantFromCtx, userProfile, updateProfile } = useAuth();

  const getToken = React.useCallback(
    () => (firebaseUser ? firebaseUser.getIdToken() : Promise.resolve(null)),
    [firebaseUser]
  );

  // ------- My profile (display name + language) -------
  const [profileDisplayName, setProfileDisplayName] = React.useState("");
  const [profileLanguage, setProfileLanguage] = React.useState("en");
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [profileSaved, setProfileSaved] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProfileDisplayName(userProfile?.displayName || "");
    setProfileLanguage(userProfile?.language || "en");
  }, [userProfile?.displayName, userProfile?.language]);

  const saveProfile = async () => {
    setProfileBusy(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await updateProfile({
        displayName: profileDisplayName.trim(),
        language: profileLanguage,
      });
      setProfileSaved(true);
    } catch (e: any) {
      setProfileError(e?.message || "Failed to save");
    } finally {
      setProfileBusy(false);
    }
  };

  // ------- Notifications -------
  const browserTz = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Europe/Berlin";
    }
  }, []);
  const [notifyEmail, setNotifyEmail] = React.useState(true);
  const [notifyAtHour, setNotifyAtHour] = React.useState(16);
  const [notifyTimezone, setNotifyTimezone] = React.useState("Europe/Berlin");
  const [notifyDays, setNotifyDays] = React.useState<number[]>([1, 5]);
  const [notifyBusy, setNotifyBusy] = React.useState(false);
  const [notifySaved, setNotifySaved] = React.useState(false);

  React.useEffect(() => {
    setNotifyEmail(userProfile?.notifyEmail !== false);
    setNotifyAtHour(typeof userProfile?.notifyAtHour === "number" ? userProfile.notifyAtHour : 16);
    setNotifyTimezone(userProfile?.notifyTimezone || browserTz);
    setNotifyDays(
      Array.isArray(userProfile?.notifyDays) && userProfile!.notifyDays!.length > 0
        ? userProfile!.notifyDays!
        : [1, 5]
    );
  }, [
    userProfile?.notifyEmail,
    userProfile?.notifyAtHour,
    userProfile?.notifyTimezone,
    userProfile?.notifyDays,
    browserTz,
  ]);

  const saveNotifications = async () => {
    setNotifyBusy(true);
    setNotifySaved(false);
    try {
      await updateProfile({
        notifyEmail,
        notifyAtHour,
        notifyTimezone,
        notifyDays,
      });
      setNotifySaved(true);
    } catch (e: any) {
      setProfileError(e?.message || "Failed to save");
    } finally {
      setNotifyBusy(false);
    }
  };

  // ------- Send digest now (on-demand, rate-limited) -------
  const [digestNowBusy, setDigestNowBusy] = React.useState(false);
  const [digestNowResult, setDigestNowResult] = React.useState<{
    severity: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const handleSendDigestNow = async () => {
    setDigestNowBusy(true);
    setDigestNowResult(null);
    try {
      const res = await requestDigestNow(getToken);
      if (res.sent) {
        const remaining = res.remainingToday;
        setDigestNowResult({
          severity: "success",
          message: `Sent — check your inbox (${res.itemsCount} item${
            res.itemsCount === 1 ? "" : "s"
          }).${typeof remaining === "number" ? ` ${remaining} sends left today.` : ""}`,
        });
      } else {
        setDigestNowResult({
          severity: "info",
          message: res.message || "Nothing to send.",
        });
      }
    } catch (e: any) {
      setDigestNowResult({
        severity: "error",
        message: e?.message || "Could not send digest",
      });
    } finally {
      setDigestNowBusy(false);
    }
  };

  const formatHour = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr12}:00 ${period}`;
  };

  // ------- Tenant details + members -------
  const [tm, setTm] = React.useState<TenantWithMembers | null>(null);
  const [tenantError, setTenantError] = React.useState<string | null>(null);
  const [tenantBusy, setTenantBusy] = React.useState(false);
  const [tenantSaved, setTenantSaved] = React.useState(false);

  // editable tenant form state, hydrated from the auth context's tenant once
  const [tName, setTName] = React.useState("");
  const [tType, setTType] = React.useState<TenantType>("personal");
  const [tCountry, setTCountry] = React.useState("");
  const [tTimezone, setTTimezone] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [companyIndustry, setCompanyIndustry] = React.useState("");
  const [companyWebsite, setCompanyWebsite] = React.useState("");
  const [companySize, setCompanySize] = React.useState<CompanySize | "">("");
  const [companyTaxId, setCompanyTaxId] = React.useState("");

  React.useEffect(() => {
    const t: any = tenantFromCtx;
    if (!t) return;
    setTName(t.name || "");
    setTType((t.type as TenantType) || "personal");
    setTCountry(t.country || "");
    setTTimezone(t.timezone || "");
    setCompanyName(t.company?.companyName || "");
    setCompanyIndustry(t.company?.industry || "");
    setCompanyWebsite(t.company?.website || "");
    setCompanySize(t.company?.size || "");
    setCompanyTaxId(t.company?.taxId || "");
  }, [tenantFromCtx]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchTenantMembers(getToken)
      .then(setTm)
      .catch((e) => setTenantError(e?.message || "Failed to load tenant"));
  }, [firebaseUser, getToken]);

  const me = tm?.members.find((m) => m.isYou);
  const canManage = me?.role === "owner" || me?.role === "admin";
  const isOwner = me?.role === "owner";

  // ------- Remove-member confirm dialog state -------
  const [removingMember, setRemovingMember] = React.useState<TenantMember | null>(null);
  const [removeBusy, setRemoveBusy] = React.useState(false);
  const [removeError, setRemoveError] = React.useState<string | null>(null);

  const confirmRemove = (m: TenantMember) => {
    setRemoveError(null);
    setRemovingMember(m);
  };

  const executeRemove = async () => {
    if (!removingMember) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await removeTenantMember(removingMember.userId, getToken);
      setRemovingMember(null);
      const next = await fetchTenantMembers(getToken);
      setTm(next);
    } catch (e: any) {
      setRemoveError(e?.message || "Failed to remove member");
    } finally {
      setRemoveBusy(false);
    }
  };

  const saveTenant = async () => {
    setTenantBusy(true);
    setTenantError(null);
    setTenantSaved(false);
    try {
      const patch: any = {
        name: tName,
        type: tType,
        country: tCountry,
        timezone: tTimezone,
      };
      if (tType === "company") {
        patch.company = {
          companyName,
          industry: companyIndustry,
          website: companyWebsite,
          size: companySize || undefined,
          taxId: companyTaxId,
        };
      }
      await updateTenant(patch, getToken);
      setTenantSaved(true);
      // refresh members card so the displayed name updates
      const next = await fetchTenantMembers(getToken);
      setTm(next);
    } catch (e: any) {
      setTenantError(e?.message || "Failed to save");
    } finally {
      setTenantBusy(false);
    }
  };

  // ------- Invitations sent -------
  const [sentInvites, setSentInvites] = React.useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<InvitationRole>("member");
  const [inviteBusy, setInviteBusy] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  const reloadInvites = React.useCallback(async () => {
    if (!firebaseUser) return;
    try {
      setSentInvites(await fetchSentInvitations(getToken));
    } catch {
      // ignore
    }
  }, [firebaseUser, getToken]);

  React.useEffect(() => {
    reloadInvites();
  }, [reloadInvites]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteBusy(true);
    try {
      await createInvitation(inviteEmail.trim(), inviteRole, getToken);
      setInviteEmail("");
      setInviteRole("member");
      await reloadInvites();
    } catch (e: any) {
      setInviteError(e?.message || "Failed to invite");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id, getToken);
      await reloadInvites();
    } catch (e) {
      console.error(e);
    }
  };

  // ------- Sections (Spaces) -------
  const [sections, setSections] = React.useState<Space[]>([]);
  const [sectionError, setSectionError] = React.useState<string | null>(null);
  const [newSectionName, setNewSectionName] = React.useState("");
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = React.useState("");

  const reloadSections = React.useCallback(async () => {
    if (!firebaseUser) return;
    setSectionError(null);
    try {
      setSections(await fetchMySpaces(getToken));
    } catch (e: any) {
      setSectionError(e?.message || "Failed to load sections");
    }
  }, [firebaseUser, getToken]);

  React.useEffect(() => {
    reloadSections();
  }, [reloadSections]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSectionName.trim();
    if (!name) return;
    setSectionError(null);
    try {
      await createSpace({ name }, getToken);
      setNewSectionName("");
      await reloadSections();
    } catch (e: any) {
      setSectionError(e?.message || "Failed to add section");
    }
  };

  const startEditSection = (s: Space) => {
    setEditingSectionId(s._id);
    setEditingSectionName(s.name);
  };
  const cancelEditSection = () => {
    setEditingSectionId(null);
    setEditingSectionName("");
  };
  const saveEditSection = async (id: string) => {
    const name = editingSectionName.trim();
    if (!name) return;
    try {
      await updateSpaceApi(id, { name }, getToken);
      cancelEditSection();
      await reloadSections();
    } catch (e: any) {
      setSectionError(e?.message || "Failed to update section");
    }
  };
  const handleDeleteSection = async (id: string) => {
    setSectionError(null);
    try {
      await deleteSpaceApi(id, false, getToken);
      await reloadSections();
    } catch (e: any) {
      // Backend refuses if products exist — surface the friendly message
      setSectionError(e?.message || "Failed to delete section");
    }
  };

  // ------- Stores -------
  const [stores, setStores] = React.useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = React.useState(true);
  const [storesError, setStoresError] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");

  const reloadStores = React.useCallback(async () => {
    setStoresLoading(true);
    setStoresError(null);
    try {
      setStores(await fetchMyStores(getToken));
    } catch (e: any) {
      setStoresError(e?.message || "Failed to load stores");
    } finally {
      setStoresLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    if (firebaseUser) reloadStores();
  }, [firebaseUser, reloadStores]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setStoresError(null);
    try {
      const created = await createStore(name, getToken);
      setStores((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } catch (e: any) {
      setStoresError(e?.message || "Failed to add store");
    }
  };

  const startEdit = (s: Store) => {
    setEditingId(s._id);
    setEditingName(s.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };
  const saveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      const updated = await updateStore(id, name, getToken);
      setStores((prev) =>
        prev.map((s) => (s._id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
    } catch (e: any) {
      setStoresError(e?.message || "Failed to update store");
    }
  };
  const handleDeleteStore = async (id: string) => {
    try {
      await deleteStore(id, getToken);
      setStores((prev) => prev.filter((s) => s._id !== id));
    } catch (e: any) {
      setStoresError(e?.message || "Failed to delete store");
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Settings
      </Typography>

      {/* ------- My profile ------- */}
      <SectionHeading>My profile</SectionHeading>
      {profileError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {profileError}
        </Alert>
      )}
      {profileSaved && (
        <Alert severity="success" sx={{ mb: 1 }}>
          Saved.
        </Alert>
      )}
      <Stack spacing={1.25}>
        <TextField
          label="Display name"
          size="small"
          value={profileDisplayName}
          onChange={(e) => setProfileDisplayName(e.target.value)}
          placeholder={userProfile?.fullName ? `e.g. ${userProfile.fullName.split(" ")[0]}` : "Eddie"}
          helperText="Shown across the app — e.g. 'added by Eddie'. Leave blank to use your full name."
          fullWidth
        />
        <TextField
          select
          label="Language"
          size="small"
          value={profileLanguage}
          onChange={(e) => setProfileLanguage(e.target.value)}
          SelectProps={{ native: true }}
          helperText="Item names from receipt scans are returned in this language."
          fullWidth
        >
          <option value="en">English</option>
          <option value="de">Deutsch (German)</option>
          <option value="fr">Français (French)</option>
          <option value="es">Español (Spanish)</option>
          <option value="it">Italiano (Italian)</option>
          <option value="nl">Nederlands (Dutch)</option>
          <option value="pl">Polski (Polish)</option>
          <option value="pt">Português (Portuguese)</option>
          <option value="sv">Svenska (Swedish)</option>
          <option value="da">Dansk (Danish)</option>
          <option value="no">Norsk (Norwegian)</option>
          <option value="fi">Suomi (Finnish)</option>
          <option value="cs">Čeština (Czech)</option>
          <option value="tr">Türkçe (Turkish)</option>
        </TextField>
        <Box>
          <Button
            onClick={saveProfile}
            variant="contained"
            disabled={
              profileBusy ||
              (profileDisplayName === (userProfile?.displayName || "") &&
                profileLanguage === (userProfile?.language || "en"))
            }
          >
            {profileBusy ? <CircularProgress size={18} color="inherit" /> : "Save"}
          </Button>
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* ------- Notifications ------- */}
      <SectionHeading>Notifications</SectionHeading>
      {notifySaved && (
        <Alert severity="success" sx={{ mb: 1 }}>
          Notification preferences saved.
        </Alert>
      )}
      <Stack spacing={1.5}>
        <FormControlLabel
          control={
            <Switch
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Daily digest email
              </Typography>
              <Typography variant="caption" color="text.secondary">
                A summary of items running low in your workspace.
              </Typography>
            </Box>
          }
        />

        <TextField
          select
          label="Send at"
          size="small"
          value={notifyAtHour}
          onChange={(e) => setNotifyAtHour(parseInt(e.target.value, 10))}
          SelectProps={{ native: true }}
          disabled={!notifyEmail}
          fullWidth
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </TextField>

        {/* Weekday picker — circular day pills + preset shortcuts */}
        <WeekdayPicker
          value={notifyDays}
          onChange={setNotifyDays}
          disabled={!notifyEmail}
        />
        {notifyDays.length === 0 && notifyEmail && (
          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: -0.5 }}>
            No days selected — auto digest won't send. Use "Send digest now" or pick at least one day.
          </Typography>
        )}

        <Box sx={{ mt: 1.5 }} />

        <TextField
          label="Timezone"
          size="small"
          value={notifyTimezone}
          onChange={(e) => setNotifyTimezone(e.target.value)}
          placeholder="e.g. Europe/Berlin"
          disabled={!notifyEmail}
          helperText={
            notifyTimezone !== browserTz
              ? `Your browser is in ${browserTz}. Click to use it.`
              : "Detected from your browser."
          }
          fullWidth
        />
        {notifyTimezone !== browserTz && notifyEmail && (
          <Button size="small" onClick={() => setNotifyTimezone(browserTz)} sx={{ alignSelf: "flex-start" }}>
            Use {browserTz}
          </Button>
        )}

        <Box>
          <Button
            onClick={saveNotifications}
            variant="contained"
            disabled={
              notifyBusy ||
              (notifyEmail === (userProfile?.notifyEmail !== false) &&
                notifyAtHour === (userProfile?.notifyAtHour ?? 16) &&
                notifyTimezone === (userProfile?.notifyTimezone || browserTz) &&
                JSON.stringify(notifyDays) ===
                  JSON.stringify(userProfile?.notifyDays?.length ? userProfile.notifyDays : [1, 5]))
            }
          >
            {notifyBusy ? <CircularProgress size={18} color="inherit" /> : "Save notifications"}
          </Button>
        </Box>

        {/* Send now — on-demand digest, rate-limited server-side (5 per 24h) */}
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed", borderColor: "divider" }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            Send me a digest now
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Email yourself the current running-low list — handy right before a shop.
            Limited to 5 requests per day.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleSendDigestNow}
            disabled={digestNowBusy}
          >
            {digestNowBusy ? <CircularProgress size={16} /> : "Send digest now"}
          </Button>
          {digestNowResult && (
            <Alert severity={digestNowResult.severity} sx={{ mt: 1 }}>
              {digestNowResult.message}
            </Alert>
          )}
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* ------- Tenant header ------- */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <HomeIcon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>
              {tm?.tenant.name || tName || "Loading…"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {me ? `Your role: ${me.role}` : ""}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ------- Tenant details form (owner-only) ------- */}
      <SectionHeading>Tenant details</SectionHeading>

      {tenantError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {tenantError}
        </Alert>
      )}
      {tenantSaved && (
        <Alert severity="success" sx={{ mb: 1 }}>
          Saved.
        </Alert>
      )}

      <Stack spacing={1.5}>
        <TextField
          label="Tenant name"
          size="small"
          value={tName}
          onChange={(e) => setTName(e.target.value)}
          disabled={!isOwner}
          fullWidth
        />

        <TextField
          label="Country"
          placeholder="e.g. Germany, South Africa, United States"
          value={tCountry}
          onChange={(e) => setTCountry(e.target.value)}
          disabled={!isOwner}
          size="small"
          fullWidth
        />

        <FormControl fullWidth size="small" disabled={!isOwner}>
          <InputLabel id="tenant-tz">Timezone</InputLabel>
          <Select
            labelId="tenant-tz"
            label="Timezone"
            value={tTimezone || ""}
            onChange={(e) => setTTimezone(String(e.target.value))}
            displayEmpty
          >
            <MenuItem value="">
              <em>Not set</em>
            </MenuItem>
            {COMMON_TIMEZONES.map((tz) => (
              <MenuItem key={tz} value={tz}>
                {tz}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl disabled={!isOwner}>
          <Typography variant="body2" color="text.secondary">
            Tenant type
          </Typography>
          <RadioGroup
            row
            value={tType}
            onChange={(e) => setTType(e.target.value as TenantType)}
          >
            <FormControlLabel value="personal" control={<Radio size="small" />} label="Personal" />
            <FormControlLabel value="company" control={<Radio size="small" />} label="Company" />
          </RadioGroup>
        </FormControl>

        {tType === "company" && (
          <Stack spacing={1.5} sx={{ pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
            <TextField
              label="Company name"
              size="small"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={!isOwner}
              fullWidth
            />
            <TextField
              label="Industry"
              size="small"
              value={companyIndustry}
              onChange={(e) => setCompanyIndustry(e.target.value)}
              disabled={!isOwner}
              fullWidth
            />
            <TextField
              label="Website"
              size="small"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              disabled={!isOwner}
              fullWidth
            />
            <FormControl fullWidth size="small" disabled={!isOwner}>
              <InputLabel id="company-size">Company size</InputLabel>
              <Select
                labelId="company-size"
                label="Company size"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value as CompanySize | "")}
              >
                <MenuItem value="">
                  <em>Not set</em>
                </MenuItem>
                {COMPANY_SIZES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Tax / VAT ID"
              size="small"
              value={companyTaxId}
              onChange={(e) => setCompanyTaxId(e.target.value)}
              disabled={!isOwner}
              fullWidth
            />
          </Stack>
        )}

        {isOwner && (
          <Box>
            <Button onClick={saveTenant} variant="contained" disabled={tenantBusy}>
              {tenantBusy ? <CircularProgress size={18} color="inherit" /> : "Save tenant details"}
            </Button>
          </Box>
        )}
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* ------- Members ------- */}
      <SectionHeading>Members</SectionHeading>
      {!tm ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <List dense disablePadding>
          {tm.members.map((m) => {
            const canRemove = isOwner && !m.isYou && m.role !== "owner";
            const lastSeen = m.lastLoginAt ? humanDate(m.lastLoginAt) : "never";
            return (
              <ListItem
                key={m.userId}
                disableGutters
                secondaryAction={
                  canRemove ? (
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      onClick={() => confirmRemove(m)}
                      aria-label={`Remove ${m.preferredName || m.email}`}
                    >
                      <PersonOffOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : undefined
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: m.role === "owner" ? "primary.light" : "grey.400" }}>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: "wrap" }}>
                      <Typography variant="body2" fontWeight={500}>
                        {m.preferredName || m.fullName || m.email || m.userId}
                      </Typography>
                      {m.isYou && <Chip size="small" label="You" />}
                      <Chip
                        size="small"
                        label={m.role}
                        color={m.role === "owner" ? "primary" : "default"}
                        variant="outlined"
                      />
                    </Stack>
                  }
                  secondary={
                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      sx={{ flexWrap: "wrap" }}
                    >
                      {m.email && m.email !== m.fullName && (
                        <Typography variant="caption" color="text.secondary">
                          {m.email}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Last seen: {lastSeen}
                      </Typography>
                    </Stack>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}

      {/* Confirm remove member dialog */}
      <Dialog
        open={removingMember !== null}
        onClose={() => !removeBusy && setRemovingMember(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove member?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{removingMember?.preferredName || removingMember?.fullName || removingMember?.email}</strong>{" "}
            will lose access to
            this workspace. They'll need a new invitation to rejoin.
          </DialogContentText>
          {removeError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {removeError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemovingMember(null)} disabled={removeBusy}>
            Cancel
          </Button>
          <Button onClick={executeRemove} color="error" variant="contained" disabled={removeBusy}>
            {removeBusy ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------- Invite member ------- */}
      {canManage && (
        <>
          <SectionHeading>Invite a member</SectionHeading>
          {inviteError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {inviteError}
            </Alert>
          )}
          <Box component="form" onSubmit={handleInvite}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                placeholder="email@example.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                fullWidth
                required
              />
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as InvitationRole)}
                >
                  <MenuItem value="member">member</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" disabled={inviteBusy || !inviteEmail.trim()}>
                Invite
              </Button>
            </Stack>
          </Box>

          {sentInvites.filter((i) => i.status === "pending").length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary">
                Pending invitations
              </Typography>
              <List dense disablePadding>
                {sentInvites
                  .filter((i) => i.status === "pending")
                  .map((inv) => (
                    <ListItem
                      key={inv._id}
                      disableGutters
                      secondaryAction={
                        <IconButton size="small" onClick={() => handleRevoke(inv._id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={inv.invitedEmail}
                        secondary={`Role: ${inv.role}`}
                      />
                    </ListItem>
                  ))}
              </List>
            </>
          )}
        </>
      )}

      <Divider sx={{ my: 2 }} />

      {/* ------- Sections ------- */}
      <SectionHeading>Sections</SectionHeading>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Sections group your products (e.g. Food, Cleaning Products, Other).
      </Typography>

      {sectionError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {sectionError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleAddSection} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Add a section..."
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={!newSectionName.trim()}>
            Add
          </Button>
        </Stack>
      </Box>

      {sections.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No sections yet.
        </Typography>
      ) : (
        <List dense>
          {sections.map((s) => (
            <ListItem
              key={s._id}
              disableGutters
              secondaryAction={
                editingSectionId === s._id ? (
                  <>
                    <IconButton edge="end" size="small" onClick={() => saveEditSection(s._id)}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={cancelEditSection}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton edge="end" size="small" onClick={() => startEditSection(s)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={() => handleDeleteSection(s._id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </>
                )
              }
            >
              {editingSectionId === s._id ? (
                <TextField
                  size="small"
                  value={editingSectionName}
                  onChange={(e) => setEditingSectionName(e.target.value)}
                  autoFocus
                  fullWidth
                />
              ) : (
                <ListItemText primary={s.name} secondary={s.description || undefined} />
              )}
            </ListItem>
          ))}
        </List>
      )}

      <Divider sx={{ my: 2 }} />

      {/* ------- Stores ------- */}
      <SectionHeading>Preferred stores</SectionHeading>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Stores are shared across everyone in this tenant.
      </Typography>

      {storesError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {storesError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleAddStore} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Add a store..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={!newName.trim()}>
            Add
          </Button>
        </Stack>
      </Box>

      {storesLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : stores.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          No stores yet.
        </Typography>
      ) : (
        <List dense>
          {stores.map((s) => (
            <ListItem
              key={s._id}
              disableGutters
              secondaryAction={
                editingId === s._id ? (
                  <>
                    <IconButton edge="end" size="small" onClick={() => saveEdit(s._id)}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={cancelEdit}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton edge="end" size="small" onClick={() => startEdit(s)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={() => handleDeleteStore(s._id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </>
                )
              }
            >
              {editingId === s._id ? (
                <TextField
                  size="small"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  autoFocus
                  fullWidth
                />
              ) : (
                <ListItemText primary={s.name} />
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
