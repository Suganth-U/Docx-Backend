import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaMinus,
  FaPlus,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import {
  clearCart,
  getCart,
  getCartSubtotal,
  removeFromCart,
  updateCartQuantity,
} from "@/shared/lib/storage";
import { requirePatientSessionForNavigation } from "@/shared/lib/authSession";
import {
  DEFAULT_SHIPPING_FEE,
  FALLBACK_MEDICINE_IMAGE,
  PHARMACY_THEME,
  formatCurrency,
} from "@/shared/features/Epharmacy/pharmacyShared";
import { hasPrescriptionProof } from "@/shared/features/Epharmacy/pharmacyClient";

const Page = styled.div`
  min-height: 100vh;
  background: white;
`;

const Container = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  padding: 40px 24px 80px;
`;

const Breadcrumb = styled.div`
  color: ${PHARMACY_THEME.inkSoft};
  font-size: 0.9rem;
  margin-bottom: 24px;
  
  span {
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
  
  .current {
    color: ${PHARMACY_THEME.brand};
  }
`;

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 40px 0;
  color: ${PHARMACY_THEME.ink};
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 40px;

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;
  }
`;

const MainCart = styled.div`
  display: flex;
  flex-direction: column;
`;

const ResponsiveTableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;

  th {
    text-align: left;
    padding: 16px 0;
    font-weight: 700;
    font-size: 0.95rem;
    color: ${PHARMACY_THEME.ink};
    border-bottom: 1px solid ${PHARMACY_THEME.lineStrong};
  }

  td {
    padding: 24px 0;
    border-bottom: 1px solid ${PHARMACY_THEME.lineStrong};
    vertical-align: middle;
  }
`;

const ProductCell = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  .remove-btn {
    background: transparent;
    border: none;
    color: ${PHARMACY_THEME.inkSoft};
    cursor: pointer;
    font-size: 1rem;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      color: ${PHARMACY_THEME.danger};
    }
  }

  img {
    width: 60px;
    height: 60px;
    object-fit: contain;
    background: transparent;
    border-radius: 8px;
  }

  .details {
    display: flex;
    flex-direction: column;
    
    .name {
      font-size: 0.95rem;
      color: ${PHARMACY_THEME.ink};
      margin-bottom: 4px;
    }
    
    .meta {
      font-size: 0.8rem;
      color: ${PHARMACY_THEME.inkSoft};
    }
  }
`;

const QtySelector = styled.div`
  display: inline-flex;
  align-items: center;
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 20px;
  width: fit-content;

  button {
    border: none;
    background: transparent;
    width: 32px;
    height: 32px;
    cursor: pointer;
    color: ${PHARMACY_THEME.inkSoft};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  span {
    min-width: 24px;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 500;
  }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  flex-wrap: wrap;
  gap: 20px;
`;

const CouponBox = styled.div`
  display: flex;
  gap: 12px;

  input {
    padding: 12px 16px;
    border: 1px solid ${PHARMACY_THEME.lineStrong};
    border-radius: 24px;
    background: ${PHARMACY_THEME.surface};
    outline: none;
    min-width: 200px;
    font-size: 0.9rem;
  }

  button {
    background: ${PHARMACY_THEME.brand};
    color: white;
    border: none;
    border-radius: 24px;
    padding: 12px 24px;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.5px;
  }
`;

const CartButtons = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  button {
    border: 1px solid ${PHARMACY_THEME.ink};
    background: transparent;
    color: ${PHARMACY_THEME.ink};
    border-radius: 24px;
    padding: 12px 24px;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.5px;
    white-space: nowrap;

    &.update {
      background: #b3cdc8; // similar to image
      border-color: transparent;
      color: white;
    }
  }
`;

const Sidebar = styled.div`
  border: 1px solid ${PHARMACY_THEME.brand};
  border-radius: 8px;
  padding: 32px;
  height: fit-content;

  h2 {
    margin: 0 0 24px 0;
    font-size: 1.4rem;
    color: ${PHARMACY_THEME.ink};
  }
`;

const TotalsRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid ${PHARMACY_THEME.lineStrong};
  font-size: 0.95rem;

  &:last-of-type {
    border-bottom: none;
    margin-bottom: 24px;
  }

  .label {
    color: ${PHARMACY_THEME.ink};
    font-weight: 500;
  }

  .value {
    font-weight: 500;
    text-align: right;
  }

  &.total {
    font-weight: 700;
    .value {
      color: ${PHARMACY_THEME.ink};
    }
  }
`;

const CheckoutButton = styled.button`
  width: 100%;
  background: ${PHARMACY_THEME.brand};
  color: white;
  border: none;
  border-radius: 24px;
  padding: 16px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const PrescriptionNotice = styled.div`
  border-radius: 8px;
  border: 1px solid ${PHARMACY_THEME.dangerSoft};
  background: #fff7ed;
  color: ${PHARMACY_THEME.inkSoft};
  padding: 16px;
  margin-top: 24px;
  display: grid;
  gap: 10px;
  font-size: 0.9rem;

  strong {
    color: ${PHARMACY_THEME.ink};
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  button {
    border: none;
    border-radius: 24px;
    background: ${PHARMACY_THEME.ink};
    color: white;
    padding: 10px 16px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.8rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 64px 28px;

  h2 {
    margin-bottom: 8px;
    font-size: 1.8rem;
  }

  p {
    margin: 0 auto 20px;
    max-width: 54ch;
    color: ${PHARMACY_THEME.inkSoft};
    line-height: 1.7;
  }

  button {
    border: none;
    border-radius: 18px;
    background: ${PHARMACY_THEME.brand};
    color: white;
    cursor: pointer;
    padding: 14px 24px;
    font-weight: 800;
  }
`;

const buildPrescriptionRequestPath = (item = {}) => {
  const params = new URLSearchParams({
    medicineId: item.medicineId || "",
    qty: String(Math.max(1, Number(item.qty || 1))),
    returnTo: "/cart",
  });
  return `/request-prescription?${params.toString()}`;
};

const Cart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const syncCart = () => setItems(getCart());
    syncCart();
    window.addEventListener("cartUpdated", syncCart);
    return () => window.removeEventListener("cartUpdated", syncCart);
  }, []);

  const subtotal = getCartSubtotal();
  const shipping = items.length ? DEFAULT_SHIPPING_FEE : 0;
  const total = subtotal + shipping;
  const missingPrescriptionItems = items.filter(
    (item) => item.requiresPrescription && !hasPrescriptionProof(item)
  );
  const hasMissingPrescription = missingPrescriptionItems.length > 0;

  if (!items.length) {
    return (
      <Page>
        <Navigationbar />
        <Container>
          <EmptyState>
            <h2>Your pharmacy cart is empty</h2>
            <p>
              Save medicines to your cart while you compare brands, review prescription
              requirements, and prepare delivery details.
            </p>
            <button onClick={() => navigate("/pharmacy")} type="button">
              Browse medicines
            </button>
          </EmptyState>
        </Container>
        <Footer />
      </Page>
    );
  }

  return (
    <Page>
      <Navigationbar />
      <Container>
        <Breadcrumb>
          <span onClick={() => navigate("/")}>Home</span> &gt; <span className="current">Cart</span>
        </Breadcrumb>
        <Title>Cart</Title>

        <Layout>
          <MainCart>
            <ResponsiveTableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.medicineId || item.name}>
                      <td>
                        <ProductCell>
                          <button
                            className="remove-btn"
                            onClick={() => removeFromCart(item.medicineId || item.name)}
                            type="button"
                          >
                            <FaTimes />
                          </button>
                          <img
                            alt={item.name}
                            onError={(event) => {
                              event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                            }}
                            src={item.image}
                          />
                          <div className="details">
                            <span className="name">{item.name}</span>
                            {item.requiresPrescription && (
                              <span className="meta">
                                {hasPrescriptionProof(item) ? "Prescription ready" : "Prescription needed"}
                              </span>
                            )}
                          </div>
                        </ProductCell>
                      </td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>
                        <QtySelector>
                          <button
                            onClick={() => updateCartQuantity(item.medicineId || item.name, -1)}
                            type="button"
                          >
                            <FaMinus size={10} />
                          </button>
                          <span>{item.qty}</span>
                          <button
                            onClick={() => updateCartQuantity(item.medicineId || item.name, 1)}
                            type="button"
                          >
                            <FaPlus size={10} />
                          </button>
                        </QtySelector>
                      </td>
                      <td>{formatCurrency(item.price * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ResponsiveTableContainer>

            <ActionRow>
              <CouponBox>
                <input placeholder="Coupon code" type="text" />
                <button type="button">APPLY COUPON</button>
              </CouponBox>
              <CartButtons>
                <button onClick={clearCart} type="button">
                  EMPTY CART
                </button>
                <button className="update" type="button">
                  UPDATE CART
                </button>
              </CartButtons>
            </ActionRow>
          </MainCart>

          <div>
            <Sidebar>
              <h2>Cart totals</h2>
              
              <TotalsRow>
                <span className="label">Subtotal</span>
                <span className="value">{formatCurrency(subtotal)}</span>
              </TotalsRow>
              
              <TotalsRow>
                <span className="label">Estimated delivery</span>
                <span className="value">{formatCurrency(shipping)}</span>
              </TotalsRow>
              
              <TotalsRow className="total">
                <span className="label">Total</span>
                <span className="value">{formatCurrency(total)}</span>
              </TotalsRow>

              <CheckoutButton
                onClick={() => requirePatientSessionForNavigation(navigate, "/checkout")}
                type="button"
              >
                Proceed to checkout
              </CheckoutButton>
            </Sidebar>

            {hasMissingPrescription && (
              <PrescriptionNotice>
                <strong>Prescription required at checkout</strong>
                <span>
                  {missingPrescriptionItems.map((item) => item.name).join(", ")} need a
                  prescription. Checkout will ask you to upload one or request a DocX
                  prescription first.
                </span>
                <div className="actions">
                  <button
                    onClick={() => requirePatientSessionForNavigation(navigate, "/checkout")}
                    type="button"
                  >
                    Upload at checkout
                  </button>
                  <button
                    onClick={() =>
                      requirePatientSessionForNavigation(
                        navigate,
                        buildPrescriptionRequestPath(missingPrescriptionItems[0])
                      )
                    }
                    type="button"
                  >
                    Request DocX prescription
                  </button>
                </div>
              </PrescriptionNotice>
            )}
          </div>
        </Layout>
      </Container>
      <Footer />
    </Page>
  );
};

export default Cart;
