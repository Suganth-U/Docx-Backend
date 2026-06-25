import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";


const Section = styled.section`
  width: 100%;
  padding: 50px 5%;

  h1 {
    text-align: center;
    margin: 70px 0;
    font-size: 40px;
    line-height: 1.4;
    font-weight: 400;
    color: #8e24aa;

  }
`;

const ServicePricing = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  background: #8e7dbe;
  margin-top: 100px;
  border-radius: 20px; /* Added detail for standalone look */
  padding-bottom: 50px; /* Spacing */
  
  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;
  }
`;

const Plan = styled.div`
  border-radius: 16px;
  box-shadow: 0 30px 30px -25px rgba(0, 38, 255, 0.205);
  padding: 10px;
  background-color: #fff;
  color: #697e91;
  max-width: 420px;
  height: 520px; /* Increased slightly to fit content */
  margin: 40px;
  transition: all ease-in 0.1s;
  font-family: "DM Serif Text", serif;

  &:hover {
    transform: translateY(-10px);
  }

  strong {
    font-weight: 600;
    color: #8e24aa;
  }

  &.regular {
    transform: translateY(-80px); /* Adjusted for layout */
    z-index: 10;
    &:hover {
      transform: translateY(-90px);
    }
  }

  @media (max-width: 900px) {
    width: 90%;
    margin: 20px 0;
    
    &.regular {
       transform: none;
       &:hover { transform: translateY(-10px); }
    }
  }
`;


const Inner = styled.div`
  max-width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* Better spacing distribution */
  padding: 10px 20px;
  padding-top: 40px;
  background-color: #f5f7fb;
  border-radius: 12px;
  position: relative;
`;

const PricingBadge = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  background-color: #D6BCFA;
  border-radius: 99em 0 0 99em;
  display: flex;
  align-items: center;
  padding: 0.625em 0.75em;
  font-size: 1.05rem;
  font-weight: 600;
  color: #425475;
  
  small {
    color: #707a91;
    font-size: 0.75em;
    margin-left: 0.25em;
  }
`;

const Title = styled.p`
  font-weight: 600;
  font-size: 1.35rem;
  color: #9F72CA; 
  margin-top: 0.75rem;
`;

const Info = styled.p`
  margin-top: 1rem;
`;

const Features = styled.ul`
  display: flex;
  flex-direction: column;
  padding: 20px 5px 0 5px;
  margin-top: 1rem;
  flex-grow: 1; /* Push button down */

  li {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1.35rem;
    
    &:first-child { margin-top: 0; }
  }
`;

const Icon = styled.span`
  background-color: #683B93; 
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Action = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: end;
  margin-top: 20px;
`;

const Button = styled(Link)`
  background-color: #683B93; 
  border-radius: 6px;
  color: #fff;
  font-weight: 500;
  font-size: 1.125rem;
  text-align: center;
  border: 1px solid #683B93;
  outline: 0;
  width: 100%;
  padding: 0.565em 0.75em;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover, &:focus {
    opacity: 0.8;
  }
`;

const Pricing = () => {
    return (
        <Section className="pricing">
            <ServicePricing className="service-pricing" data-aos="fade-up">
                {/* General Care */}
                <Plan className="plan">
                    <Inner className="inner">
                        <div>
                            <PricingBadge className="pricing">
                                <span>
                                    $49<small>/ m</small>
                                </span>
                            </PricingBadge>
                            <Title className="title">General Care</Title>
                            <Info className="info">
                                Ideal for individuals seeking general healthcare services.
                            </Info>
                        </div>

                        <Features className="features">
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>
                                    <strong>1</strong> consultation per month
                                </span>
                            </li>
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>Basic diagnostics and lab tests</span>
                            </li>
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>Access to basic treatments</span>
                            </li>
                        </Features>
                        <Action className="action">
                            <Button className="button" to="/membership-checkout?plan=general">Choose plan</Button>
                        </Action>
                    </Inner>
                </Plan>

                {/* Premium Care */}
                <Plan className="plan regular">
                    <Inner className="inner">
                        <div>
                            <PricingBadge className="pricing">
                                <span>
                                    $99<small>/ m</small>
                                </span>
                            </PricingBadge>
                            <Title className="title">Premium Care</Title>
                            <Info className="info">
                                For patients requiring more frequent consultations & care.
                            </Info>
                        </div>

                        <Features className="features">
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>
                                    <strong>3</strong> consultations per month
                                </span>
                            </li>
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>Access to advanced diagnostic tests</span>
                            </li>
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>Specialist consultations</span>
                            </li>
                        </Features>
                        <Action className="action">
                            <Button className="button" to="/membership-checkout?plan=premium">Choose plan</Button>
                        </Action>
                    </Inner>
                </Plan>

                {/* VIP Care */}
                <Plan className="plan">
                    <Inner className="inner">
                        <div>
                            <PricingBadge className="pricing">
                                <span>
                                    $149<small>/ m</small>
                                </span>
                            </PricingBadge>
                            <Title className="title">VIP Care</Title>
                            <Info className="info">
                                For patients seeking all-inclusive care & 24/7 access.
                            </Info>
                        </div>

                        <Features className="features">
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>
                                    <strong>Unlimited</strong> consultations
                                </span>
                            </li>
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>Immediate access for emergency</span>
                            </li>
                            <li>
                                <Icon className="icon">
                                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                    </svg>
                                </Icon>
                                <span>Comprehensive health monitorings</span>
                            </li>
                        </Features>
                        <Action className="action">
                            <Button className="button" to="/membership-checkout?plan=vip">Choose plan</Button>
                        </Action>
                    </Inner>
                </Plan>
            </ServicePricing>
        </Section>
    );
};

export default Pricing;
