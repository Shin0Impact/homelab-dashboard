import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"];

// Helper to load initial settings from localStorage
const loadInitialSettings = () => {
  try {
    const savedCat = localStorage.getItem("homelab_categories");
    return {
      categories: savedCat ? JSON.parse(savedCat) : DEFAULT_CATEGORIES,
      compact: localStorage.getItem("homelab_compact") === "true",
      amoled: localStorage.getItem("homelab_amoled") === "true",
      refresh: Number(localStorage.getItem("homelab_refresh")) || 10,
    };
  } catch {
    return {
      categories: DEFAULT_CATEGORIES,
      compact: false,
      amoled: false,
      refresh: 10,
    };
  }
};

const settingsSlice = createSlice({
  name: "settings",
  initialState: loadInitialSettings(),
  reducers: {
    setCategories: (state, action) => {
      state.categories = action.payload;
      localStorage.setItem(
        "homelab_categories",
        JSON.stringify(action.payload),
      );
    },
    addCategory: (state, action) => {
      if (!state.categories.includes(action.payload)) {
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
    setAmoled: (state, action) => {
      state.amoled = action.payload;
      localStorage.setItem("homelab_amoled", action.payload);
      if (action.payload) {
        document.documentElement.classList.add("amoled");
      } else {
        document.documentElement.classList.remove("amoled");
      }
    },
    setRefresh: (state, action) => {
      state.refresh = action.payload;
      localStorage.setItem("homelab_refresh", action.payload);
    },
    importSettings: (state, action) => {
      const { categories, compact, amoled, refresh } = action.payload;
      if (categories) state.categories = categories;
      if (compact !== undefined) state.compact = compact;
      if (amoled !== undefined) state.amoled = amoled;
      if (refresh) state.refresh = refresh;
    },
  },
});

export const {
  setCategories,
  addCategory,
  removeCategory,
  setCompact,
  setAmoled,
  setRefresh,
  importSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
