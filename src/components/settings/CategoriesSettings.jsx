import React, { useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { addCategory, removeCategory } from "../../store/settingsSlice"
import { Plus, X } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

export function CategoriesSettings() {
  const dispatch = useDispatch()
  const categories = useSelector((state) => state.settings.categories)
  const [newCat, setNewCat] = useState("")

  const handleAddCat = () => {
    const v = newCat.trim()
    if (v) {
      dispatch(addCategory(v))
      setNewCat("")
    }
  }

  return (
    <div className={`rounded-2xl p-6 ${glass}`}>
      <h2 className="text-base font-semibold">Categories</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tags used to organize your services.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <span
            key={c}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-secondary/50 px-3 py-1 text-xs font-medium"
          >
            {c}
            <button
              onClick={() => dispatch(removeCategory(c))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddCat()
          }}
          placeholder="New category"
          className="flex-1 rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={handleAddCat}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  )
}