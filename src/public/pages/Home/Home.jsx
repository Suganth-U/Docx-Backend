import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { assets } from "@/shared/lib/assets";
import Footer from "@/shared/components/layout/Footer/Footer";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import "@/public/pages/Services/services.css";
import Hero from "@/shared/features/home/Hero";
import EasyAccessService from "@/shared/features/home/EasyAccessService";
import Process from "@/shared/features/home/Process";
import Specialties from "@/shared/features/home/Specialties";
import Testimonials from "@/shared/features/home/Testimonials";
import WhyUs from "@/shared/features/home/WhyUs";
import ContactUs from "@/shared/features/home/ContactUs";
import Blogs from "@/shared/features/home/Blogs";
import TrustHighlights from "@/shared/features/home/TrustHighlights";
import TopDoctors from "@/shared/features/home/TopDoctors";

const HeroContainer = styled.div`
  width: 90%;
  max-width: var(--page-max-width);
  margin: 10px auto 24px;
  padding: 24px;
  background-image: linear-gradient(#9481ffd9, #8e7dbe9c), url(${assets.homeBG});
  background-size: cover;
  background-position: right;
  color: #fff;
  font-family: "Inter", sans-serif;
  position: relative;
  border-radius: 35px;
  box-shadow: rgba(17, 12, 46, 0.15) 0px 48px 100px 0px;
  box-sizing: border-box;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 18px;
  }
`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(380px, 0.95fr);
  gap: 26px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const HeroContent = styled.div`
  padding: 26px 12px 18px 12px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 1100px) {
    max-width: 100%;
    padding: 18px 6px 4px;
  }

  h3 {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
    font-size: clamp(2.9rem, 6vw, 4.5rem);
    font-weight: 700;
    color: #fff;
    margin-bottom: 20px;
    line-height: 0.96;
    letter-spacing: -0.05em;
  }

  p {
    max-width: 640px;
    font-size: 15px;
    line-height: 1.85;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }
`;

const HeroEyebrow = styled.span`
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
`;

const HeroChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
`;

const HeroChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(6px);
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 24px;
`;

const HeroAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 12px 16px;
  border-radius: 999px;
  text-decoration: none;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(8px);
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.22);
  }
`;

const AboutSection = styled.section`
  position: relative;
  padding: 40px;
  background: transparent;
  z-index: 2;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
`;

const Home = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 1000, once: true });
  }, []);

  return (
    <>
      <div className="hero-main">
        <Navigationbar />
        <HeroContainer>
          <HeroGrid>
            <HeroContent>
              <HeroEyebrow>Connected Care Journey</HeroEyebrow>
              <h3>
                Book, track,
                <br />
                and continue
                <br />
                care in one place.
              </h3>
              <p>
                Start with doctor discovery and real-time booking, then move into
                records, lab updates, digital prescriptions, and pharmacy follow-up
                without losing the patient journey after consultation.
              </p>
              <HeroChips>
                <HeroChip>Appointments &amp; follow-up</HeroChip>
                <HeroChip>Records &amp; lab access</HeroChip>
                <HeroChip>Prescriptions &amp; refills</HeroChip>
              </HeroChips>
              <HeroActions>
                <HeroAction to="/care-hub">Explore Care Hub</HeroAction>
              </HeroActions>
            </HeroContent>
            <Hero />
          </HeroGrid>
        </HeroContainer>
      </div>

      <EasyAccessService />
      {/* <TrustHighlights /> */}

      <AboutSection className="about">
        <Process />
        <Specialties />
        {/* <TopDoctors /> */}
        <WhyUs />
        <Testimonials />
        <Blogs />
        <ContactUs />
      </AboutSection>

      <Footer />
    </>
  );
};

export default Home;
