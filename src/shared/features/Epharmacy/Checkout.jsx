import React, { useEffect, useState, useMemo, useRef } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaFilePrescription, FaNotesMedical, FaUpload, FaChevronDown, FaSearch } from "react-icons/fa";
import StatusModal from "@/shared/components/common/StatusModal";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import {
  createOrder,
  createStripeSession,
  fetchPatientProfile,
  getCheckoutDefaults,
  hasPrescriptionProof,
  toOrderLineItem,
  uploadPrescriptionProof,
} from "@/shared/features/Epharmacy/pharmacyClient";
import {
  DEFAULT_COUNTRY,
  formatCurrency,
  PHARMACY_THEME
} from "@/shared/features/Epharmacy/pharmacyShared";
import {
  attachPrescriptionUploadToCartItem,
  clearCart,
  clearPendingPaymentOrder,
  getCart,
  getCartSubtotal,
  markPendingPaymentOrder,
} from "@/shared/lib/storage";
import { getStoredAuthSession } from "@/shared/lib/authSession";

const SL_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
  "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
];

const DEFAULT_SHIPPING_FEE = 350;
const EXPRESS_SURCHARGE = 500;
const MAX_PRESCRIPTION_FILE_SIZE = 5 * 1024 * 1024;

// Province-wise shipping from Colombo store. Min 350, Max 500.
const DISTRICT_SHIPPING = {
  // Western Province — closest
  colombo: 350, gampaha: 350, kalutara: 380,
  // Sabaragamuwa Province
  ratnapura: 400, kegalle: 400,
  // Central Province
  kandy: 420, matale: 420, "nuwara eliya": 430,
  // Southern Province
  galle: 420, matara: 430, hambantota: 450,
  // North Western Province
  kurunegala: 400, puttalam: 420,
  // North Central Province
  anuradhapura: 460, polonnaruwa: 470,
  // Uva Province
  badulla: 470, monaragala: 480,
  // Eastern Province
  ampara: 480, batticaloa: 490, trincomalee: 490,
  // Northern Province — farthest
  jaffna: 500, kilinochchi: 500, mannar: 500, mullaitivu: 500, vavuniya: 490,
};

const getShippingFee = (country, district) => {
  const c = (country || "").toLowerCase().trim();
  if (c === "sri lanka" || c === "lk" || c === "srilanka") {
    const d = (district || "").toLowerCase().trim();
    return DISTRICT_SHIPPING[d] || DEFAULT_SHIPPING_FEE;
  }
  return DEFAULT_SHIPPING_FEE;
};

const Page = styled.div`
  min-height: 100vh;
  background: #ffffff;
  color: #333333;
  font-family: "Inter", sans-serif;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 40px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FormSection = styled.div`
  h2 {
    font-size: 1.4rem;
    margin-top: 0;
    margin-bottom: 24px;
    color: #111;
  }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.9rem;
    color: #444;
    font-weight: 600;
  }

  input, select, textarea {
    padding: 12px 14px;
    border: 1px solid ${(props) => props.$error ? '#e53e3e' : '#ddd'};
    border-radius: 4px;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: ${(props) => props.$error ? '#e53e3e' : '#6b5ca5'};
      box-shadow: 0 0 0 3px ${(props) => props.$error ? 'rgba(229,62,62,0.1)' : 'rgba(107,92,165,0.1)'};
    }
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }
`;

const InlineError = styled.span`
  font-size: 0.8rem;
  color: #e53e3e;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '⚠';
    font-size: 0.75rem;
  }
`;

const CheckboxField = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: #222;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;

  input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

const OrderSection = styled.div`
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 30px;
  align-self: start;

  h3 {
    margin-top: 0;
    margin-bottom: 24px;
    font-size: 1.2rem;
    color: #111;
  }
`;

const OrderTable = styled.div`
  width: 100%;
  margin-bottom: 30px;
  font-size: 0.95rem;

  .row {
    display: flex;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid #ddd;
  }

  .header {
    font-weight: 700;
    color: #555;
    border-bottom: 2px solid #ddd;
  }

  .product-name {
    color: #666;
    max-width: 70%;
    strong {
      color: #222;
    }
  }
  
  .total-row {
    font-weight: 700;
    color: #111;
  }

  .shipment-row {
    display: flex;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid #ddd;

    .shipment-options {
      text-align: right;
      label {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-end;
        margin-bottom: 6px;
        cursor: pointer;
        color: #555;
      }
    }
  }
`;

const PrescriptionGate = styled.div`
  border: 1px solid ${PHARMACY_THEME.warningSoft};
  background: #fff8ed;
  border-radius: 8px;
  padding: 18px;
  margin: 0 0 24px;
  display: grid;
  gap: 14px;

  .gate-heading {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    color: ${PHARMACY_THEME.ink};

    svg {
      color: ${PHARMACY_THEME.warning};
      margin-top: 2px;
      flex: 0 0 auto;
    }

    strong {
      display: block;
      font-size: 0.98rem;
      margin-bottom: 4px;
    }

    p {
      margin: 0;
      color: ${PHARMACY_THEME.inkSoft};
      font-size: 0.88rem;
      line-height: 1.5;
    }
  }

  .rx-item {
    background: #fff;
    border: 1px solid ${PHARMACY_THEME.line};
    border-radius: 8px;
    padding: 14px;
    display: grid;
    gap: 10px;
  }

  .rx-title {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: ${PHARMACY_THEME.ink};
    font-weight: 700;
  }

  .rx-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  button,
  .upload-button {
    border: 1px solid ${PHARMACY_THEME.brand};
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 0.86rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .upload-button {
    background: ${PHARMACY_THEME.brand};
    color: white;
  }

  .request-button {
    background: white;
    color: ${PHARMACY_THEME.brand};
  }

  input[type="file"] {
    display: none;
  }
`;

const PrescriptionReady = styled.div`
  border: 1px solid ${PHARMACY_THEME.line};
  background: ${PHARMACY_THEME.brandSoft};
  color: ${PHARMACY_THEME.ink};
  border-radius: 8px;
  padding: 14px;
  margin: 0 0 24px;
  display: grid;
  gap: 8px;
  font-size: 0.9rem;

  strong {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  svg {
    color: ${PHARMACY_THEME.success};
  }

  span {
    color: ${PHARMACY_THEME.inkSoft};
  }
`;

const PaymentMethods = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const PaymentOption = styled.div`
  background: #fff;
  border: 1px solid #ddd;
  padding: 16px;
  border-radius: 4px;

  label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .description {
    margin-top: 10px;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.5;
    padding-left: 26px;
  }
`;

const PrivacyText = styled.p`
  font-size: 0.85rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;

  a {
    color: #000;
    font-weight: 600;
    text-decoration: none;
  }
`;

const TermsCheckbox = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: #444;
  cursor: pointer;
  margin-bottom: 24px;
  line-height: 1.4;

  input {
    margin-top: 3px;
    cursor: pointer;
  }
  
  a {
    color: #6b5ca5;
    text-decoration: none;
  }
`;

const PlaceOrderBtn = styled.button`
  width: 100%;
  background: #6b5ca5;
  color: white;
  border: none;
  padding: 16px;
  font-size: 1.05rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;

  &:hover:not(:disabled) {
    background: #5a4d8c;
    box-shadow: 0 6px 20px rgba(107,92,165,0.3);
  }

  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
`;

const DropdownWrapper = styled.div`
  position: relative;
`;

const DropdownTrigger = styled.button`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${(props) => props.$error ? '#e53e3e' : '#ddd'};
  border-radius: 4px;
  font-size: 0.95rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${(props) => props.$empty ? '#9ca3af' : '#111'};
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${(props) => props.$error ? '#e53e3e' : '#6b5ca5'};
    box-shadow: 0 0 0 3px ${(props) => props.$error ? 'rgba(229,62,62,0.1)' : 'rgba(107,92,165,0.1)'};
  }

  svg {
    color: #9ca3af;
    font-size: 0.85rem;
    flex-shrink: 0;
    transition: transform 0.2s;
    transform: ${(props) => props.$open ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const DropdownPanel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 32px rgba(0,0,0,0.12);
  z-index: 100;
  overflow: hidden;
`;

const DropdownSearch = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;

  svg {
    color: #9ca3af;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  input {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    font-size: 0.9rem;
    width: 100%;
    color: #111;

    &::placeholder { color: #9ca3af; }
  }
`;

const DropdownList = styled.ul`
  margin: 0;
  padding: 6px 0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(107,92,165,0.25); border-radius: 999px; }
`;

const DropdownItem = styled.li`
  padding: 10px 16px;
  font-size: 0.92rem;
  cursor: pointer;
  color: #333;
  transition: background 0.15s;

  &:hover, &[data-active="true"] {
    background: rgba(107,92,165,0.08);
    color: #6b5ca5;
    font-weight: 600;
  }
`;

const DropdownEmpty = styled.li`
  padding: 14px 16px;
  font-size: 0.9rem;
  color: #9ca3af;
  text-align: center;
`;

const BottomWave = styled.div`
  height: 40px;
  background-image: radial-gradient(circle at 10px 0, transparent 10px, #f9f9f9 11px);
  background-size: 20px 20px;
  background-repeat: repeat-x;
  margin-top: 40px;
`;

const Checkout = () => {
  const navigate = useNavigate();
  const districtRef = useRef(null);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("STRIPE");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploadingPrescriptionId, setUploadingPrescriptionId] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "info",
    message: "",
  });
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: DEFAULT_COUNTRY,
    deliveryNotes: "",
    createAccount: false,
    shipToDifferent: false
  });

  // Close district dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (districtRef.current && !districtRef.current.contains(e.target)) {
        setDistrictOpen(false);
        setDistrictSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const syncCart = () => setItems(getCart());
    syncCart();
    window.addEventListener("cartUpdated", syncCart);
    return () => window.removeEventListener("cartUpdated", syncCart);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDefaults = async () => {
      setProfileLoading(true);
      const userInfo = getStoredAuthSession();
      try {
        const patientProfile = await fetchPatientProfile();
        if (!cancelled) {
          const defaults = getCheckoutDefaults(userInfo, patientProfile);
          const nameParts = (defaults.fullName || "").split(" ");
          setFormData((current) => ({
            ...current,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: defaults.email || "",
            phone: defaults.phone || "",
            addressLine1: defaults.addressLine1 || "",
            addressLine2: defaults.addressLine2 || "",
            city: defaults.city || "",
            postalCode: defaults.postalCode || "",
            country: defaults.country || DEFAULT_COUNTRY,
          }));
        }
      } catch {
        // Ignore defaults loading errors; checkout can continue with manual data.
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = getCartSubtotal();
  const standardShipping = items.length ? getShippingFee(formData.country, formData.state) : 0;
  const shippingPrice = items.length ? (standardShipping + (expressDelivery ? EXPRESS_SURCHARGE : 0)) : 0;
  const taxPrice = 0;
  const totalPrice = subtotal + shippingPrice + taxPrice;
  const prescriptionItems = useMemo(
    () => items.filter((item) => item.requiresPrescription),
    [items]
  );
  const missingPrescriptionItems = useMemo(
    () => prescriptionItems.filter((item) => !hasPrescriptionProof(item)),
    [prescriptionItems]
  );
  const hasMissingPrescription = missingPrescriptionItems.length > 0;

  const buildPrescriptionRequestPath = (item = {}) => {
    const params = new URLSearchParams({
      medicineId: item.medicineId || "",
      qty: String(Math.max(1, Number(item.qty || 1))),
      returnTo: "/checkout",
    });
    return `/request-prescription?${params.toString()}`;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    // Clear error as user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const FIELD_LABELS = {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email address',
    phone: 'Phone',
    addressLine1: 'Street address',
    city: 'Town / City',
    state: 'State / District',
    postalCode: 'ZIP Code',
    country: 'Country / Region',
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    if (!FIELD_LABELS[name]) return; // only validate required fields
    if (!String(value || '').trim()) {
      setFieldErrors((prev) => ({ ...prev, [name]: `${FIELD_LABELS[name]} is required` }));
    }
  };

  const handlePrescriptionUpload = async (item, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > MAX_PRESCRIPTION_FILE_SIZE) {
      setStatusModal({
        isOpen: true,
        type: "error",
        message: "Prescription file must be 5 MB or smaller.",
      });
      return;
    }

    const itemKey = item.medicineId || item.name;
    setUploadingPrescriptionId(itemKey);

    try {
      const patientName = `${formData.firstName} ${formData.lastName}`.trim();
      const prescriptionUpload = await uploadPrescriptionProof(file, {
        patientName,
        patientPhone: formData.phone,
        notes: formData.deliveryNotes,
      });

      if (!prescriptionUpload) {
        throw new Error("Please choose a valid prescription image or PDF.");
      }

      attachPrescriptionUploadToCartItem(itemKey, prescriptionUpload);
      setStatusModal({
        isOpen: true,
        type: "success",
        message: `Prescription uploaded for ${item.name}.`,
      });
    } catch (error) {
      setStatusModal({
        isOpen: true,
        type: "error",
        message:
          error.response?.data?.message ||
          error.message ||
          "Prescription upload failed. Please try again.",
      });
    } finally {
      setUploadingPrescriptionId("");
    }
  };

  const buildPayload = () => ({
    orderItems: items.map(toOrderLineItem),
    paymentMethod,
    fullName: `${formData.firstName} ${formData.lastName}`.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    shippingAddress: {
      addressLine1: formData.addressLine1.trim(),
      addressLine2: formData.addressLine2.trim(),
      city: formData.city.trim(),
      postalCode: formData.postalCode.trim(),
      country: formData.country.trim(),
      deliveryNotes: formData.deliveryNotes.trim(),
    },
    itemsPrice: subtotal,
    shippingPrice,
    taxPrice,
    totalPrice,
    currency: "LKR",
  });

  const validate = () => {
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
    ];

    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!String(formData[field] || '').trim()) {
        newErrors[field] = `${FIELD_LABELS[field] || field} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      // Scroll to first error
      const firstErrorField = document.querySelector('input[aria-invalid="true"], select[aria-invalid="true"]');
      if (firstErrorField) firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    if (!termsAccepted) {
      setStatusModal({ isOpen: true, type: "error", message: "You must accept the terms and conditions." });
      return false;
    }

    if (!items.length) {
      setStatusModal({ isOpen: true, type: "error", message: "Your cart is empty." });
      return false;
    }

    if (hasMissingPrescription) {
      setStatusModal({ isOpen: true, type: "error", message: `Before checkout, upload a prescription or request a DocX prescription for ${missingPrescriptionItems[0].name}.` });
      return false;
    }

    return true;
  };

  const handleCodCheckout = async () => {
    const order = await createOrder(buildPayload());
    clearPendingPaymentOrder();
    clearCart();
    navigate(`/orders/${order._id}?placed=1`);
  };

  const redirectToGateway = (url) => {
    if (!url) {
      throw new Error("Payment gateway did not return a checkout URL.");
    }
    window.location.assign(url);
  };

  const handleStripeCheckout = async () => {
    const session = await createStripeSession(buildPayload());
    markPendingPaymentOrder(session.orderId);
    redirectToGateway(session.checkoutUrl);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (paymentMethod === "DEMO") {
        await handleCodCheckout();
      } else {
        await handleStripeCheckout();
      }
    } catch (error) {
      setStatusModal({
        isOpen: true,
        type: "error",
        message:
          error.response?.data?.message ||
          error.message ||
          "Checkout could not be completed right now.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length && !profileLoading) {
    return (
      <Page>
        <Navigationbar />
        <Container>
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <h2>Your cart is empty</h2>
            <p>Add medicines to your cart first.</p>
            <button onClick={() => navigate("/pharmacy")} style={{ padding: "10px 20px", background: "#a855f7", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Back to catalog
            </button>
          </div>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal((current) => ({ ...current, isOpen: false }))}
        type={statusModal.type}
        message={statusModal.message}
      />
      <Navigationbar />
      
      <Container>


        <Layout>
          <FormSection>
            <h2>Billing details</h2>
            <FieldGrid>
              <Field $error={!!fieldErrors.firstName}>
                <label>First name *</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.firstName} />
                {fieldErrors.firstName && <InlineError>{fieldErrors.firstName}</InlineError>}
              </Field>
              <Field $error={!!fieldErrors.lastName}>
                <label>Last name *</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.lastName} />
                {fieldErrors.lastName && <InlineError>{fieldErrors.lastName}</InlineError>}
              </Field>
            </FieldGrid>

            <Field style={{ marginBottom: "20px" }}>
              <label>Company name (optional)</label>
              <input name="companyName" value={formData.companyName} onChange={handleChange} />
            </Field>

            <Field $error={!!fieldErrors.country} style={{ marginBottom: "20px" }}>
              <label>Country / Region *</label>
              <input name="country" value={formData.country} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.country} />
              {fieldErrors.country && <InlineError>{fieldErrors.country}</InlineError>}
            </Field>

            <Field $error={!!fieldErrors.addressLine1} style={{ marginBottom: "20px" }}>
              <label>Street address *</label>
              <input name="addressLine1" placeholder="House number and street name" value={formData.addressLine1} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.addressLine1} />
              {fieldErrors.addressLine1 && <InlineError>{fieldErrors.addressLine1}</InlineError>}
            </Field>
            <Field style={{ marginBottom: "20px" }}>
              <input name="addressLine2" placeholder="Apartment, suite, unit, etc. (optional)" value={formData.addressLine2} onChange={handleChange} />
            </Field>

            <Field $error={!!fieldErrors.city} style={{ marginBottom: "20px" }}>
              <label>Town / City *</label>
              <input name="city" value={formData.city} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.city} />
              {fieldErrors.city && <InlineError>{fieldErrors.city}</InlineError>}
            </Field>

            <Field $error={!!fieldErrors.state} style={{ marginBottom: "20px" }}>
              <label>District *</label>
              <DropdownWrapper ref={districtRef}>
                <DropdownTrigger
                  type="button"
                  $error={!!fieldErrors.state}
                  $empty={!formData.state}
                  $open={districtOpen}
                  onClick={() => { setDistrictOpen((o) => !o); setDistrictSearch(""); }}
                  aria-invalid={!!fieldErrors.state}
                >
                  <span>{formData.state || "Select district"}</span>
                  <FaChevronDown />
                </DropdownTrigger>
                {districtOpen && (
                  <DropdownPanel>
                    <DropdownSearch>
                      <FaSearch />
                      <input
                        autoFocus
                        placeholder="Search district..."
                        value={districtSearch}
                        onChange={(e) => setDistrictSearch(e.target.value)}
                      />
                    </DropdownSearch>
                    <DropdownList>
                      {SL_DISTRICTS.filter((d) =>
                        d.toLowerCase().includes(districtSearch.toLowerCase())
                      ).length === 0 ? (
                        <DropdownEmpty>No districts found</DropdownEmpty>
                      ) : (
                        SL_DISTRICTS.filter((d) =>
                          d.toLowerCase().includes(districtSearch.toLowerCase())
                        ).map((district) => (
                          <DropdownItem
                            key={district}
                            data-active={formData.state === district}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, state: district }));
                              if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: "" }));
                              setDistrictOpen(false);
                              setDistrictSearch("");
                            }}
                          >
                            {district}
                          </DropdownItem>
                        ))
                      )}
                    </DropdownList>
                  </DropdownPanel>
                )}
              </DropdownWrapper>
              {fieldErrors.state && <InlineError>{fieldErrors.state}</InlineError>}
            </Field>

            <Field $error={!!fieldErrors.postalCode} style={{ marginBottom: "20px" }}>
              <label>ZIP Code *</label>
              <input name="postalCode" value={formData.postalCode} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.postalCode} />
              {fieldErrors.postalCode && <InlineError>{fieldErrors.postalCode}</InlineError>}
            </Field>

            <Field $error={!!fieldErrors.phone} style={{ marginBottom: "20px" }}>
              <label>Phone *</label>
              <input name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.phone} />
              {fieldErrors.phone && <InlineError>{fieldErrors.phone}</InlineError>}
            </Field>

            <Field $error={!!fieldErrors.email} style={{ marginBottom: "30px" }}>
              <label>Email address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email && <InlineError>{fieldErrors.email}</InlineError>}
            </Field>

            <CheckboxField>
              <input type="checkbox" name="createAccount" checked={formData.createAccount} onChange={handleChange} /> Create an account?
            </CheckboxField>
            
            <CheckboxField>
              <input type="checkbox" name="shipToDifferent" checked={formData.shipToDifferent} onChange={handleChange} /> Ship to a different address?
            </CheckboxField>

            <Field>
              <label>Order notes (optional)</label>
              <textarea name="deliveryNotes" placeholder="Enter delivery notes" value={formData.deliveryNotes} onChange={handleChange} />
            </Field>
          </FormSection>

          <OrderSection>
            <h3>Your order</h3>
            <OrderTable>
              <div className="row header">
                <span>Product</span>
                <span>Subtotal</span>
              </div>
              {items.map(item => (
                <div className="row" key={item.medicineId || item.name}>
                  <span className="product-name">
                    {item.name} <strong>× {item.qty}</strong>
                    {item.requiresPrescription && (
                      <small style={{ display: "block", marginTop: "4px", color: hasPrescriptionProof(item) ? PHARMACY_THEME.success : PHARMACY_THEME.warning }}>
                        {hasPrescriptionProof(item)
                          ? item.prescriptionUpload?.fileName || "DocX prescription linked"
                          : "Prescription needed"}
                      </small>
                    )}
                  </span>
                  <span>{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="shipment-row">
                <span>Delivery</span>
                <div className="shipment-options">
                  <label style={{ color: !expressDelivery ? '#6b5ca5' : '#555', fontWeight: !expressDelivery ? 700 : 400 }}>
                    Standard&nbsp;({formatCurrency(standardShipping)})
                    <input
                      type="radio"
                      name="delivery"
                      checked={!expressDelivery}
                      onChange={() => setExpressDelivery(false)}
                    />
                  </label>
                  <label style={{ color: expressDelivery ? '#6b5ca5' : '#555', fontWeight: expressDelivery ? 700 : 400 }}>
                    Express&nbsp;({formatCurrency(standardShipping + EXPRESS_SURCHARGE)})
                    <input
                      type="radio"
                      name="delivery"
                      checked={expressDelivery}
                      onChange={() => setExpressDelivery(true)}
                    />
                  </label>
                  {expressDelivery && (
                    <small style={{ display: 'block', marginTop: 4, color: '#6b5ca5', fontSize: '0.78rem' }}>
                      ⚡ Priority dispatch — delivered faster
                    </small>
                  )}
                </div>
              </div>

              <div className="row total-row">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </OrderTable>

            {hasMissingPrescription ? (
              <PrescriptionGate>
                <div className="gate-heading">
                  <FaFilePrescription />
                  <div>
                    <strong>Prescription required before payment</strong>
                    <p>
                      Upload an existing prescription for each item below. If you do not
                      have one, request a DocX prescription and continue after it is issued.
                    </p>
                  </div>
                </div>

                {missingPrescriptionItems.map((item) => (
                  <div className="rx-item" key={item.medicineId || item.name}>
                    <div className="rx-title">
                      <span>{item.name}</span>
                      <span>× {item.qty}</span>
                    </div>
                    <div className="rx-actions">
                      <label className="upload-button">
                        <FaUpload />
                        {uploadingPrescriptionId === (item.medicineId || item.name)
                          ? "Uploading..."
                          : "Upload prescription"}
                        <input
                          accept="image/*,.pdf"
                          disabled={Boolean(uploadingPrescriptionId)}
                          onChange={(event) => handlePrescriptionUpload(item, event)}
                          type="file"
                        />
                      </label>
                      <button
                        className="request-button"
                        onClick={() => navigate(buildPrescriptionRequestPath(item))}
                        type="button"
                      >
                        <FaNotesMedical /> Request DocX prescription
                      </button>
                    </div>
                  </div>
                ))}
              </PrescriptionGate>
            ) : prescriptionItems.length ? (
              <PrescriptionReady>
                <strong>
                  <FaCheckCircle /> Prescription proof attached
                </strong>
                <span>
                  Your prescription-required medicines are ready for pharmacist review
                  after the order is placed.
                </span>
              </PrescriptionReady>
            ) : null}

            <PaymentMethods>
              <PaymentOption>
                <label>
                  <input type="radio" name="payment" checked={paymentMethod === "STRIPE"} onChange={() => setPaymentMethod("STRIPE")} /> Secure card payment (Stripe)
                </label>
              </PaymentOption>
              <PaymentOption>
                <label>
                  <input type="radio" name="payment" checked={paymentMethod === "DEMO"} onChange={() => setPaymentMethod("DEMO")} /> Demo Payment (Instantly complete order)
                </label>
              </PaymentOption>
            </PaymentMethods>

            <PrivacyText>
              Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our <a href="#">privacy policy</a>.
            </PrivacyText>

            <TermsCheckbox>
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} /> 
              <span>I have read and agree to the website <a href="#">terms and conditions</a> *</span>
            </TermsCheckbox>

            <PlaceOrderBtn disabled={profileLoading || submitting || !items.length || hasMissingPrescription} onClick={handleSubmit}>
              {hasMissingPrescription ? "Attach prescription first" : "Place order"}
            </PlaceOrderBtn>
          </OrderSection>
        </Layout>
      </Container>
      
      <BottomWave />
    </Page>
  );
};

export default Checkout;
