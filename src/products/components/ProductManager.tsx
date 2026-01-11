import * as React from "react";
import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { ProductList } from "./ProductList";
import { ProductCategories } from "./ProductCategories";
import { ProductView } from "./ProductView";
import { ProductAdd } from "./ProductAdd";
import { ProductEdit } from "./ProductEdit";

export const ProductManager: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "list";

  const onChange = (_: any, value: string) => {
    navigate({ pathname: "/", search: `?tab=${value}` });
  };

  return (
    <>
      <Routes>
        <Route path="/" element={tab === "categories" ? <ProductCategories /> : <ProductList />} />
        <Route path="/product/:id" element={<ProductView />} />
        <Route path="/product/:id/edit" element={<ProductEdit />} />
        <Route path="/add" element={<ProductAdd />} />
      </Routes>

      <Paper sx={{ position: "fixed", left: 0, right: 0, bottom: 0 }} elevation={3}>
        <BottomNavigation value={tab} onChange={onChange} showLabels>
          <BottomNavigationAction label="List" value="list" icon={<ListAltOutlinedIcon />} />
          <BottomNavigationAction label="Categories" value="categories" icon={<CategoryOutlinedIcon />} />
          <BottomNavigationAction
            label="Add"
            value="add"
            icon={<AddCircleOutlineIcon />}
            onClick={() => navigate("/add")}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
};
