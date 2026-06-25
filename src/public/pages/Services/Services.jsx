import React, { useEffect } from "react";
import styled from "styled-components";
import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from "react-router-dom";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import { FaArrowRight, FaStethoscope } from "react-icons/fa";
import { specialtyCatalog } from "@/shared/data/specialties";

const PageWrapper = styled.div`
  background-color: #f8fafc;
  min-height: 100vh;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
`;

const ContentWrapper = styled.div`
  flex: 1;
  padding: 120px 40px 80px;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  text-align: center;
  margin-bottom: 60px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const HeaderText = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 20px;
  letter-spacing: -0.025em;

  span {
    color: #8e7dbe;
  }

  @media (max-width: 768px) {
    font-size: 2.25rem;
  }
`;

const HeaderSubtext = styled.p`
  font-size: 1.125rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 30px;
  
  @media (max-width: 600px) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 20px;
  }
`;

const SpecialtyCard = styled(Link)`
  background: #ffffff;
  border-radius: 16px;
  padding: 32px 20px;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: #8e7dbe;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.4s ease;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border-color: #d1c4e9;
    
    &::before {
      transform: scaleX(1);
    }
  }
`;

const IconContainer = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background-color: #f1f5f9;
  color: #8e7dbe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  transition: transform 0.3s ease, background-color 0.3s ease, color 0.3s ease;

  ${SpecialtyCard}:hover & {
    transform: scale(1.1);
    background-color: #8e7dbe;
    color: #ffffff;
  }
`;

const Label = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.01em;
`;

const CTASection = styled.div`
  margin-top: 80px;
  padding: 60px 40px;
  background-color: #ffffff;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  text-align: center;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
`;

const CTATitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
`;

const CTASubtext = styled.p`
  font-size: 1.125rem;
  color: #475569;
  margin-bottom: 32px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
`;

const CTAButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background-color: #8e7dbe;
  color: #ffffff;
  padding: 16px 36px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1.125rem;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(142, 125, 190, 0.4);

  &:hover {
    background-color: #6e5d9e;
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(142, 125, 190, 0.4);
  }
`;

const Services = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <PageWrapper>
      <Navigationbar />

      <ContentWrapper>
        <Container>
          <HeaderContainer data-aos="fade-up">
            <HeaderText>
              Medical <span>Specialties</span>
            </HeaderText>
            <HeaderSubtext>
              Start with a specialty overview so patients understand what that
              care area covers before they move into booking and doctor selection.
            </HeaderSubtext>
          </HeaderContainer>

          <Grid>
            {specialtyCatalog.map((item, index) => {
              const Icon = item.icon || FaStethoscope;

              return (
              <SpecialtyCard key={item.slug} to={`/specialties/${item.slug}`} data-aos="fade-up" data-aos-delay={(index % 4) * 100}>
                <IconContainer><Icon /></IconContainer>
                <Label>{item.name}</Label>
                <HeaderSubtext as="p" style={{ fontSize: "0.95rem", margin: 0 }}>
                  {item.shortDescription}
                </HeaderSubtext>
              </SpecialtyCard>
              );
            })}
          </Grid>

          <CTASection data-aos="zoom-in" data-aos-delay="200">
            <CTATitle>Ready to consult?</CTATitle>
            <CTASubtext>
              If the patient already knows what they need, they can go straight to
              the live doctor directory and book from there.
            </CTASubtext>
            <CTAButton to="/find-doctors">
              Find a Doctor <FaArrowRight />
            </CTAButton>
          </CTASection>
        </Container>
      </ContentWrapper>

      <Footer />
    </PageWrapper>
  );
};

export default Services;
