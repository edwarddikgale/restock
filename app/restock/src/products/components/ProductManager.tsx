import * as React from "react";
import { Routes, Route, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { BottomNavigation, BottomNavigationAction, Paper, Badge } from "@mui/material";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { ProductList } from "./ProductList";
import { ProductCategories } from "./ProductCategories";
import { ProductView } from "./ProductView";
import { ProductAdd } from "./ProductAdd";
import { ProductEdit } from "./ProductEdit";
import { ShoppingPage } from "./ShoppingPage";
import { ShoppingHistoryPage } from "./ShoppingHistoryPage";
import { IntakePage } from "./IntakePage";
import { SettingsPage } from "../../settings/SettingsPage";
import { SectionsDashboard } from "./SectionsDashboard";
import { useShoppingList } from "../state/shopping";

export const ProductManager: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "list";

  // Live count of items left to buy (real-time via RTDB) — drives the cart badge
  const { list: shoppingList } = useShoppingList();
  const cartCount = shoppingList?.items.filter((i) => !i.checked).length ?? 0;

  const activeNav = location.pathname.startsWith("/sections")
    ? "sections"
    : location.pathname.startsWith("/shopping")
    ? "shopping"
    : location.pathname.startsWith("/settings")
    ? "settings"
    : location.pathname.startsWith("/add")
    ? "add"
    : tab;

  return (
    <>
      <Routes>
        <Route path="/" element={tab === "categories" ? <ProductCategories /> : <ProductList />} />
        <Route path="/sections" element={<SectionsDashboard />} />
        <Route path="/product/:id" element={<ProductView />} />
        <Route path="/product/:id/edit" element={<ProductEdit />} />
        <Route path="/add" element={<ProductAdd />} />
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/shopping/history" element={<ShoppingHistoryPage />} />
        <Route path="/intake" element={<IntakePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>

      <Paper sx={{ position: "fixed", left: 0, right: 0, bottom: 0, pb: "env(safe-area-inset-bottom, 0px)" }} elevation={3}>
        <BottomNavigation value={activeNav} showLabels>
          <BottomNavigationAction
            label="Sections"
            value="sections"
            icon={<GridViewOutlinedIcon />}
            onClick={() => navigate("/sections")}
          />
          <BottomNavigationAction
            label="List"
            value="list"
            icon={<ListAltOutlinedIcon />}
            onClick={() => navigate({ pathname: "/", search: "?tab=list" })}
          />
          <BottomNavigationAction
            label="Add"
            value="add"
            icon={<AddCircleOutlineIcon />}
            onClick={() => {
              const currentSectionId = params.get("sectionId");
              navigate(
                currentSectionId
                  ? `/add?sectionId=${encodeURIComponent(currentSectionId)}`
                  : "/add"
              );
            }}
          />
          <BottomNavigationAction
            label="Shopping"
            value="shopping"
            icon={
              <Badge badgeContent={cartCount} color="primary" max={99}>
                <ShoppingCartOutlinedIcon />
              </Badge>
            }
            onClick={() => navigate("/shopping")}
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
