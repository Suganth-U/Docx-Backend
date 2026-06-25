import { normalizeCartItem } from "@/shared/features/Epharmacy/pharmacyClient";
import { getStoredAuthSession, isPatientSession } from "@/shared/lib/authSession";

const LEGACY_CART_KEY = "docx_cart";
const GUEST_CART_KEY = "docx_cart_guest";
const WISHLIST_KEY = "docx_wishlist";
const PENDING_ORDER_KEY = "docx_pending_order_id";

const dispatchUpdate = (eventName) => {
  window.dispatchEvent(new Event(eventName));
};

const saveCollection = (key, items) => {
  localStorage.setItem(key, JSON.stringify(items));
};

const normalizeCollection = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCartItem);
};

const readCollection = (key) => {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    const normalized = normalizeCollection(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      saveCollection(key, normalized);
    }
    return normalized;
  } catch (error) {
    console.error(`Failed to parse ${key}`, error);
    return [];
  }
};

const getPatientScopedKey = (session = {}) => {
  const patientKey = session._id || session.email || session.name || "patient";
  return `docx_cart_patient_${String(patientKey).replace(/[^a-z0-9_-]/gi, "_")}`;
};

export const getCartStorageKey = (session = getStoredAuthSession()) => {
  const role = String(session?.role || session?.roles?.[0] || "").toLowerCase();

  if (isPatientSession(session)) {
    return getPatientScopedKey(session);
  }

  if (role === "doctor" || role === "admin") {
    return `docx_cart_${role}_${String(session?._id || "session").replace(/[^a-z0-9_-]/gi, "_")}`;
  }

  return GUEST_CART_KEY;
};

const readCartStorage = () => {
  const session = getStoredAuthSession();
  const cartKey = getCartStorageKey(session);
  const scopedCart = readCollection(cartKey);

  if (scopedCart.length) {
    return scopedCart;
  }

  const legacyCart = readCollection(LEGACY_CART_KEY);
  const guestCart = readCollection(GUEST_CART_KEY);
  const fallbackCart = guestCart.length ? guestCart : legacyCart;

  if (!fallbackCart.length) {
    return [];
  }

  if (isPatientSession(session)) {
    saveCollection(cartKey, fallbackCart);
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem(LEGACY_CART_KEY);
    return fallbackCart;
  }

  if (cartKey === GUEST_CART_KEY) {
    saveCollection(GUEST_CART_KEY, fallbackCart);
    localStorage.removeItem(LEGACY_CART_KEY);
    return fallbackCart;
  }

  return [];
};

export const hasPatientSession = () => {
  return isPatientSession();
};

const getItemIdentifier = (item = {}) =>
  item.medicineId || item._id || item.name || item.MedicineName || "";

const matchIdentifier = (item, identifier) =>
  [item.medicineId, item.name].includes(identifier);

export const getCart = () => readCartStorage();

export const getCartCount = () =>
  getCart().reduce((count, item) => count + (item.qty || 1), 0);

export const getCartSubtotal = () =>
  getCart().reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.qty || 1),
    0
  );

export const setCartItems = (items) => {
  const normalized = normalizeCollection(items);
  saveCollection(getCartStorageKey(), normalized);
  dispatchUpdate("cartUpdated");
  return normalized;
};

export const addToCart = (product, quantity = 1) => {
  const item = normalizeCartItem({ ...product, qty: quantity });
  const cart = readCartStorage();
  const existingItemIndex = cart.findIndex(
    (cartItem) => cartItem.medicineId === item.medicineId || cartItem.name === item.name
  );

  if (existingItemIndex > -1) {
    cart[existingItemIndex] = {
      ...cart[existingItemIndex],
      prescriptionRequestId:
        item.prescriptionRequestId || cart[existingItemIndex].prescriptionRequestId || "",
      prescriptionId: item.prescriptionId || cart[existingItemIndex].prescriptionId || "",
      prescriptionUpload:
        item.prescriptionUpload || cart[existingItemIndex].prescriptionUpload || null,
      qty: (cart[existingItemIndex].qty || 1) + quantity,
    };
    saveCollection(getCartStorageKey(), cart);
    dispatchUpdate("cartUpdated");
    return cart;
  }

  const newCart = [...cart, item];
  saveCollection(getCartStorageKey(), newCart);
  dispatchUpdate("cartUpdated");
  return newCart;
};

export const attachPrescriptionUploadToCartItem = (identifier, prescriptionUpload) => {
  const cart = readCartStorage();
  const updatedCart = cart.map((item) => {
    if (!matchIdentifier(item, identifier)) {
      return item;
    }

    return normalizeCartItem({
      ...item,
      prescriptionUpload,
    });
  });

  saveCollection(getCartStorageKey(), updatedCart);
  dispatchUpdate("cartUpdated");
  return updatedCart;
};

export const updateCartQuantity = (identifier, delta) => {
  const cart = readCartStorage();
  const updatedCart = cart.map((item) => {
    if (matchIdentifier(item, identifier)) {
      return { ...item, qty: Math.max(1, (item.qty || 1) + delta) };
    }
    return item;
  });

  saveCollection(getCartStorageKey(), updatedCart);
  dispatchUpdate("cartUpdated");
  return updatedCart;
};

export const removeFromCart = (identifier) => {
  const newCart = readCartStorage().filter(
    (item) => !matchIdentifier(item, identifier)
  );
  saveCollection(getCartStorageKey(), newCart);
  dispatchUpdate("cartUpdated");
  return newCart;
};

export const clearCart = () => {
  localStorage.removeItem(getCartStorageKey());
  dispatchUpdate("cartUpdated");
};

export const migrateGuestCartToPatient = (session = getStoredAuthSession()) => {
  if (!isPatientSession(session)) return [];

  const guestCart = readCollection(GUEST_CART_KEY);
  if (!guestCart.length) return readCollection(getPatientScopedKey(session));

  const patientKey = getPatientScopedKey(session);
  const patientCart = readCollection(patientKey);
  const mergedCart = [...patientCart];

  guestCart.forEach((guestItem) => {
    const normalizedGuestItem = normalizeCartItem(guestItem);
    const existingIndex = mergedCart.findIndex(
      (item) =>
        item.medicineId === normalizedGuestItem.medicineId ||
        item.name === normalizedGuestItem.name
    );

    if (existingIndex >= 0) {
      mergedCart[existingIndex] = normalizeCartItem({
        ...mergedCart[existingIndex],
        prescriptionRequestId:
          mergedCart[existingIndex].prescriptionRequestId ||
          normalizedGuestItem.prescriptionRequestId,
        prescriptionId:
          mergedCart[existingIndex].prescriptionId ||
          normalizedGuestItem.prescriptionId,
        prescriptionUpload:
          mergedCart[existingIndex].prescriptionUpload ||
          normalizedGuestItem.prescriptionUpload,
        qty: (mergedCart[existingIndex].qty || 1) + (normalizedGuestItem.qty || 1),
      });
      return;
    }

    mergedCart.push(normalizedGuestItem);
  });

  saveCollection(patientKey, mergedCart);
  localStorage.removeItem(GUEST_CART_KEY);
  localStorage.removeItem(LEGACY_CART_KEY);
  dispatchUpdate("cartUpdated");
  return mergedCart;
};

export const getWishlist = () => readCollection(WISHLIST_KEY);

export const setWishlistItems = (items) => {
  const normalized = normalizeCollection(items);
  saveCollection(WISHLIST_KEY, normalized);
  dispatchUpdate("wishlistUpdated");
  return normalized;
};

export const toggleWishlist = (product) => {
  const item = normalizeCartItem(product);
  const wishlist = getWishlist();
  const exists = wishlist.find(
    (wishlistItem) =>
      wishlistItem.medicineId === item.medicineId || wishlistItem.name === item.name
  );

  const updatedWishlist = exists
    ? wishlist.filter(
        (wishlistItem) =>
          wishlistItem.medicineId !== item.medicineId && wishlistItem.name !== item.name
      )
    : [...wishlist, item];

  saveCollection(WISHLIST_KEY, updatedWishlist);
  dispatchUpdate("wishlistUpdated");
  return updatedWishlist;
};

export const isInWishlist = (identifier) => {
  const wishlist = getWishlist();
  return wishlist.some((item) =>
    [item.medicineId, item.name].includes(
      typeof identifier === "object" ? getItemIdentifier(identifier) : identifier
    )
  );
};

export const markPendingPaymentOrder = (orderId) => {
  if (!orderId) return;
  sessionStorage.setItem(PENDING_ORDER_KEY, orderId);
};

export const getPendingPaymentOrder = () =>
  sessionStorage.getItem(PENDING_ORDER_KEY);

export const clearPendingPaymentOrder = () => {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
};
