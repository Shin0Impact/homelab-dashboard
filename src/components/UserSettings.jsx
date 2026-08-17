import React, { useState, useEffect } from "react"
import { UserPlus, Trash2, Shield, User as UserIcon, KeyRound, Check } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

export function UserSettings({ token }) {
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState("")
  const [newPass, setNewPass] = useState("")
  const [newRole, setNewRole] = useState("Viewer")
  const [userError, setUserError] = useState("")
  const [userSuccess, setUserSuccess] = useState("")
  const [editingUserId, setEditingUserId] = useState(null)
  const [editPassword, setEditPassword] = useState("")

  const handleAuthError = () => {
    setUserError("Session expired. Please sign out and log back in.")
  }

  const fetchUsers = async () => {
    if (!token) {
      setUserError("No authentication token found. Please sign in again.")
      return
    }
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) {
        handleAuthError()
        return
      }
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
        setUserError("")
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [token])

  const handleAddUser = async (e) => {
    e.preventDefault()
    setUserError("")
    setUserSuccess("")
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUser, password: newPass, role: newRole }),
      })

      const data = await res.json()
      if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid or expired token. Please sign out and sign in again.")
      }
      if (!res.ok) throw new Error(data.message || "Failed to create user")

      setNewUser("")
      setNewPass("")
      setNewRole("Viewer")
      setUserSuccess("User added successfully.")
      fetchUsers()
    } catch (err) {
      setUserError(err.message)
    }
  }

  const handleUpdatePassword = async (id) => {
    setUserError("")
    setUserSuccess("")
    if (!editPassword) return

    try {
      const res = await fetch(`/api/users/${id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: editPassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to update password")

      setUserSuccess(data.message || "Password updated.")
      setEditingUserId(null)
      setEditPassword("")
    } catch (err) {
      setUserError(err.message)
    }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.message || "Failed to delete user")
      }
    } catch (err) {
      console.error("Failed to delete user", err)
    }
  }

  return (
    <div className={`rounded-2xl p-6 ${glass} lg:col-span-2`}>
      <h2 className="text-base font-semibold">Users & Security</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage user accounts, roles, and security credentials.
      </p>

      {userError && <p className="mt-2 text-xs font-medium text-destructive">{userError}</p>}
      {userSuccess && <p className="mt-2 text-xs font-medium text-emerald-400">{userSuccess}</p>}

      <form onSubmit={handleAddUser} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Username"
          required
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          className="min-w-[130px] flex-1 rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          className="min-w-[130px] flex-1 rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="rounded-lg border border-white/10 bg-secondary px-3 py-2 text-sm outline-none"
        >
          <option value="Viewer">Viewer</option>
          <option value="Admin">Admin</option>
        </select>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" /> Add User
        </button>
      </form>

      <div className="mt-4 divide-y divide-white/5 border-t border-white/5 pt-2">
        {users.map((u) => (
          <div key={u.id} className="py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{u.username}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Shield className="h-3 w-3 text-primary" /> {u.role}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingUserId(editingUserId === u.id ? null : u.id)
                    setEditPassword("")
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-secondary/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Edit Password
                </button>

                {u.username !== "admin" && (
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {editingUserId === u.id && (
              <div className="mt-3 flex gap-2 pl-9">
                <input
                  type="password"
                  placeholder={`New password for ${u.username}`}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-input/40 px-3 py-1.5 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => handleUpdatePassword(u.id)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  onClick={() => {
                    setEditingUserId(null)
                    setEditPassword("")
                  }}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}