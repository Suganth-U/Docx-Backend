import React from "react";
import styled from "styled-components";
import { FaCreditCard, FaLock, FaPaypal } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

const THEME = {
  primary: "#683B93",
  paypal: "#003087",
  bg: "#f8f9fa",
  white: "#ffffff",
  text: "#3D2660",
  textLight: "#777",
  border: "#e0e0e0",
};

const PageContainer = styled.div`
  background-color: ${THEME.bg};
  min-height: 100vh;
  padding: 40px 5%;
  font-family: "Inter", sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CardContainer = styled.div`
  background: ${THEME.white};
  max-width: 500px;
  width: 100%;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid ${THEME.border};
`;

const Header = styled.div`
  margin-bottom: 28px;
  text-align: center;

  h1 {
    font-size: 24px;
    color: ${THEME.text};
    margin: 0 0 10px;
  }

  p {
    color: ${THEME.textLight};
    font-size: 14px;
    margin: 0;
  }
`;

const SecurityPanel = styled.div`
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 18px;
  color: ${THEME.text};
  background: #fbfafc;

  p {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    line-height: 1.5;
  }
`;

const PayButton = styled(Link)`
  background: ${({ $provider }) => ($provider === "paypal" ? THEME.paypal : THEME.primary)};
  color: white;
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
  transition: transform 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  text-decoration: none;

  &:hover {
    transform: translateY(-2px);
    color: white;
  }
`;

const Payment = () => {
  const location = useLocation();
  const total = Number(location.state?.total || 0);

  return (
    <PageContainer>
      <CardContainer>
        <Header>
          <h1>Secure Online Payment</h1>
          <p>Complete your purchase of Rs. {total.toFixed(2)} from checkout.</p>
        </Header>

        <SecurityPanel>
          <p>
            <FaLock />
            DocX uses secure, hosted payment processors like Stripe. Card details stay with the payment gateway.
          </p>
        </SecurityPanel>

        <PayButton to="/checkout" $provider="stripe">
          <FaCreditCard /> Continue to Stripe Card Payment
        </PayButton>

      </CardContainer>
    </PageContainer>
  );
};

export default Payment;
