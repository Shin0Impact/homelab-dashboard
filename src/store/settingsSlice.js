import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"];

const loadInitialSettings = () => {
  try {
    const savedCat = localStorage.getItem("homelab_categories");
    const savedTheme = localStorage.getItem("homelab_theme");
    const legacyAmoled = localStorage.getItem("homelab_amoled") === "true";

    // Migrate old amoled toggle to theme string
    let initialTheme = savedTheme || "default";
    if (!savedTheme && legacyAmoled) {
      initialTheme = "amoled";
    }

    return {
      categories: savedCat ? JSON.parse(savedCat) : DEFAULT_CATEGORIES,
      compact: localStorage.getItem("homelab_compact") === "true",
      theme: initialTheme, // "default" | "amoled" | "light"
      refresh: Number(localStorage.getItem("homelab_refresh")) || 10,
    };
  } catch {
    return {
      categories: DEFAULT_CATEGORIES,
      compact: false,
      theme: "default",
      refresh: 10,
    };
  }
};

const settingsSlice = createSlice({
  name: "settings",
  initialState: loadInitialSettings(),
  reducers: {
    setSettings: (state, action) => {
      const { categories, compact, theme, amoled, refresh } = action.payload;
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
        // Fallback migration if server returns legacy amoled payload
        state.theme = amoled ? "amoled" : "default";
        localStorage.setItem("homelab_theme", state.theme);
      }
      if (refresh !== undefined) {
        state.refresh = refresh;
        localStorage.setItem("homelab_refresh", refresh);
      }
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
      localStorage.removeItem("homelab_categories");
      localStorage.removeItem("homelab_compact");
      localStorage.removeItem("homelab_theme");
      localStorage.removeItem("homelab_amoled");
      localStorage.removeItem("homelab_refresh");
    },
  },
});

export const {
  setSettings,
  setCategories,
  addCategory,
  removeCategory,
  setCompact,
  setTheme,
  setRefresh,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
