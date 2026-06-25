import React from "react";
import styled from "styled-components";
import {
  FaArrowRight,
  FaStethoscope
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { featuredSpecialties } from "@/shared/data/specialties";

const THEME = {
  background: "#f7fafc",
  surface: "#ffffff",
  border: "#dde6ef",
  text: "#12283a",
  textSoft: "#5c6b7b",
  accent: "#6b5ca5",
  accentSoft: "#f2effa"
};

const SectionWrapper = styled.section`
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
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 36px;

  @media (max-width: 820px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const HeaderText = styled.div`
  max-width: 660px;

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

const BrowseAllButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border-radius: 14px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(107, 92, 165, 0.26);
    box-shadow: 0 16px 28px rgba(18, 40, 58, 0.08);
  }
`;

const SpecialtiesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SpecialtyCard = styled(Link)`
  min-height: 208px;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 12px 28px rgba(18, 40, 58, 0.05);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(107, 92, 165, 0.24);
    box-shadow: 0 20px 36px rgba(18, 40, 58, 0.09);
  }
`;

const IconContainer = styled.div`
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: ${THEME.accentSoft};
  color: ${THEME.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.22rem;
`;

const Label = styled.h4`
  margin: 0;
  color: ${THEME.text};
  font-family: "Barlow", sans-serif;
  font-size: 1.34rem;
  line-height: 1.06;
  letter-spacing: -0.03em;
`;

const Description = styled.p`
  margin: 0;
  color: ${THEME.textSoft};
  font-size: 0.95rem;
  line-height: 1.65;
`;

const CardLink = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  color: ${THEME.accent};
  font-size: 0.95rem;
  font-weight: 700;
`;

const Specialties = () => {
  return (
    <SectionWrapper data-aos="fade-up">
      <Container>
        <HeaderContainer>
          <HeaderText>
            <span>Browse By Specialties</span>
            <h3>Help patients choose the right clinical area before they book.</h3>
            <p>
              Each specialty now opens with guidance first, then leads into doctor
              discovery once the patient feels confident about the next step.
            </p>
          </HeaderText>

          <BrowseAllButton to="/services">
            View all specialties <FaArrowRight size={14} />
          </BrowseAllButton>
        </HeaderContainer>

        <SpecialtiesGrid>
          {featuredSpecialties.map((item, index) => {
            const Icon = item.icon || FaStethoscope;

            return (
            <SpecialtyCard
              key={item.name}
              to={`/specialties/${item.slug}`}
              data-aos="fade-up"
              data-aos-delay={index * 60}
            >
              <IconContainer>
                <Icon />
              </IconContainer>
              <Label>{item.name}</Label>
              <Description>{item.shortDescription}</Description>
              <CardLink>
                Understand this specialty <FaArrowRight size={14} />
              </CardLink>
            </SpecialtyCard>
            );
          })}
        </SpecialtiesGrid>
      </Container>
    </SectionWrapper>
  );
};

export default Specialties;
