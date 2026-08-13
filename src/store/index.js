import { configureStore } from "@reduxjs/toolkit";
import settingsReducer from "./settingsSlice";
import telemetryReducer from "./telemetrySlice";

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    telemetry: telemetryReducer,
  },
});
