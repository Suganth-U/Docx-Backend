import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaArrowRight, FaSyncAlt } from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import { fetchMyOrders } from "@/shared/features/Epharmacy/pharmacyClient";
import {
  PHARMACY_THEME,
  formatCurrency,
  formatDateTime,
  getOrderTone,
  getPaymentMethodLabel,
} from "@/shared/features/Epharmacy/pharmacyShared";

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
  align-items: flex-end;
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

const Header = styled.div`
  h1 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3rem);
    letter-spacing: -0.05em;
  }

  p {
    margin: 8px 0 0;
    color: ${PHARMACY_THEME.inkSoft};
    line-height: 1.7;
  }
`;

const RefreshButton = styled.button`
  border: none;
  background: ${PHARMACY_THEME.ink};
  color: white;
  border-radius: 16px;
  cursor: pointer;
  padding: 14px 16px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;

const List = styled.div`
  display: grid;
  gap: 16px;
`;

const OrderCard = styled.article`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 28px;
  box-shadow: ${PHARMACY_THEME.shadowSoft};
  padding: 22px;
  display: grid;
  gap: 18px;
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;

  strong {
    display: block;
    font-size: 1.15rem;
    margin-bottom: 4px;
  }

  span {
    color: ${PHARMACY_THEME.inkMuted};
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
  font-weight: 800;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const MetaCard = styled.div`
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 20px;
  padding: 16px;
  background: ${PHARMACY_THEME.surface};

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
`;

const CardAction = styled.button`
  width: fit-content;
  border: none;
  background: transparent;
  color: ${PHARMACY_THEME.brand};
  cursor: pointer;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMyOrders();
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <Page>
      <Navigationbar />
      <Container>
        <TopRow>
          <Header>
            <h1>My pharmacy orders</h1>
            <p>Review recent orders, payment states, and delivery information in one place.</p>
          </Header>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <BackButton onClick={() => navigate("/pharmacy")} type="button">
              <FaArrowLeft /> Back to pharmacy
            </BackButton>
            <RefreshButton onClick={loadOrders} type="button">
              <FaSyncAlt /> Refresh
            </RefreshButton>
          </div>
        </TopRow>

        {loading ? (
          <EmptyState>
            <h2>Loading your orders…</h2>
            <p>We are fetching your latest order history and payment status.</p>
          </EmptyState>
        ) : error ? (
          <EmptyState>
            <h2>We couldn’t load your order history</h2>
            <p>{error}</p>
            <button onClick={loadOrders} type="button">
              Try again
            </button>
          </EmptyState>
        ) : !orders.length ? (
          <EmptyState>
            <h2>No pharmacy orders yet</h2>
            <p>
              Once you complete checkout, your orders will appear here with payment and delivery updates.
            </p>
            <button onClick={() => navigate("/pharmacy")} type="button">
              Start shopping
            </button>
          </EmptyState>
        ) : (
          <List>
            {orders.map((order) => {
              const tone = getOrderTone(order);

              return (
                <OrderCard key={order._id}>
                  <CardTop>
                    <div>
                      <strong>Order #{order._id.slice(-8).toUpperCase()}</strong>
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                    <StatusPill $background={tone.background} $color={tone.color}>
                      {tone.label}
                    </StatusPill>
                  </CardTop>

                  <MetaGrid>
                    <MetaCard>
                      <span>Payment method</span>
                      <strong>{getPaymentMethodLabel(order.paymentProvider, order.paymentMethod)}</strong>
                    </MetaCard>
                    <MetaCard>
                      <span>Items</span>
                      <strong>{order.orderItems?.length || 0}</strong>
                    </MetaCard>
                    <MetaCard>
                      <span>Total</span>
                      <strong>{formatCurrency(order.totalPrice)}</strong>
                    </MetaCard>
                    <MetaCard>
                      <span>Delivery city</span>
                      <strong>{order.shippingAddress?.city || "Pending"}</strong>
                    </MetaCard>
                  </MetaGrid>

                  <CardAction onClick={() => navigate(`/orders/${order._id}`)} type="button">
                    View order details <FaArrowRight />
                  </CardAction>
                </OrderCard>
              );
            })}
          </List>
        )}
      </Container>
      <Footer />
    </Page>
  );
};

export default Orders;
