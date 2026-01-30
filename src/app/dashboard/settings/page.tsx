"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Building2, Users, Plus, Trash2, Loader2 } from "lucide-react"

interface Business {
  id: string
  name: string
  phone?: string
  address?: string
  currency: string
  whatsappNumber?: string
  createdAt: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const isOwner = session?.user?.role === "OWNER"

  const [activeTab, setActiveTab] = useState<"business" | "users">("business")
  const [business, setBusiness] = useState<Business | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Business form state
  const [businessForm, setBusinessForm] = useState({
    name: "",
    phone: "",
    address: "",
    currency: "USD",
    whatsappNumber: "",
  })

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "STAFF" as "STAFF" | "OWNER",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const businessRes = await fetch("/api/business")
      const businessData = await businessRes.json()
      setBusiness(businessData)
      setBusinessForm({
        name: businessData.name || "",
        phone: businessData.phone || "",
        address: businessData.address || "",
        currency: businessData.currency || "USD",
        whatsappNumber: businessData.whatsappNumber || "",
      })

      if (isOwner) {
        const usersRes = await fetch("/api/users")
        const usersData = await usersRes.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSaving(true)

    try {
      const response = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update business")
      }

      const updatedBusiness = await response.json()
      setBusiness(updatedBusiness)
      alert("Business settings updated successfully!")
    } catch (error: any) {
      setErrors({ submit: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSaving(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create user")
      }

      const newUser = await response.json()
      setUsers([newUser, ...users])
      setShowAddUser(false)
      setNewUserForm({ email: "", password: "", name: "", role: "STAFF" })
      alert("User created successfully!")
    } catch (error: any) {
      setErrors({ submit: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business information and team
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "business" ? "default" : "ghost"}
          onClick={() => setActiveTab("business")}
          className="rounded-b-none"
        >
          <Building2 className="mr-2 h-4 w-4" />
          Business
        </Button>
        {isOwner && (
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            onClick={() => setActiveTab("users")}
            className="rounded-b-none"
          >
            <Users className="mr-2 h-4 w-4" />
            Users
          </Button>
        )}
      </div>

      {errors.submit && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {errors.submit}
        </div>
      )}

      {/* Business Settings Tab */}
      {activeTab === "business" && (
        <form onSubmit={handleBusinessSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Update your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={businessForm.name}
                  onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                  placeholder="My Business"
                  required
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={businessForm.phone}
                  onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                  placeholder="+96170123456"
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input
                  id="whatsappNumber"
                  type="tel"
                  value={businessForm.whatsappNumber}
                  onChange={(e) => setBusinessForm({ ...businessForm, whatsappNumber: e.target.value })}
                  placeholder="+96170123456"
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Business WhatsApp number for customer communication
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  placeholder="Business address"
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={businessForm.currency}
                  onChange={(e) => setBusinessForm({ ...businessForm, currency: e.target.value })}
                  placeholder="USD"
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Currency code (USD, EUR, LBP, etc.)
                </p>
              </div>

              {isOwner && (
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              )}

              {!isOwner && (
                <p className="text-sm text-muted-foreground">
                  Only owners can update business settings.
                </p>
              )}
            </CardContent>
          </Card>

          {business && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Business created on {formatDate(business.createdAt)}
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      )}

      {/* Users Tab (Owner Only) */}
      {activeTab === "users" && isOwner && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage staff accounts and permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddUser(!showAddUser)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddUser && (
                <form onSubmit={handleAddUser} className="mb-6 p-4 rounded-lg border bg-muted/50">
                  <h3 className="font-semibold mb-4">Add New User</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newName">Name *</Label>
                      <Input
                        id="newName"
                        value={newUserForm.name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newEmail">Email *</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        placeholder="user@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Password *</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        placeholder="Minimum 6 characters"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={newUserForm.role === "STAFF" ? "default" : "outline"}
                          onClick={() => setNewUserForm({ ...newUserForm, role: "STAFF" })}
                          size="sm"
                        >
                          Staff
                        </Button>
                        <Button
                          type="button"
                          variant={newUserForm.role === "OWNER" ? "default" : "outline"}
                          onClick={() => setNewUserForm({ ...newUserForm, role: "OWNER" })}
                          size="sm"
                        >
                          Owner
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create User"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddUser(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {users.length > 0 ? (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.name}</p>
                          <Badge variant={user.role === "OWNER" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Joined {formatDate(user.createdAt)}
                        </p>
                      </div>
                      {user.id !== session?.user?.id && (
                        <Button variant="ghost" size="sm" disabled>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No users found. Add your first team member!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
