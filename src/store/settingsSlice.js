import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"];
const DEFAULT_USERS = [
  { id: "1", username: "admin", role: "Admin", email: "root@homelab" },
];

const loadInitialSettings = () => {
  try {
    const savedCat = localStorage.getItem("homelab_categories");
    const savedUsers = localStorage.getItem("homelab_users");
    return {
      categories: savedCat ? JSON.parse(savedCat) : DEFAULT_CATEGORIES,
      compact: localStorage.getItem("homelab_compact") === "true",
      amoled: localStorage.getItem("homelab_amoled") === "true",
      refresh: Number(localStorage.getItem("homelab_refresh")) || 10,
      users: savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS,
    };
  } catch {
    return {
      categories: DEFAULT_CATEGORIES,
      compact: false,
      amoled: false,
      refresh: 10,
      users: DEFAULT_USERS,
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
    addUser: (state, action) => {
      state.users.push(action.payload);
      localStorage.setItem("homelab_users", JSON.stringify(state.users));
    },
    removeUser: (state, action) => {
      state.users = state.users.filter((u) => u.id !== action.payload);
      localStorage.setItem("homelab_users", JSON.stringify(state.users));
    },
    resetSettings: (state) => {
      state.categories = DEFAULT_CATEGORIES;
      state.compact = false;
      state.amoled = false;
      state.refresh = 10;
      state.users = DEFAULT_USERS;
      localStorage.removeItem("homelab_categories");
      localStorage.removeItem("homelab_compact");
      localStorage.removeItem("homelab_amoled");
      localStorage.removeItem("homelab_refresh");
      localStorage.removeItem("homelab_users");
      document.documentElement.classList.remove("amoled");
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
  addUser,
  removeUser,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
