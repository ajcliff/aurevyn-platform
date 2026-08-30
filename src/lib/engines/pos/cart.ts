export type CartItem = {
  product_id: string;

  name: string;

  price: number;

  quantity: number;
};

export function addToCart(
  cart: CartItem[],
  item: CartItem
) {
  const existing = cart.find(
    (p) =>
      p.product_id ===
      item.product_id
  );

  if (existing) {
    return cart.map((p) =>
      p.product_id === item.product_id
        ? {
            ...p,
            quantity:
              p.quantity + 1
          }
        : p
    );
  }

  return [...cart, item];
}

export function removeFromCart(
  cart: CartItem[],
  productId: string
) {
  return cart.filter(
    (p) =>
      p.product_id !== productId
  );
}

export function increaseQty(
  cart: CartItem[],
  productId: string
) {
  return cart.map((p) =>
    p.product_id === productId
      ? {
          ...p,
          quantity:
            p.quantity + 1
        }
      : p
  );
}

export function decreaseQty(
  cart: CartItem[],
  productId: string
) {
  return cart
    .map((p) =>
      p.product_id === productId
        ? {
            ...p,
            quantity:
              p.quantity - 1
          }
        : p
    )
    .filter(
      (p) => p.quantity > 0
    );
}

export function calculateSubtotal(
  cart: CartItem[]
) {
  return cart.reduce(
    (sum, item) =>
      sum +
      item.price *
        item.quantity,
    0
  );
}

export function calculateTax(
  subtotal: number,
  rate = 0.16
) {
  return subtotal * rate;
}

export function calculateDiscount(
  subtotal: number,
  percentage = 0
) {
  return (
    subtotal *
    (percentage / 100)
  );
}

export function calculateTotal(
  subtotal: number,
  tax: number,
  discount: number
) {
  return (
    subtotal +
    tax -
    discount
  );
}