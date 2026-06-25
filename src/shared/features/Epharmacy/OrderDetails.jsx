import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCreditCard,
  FaSyncAlt,
  FaTruck,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import {
  fetchOrderById,
  verifyStripeSession,
} from "@/shared/features/Epharmacy/pharmacyClient";
import {
  FALLBACK_MEDICINE_IMAGE,
  PHARMACY_THEME,
  formatCurrency,
  formatDateTime,
  getOrderTone,
  getPaymentMethodLabel,
} from "@/shared/features/Epharmacy/pharmacyShared";
import {
  clearCart,
  clearPendingPaymentOrder,
  getPendingPaymentOrder,
  hasPatientSession,
} from "@/shared/lib/storage";

const Page = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(23, 66, 160, 0.08), transparent 32%),
    linear-gradient(180deg, #f8f9fc 0%, #eef3fb 100%);
`;

const Container = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 24px 72px;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 22px;
`;

const BackButton = styled.button`
  border: none;
  background: white;
  border-radius: 16px;
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  cursor: pointer;
  padding: 14px 16px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;

const Hero = styled.section`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 32px;
  box-shadow: ${PHARMACY_THEME.shadow};
  padding: 28px;
  display: grid;
  gap: 18px;
  margin-bottom: 22px;
`;

const StatusPill = styled.span`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  padding: 10px 14px;
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
  font-weight: 800;
`;

const HeroText = styled.div`
  h1 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3rem);
    letter-spacing: -0.05em;
  }

  p {
    margin: 10px 0 0;
    color: ${PHARMACY_THEME.inkSoft};
    line-height: 1.75;
    max-width: 70ch;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  button {
    border: none;
    border-radius: 18px;
    cursor: pointer;
    padding: 14px 18px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .primary {
    background: ${PHARMACY_THEME.ink};
    color: white;
  }

  .secondary {
    background: ${PHARMACY_THEME.surface};
    color: ${PHARMACY_THEME.ink};
    border: 1px solid ${PHARMACY_THEME.lineStrong};
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.9fr);
  gap: 22px;

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 30px;
  box-shadow: ${PHARMACY_THEME.shadowSoft};
  overflow: hidden;
`;

const SectionHeader = styled.div`
  padding: 22px 24px;
  border-bottom: 1px solid ${PHARMACY_THEME.lineStrong};

  h2 {
    margin: 0 0 6px;
    font-size: 1.2rem;
  }

  p {
    margin: 0;
    color: ${PHARMACY_THEME.inkMuted};
    line-height: 1.6;
  }
`;

const SectionBody = styled.div`
  padding: 24px;
  display: grid;
  gap: 18px;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const MetaCard = styled.div`
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 22px;
  background: ${PHARMACY_THEME.surface};
  padding: 18px;

  span {
    display: block;
    margin-bottom: 6px;
    color: ${PHARMACY_THEME.inkMuted};
    text-transform: uppercase;
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    font-weight: 800;
  }

  strong {
    font-size: 1rem;
  }

  p {
    margin: 8px 0 0;
    color: ${PHARMACY_THEME.inkSoft};
    line-height: 1.7;
  }
`;

const ItemList = styled.div`
  display: grid;
  gap: 12px;
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 14px;
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 22px;
  padding: 12px;
  background: white;

  img {
    width: 74px;
    height: 74px;
    object-fit: contain;
    border-radius: 16px;
    background: ${PHARMACY_THEME.surface};
    padding: 8px;
  }

  strong {
    display: block;
    margin-bottom: 4px;
  }

  span {
    display: block;
    color: ${PHARMACY_THEME.inkMuted};
    line-height: 1.6;
    font-size: 0.88rem;
  }
`;

const SummaryRows = styled.div`
  display: grid;
  gap: 12px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: ${(props) => (props.$strong ? PHARMACY_THEME.ink : PHARMACY_THEME.inkSoft)};
  font-weight: ${(props) => (props.$strong ? 800 : 600)};
`;

const EmptyState = styled.div`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 30px;
  box-shadow: ${PHARMACY_THEME.shadowSoft};
  text-align: center;
  padding: 72px 28px;

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
    padding: 14px 18px;
    font-weight: 800;
  }
`;

const OrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gatewayVerified, setGatewayVerified] = useState(false);
  const [verifyingGateway, setVerifyingGateway] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const paymentSubmitted = searchParams.get("payment") === "submitted";
  const paymentProvider = searchParams.get("provider");
  const stripeSessionId = searchParams.get("session_id");
  const placed = searchParams.get("placed") === "1";
  const canViewOrderHistory = hasPatientSession();
  const ordersDestination = canViewOrderHistory ? "/my-orders" : "/pharmacy";

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrderById(id);
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load this order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!paymentSubmitted || gatewayVerified) return;
    if (paymentProvider !== "stripe") return;

    const verifyGateway = async () => {
      setVerifyingGateway(true);
      setError("");
      try {
        const data = await verifyStripeSession(id, stripeSessionId);
        setOrder(data);
        setGatewayVerified(true);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "We could not verify this gateway payment yet."
        );
      } finally {
        setVerifyingGateway(false);
      }
    };

    if (paymentProvider === "stripe" && stripeSessionId) {
      verifyGateway();
    }
  }, [gatewayVerified, id, paymentProvider, paymentSubmitted, stripeSessionId]);

  useEffect(() => {
    if (verifyingGateway || !paymentSubmitted || !order) return undefined;
    if ((order.paymentStatus || "").toLowerCase() !== "pending") return undefined;

    const interval = window.setInterval(() => {
      loadOrder();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [paymentSubmitted, order, loadOrder, verifyingGateway]);

  useEffect(() => {
    if (!order) return;
    const pendingOrderId = getPendingPaymentOrder();

    if (pendingOrderId === order._id && order.paymentStatus === "paid") {
      clearCart();
      clearPendingPaymentOrder();
    }

    if (
      pendingOrderId === order._id &&
      ["failed", "canceled", "chargedback"].includes(order.paymentStatus)
    ) {
      clearPendingPaymentOrder();
    }
  }, [order]);

  const tone = useMemo(() => (order ? getOrderTone(order) : null), [order]);

  if (loading) {
    return (
      <Page>
        <Navigationbar />
        <Container>
          <EmptyState>
            <h2>Loading order details…</h2>
            <p>We are fetching payment and delivery information for this order.</p>
          </EmptyState>
        </Container>
      </Page>
    );
  }

  if (error || !order) {
    return (
      <Page>
        <Navigationbar />
        <Container>
          <EmptyState>
            <h2>Order not available</h2>
            <p>{error || "This order could not be found."}</p>
            <button onClick={() => navigate(ordersDestination)} type="button">
              {canViewOrderHistory ? "Back to orders" : "Back to pharmacy"}
            </button>
          </EmptyState>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Navigationbar />
      <Container>
        <TopRow>
          <BackButton onClick={() => navigate(ordersDestination)} type="button">
            <FaArrowLeft /> {canViewOrderHistory ? "Back to orders" : "Back to pharmacy"}
          </BackButton>

          <BackButton onClick={loadOrder} type="button">
            <FaSyncAlt /> Refresh status
          </BackButton>
        </TopRow>

        <Hero>
          <StatusPill $background={tone.background} $color={tone.color}>
            {tone.label}
          </StatusPill>

          <HeroText>
            <h1>Order #{order._id.slice(-8).toUpperCase()}</h1>
            <p>
              {placed
                ? "Your order has been created successfully. We’ll use the details below for fulfillment and delivery."
                : paymentSubmitted
                  ? "We’re waiting for final payment confirmation. This page refreshes while the payment is still pending."
                  : "Review your order summary, payment state, and delivery details below."}
            </p>
          </HeroText>

          <Actions>
            <button className="primary" onClick={() => navigate("/pharmacy")} type="button">
              Continue shopping
            </button>
            <button className="secondary" onClick={() => navigate(ordersDestination)} type="button">
              {canViewOrderHistory ? "All orders" : "Back to pharmacy"}
            </button>
          </Actions>
        </Hero>

        <Layout>
          <div style={{ display: "grid", gap: "22px" }}>
            <Card>
              <SectionHeader>
                <h2>Order and payment</h2>
                <p>Reference details for payment verification, delivery routing, and support.</p>
              </SectionHeader>
              <SectionBody>
                <MetaGrid>
                  <MetaCard>
                    <span>Placed</span>
                    <strong>{formatDateTime(order.createdAt)}</strong>
                  </MetaCard>
                  <MetaCard>
                    <span>Payment method</span>
                    <strong>{getPaymentMethodLabel(order.paymentProvider, order.paymentMethod)}</strong>
                    <p>
                      {order.paymentResult?.method
                        ? `Payment method: ${getPaymentMethodLabel(order.paymentResult.method)}`
                        : "Payment method is not confirmed yet."}
                    </p>
                  </MetaCard>
                  <MetaCard>
                    <span>Contact</span>
                    <strong>{order.fullName}</strong>
                    <p>{order.email} · {order.phone}</p>
                  </MetaCard>
                  <MetaCard>
                    <span>Delivery address</span>
                    <strong>{order.shippingAddress?.city}</strong>
                    <p>
                      {[
                        order.shippingAddress?.addressLine1,
                        order.shippingAddress?.addressLine2,
                        order.shippingAddress?.postalCode,
                        order.shippingAddress?.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </MetaCard>
                </MetaGrid>

                {paymentSubmitted && order.paymentStatus === "pending" && (
                  <MetaCard>
                    <span>Payment verification</span>
                    <strong>Waiting for payment confirmation</strong>
                    <p>
                      Card checkout is still confirming the final payment state. This page will
                      update automatically when confirmation is complete.
                    </p>
                  </MetaCard>
                )}

                {["failed", "canceled", "chargedback"].includes(order.paymentStatus) && (
                  <MetaCard>
                    <span>Next step</span>
                    <strong>Payment did not complete</strong>
                    <p>
                      Your cart was not cleared. You can return to the cart and begin checkout
                      again when you are ready.
                    </p>
                  </MetaCard>
                )}
              </SectionBody>
            </Card>

            <Card>
              <SectionHeader>
                <h2>Ordered items</h2>
                <p>Every line item remains visible with quantity and price information.</p>
              </SectionHeader>
              <SectionBody>
                <ItemList>
                  {order.orderItems.map((item) => (
                    <ItemRow key={`${item.medicine}-${item.name}`}>
                      <img
                        alt={item.name}
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                        }}
                        src={item.image}
                      />
                      <div>
                        <strong>{item.name}</strong>
                        <span>Qty {item.qty}</span>
                        <span>{formatCurrency(item.price * item.qty)}</span>
                      </div>
                    </ItemRow>
                  ))}
                </ItemList>
              </SectionBody>
            </Card>
          </div>

          <Card>
            <SectionHeader>
              <h2>Totals and delivery</h2>
              <p>Final price summary and order lifecycle state.</p>
            </SectionHeader>
            <SectionBody>
              <SummaryRows>
                <SummaryRow>
                  <span>Items subtotal</span>
                  <span>{formatCurrency(order.itemsPrice)}</span>
                </SummaryRow>
                <SummaryRow>
                  <span>Delivery</span>
                  <span>{formatCurrency(order.shippingPrice)}</span>
                </SummaryRow>
                <SummaryRow>
                  <span>Tax</span>
                  <span>{formatCurrency(order.taxPrice)}</span>
                </SummaryRow>
                <SummaryRow $strong>
                  <span>Total</span>
                  <span>{formatCurrency(order.totalPrice)}</span>
                </SummaryRow>
              </SummaryRows>

              <MetaCard>
                <span>Status detail</span>
                <strong>{tone.label}</strong>
                <p>
                  {order.isPaid
                    ? `Payment confirmed on ${formatDateTime(order.paidAt)}.`
                    : order.paymentStatus === "pending"
                      ? "Payment is pending or awaiting verification."
                      : order.paymentResult?.status_message || "Payment did not complete successfully."}
                </p>
              </MetaCard>

              <MetaCard>
                <span>Delivery note</span>
                <strong>{order.shippingAddress?.deliveryNotes || "No delivery note added"}</strong>
                <p>
                  {order.shippingAddress?.deliveryNotes
                    ? "Your courier and pharmacy team can use this during dispatch."
                    : "Add delivery notes during checkout whenever you need special instructions."}
                </p>
              </MetaCard>

              <Actions>
                <button className="primary" onClick={() => navigate("/pharmacy")} type="button">
                  <FaTruck /> Shop again
                </button>
                <button className="secondary" onClick={() => navigate("/cart")} type="button">
                  {["failed", "canceled", "chargedback"].includes(order.paymentStatus) ? (
                    <>
                      <FaCreditCard /> Retry from cart
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Back to cart
                    </>
                  )}
                </button>
              </Actions>
            </SectionBody>
          </Card>
        </Layout>
      </Container>
      <Footer />
    </Page>
  );
};

export default OrderDetails;
