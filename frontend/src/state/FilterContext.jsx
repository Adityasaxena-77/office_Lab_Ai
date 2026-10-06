import { createContext, useContext, useMemo, useReducer } from "react";

export const initialFilters = {
  start: "", end: "", category: "", status: "",
  currency: "INR",
  metric: "revenue",      // revenue | orders  (chart toggle)
  granularity: "day",     // day | month
};

function reducer(state, action) {
  switch (action.type) {
    case "set": return { ...state, ...action.payload };
    case "reset": return { ...initialFilters, currency: state.currency };
    default: return state;
  }
}

const Ctx = createContext(null);

export function FilterProvider({ children }) {
  const [filters, dispatch] = useReducer(reducer, initialFilters);
  const value = useMemo(() => ({
    filters,
    setFilters: (payload) => dispatch({ type: "set", payload }),
    resetFilters: () => dispatch({ type: "reset" }),
  }), [filters]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFilters = () => useContext(Ctx);

/** Only the filter fields the API understands. */
export const apiParams = ({ start, end, category, status, currency }) => ({ start, end, category, status, currency });
