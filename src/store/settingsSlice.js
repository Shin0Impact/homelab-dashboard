import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"];

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
    setSettings: (state, action) => {
      const { categories, compact, amoled, refresh } = action.payload;
      if (categories) {
        state.categories = categories;
        localStorage.setItem("homelab_categories", JSON.stringify(categories));
      }
      if (compact !== undefined) {
        state.compact = compact;
        localStorage.setItem("homelab_compact", compact);
      }
      if (amoled !== undefined) {
        state.amoled = amoled;
        localStorage.setItem("homelab_amoled", amoled);
        if (amoled) {
          document.documentElement.classList.add("amoled");
        } else {
          document.documentElement.classList.remove("amoled");
        }
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
    resetSettings: (state) => {
      state.categories = DEFAULT_CATEGORIES;
      state.compact = false;
      state.amoled = false;
      state.refresh = 10;
      localStorage.removeItem("homelab_categories");
      localStorage.removeItem("homelab_compact");
      localStorage.removeItem("homelab_amoled");
      localStorage.removeItem("homelab_refresh");
      document.documentElement.classList.remove("amoled");
    },
  },
});

export const {
  setSettings,
  setCategories,
  addCategory,
  removeCategory,
  setCompact,
  setAmoled,
  setRefresh,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
