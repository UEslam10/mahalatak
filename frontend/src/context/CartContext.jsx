import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

// العربة مربوطة بمحل واحد بس في المرة (زي أغلب تطبيقات التوصيل)
export function CartProvider({ children }) {
  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState(null);
  const [items, setItems] = useState([]); // { product_id, name, price, image, quantity }

  useEffect(() => {
    const saved = localStorage.getItem('mahalak_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStoreId(parsed.storeId);
        setStoreName(parsed.storeName);
        setItems(parsed.items || []);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mahalak_cart', JSON.stringify({ storeId, storeName, items }));
  }, [storeId, storeName, items]);

  function addItem(product, store) {
    // لو العربة فيها منتجات من محل تاني، اسأل قبل المسح - هنسيبها بسيطة: نمسح ونبدأ من جديد
    if (storeId && storeId !== store.id) {
      const confirmSwitch = window.confirm(
        'عربتك فيها منتجات من محل تاني. هل تريد إفراغها والبدء بالطلب من هذا المحل؟'
      );
      if (!confirmSwitch) return false;
      setItems([]);
    }
    setStoreId(store.id);
    setStoreName(store.name);

    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 }];
    });
    return true;
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i)));
  }

  function removeItem(productId) {
    setItems((prev) => {
      const next = prev.filter((i) => i.product_id !== productId);
      if (next.length === 0) {
        setStoreId(null);
        setStoreName(null);
      }
      return next;
    });
  }

  function clearCart() {
    setItems([]);
    setStoreId(null);
    setStoreName(null);
  }

  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ storeId, storeName, items, addItem, updateQuantity, removeItem, clearCart, itemsTotal, itemsCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
