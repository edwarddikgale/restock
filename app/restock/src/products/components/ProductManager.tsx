import * as React from "react";
import { Routes, Route, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { ProductList } from "./ProductList";
import { ProductCategories } from "./ProductCategories";
import { ProductView } from "./ProductView";
import { ProductAdd } from "./ProductAdd";
import { ProductEdit } from "./ProductEdit";
import { SettingsPage } from "../../settings/SettingsPage";

export const ProductManager: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "list";

  // Pick the active bottom-nav based on the current route, falling back to the tab query.
  const activeNav = location.pathname.startsWith("/settings")
    ? "settings"
    : location.pathname.startsWith("/add")
    ? "add"
    : tab;

  return (
    <>
      <Routes>
        <Route path="/" element={tab === "categories" ? <ProductCategories /> : <ProductList />} />
        <Route path="/product/:id" element={<ProductView />} />
        <Route path="/product/:id/edit" element={<ProductEdit />} />
        <Route path="/add" element={<ProductAdd />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>

      <Paper sx={{ position: "fixed", left: 0, right: 0, bottom: 0 }} elevation={3}>
        <BottomNavigation value={activeNav} showLabels>
          <BottomNavigationAction
            label="List"
            value="list"
            icon={<ListAltOutlinedIcon />}
            onClick={() => navigate({ pathname: "/", search: "?tab=list" })}
          />
          <BottomNavigationAction
            label="Categories"
            value="categories"
            icon={<CategoryOutlinedIcon />}
            onClick={() => navigate({ pathname: "/", search: "?tab=categories" })}
          />
          <BottomNavigationAction
            label="Add"
            value="add"
            icon={<AddCircleOutlineIcon />}
            onClick={() => navigate("/add")}
          />
          <BottomNavigationAction
            label="Settings"
            value="settings"
            icon={<SettingsOutlinedIcon />}
            onClick={() => navigate("/settings")}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
};
