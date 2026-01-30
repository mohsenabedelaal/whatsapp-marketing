"use client"

import { useState } from "react"
import Link from "next/link"
import { useProducts, useDeleteProduct } from "@/hooks/useProducts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from "lucide-react"

export default function InventoryPage() {
  const [search, setSearch] = useState("")
  const [lowStockFilter, setLowStockFilter] = useState(false)

  const { data: products, isLoading } = useProducts({
    search,
    lowStock: lowStockFilter,
  })
  const deleteProduct = useDeleteProduct()

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteProduct.mutateAsync(id)
      } catch (error) {
        alert("Failed to delete product")
      }
    }
  }

  const getStockBadge = (quantity: number, lowStockThreshold: number) => {
    if (quantity === 0) {
      return <Badge variant="danger">Out of Stock</Badge>
    } else if (quantity <= lowStockThreshold) {
      return <Badge variant="warning">Low Stock</Badge>
    }
    return <Badge variant="success">In Stock</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage your products and stock levels
          </p>
        </div>
        <Link href="/dashboard/inventory/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={lowStockFilter ? "default" : "outline"}
              onClick={() => setLowStockFilter(!lowStockFilter)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Low Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid/List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : products && products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {search || lowStockFilter
                ? "Try adjusting your filters"
                : "Get started by adding your first product"}
            </p>
            {!search && !lowStockFilter && (
              <Link href="/dashboard/inventory/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products?.map((product) => (
            <Card key={product.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    {product.sku && (
                      <p className="text-sm text-muted-foreground mt-1">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>
                  {getStockBadge(product.quantity, product.lowStockThreshold)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-semibold">${Number(product.price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stock</p>
                    <p className="font-semibold">{product.quantity} units</p>
                  </div>
                  {product.category && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium">{product.category}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/inventory/${product.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={deleteProduct.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {products && products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stock</p>
                <p className="text-2xl font-bold">
                  {products.reduce((sum, p) => sum + p.quantity, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-600">
                  {products.filter((p) => p.quantity <= p.lowStockThreshold).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter((p) => p.quantity === 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
