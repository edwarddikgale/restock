import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1a73e8" }, // Google-style blue
    secondary: { main: "#34a853" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiContainer: { 
      defaultProps: { 
        maxWidth: "sm",
      } 
    },
    MuiPopover: {
      defaultProps: {
        container: typeof document !== "undefined" ? document.body : undefined,
      },
    },
    MuiModal: {
      defaultProps: {
        container: typeof document !== "undefined" ? document.body : undefined,
      },
    },
  },
});

export default theme;
