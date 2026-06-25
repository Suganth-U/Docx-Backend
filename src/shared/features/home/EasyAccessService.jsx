import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  CalendarHeart,
  FileText,
  Pill,
  Search,
  Video,
} from "lucide-react";

const THEME = {
  text: "#12283a",
  textSoft: "#5c6b7b",
  accent: "#6b5ca5",
  accentLight: "rgba(107, 92, 165, 0.08)",
  white: "#ffffff",
  border: "#eaeef2",
  shadow: "0 10px 30px rgba(18, 40, 58, 0.04)",
  shadowHover: "0 20px 40px rgba(18, 40, 58, 0.08)",
};

const SectionWrapper = styled.section`
  width: 100%;
  padding: 88px 40px;
  background: transparent;
  font-family: "Inter", system-ui, -apple-system, sans-serif;

  @media (max-width: 768px) {
    padding: 72px 20px;
  }
`;

const Container = styled.div`
  max-width: 1240px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  margin-bottom: 60px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const HeaderText = styled.div`
  max-width: 640px;

  span {
    display: inline-block;
    margin-bottom: 12px;
    color: ${THEME.accent};
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: ${THEME.accentLight};
    padding: 6px 14px;
    border-radius: 999px;
  }

  h3 {
    margin: 0 0 16px;
    color: ${THEME.text};
    font-family: "Barlow", sans-serif;
    font-size: clamp(2.2rem, 4vw, 3.2rem);
    line-height: 1.1;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: ${THEME.textSoft};
    font-size: 1.05rem;
    line-height: 1.7;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${THEME.accentLight};
  color: ${THEME.accent};
  margin-bottom: 24px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  svg {
    width: 32px;
    height: 32px;
    stroke-width: 1.5;
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const Card = styled(Link)`
  background: ${THEME.white};
  border: 1px solid ${THEME.border};
  border-radius: 20px;
  padding: 32px 20px;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  box-shadow: ${THEME.shadow};
  position: relative;
  overflow: hidden;
  height: 100%;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: ${THEME.accent};
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.4s ease;
  }

  h4 {
    margin: 0 0 12px;
    color: ${THEME.text};
    font-family: "Barlow", sans-serif;
    font-size: 1.25rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
    font-weight: 700;
    transition: color 0.3s ease;
  }

  p {
    margin: 0;
    color: ${THEME.textSoft};
    font-size: 0.9rem;
    line-height: 1.5;
  }

  &:hover,
  &:focus-visible {
    transform: translateY(-8px);
    box-shadow: ${THEME.shadowHover};
    border-color: transparent;
    outline: none;

    &::before {
      transform: scaleX(1);
    }

    ${IconWrapper} {
      background: ${THEME.accent};
      color: ${THEME.white};
      transform: scale(1.1) rotate(5deg);
    }
  }
`;

const services = [
  {
    path: "/find-doctors",
    title: "Find Doctors",
    desc: "Search by specialty and move quickly into care.",
    icon: Search,
  },
  {
    path: "/virtual-consultation",
    title: "Video Consult",
    desc: "Connect remotely when you want care without a visit.",
    icon: Video,
  },
  {
    path: "/pharmacy",
    title: "Online Pharmacy",
    desc: "Order medicines through the connected experience.",
    icon: Pill,
  },
  {
    path: "/find-doctors",
    title: "Book Visit",
    desc: "Reserve a consultation with a straightforward flow.",
    icon: CalendarHeart,
  },
  {
    path: "/digital-prescription",
    title: "Prescription",
    desc: "Keep medication instructions easier to manage.",
    icon: FileText,
  },
];

const EasyAccessService = () => {
  return (
    <SectionWrapper data-aos="fade-up">
      <Container>
        <HeaderContainer>
          <HeaderText>
            <span>Quick Services</span>
            <h3>Start with the service you need most.</h3>
            <p>
              Designed to reduce friction for patients and make the most important
              actions easy to find from the homepage.
            </p>
          </HeaderText>
        </HeaderContainer>

        <Grid>
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <Card
                to={service.path}
                key={service.title}
                aria-label={`${service.title}`}
              >
                <IconWrapper>
                  <Icon />
                </IconWrapper>
                <ContentWrapper>
                  <h4>{service.title}</h4>
                  <p>{service.desc}</p>
                </ContentWrapper>
              </Card>
            );
          })}
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default EasyAccessService;
