import api from "@/shared/lib/api";
import {
  DEFAULT_COUNTRY,
  FALLBACK_MEDICINE_IMAGE,
  RX_CATEGORIES,
} from "@/shared/features/Epharmacy/pharmacyShared";
import { enrichMedicineData } from "@/shared/features/Epharmacy/dataEnrichment";

const normalizeImage = (image) => image || FALLBACK_MEDICINE_IMAGE;
const normalizeReferenceId = (value) =>
  value?._id || value?.id || value || "";
const normalizePrescriptionUpload = (value = {}) => {
  if (!value || typeof value !== "object") return null;

  const fileName = String(value.fileName || value.name || "").trim();
  if (!fileName) return null;

  return {
    source: value.source || "patient_upload",
    fileName,
    fileType: String(value.fileType || value.type || "").trim(),
    fileSize: Math.max(0, Number(value.fileSize ?? value.size ?? 0) || 0),
    uploadedAt: value.uploadedAt || null,
    fileUrl: String(value.fileUrl || value.url || "").trim(),
    storageName: String(value.storageName || value.filename || "").trim(),
    patientName: String(value.patientName || value.fullName || "").trim(),
    patientPhone: String(value.patientPhone || value.mobileNumber || "").trim(),
    notes: String(value.notes || "").trim(),
  };
};
const normalizeCatalogKeyPart = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const createSyntheticMedicineId = ({ name, category, price }) =>
  [name, category, price]
    .map(normalizeCatalogKeyPart)
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const getCatalogKey = (medicine = {}) =>
  [
    medicine.name,
    medicine.category,
    medicine.manufacturer,
    Number(medicine.price || 0).toFixed(2),
  ]
    .map(normalizeCatalogKeyPart)
    .join("|");
const normalizeImages = (medicine = {}) => {
  const imageCandidates = [
    medicine.image,
    medicine.ImagePath,
    ...(Array.isArray(medicine.images) ? medicine.images : []),
    ...(Array.isArray(medicine.galleryImages) ? medicine.galleryImages : []),
    ...(Array.isArray(medicine.imageGallery) ? medicine.imageGallery : []),
  ]
    .filter(Boolean)
    .map(normalizeImage);

  return [...new Set(imageCandidates)];
};

export const normalizeMedicine = (medicine = {}) => {
  const name = medicine.name || medicine.MedicineName || "Unnamed medicine";
  const price = Number(medicine.price ?? medicine.Price ?? 0);
  const category = medicine.category || medicine.MainCategory || "General wellness";
  const sourceId = medicine._id || medicine.medicineId || medicine.id || "";
  const medicineId = sourceId || createSyntheticMedicineId({ name, category, price });

  const normalized = {
    medicineId,
    _id: sourceId || medicineId,
    name,
    description: medicine.description || "Doctor-curated pharmacy item.",
    price,
    category,
    subCategory: medicine.subCategory || medicine.SubCategory || "",
    manufacturer: medicine.manufacturer || medicine.brand || "DocX Pharmacy",
    image: normalizeImage(medicine.image || medicine.ImagePath),
    images: normalizeImages(medicine),
    stock: Number(medicine.stock ?? medicine.qtyAvailable ?? 0),
    createdAt: medicine.createdAt || medicine.updatedAt || null,
    requiresPrescription:
      Boolean(medicine.requiresPrescription) ||
      RX_CATEGORIES.has(category),
    reorderLevel: Number(medicine.reorderLevel ?? 0),
    reorderQuantity: Number(medicine.reorderQuantity ?? 0),
  };

  return enrichMedicineData(normalized);
};

const mergeDuplicateMedicine = (existing, next) => ({
  ...existing,
  stock: Math.max(existing.stock || 0, next.stock || 0),
  images: [...new Set([...(existing.images || []), ...(next.images || [])])],
  requiresPrescription: existing.requiresPrescription || next.requiresPrescription,
  reorderLevel: Math.max(existing.reorderLevel || 0, next.reorderLevel || 0),
  reorderQuantity: Math.max(existing.reorderQuantity || 0, next.reorderQuantity || 0),
});

export const dedupeMedicines = (medicines = []) => {
  const uniqueMedicines = new Map();

  medicines.map(normalizeMedicine).forEach((medicine) => {
    const key = getCatalogKey(medicine);
    const existing = uniqueMedicines.get(key);
    uniqueMedicines.set(
      key,
      existing ? mergeDuplicateMedicine(existing, medicine) : medicine
    );
  });

  return [...uniqueMedicines.values()];
};

export const normalizeCartItem = (item = {}) => {
  const medicine = normalizeMedicine(item);
  const prescriptionRequestId = normalizeReferenceId(
    item.prescriptionRequestId || item.prescriptionRequest
  );
  const prescriptionId = normalizeReferenceId(item.prescriptionId || item.prescription);
  const prescriptionUpload = normalizePrescriptionUpload(item.prescriptionUpload);

  return {
    medicineId: medicine.medicineId || item.medicine || item._id || "",
    name: item.name || item.MedicineName || medicine.name,
    image: normalizeImage(item.image || item.ImagePath || medicine.image),
    price: Number(item.price ?? item.Price ?? medicine.price ?? 0),
    manufacturer: item.manufacturer || medicine.manufacturer,
    category: item.category || medicine.category,
    requiresPrescription:
      item.requiresPrescription ?? medicine.requiresPrescription ?? false,
    qty: Math.max(1, Number(item.qty ?? item.quantity ?? 1)),
    stock: Number(item.stock ?? medicine.stock ?? 0),
    description: item.description || medicine.description,
    createdAt: item.createdAt || medicine.createdAt,
    prescriptionRequestId,
    prescriptionId,
    prescriptionUpload,
  };
};

export const uploadPrescriptionProof = async (file, details = {}) => {
  const formData = new FormData();
  formData.append("prescription", file);
  formData.append("patientName", details.patientName || "");
  formData.append("patientPhone", details.patientPhone || "");
  formData.append("notes", details.notes || "");

  const response = await api.post("/orders/prescription-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return normalizePrescriptionUpload(response.data?.prescriptionUpload);
};

const hasUploadedPrescriptionProof = (item = {}) => {
  const upload = normalizePrescriptionUpload(item.prescriptionUpload);
  return Boolean(upload?.fileName && (upload.fileUrl || upload.storageName));
};

export const hasPrescriptionProof = (item = {}) =>
  Boolean(item.prescriptionId || hasUploadedPrescriptionProof(item));

export const toOrderLineItem = (item = {}) => ({
  medicine: item.medicineId,
  name: item.name,
  image: item.image,
  price: Number(item.price || 0),
  qty: Math.max(1, Number(item.qty || 1)),
  prescriptionRequest: item.prescriptionRequestId || undefined,
  prescription: item.prescriptionId || undefined,
  prescriptionUpload: item.prescriptionUpload || undefined,
});

export const fetchMedicines = async () => {
  try {
    const response = await api.get("/medicines");
    return dedupeMedicines(response.data);
  } catch (error) {
    const status = error.response?.status;
    const shouldUseFallback = !status || status >= 500;

    if (!shouldUseFallback) {
      throw error;
    }

    // Keep pharmacy usable in development when the API is still booting.
    const { medicineData } = await import("../../data/medicineData");
    return dedupeMedicines(medicineData);
  }
};

export const fetchMedicineById = async (medicineId) => {
  const response = await api.get(`/medicines/${medicineId}`);
  return normalizeMedicine(response.data);
};

export const fetchPatientProfile = async () => {
  const response = await api.get("/patient/profile");
  return response.data;
};

export const createOrder = async (payload) => {
  const response = await api.post("/orders", payload);
  return response.data;
};

export const createPayHereSession = async (payload) => {
  const response = await api.post("/orders/payhere/session", payload);
  return response.data;
};

export const createStripeSession = async (payload) => {
  const response = await api.post("/orders/stripe/session", {
    ...payload,
    origin: window.location.origin,
  });
  return response.data;
};

export const verifyStripeSession = async (orderId, sessionId) => {
  const response = await api.post(`/orders/${orderId}/stripe/verify`, { sessionId });
  return response.data;
};



export const fetchMyOrders = async () => {
  const response = await api.get("/orders/myorders");
  return response.data;
};

export const fetchOrderById = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

export const getCheckoutDefaults = (userInfo = {}, patientProfile = {}) => ({
  fullName:
    patientProfile.fullName ||
    userInfo.name ||
    userInfo.fullName ||
    "",
  email: userInfo.email || "",
  phone: patientProfile.phone || userInfo.phone || "",
  addressLine1: patientProfile.address || "",
  addressLine2: "",
  city: "Colombo",
  postalCode: "",
  country: DEFAULT_COUNTRY,
  deliveryNotes: "",
});
