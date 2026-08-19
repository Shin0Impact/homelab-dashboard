import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"];

const loadInitialSettings = () => {
  try {
    const savedCat = localStorage.getItem("homelab_categories");
    const savedTheme = localStorage.getItem("homelab_theme");
    const savedServices = localStorage.getItem("homelab_custom_services");
    const legacyAmoled = localStorage.getItem("homelab_amoled") === "true";

    let initialTheme = savedTheme || "default";
    if (!savedTheme && legacyAmoled) {
      initialTheme = "amoled";
    }

    return {
      categories: savedCat ? JSON.parse(savedCat) : DEFAULT_CATEGORIES,
      compact: localStorage.getItem("homelab_compact") === "true",
      theme: initialTheme,
      refresh: Number(localStorage.getItem("homelab_refresh")) || 10,
      customServices: savedServices ? JSON.parse(savedServices) : [],
    };
  } catch {
    return {
      categories: DEFAULT_CATEGORIES,
      compact: false,
      theme: "default",
      refresh: 10,
      customServices: [],
    };
  }
};

const settingsSlice = createSlice({
  name: "settings",
  initialState: loadInitialSettings(),
  reducers: {
    setSettings: (state, action) => {
      const { categories, compact, theme, amoled, refresh, customServices } =
        action.payload;
      if (categories) {
        state.categories = categories;
        localStorage.setItem("homelab_categories", JSON.stringify(categories));
      }
      if (compact !== undefined) {
        state.compact = compact;
        localStorage.setItem("homelab_compact", compact);
      }
      if (theme !== undefined) {
        state.theme = theme;
        localStorage.setItem("homelab_theme", theme);
      } else if (amoled !== undefined) {
        state.theme = amoled ? "amoled" : "default";
        localStorage.setItem("homelab_theme", state.theme);
      }
      if (refresh !== undefined) {
        state.refresh = refresh;
        localStorage.setItem("homelab_refresh", refresh);
      }
      if (customServices !== undefined) {
        state.customServices = customServices;
        localStorage.setItem(
          "homelab_custom_services",
          JSON.stringify(customServices),
        );
      }
    },
    setCustomServices: (state, action) => {
      state.customServices = action.payload;
      localStorage.setItem(
        "homelab_custom_services",
        JSON.stringify(action.payload),
      );
    },
    addCustomService: (state, action) => {
      state.customServices.push(action.payload);
      localStorage.setItem(
        "homelab_custom_services",
        JSON.stringify(state.customServices),
      );
    },
    removeCustomService: (state, action) => {
      state.customServices = state.customServices.filter(
        (s) => s.id !== action.payload,
      );
      localStorage.setItem(
        "homelab_custom_services",
        JSON.stringify(state.customServices),
      );
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
      localStorage.setItem(
        "homelab_categories",
        JSON.stringify(action.payload),
      );
    },
    addCategory: (state, action) => {
      if (action.payload && !state.categories.includes(action.payload)) {
        state.categories.push(action.payload);
        localStorage.setItem(
          "homelab_categories",
          JSON.stringify(state.categories),
        );
      }
    },
    removeCategory: (state, action) => {
      state.categories = state.categories.filter((c) => c !== action.payload);
      localStorage.setItem(
        "homelab_categories",
        JSON.stringify(state.categories),
      );
    },
    setCompact: (state, action) => {
      state.compact = action.payload;
      localStorage.setItem("homelab_compact", action.payload);
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem("homelab_theme", action.payload);
    },
    setRefresh: (state, action) => {
      state.refresh = action.payload;
      localStorage.setItem("homelab_refresh", action.payload);
    },
    resetSettings: (state) => {
      state.categories = DEFAULT_CATEGORIES;
      state.compact = false;
      state.theme = "default";
      state.refresh = 10;
      state.customServices = [];
      localStorage.removeItem("homelab_categories");
      localStorage.removeItem("homelab_compact");
      localStorage.removeItem("homelab_theme");
      localStorage.removeItem("homelab_amoled");
      localStorage.removeItem("homelab_refresh");
      localStorage.removeItem("homelab_custom_services");
    },
  },
});

export const {
  setSettings,
  setCustomServices,
  addCustomService,
  removeCustomService,
  setCategories,
  addCategory,
  removeCategory,
  setCompact,
  setTheme,
  setRefresh,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
