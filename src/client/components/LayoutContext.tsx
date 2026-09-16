import { createContext, useContext } from "react";

export interface LayoutContextValue {
  sidebarCollapsed: boolean;
  drawerOpen: boolean;
  toggleSidebar: () => void;
  setDrawerOpen: (open: boolean) => void;
}

export const LayoutContext = createContext<LayoutContextValue>({
  sidebarCollapsed: false,
  drawerOpen: false,
  toggleSidebar: () => {},
  setDrawerOpen: () => {},
});

export const useLayout = () => useContext(LayoutContext);
