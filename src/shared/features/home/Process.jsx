import React from "react";
import styled from "styled-components";
import {
  FaCalendarCheck,
  FaFilePrescription,
  FaStethoscope
} from "react-icons/fa";

const THEME = {
  background: "#ffffff",
  surface: "#f8fafc",
  border: "#dde6ef",
  text: "#12283a",
  textSoft: "#5c6b7b",
  accent: "#6b5ca5",
  accentSoft: "#f2effa"
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
  max-width: 1200px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  text-align: center;
  max-width: 760px;
  margin: 0 auto 42px;

  span {
    display: inline-block;
    margin-bottom: 10px;
    color: ${THEME.accent};
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0 0 12px;
    color: ${THEME.text};
    font-family: "Barlow", sans-serif;
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.02;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: ${THEME.textSoft};
    font-size: 1rem;
    line-height: 1.7;
  }
`;

const ProcessGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  &::before {
    content: "";
    position: absolute;
    top: 40px;
    left: 12%;
    right: 12%;
    height: 1px;
    background: ${THEME.border};
    z-index: 0;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;

    &::before {
      display: none;
    }
  }
`;

const StepCard = styled.div`
  position: relative;
  z-index: 1;
  padding: 26px 22px;
  border-radius: 24px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  box-shadow: 0 16px 30px rgba(18, 40, 58, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(107, 92, 165, 0.26);
    box-shadow: 0 22px 36px rgba(18, 40, 58, 0.09);
  }
`;

const StepTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
`;

const StepNumber = styled.span`
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: ${THEME.accentSoft};
  color: ${THEME.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.08em;
`;

const StepIcon = styled.div`
  color: ${THEME.accent};
  font-size: 1.2rem;
`;

const StepTitle = styled.h4`
  margin: 0 0 10px;
  color: ${THEME.text};
  font-family: "Barlow", sans-serif;
  font-size: 1.4rem;
  line-height: 1.06;
  letter-spacing: -0.03em;
`;

const StepDesc = styled.p`
  margin: 0;
  color: ${THEME.textSoft};
  font-size: 0.96rem;
  line-height: 1.68;
`;

const steps = [
  {
    number: "01",
    title: "Search by doctor or specialty",
    desc: "Start with the right specialty or search directly for a doctor who matches your need.",
    icon: FaStethoscope
  },
  {
    number: "02",
    title: "Book a clinic or video visit",
    desc: "Choose a convenient appointment path, whether you prefer in-person care or online consultation.",
    icon: FaCalendarCheck
  },
  {
    number: "03",
    title: "Continue care after the visit",
    desc: "Manage prescriptions and treatment follow-up through the same DocX experience.",
    icon: FaFilePrescription
  }
];

const Process = () => {
  return (
    <SectionWrapper data-aos="fade-up">
      <Container>
        <HeaderContainer>
          <span>How DocX Works</span>
          <h3>A simple care journey built around clarity.</h3>
          <p>
            Patients should understand the next step immediately. This flow keeps the
            experience practical, reassuring, and easy to follow.
          </p>
        </HeaderContainer>

        <ProcessGrid>
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <StepCard key={step.title} data-aos="fade-up" data-aos-delay={index * 80}>
                <StepTop>
                  <StepNumber>{step.number}</StepNumber>
                  <StepIcon>
                    <Icon />
                  </StepIcon>
                </StepTop>

                <StepTitle>{step.title}</StepTitle>
                <StepDesc>{step.desc}</StepDesc>
              </StepCard>
            );
          })}
        </ProcessGrid>
      </Container>
    </SectionWrapper>
  );
};

export default Process;
