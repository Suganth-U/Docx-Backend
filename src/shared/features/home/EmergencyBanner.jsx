import React from 'react';
import styled from 'styled-components';
import { FaAmbulance, FaPhoneAlt } from 'react-icons/fa';

const Section = styled.section`
  padding: 40px 5%;
  background: linear-gradient(90deg, #ff4757 0%, #ff6b81 100%); // Vibrant Red Gradient
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60px;
  flex-wrap: wrap;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.1);
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 30px;
    text-align: center;
    padding: 40px 20px;
  }
`;

const Content = styled.div`
  display: flex;
  align-items: center;
  gap: 25px;
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 15px;
  }
  
  svg {
    font-size: 48px;
    opacity: 0.9;
  }
`;

const TextBlock = styled.div`
  h2 {
    font-size: 26px;
    font-weight: 800;
    margin: 0 0 5px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: 'Poppins', sans-serif;
  }
  
  p {
    font-size: 16px;
    opacity: 0.95;
    margin: 0;
    font-weight: 500;
  }
`;

const CallBtn = styled.a`
  background: #fff;
  color: #ff4757;
  padding: 16px 40px;
  border-radius: 50px;
  font-weight: 800;
  font-size: 18px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.15);
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 15px 30px rgba(0,0,0,0.2);
  }

  svg { animation: shake 2s infinite; }

  @keyframes shake {
    0% { transform: rotate(0deg); }
    10% { transform: rotate(15deg); }
    20% { transform: rotate(-15deg); }
    30% { transform: rotate(10deg); }
    40% { transform: rotate(-10deg); }
    50% { transform: rotate(0deg); }
    100% { transform: rotate(0deg); }
  }
`;

const EmergencyBanner = () => {
    return (
        <Section>
            <Content>
                <FaAmbulance />
                <TextBlock>
                    <h2>Need Emergency Help?</h2>
                    <p>Our ambulance service is available 24/7 for critical situations.</p>
                </TextBlock>
            </Content>
            <CallBtn href="tel:1990">
                <FaPhoneAlt /> Call 1990
            </CallBtn>
        </Section>
    );
}

export default EmergencyBanner;
