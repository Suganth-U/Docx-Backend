import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  FaArrowRight,
  FaCalendarCheck,
  FaCapsules,
  FaFilePrescription,
  FaFlask,
  FaHeart,
  FaNotesMedical,
  FaUserShield,
  FaVideo,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";

const PageWrapper = styled.div`
  min-height: 100vh;
  background: #ffffff;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1e1b4b;
`;

const Content = styled.main`
  max-width: 1240px;
  margin: 0 auto;
  padding: 112px 24px 90px;

  @media (max-width: 768px) {
    padding: 96px 20px 72px;
  }
`;

const HeroCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.9fr);
  gap: 40px;
  padding: 20px 0 60px;
  align-items: center;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 30px;
  }
`;

const HeroContent = styled.div`
  h1 {
    margin: 0 0 16px;
    max-width: 680px;
    color: #111827;
    font-size: clamp(2.4rem, 4.5vw, 4rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-weight: 700;
    text-shadow: 0 2px 10px rgba(107, 92, 165, 0.1);
  }

  p {
    margin: 0;
    max-width: 640px;
    font-size: 1.125rem;
    line-height: 1.6;
    color: #4b5563;
    opacity: 0.9;
  }
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #111827;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(107, 92, 165, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 32px;
`;

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 28px;
  min-height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6b5ca5 0%, #5a4d8c 100%);
  color: #ffffff;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(107, 92, 165, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(107, 92, 165, 0.4);
    background: linear-gradient(135deg, #7b6cb5 0%, #5a4d8c 100%);
  }
`;

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 28px;
  min-height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  color: #111827;
  border: 1px solid rgba(107, 92, 165, 0.2);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    background: #ffffff;
    border-color: #7b6cb5;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(107, 92, 165, 0.15);
  }
`;

const HeroChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
`;

const HeroChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(107, 92, 165, 0.1);
  color: #111827;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(107, 92, 165, 0.3);
    transform: translateY(-1px);
  }
`;

const HighlightPanel = styled.div`
  padding: 40px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 20px 40px rgba(90, 77, 140, 0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #6b5ca5, #9c8ccf);
  }
`;

const PanelLabel = styled.span`
  color: #111827;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: #111827;
  font-size: 1.6rem;
  line-height: 1.3;
  font-weight: 700;
`;

const PanelText = styled.p`
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
  font-size: 1rem;
  opacity: 0.9;
`;

const PanelList = styled.div`
  display: grid;
  gap: 16px;
  margin-top: auto;
`;

const PanelItem = styled.div`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(107, 92, 165, 0.1);
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 15px rgba(107, 92, 165, 0.05);
    border-color: rgba(107, 92, 165, 0.2);
  }

  .icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3e8ff;
    color: #6b5ca5;
    font-size: 1.2rem;
  }

  h3 {
    margin: 0 0 4px;
    color: #111827;
    font-size: 1.05rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #4b5563;
    font-size: 0.9rem;
    line-height: 1.5;
    opacity: 0.8;
  }
`;

const Section = styled.section`
  margin-top: 60px;
`;

const SectionHeader = styled.div`
  max-width: 720px;
  margin-bottom: 40px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    color: #111827;
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: rgba(107, 92, 165, 0.1);
    padding: 6px 12px;
    border-radius: 20px;
  }

  h2 {
    margin: 0 0 16px;
    color: #111827;
    font-size: clamp(2rem, 3.5vw, 2.8rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #4b5563;
    line-height: 1.7;
    font-size: 1.1rem;
    opacity: 0.9;
  }
`;

const AccessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const AccessIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3e8ff;
  color: #6b5ca5;
  font-size: 1.5rem;
  transition: all 0.3s ease;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
`;

const AccessCard = styled(Link)`
  position: relative;
  padding: 32px 24px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(107, 92, 165, 0.15);
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(180deg, rgba(107, 92, 165, 0.05) 0%, rgba(255,255,255,0) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(90, 77, 140, 0.1);
    border-color: rgba(107, 92, 165, 0.4);
    
    &::before {
      opacity: 1;
    }

    ${AccessIcon} {
      background: #6b5ca5;
      color: #ffffff;
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(107, 92, 165, 0.3);
    }
  }
`;

const AccessMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;

  h3 {
    margin: 0;
    color: #111827;
    font-size: 1.25rem;
    font-weight: 700;
  }
`;

const LockBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  background: #fdf4ff;
  border: 1px solid #f0abfc;
  color: #c026d3;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const AccessDescription = styled.p`
  margin: 0 0 24px;
  color: #4b5563;
  line-height: 1.6;
  min-height: 72px;
  opacity: 0.8;
  position: relative;
  z-index: 1;
`;

const AccessFooter = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-weight: 700;
  font-size: 0.95rem;
  position: relative;
  z-index: 1;
  transition: gap 0.2s ease;

  ${AccessCard}:hover & {
    gap: 12px;
  }
`;

const JourneyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const JourneyCard = styled.div`
  position: relative;
  padding: 32px 24px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(107, 92, 165, 0.15);
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    box-shadow: 0 10px 30px rgba(90, 77, 140, 0.08);
    transform: translateY(-4px);
    border-color: rgba(107, 92, 165, 0.3);
  }

  &::before {
    content: attr(data-step);
    position: absolute;
    top: -10px;
    right: -10px;
    color: rgba(107, 92, 165, 0.05);
    font-size: 8rem;
    font-weight: 900;
    line-height: 1;
    z-index: 0;
  }

  h3 {
    margin: 20px 0 12px;
    color: #111827;
    font-size: 1.2rem;
    font-weight: 700;
    position: relative;
    z-index: 1;
  }

  p {
    margin: 0;
    color: #4b5563;
    line-height: 1.6;
    font-size: 0.95rem;
    opacity: 0.8;
    position: relative;
    z-index: 1;
  }
`;

const JourneyIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6b5ca5 0%, #5a4d8c 100%);
  color: #ffffff;
  font-size: 1.3rem;
  position: relative;
  z-index: 1;
  box-shadow: 0 4px 15px rgba(107, 92, 165, 0.3);
`;

const ValueBand = styled.section`
  margin-top: 60px;
  padding: 48px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(107, 92, 165, 0.15);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(107, 92, 165, 0.05) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
    transform: translate(30%, -30%);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: 32px;
  }
`;

const ValueCard = styled.div`
  padding: 32px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(107, 92, 165, 0.1);
  box-shadow: 0 4px 15px rgba(107, 92, 165, 0.03);
  position: relative;
  z-index: 1;

  h3 {
    margin: 0 0 16px;
    color: #111827;
    font-size: 1.15rem;
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: #4b5563;
    line-height: 1.6;
    font-size: 0.95rem;
    opacity: 0.9;
  }
`;


const accessItems = [
  {
    title: "Medical Records",
    description: "Open the patient timeline, prescriptions, and care history without relying on paper files.",
    to: "/patient/ehr",
    icon: FaNotesMedical,
    requiresAuth: true,
  },
  {
    title: "Lab Reports",
    description: "Review recent diagnostics and follow-up findings in one repeatable digital path.",
    to: "/patient/lab-reports",
    icon: FaFlask,
    requiresAuth: true,
  },
  {
    title: "Digital Prescriptions",
    description: "Request prescription support and keep treatment instructions easier to access after consultation.",
    to: "/digital-prescription",
    icon: FaFilePrescription,
    requiresAuth: true,
  },
  {
    title: "DocX Plus",
    description: "Unlock priority access, medicine discounts, and long-term digital care support from one membership path.",
    to: "/plus",
    icon: FaUserShield,
    requiresAuth: true,
  },
];

const journeyItems = [
  {
    title: "Book or consult",
    description: "Start with doctor discovery, appointment selection, or a virtual consultation without queue-first friction.",
    icon: FaCalendarCheck,
  },
  {
    title: "Keep history together",
    description: "Use patient records to keep appointments, notes, and care context connected across the journey.",
    icon: FaNotesMedical,
  },
  {
    title: "Track diagnostics",
    description: "Check lab updates and treatment progress without asking patients to carry every paper report.",
    icon: FaFlask,
  },
  {
    title: "Continue treatment",
    description: "Move from digital prescriptions into medicine access and pharmacy follow-up inside the same ecosystem.",
    icon: FaCapsules,
  },
];

const CareHub = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageWrapper>
      <Navigationbar />

      <Content>
        <HeroCard>
          <HeroContent>
            <Eyebrow>
              <FaHeart />
              Care Hub
            </Eyebrow>
            <h1>Everything after booking should stay connected.</h1>
            <p>
              DocX is designed to close the gap between appointments, consultations,
              records, lab results, prescriptions, and pharmacy follow-up so the
              patient journey does not split into disconnected manual steps.
            </p>

            <HeroChips>
              <HeroChip>Medical records access</HeroChip>
              <HeroChip>Lab results in one flow</HeroChip>
              <HeroChip>Digital prescriptions</HeroChip>
              <HeroChip>Refill-ready follow-up</HeroChip>
            </HeroChips>

            <HeroActions>
              <PrimaryButton to="/find-doctors">
                Start with a doctor <FaArrowRight />
              </PrimaryButton>
              <SecondaryButton to="/digital-prescription">
                Request prescription support <FaArrowRight />
              </SecondaryButton>
            </HeroActions>
          </HeroContent>

          <HighlightPanel>
            <PanelLabel>Why it matters</PanelLabel>
            <PanelTitle>DocX is more than a booking layer.</PanelTitle>
            <PanelText>
              The strongest difference is continuity of care: patients can move
              from consultation into records, reports, and treatment follow-up
              without losing context at each step.
            </PanelText>

            <PanelList>
              <PanelItem>
                <div className="icon">
                  <FaVideo />
                </div>
                <div>
                  <h3>Consultation continuity</h3>
                  <p>Virtual and in-person care can both lead into the same follow-up flow.</p>
                </div>
              </PanelItem>
              <PanelItem>
                <div className="icon">
                  <FaNotesMedical />
                </div>
                <div>
                  <h3>Unified records</h3>
                  <p>Patient history stays easier to revisit for future decisions and repeat care.</p>
                </div>
              </PanelItem>
              <PanelItem>
                <div className="icon">
                  <FaCapsules />
                </div>
                <div>
                  <h3>Prescription to pharmacy</h3>
                  <p>Instructions, medicine access, and refill support stay closer together.</p>
                </div>
              </PanelItem>
            </PanelList>
          </HighlightPanel>
        </HeroCard>

        <Section>
          <SectionHeader>
            <span>
              <FaHeart />
              Quick Access
            </span>
            <h2>The core care tools patients need after consultation.</h2>
            <p>
              These entry points turn DocX into a connected care experience instead of
              a booking-only interface. Protected destinations will guide guests through
              sign-in and return them to the right place.
            </p>
          </SectionHeader>

          <AccessGrid>
            {accessItems.map((item) => {
              const Icon = item.icon;

              return (
                <AccessCard key={item.title} to={item.to}>
                  <AccessIcon>
                    <Icon />
                  </AccessIcon>
                  <AccessMeta>
                    <h3>{item.title}</h3>
                    {item.requiresAuth ? <LockBadge>Sign In</LockBadge> : null}
                  </AccessMeta>
                  <AccessDescription>{item.description}</AccessDescription>
                  <AccessFooter>
                    Open now <FaArrowRight />
                  </AccessFooter>
                </AccessCard>
              );
            })}
          </AccessGrid>
        </Section>

        <Section>
          <SectionHeader>
            <span>
              <FaCalendarCheck />
              Journey Flow
            </span>
            <h2>How DocX closes the hospital workflow gap.</h2>
            <p>
              The system should keep patients moving from first contact to treatment
              follow-up, which is exactly where most existing solutions stop too early.
            </p>
          </SectionHeader>

          <JourneyGrid>
            {journeyItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <JourneyCard key={item.title} data-step={`0${index + 1}`}>
                  <JourneyIcon>
                    <Icon />
                  </JourneyIcon>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </JourneyCard>
              );
            })}
          </JourneyGrid>
        </Section>

        <ValueBand>
          <ValueCard>
            <h3>Booking-only platforms handle the first click.</h3>
            <p>
              They help patients discover doctors, but they rarely keep the
              post-consultation experience connected.
            </p>
          </ValueCard>
          <ValueCard>
            <h3>Manual systems split records and treatment into silos.</h3>
            <p>
              Paper files, disconnected pharmacy steps, and scattered reports increase
              waiting time and reduce care visibility.
            </p>
          </ValueCard>
          <ValueCard>
            <h3>DocX focuses on continuity.</h3>
            <p>
              The Care Hub brings records, lab follow-up, prescriptions, and refill
              paths closer together so the service feels complete.
            </p>
          </ValueCard>
        </ValueBand>
      </Content>

      <Footer />
    </PageWrapper>
  );
};

export default CareHub;
