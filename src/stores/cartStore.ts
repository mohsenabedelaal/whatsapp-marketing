import { create } from "zustand"

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  availableStock: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.productId === item.productId)

      if (existingItem) {
        // Update quantity if item already exists
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.availableStock) }
              : i
          ),
        }
      }

      // Add new item
      return { items: [...state.items, item] }
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.availableStock)) }
          : item
      ),
    })),

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    const state = get()
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  },

  getItemCount: () => {
    const state = get()
    return state.items.reduce((count, item) => count + item.quantity, 0)
  },
}))
