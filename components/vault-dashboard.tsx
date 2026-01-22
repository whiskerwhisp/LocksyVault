"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { encryptVaultItem, decryptVaultItem, deriveEncryptionKey, VaultItemData } from "@/lib/encryption";
import { generatePassword } from "@/lib/password-generator";
import { Copy, Edit, Trash2, Plus, Search, Eye, EyeOff, LogOut, RefreshCw } from "lucide-react";

interface VaultItem {
  _id: string;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
}

interface DecryptedVaultItem extends VaultItem {
  decrypted: VaultItemData;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface VaultDashboardProps {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  onAuthChange: () => void;
}

export default function VaultDashboard({ user, isAuthenticated, loading: authLoading, onAuthChange }: VaultDashboardProps) {
  const router = useRouter();
  const [items, setItems] = useState<DecryptedVaultItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<DecryptedVaultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DecryptedVaultItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [generatorOptions, setGeneratorOptions] = useState({
    length: 16,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
    excludeLookAlike: false,
  });
  
  const [formData, setFormData] = useState<VaultItemData>({
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  const getEncryptionKey = useCallback(() => {
    const email = sessionStorage.getItem("userEmail");
    const password = sessionStorage.getItem("tempPassword");
    
    if (!email) {
      return null;
    }
    
    return deriveEncryptionKey(password || email, email);
  }, []);

  const loadItems = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setFilteredItems([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/vault");
      if (!response.ok) throw new Error("Failed to load items");
      
      const data = await response.json();
      const key = getEncryptionKey();
      
      if (!key) {
        setItems([]);
        setFilteredItems([]);
        return;
      }

      const decryptedItems = data.items.map((item: VaultItem) => {
        try {
          const decrypted = decryptVaultItem(item.encryptedData, key);
          return { ...item, decrypted };
        } catch (error) {
          console.error("Failed to decrypt item:", error);
          return null;
        }
      }).filter(Boolean);
      
      setItems(decryptedItems);
      setFilteredItems(decryptedItems);
    } catch (error) {
      console.error("Load items error:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getEncryptionKey]);

  const filterItems = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(item => 
      item.decrypted.title.toLowerCase().includes(query) ||
      item.decrypted.username.toLowerCase().includes(query) ||
      item.decrypted.url.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  useEffect(() => {
    if (!authLoading) {
      loadItems();
    }
  }, [authLoading, isAuthenticated, loadItems]);

  useEffect(() => {
    filterItems();
  }, [filterItems]);

  
  const handleSave = async () => {
    const key = getEncryptionKey();
    if (!key) return;

    try {
      const encryptedData = encryptVaultItem(formData, key);
      
      if (editingItem) {
        // Update
        const response = await fetch(`/api/vault/${editingItem._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encryptedData }),
        });
        
        if (!response.ok) throw new Error("Failed to update item");
      } else {
        // Create
        const response = await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encryptedData }),
        });
        
        if (!response.ok) throw new Error("Failed to create item");
      }

      resetForm();
      loadItems();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const response = await fetch(`/api/vault/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete item");
      
      loadItems();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete item");
    }
  };

  const handleEdit = (item: DecryptedVaultItem) => {
    setFormData(item.decrypted);
    setEditingItem(item);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      username: "",
      password: "",
      url: "",
      notes: "",
    });
    setEditingItem(null);
    setShowAddModal(false);
    setShowPasswordInForm(false);
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(generatorOptions);
    setFormData({ ...formData, password: newPassword });
    setShowPasswordInForm(true);
  };

  const handleGeneratorOptionChange = (option: keyof typeof generatorOptions) => {
    setGeneratorOptions(prev => ({
      ...prev,
      [option]: typeof prev[option] === 'boolean' ? !prev[option] : prev[option]
    }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      
      setTimeout(() => {
        setCopiedId(null);
      }, 15000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionStorage.clear();
      onAuthChange();
      setItems([]);
      setFilteredItems([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("userEmail", loginData.email);
        sessionStorage.setItem("tempPassword", loginData.password);
      }

      setShowLoginModal(false);
      setLoginData({ email: "", password: "" });
      onAuthChange();
      await loadItems();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAddItemClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-md py-4 md:py-5 px-4 md:px-10 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold">Locksy Vault</h1>
          {isAuthenticated ? (
            <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
              <span className="text-xs md:text-sm text-gray-600 truncate max-w-[150px] md:max-w-none">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/login")} className="shrink-0">
                Login
              </Button>
              <Button size="sm" onClick={() => router.push("/signup")} className="shrink-0">
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search vault items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleAddItemClick} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Password
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <CardTitle className="text-lg">{item.decrypted.title}</CardTitle>
                <CardDescription className="truncate">{item.decrypted.url}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Username:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600">{item.decrypted.username}</span>
                      {item.decrypted.username && (
                        <button
                          onClick={() => copyToClipboard(item.decrypted.username, `${item._id}-user`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      {copiedId === `${item._id}-user` && (
                        <span className="text-green-600 text-xs">Copied!</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Password:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600 font-mono">
                        {showPasswords[item._id] ? item.decrypted.password : "••••••••••"}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(item._id)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        {showPasswords[item._id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(item.decrypted.password, `${item._id}-pass`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {copiedId === `${item._id}-pass` && (
                        <span className="text-green-600 text-xs">Copied!</span>
                      )}
                    </div>
                  </div>
                  {item.decrypted.notes && (
                    <div>
                      <span className="font-medium">Notes:</span>
                      <p className="text-gray-600 mt-1 text-xs">{item.decrypted.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="w-full sm:w-auto">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item._id)} className="w-full sm:w-auto">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {!isAuthenticated ? (
              <div>
                <p className="mb-4">Login to access your secure vault</p>
                <Button onClick={() => setShowLoginModal(true)}>
                  Login to Continue
                </Button>
              </div>
            ) : searchQuery ? (
              "No items found"
            ) : (
              "No vault items yet. Add your first password!"
            )}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="w-full max-w-5xl my-2 sm:my-8">
              <Card className="max-h-[95vh] overflow-y-auto">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">{editingItem ? "Edit Item" : "Add New Item"}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-3 sm:space-y-4">
                      <Field>
                        <FieldLabel htmlFor="title" className="text-sm">Title</FieldLabel>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g., Gmail Account"
                          className="text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="username" className="text-sm">Username/Email</FieldLabel>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="username@example.com"
                          className="text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="url" className="text-sm">URL</FieldLabel>
                        <Input
                          id="url"
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          placeholder="https://example.com"
                          className="text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="notes" className="text-sm">Notes</FieldLabel>
                        <textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full min-h-20 sm:min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                          placeholder="Additional notes..."
                        />
                      </Field>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <Field>
                        <FieldLabel htmlFor="password" className="text-sm">Password</FieldLabel>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPasswordInForm ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="pr-10 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPasswordInForm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </Field>

                      <div className="border rounded-lg p-3 sm:p-4 bg-gray-50 space-y-2 sm:space-y-3">
                        <h3 className="font-semibold text-xs sm:text-sm">Password Generator</h3>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-medium">Length:</span>
                          <span className="bg-white px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm">{generatorOptions.length}</span>
                        </div>
                        <input 
                          type="range" 
                          min="8" 
                          max="64" 
                          value={generatorOptions.length}
                          onChange={(e) => setGeneratorOptions({ ...generatorOptions, length: Number(e.target.value) })}
                          className="w-full h-2"
                        />
                        
                        <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                          <label className="flex items-center justify-between text-xs sm:text-sm cursor-pointer py-1">
                            <span>Lowercase (a-z)</span>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              checked={generatorOptions.lowercase}
                              onChange={() => handleGeneratorOptionChange('lowercase')}
                            />
                          </label>
                          <label className="flex items-center justify-between text-xs sm:text-sm cursor-pointer py-1">
                            <span>Uppercase (A-Z)</span>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              checked={generatorOptions.uppercase}
                              onChange={() => handleGeneratorOptionChange('uppercase')}
                            />
                          </label>
                          <label className="flex items-center justify-between text-xs sm:text-sm cursor-pointer py-1">
                            <span>Numbers (0-9)</span>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              checked={generatorOptions.numbers}
                              onChange={() => handleGeneratorOptionChange('numbers')}
                            />
                          </label>
                          <label className="flex items-center justify-between text-xs sm:text-sm cursor-pointer py-1">
                            <span>Symbols (!@#$%...)</span>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              checked={generatorOptions.symbols}
                              onChange={() => handleGeneratorOptionChange('symbols')}
                            />
                          </label>
                          <label className="flex items-center justify-between text-xs sm:text-sm cursor-pointer py-1">
                            <span>Exclude look-alike</span>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              checked={generatorOptions.excludeLookAlike}
                              onChange={() => handleGeneratorOptionChange('excludeLookAlike')}
                            />
                          </label>
                        </div>

                        <Button 
                          type="button"
                          onClick={handleGeneratePassword}
                          className="w-full text-xs sm:text-sm py-2"
                        >
                          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Generate Password
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6">
                    <Button type="button" onClick={handleSave} className="w-full sm:w-auto text-sm">
                      {editingItem ? "Update" : "Save"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto text-sm">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {showLoginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Login Required</CardTitle>
                <CardDescription>Please login to add passwords to your vault</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin}>
                  <FieldGroup>
                    {loginError && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {loginError}
                      </div>
                    )}
                    <Field>
                      <FieldLabel htmlFor="login-email">Email</FieldLabel>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="login-password">Password</FieldLabel>
                      <Input
                        id="login-password"
                        type="password"
                        required
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      />
                    </Field>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="submit" disabled={loginLoading} className="w-full sm:w-auto">
                        {loginLoading ? "Logging in..." : "Login"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowLoginModal(false);
                          setLoginError("");
                          setLoginData({ email: "", password: "" });
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="text-center text-sm text-gray-600 mt-2">
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setShowLoginModal(false);
                          router.push("/signup");
                        }}
                        className="text-blue-600 hover:underline">Sign up
                      </button>
                    </div>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

