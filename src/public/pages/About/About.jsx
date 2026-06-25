import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  FaArrowRight,
  FaCalendarCheck,
  FaCheckCircle,
  FaHeadset,
  FaLock,
  FaPills,
  FaShieldAlt,
  FaStethoscope,
  FaUserMd,
  FaVideo,
} from "react-icons/fa";
import { assets } from "@/shared/lib/assets";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";

const capabilityCards = [
  {
    icon: FaCalendarCheck,
    title: "Appointments made simpler",
    description:
      "Search for care, review service options, and keep bookings organized in one connected experience.",
  },
  {
    icon: FaVideo,
    title: "Virtual care with continuity",
    description:
      "Support remote consultations and follow-ups so patients can stay connected to care wherever they are.",
  },
  {
    icon: FaPills,
    title: "Digital prescriptions and pharmacy support",
    description:
      "Reduce friction between consultation, prescription management, and the next step in treatment.",
  },
];

const pillars = [
  {
    icon: FaStethoscope,
    title: "Access without friction",
    description:
      "DocX helps patients move from need to care with fewer barriers and clearer service pathways.",
  },
  {
    icon: FaUserMd,
    title: "Care that stays coordinated",
    description:
      "Appointments, virtual touchpoints, and prescription workflows are designed to feel connected rather than fragmented.",
  },
  {
    icon: FaShieldAlt,
    title: "Confidence through clarity",
    description:
      "Professional interfaces, transparent journeys, and trusted presentation help patients make informed decisions.",
  },
];

const standards = [
  {
    icon: FaCheckCircle,
    title: "Verified care pathways",
    description:
      "Service entry points are presented to support informed choices and a more reliable digital healthcare journey.",
  },
  {
    icon: FaStethoscope,
    title: "Patient-centered design",
    description:
      "Every interaction is shaped to feel calm, understandable, and approachable for patients and families.",
  },
  {
    icon: FaLock,
    title: "Privacy-minded workflows",
    description:
      "Digital care experiences are structured to respect sensitive information and reduce unnecessary complexity.",
  },
  {
    icon: FaHeadset,
    title: "Responsive human support",
    description:
      "DocX combines digital convenience with support when patients need extra guidance or reassurance.",
  },
];

const missionPoints = [
  "Bring core healthcare services into one connected digital experience.",
  "Help patients navigate appointments, remote care, and prescription follow-through with confidence.",
  "Create a platform that feels dependable for providers and intuitive for every patient touchpoint.",
];

const PageContainer = styled.div`
  background:
    radial-gradient(circle at top left, rgba(196, 181, 253, 0.16), transparent 32%),
    linear-gradient(180deg, #f8fafc 0%, #ffffff 32%);
  color: #0f172a;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  overflow-x: hidden;
`;

const SectionContainer = styled.div`
  width: 100%;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding-left: var(--page-padding-x);
  padding-right: var(--page-padding-x);
`;

const HeroSection = styled.section`
  padding: 32px 0 32px;
`;

const HeroFrame = styled.div`
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 32px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  padding: clamp(32px, 5vw, 56px);

  &::before {
    content: "";
    position: absolute;
    inset: auto auto -120px -120px;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    background: rgba(167, 139, 250, 0.12);
    filter: blur(10px);
  }

  &::after {
    content: "";
    position: absolute;
    top: -80px;
    right: -60px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: rgba(226, 232, 240, 0.65);
  }
`;

const HeroGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: clamp(28px, 4vw, 56px);
  align-items: center;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCopy = styled.div`
  max-width: 640px;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.08);
  color: #6d28d9;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 22px;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #8b5cf6;
  }
`;

const HeroTitle = styled.h1`
  margin: 0;
  font-size: clamp(2.6rem, 5vw, 4.55rem);
  line-height: 1.04;
  letter-spacing: -0.04em;
  color: #0f172a;
`;

const HeroDescription = styled.p`
  margin: 22px 0 0;
  max-width: 600px;
  font-size: 1.08rem;
  line-height: 1.8;
  color: #475569;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 30px;
`;

const HeroButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 174px;
  padding: 15px 22px;
  border-radius: 14px;
  border: 1px solid ${({ $secondary }) => ($secondary ? "#cbd5e1" : "#8e7dbe")};
  background: ${({ $secondary }) => ($secondary ? "#ffffff" : "#8e7dbe")};
  color: ${({ $secondary }) => ($secondary ? "#1e293b" : "#ffffff")};
  text-decoration: none;
  font-size: 0.98rem;
  font-weight: 600;
  box-shadow: ${({ $secondary }) =>
    $secondary ? "none" : "0 18px 35px rgba(142, 125, 190, 0.25)"};
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ $secondary }) =>
      $secondary ? "0 14px 30px rgba(15, 23, 42, 0.08)" : "0 22px 40px rgba(142, 125, 190, 0.32)"};
    border-color: ${({ $secondary }) => ($secondary ? "#94a3b8" : "#7c68b2")};
    background: ${({ $secondary }) => ($secondary ? "#f8fafc" : "#7c68b2")};
  }
`;

const HeroNote = styled.p`
  margin: 20px 0 0;
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.7;
`;

const HeroVisual = styled.div`
  position: relative;
  padding: 18px;

  @media (max-width: 1180px) {
    padding: 0;
  }
`;

const HeroImageCard = styled.div`
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid #dbe4f0;
  background: #e2e8f0;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);

  img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 420px;
    object-fit: cover;
  }

  @media (max-width: 980px) {
    img {
      min-height: 320px;
    }
  }
`;

const FloatingNote = styled.div`
  position: absolute;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 260px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 20px 30px rgba(15, 23, 42, 0.12);
  color: #334155;

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #8e7dbe;
    font-size: 1rem;
  }

  strong {
    display: block;
    margin-bottom: 4px;
    color: #0f172a;
    font-size: 0.95rem;
  }

  span {
    font-size: 0.86rem;
    line-height: 1.6;
  }

  &.top {
    top: 18px;
    left: 18px;
  }

  &.bottom {
    right: 18px;
    bottom: 18px;
  }

  @media (max-width: 1180px) {
    &.top,
    &.bottom {
      position: static;
      max-width: none;
    }
  }
`;

const FloatingStack = styled.div`
  @media (max-width: 1180px) {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-top: 18px;
  }
`;

const CapabilitySection = styled.section`
  padding: 28px 0 80px;
`;

const CapabilityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const CapabilityCard = styled.article`
  padding: 28px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: #d8cffa;
    box-shadow: 0 24px 40px rgba(15, 23, 42, 0.08);
  }
`;

const IconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  background: rgba(142, 125, 190, 0.12);
  color: #7c68b2;
  font-size: 1.2rem;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.22rem;
  color: #0f172a;
`;

const CardText = styled.p`
  margin: 12px 0 0;
  font-size: 0.98rem;
  line-height: 1.75;
  color: #475569;
`;

const MissionSection = styled.section`
  padding: 0 0 80px;
`;

const MissionPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: clamp(28px, 4vw, 52px);
  align-items: center;
  padding: clamp(28px, 5vw, 48px);
  border-radius: 30px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06);

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const MissionImage = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  min-height: 420px;
  aspect-ratio: 5 / 6;
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.08);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 18% center;
  }

  @media (max-width: 980px) {
    min-height: 300px;
    aspect-ratio: 16 / 10;

    img {
      object-position: 24% center;
    }
  }
`;

const SectionLabel = styled.span`
  display: inline-block;
  margin-bottom: 14px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6d28d9;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.14;
  letter-spacing: -0.03em;
  color: #0f172a;
`;

const SectionBody = styled.p`
  margin: 18px 0 0;
  max-width: 640px;
  font-size: 1rem;
  line-height: 1.85;
  color: #475569;
`;

const Checklist = styled.ul`
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
  display: grid;
  gap: 16px;
`;

const ChecklistItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid #e2e8f0;

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #8e7dbe;
    font-size: 1rem;
  }

  span {
    color: #334155;
    font-size: 0.96rem;
    line-height: 1.7;
  }
`;

const WhySection = styled.section`
  padding: 0 0 80px;
`;

const SectionIntro = styled.div`
  max-width: 740px;
  margin: 0 auto 34px;
  text-align: center;
`;

const PillarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const PillarCard = styled.article`
  height: 100%;
  padding: 30px;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfe 100%);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: #d8cffa;
    box-shadow: 0 24px 40px rgba(15, 23, 42, 0.08);
  }
`;

const StandardsSection = styled.section`
  padding: 0 0 88px;
`;

const StandardsPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(28px, 5vw, 48px);
  padding: clamp(28px, 5vw, 48px);
  border-radius: 32px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const StandardsLead = styled.div`
  max-width: 520px;
`;

const StandardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const StandardCard = styled.article`
  padding: 22px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.05);

  ${IconWrap} {
    margin-bottom: 16px;
  }
`;

const CTASection = styled.section`
  padding: 0 0 100px;
`;

const CTABand = styled.div`
  position: relative;
  overflow: hidden;
  padding: clamp(32px, 5vw, 50px);
  border-radius: 32px;
  border: 1px solid #d8cffa;
  background: linear-gradient(135deg, rgba(142, 125, 190, 0.14), rgba(255, 255, 255, 0.96));
  box-shadow: 0 24px 55px rgba(15, 23, 42, 0.08);
  text-align: center;

  &::before {
    content: "";
    position: absolute;
    top: -90px;
    right: -60px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: rgba(167, 139, 250, 0.15);
  }
`;

const CTAContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
`;

const CenteredBody = styled(SectionBody)`
  margin-left: auto;
  margin-right: auto;
`;

const CenteredActionRow = styled(ActionRow)`
  justify-content: center;
`;

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 800, once: true, easing: "ease-out-cubic" });
  }, []);

  return (
    <PageContainer>
      <Navigationbar />

      <HeroSection>
        <SectionContainer>
          <HeroFrame data-aos="fade-up">
            <HeroGrid>
              <HeroCopy>
                <Eyebrow>About DocX</Eyebrow>
                <HeroTitle>
                  Modern healthcare should feel clear, connected, and easy to reach.
                </HeroTitle>
                <HeroDescription>
                  DocX is built to make healthcare journeys more accessible and
                  more coordinated. We bring together appointments, virtual care,
                  prescriptions, and follow-through in a platform designed to
                  help patients move with confidence.
                </HeroDescription>

                <ActionRow>
                  <HeroButton to="/services">
                    Explore Services <FaArrowRight />
                  </HeroButton>
                  <HeroButton to="/contact-us" $secondary>
                    Contact Us
                  </HeroButton>
                </ActionRow>

                <HeroNote>
                  We focus on professional digital experiences that support
                  trust, reduce friction, and make the next step in care easier
                  to understand.
                </HeroNote>
              </HeroCopy>

              <HeroVisual data-aos="fade-left" data-aos-delay="100">
                <HeroImageCard>
                  <img
                    src={assets.servicesMain}
                    alt="DocX healthcare services experience"
                  />
                </HeroImageCard>
                <FloatingStack>
                  <FloatingNote className="top">
                    <FaCheckCircle />
                    <div>
                      <strong>Professional digital journeys</strong>
                      <span>
                        Structured around clarity, trust, and practical next
                        steps for patients.
                      </span>
                    </div>
                  </FloatingNote>
                  <FloatingNote className="bottom">
                    <FaShieldAlt />
                    <div>
                      <strong>Care with continuity</strong>
                      <span>
                        From discovery to follow-up, DocX is designed to keep
                        healthcare touchpoints connected.
                      </span>
                    </div>
                  </FloatingNote>
                </FloatingStack>
              </HeroVisual>
            </HeroGrid>
          </HeroFrame>
        </SectionContainer>
      </HeroSection>

      <CapabilitySection>
        <SectionContainer>
          <CapabilityGrid>
            {capabilityCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <CapabilityCard
                  key={card.title}
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <IconWrap>
                    <Icon />
                  </IconWrap>
                  <CardTitle>{card.title}</CardTitle>
                  <CardText>{card.description}</CardText>
                </CapabilityCard>
              );
            })}
          </CapabilityGrid>
        </SectionContainer>
      </CapabilitySection>

      <MissionSection>
        <SectionContainer>
          <MissionPanel>
            <MissionImage data-aos="fade-right">
              <img src={assets.aboutBg} alt="Patients supported through digital care" />
            </MissionImage>

            <div data-aos="fade-left">
              <SectionLabel>Our mission</SectionLabel>
              <SectionTitle>
                Build a healthcare experience that feels more joined up for every patient.
              </SectionTitle>
              <SectionBody>
                DocX exists to reduce the fragmentation patients often face when
                they are searching for care, arranging a visit, managing a
                prescription, or continuing treatment after a consultation. We
                believe digital healthcare should feel professional, calm, and
                dependable at every step.
              </SectionBody>
              <SectionBody>
                By connecting important parts of the care journey in one place,
                we help patients spend less time navigating systems and more
                time focusing on health outcomes.
              </SectionBody>

              <Checklist>
                {missionPoints.map((point) => (
                  <ChecklistItem key={point}>
                    <FaCheckCircle />
                    <span>{point}</span>
                  </ChecklistItem>
                ))}
              </Checklist>
            </div>
          </MissionPanel>
        </SectionContainer>
      </MissionSection>

      <WhySection>
        <SectionContainer>
          <SectionIntro data-aos="fade-up">
            <SectionLabel>Why DocX</SectionLabel>
            <SectionTitle>
              A platform shaped around access, coordination, and confidence.
            </SectionTitle>
            <CenteredBody>
              Our approach is not just about putting services online. It is
              about making healthcare journeys easier to understand, easier to
              continue, and easier to trust.
            </CenteredBody>
          </SectionIntro>

          <PillarGrid>
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;

              return (
                <PillarCard
                  key={pillar.title}
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <IconWrap>
                    <Icon />
                  </IconWrap>
                  <CardTitle>{pillar.title}</CardTitle>
                  <CardText>{pillar.description}</CardText>
                </PillarCard>
              );
            })}
          </PillarGrid>
        </SectionContainer>
      </WhySection>

      <StandardsSection>
        <SectionContainer>
          <StandardsPanel>
            <StandardsLead data-aos="fade-right">
              <SectionLabel>Our standards</SectionLabel>
              <SectionTitle>
                Trust is built through thoughtful design and responsible execution.
              </SectionTitle>
              <SectionBody>
                We aim to make every interaction with DocX feel professional,
                understandable, and supportive. That means focusing not only on
                what the platform can do, but on how confidently patients can
                use it when it matters.
              </SectionBody>
            </StandardsLead>

            <StandardsGrid>
              {standards.map((item, index) => {
                const Icon = item.icon;

                return (
                  <StandardCard
                    key={item.title}
                    data-aos="fade-up"
                    data-aos-delay={index * 90}
                  >
                    <IconWrap>
                      <Icon />
                    </IconWrap>
                    <CardTitle>{item.title}</CardTitle>
                    <CardText>{item.description}</CardText>
                  </StandardCard>
                );
              })}
            </StandardsGrid>
          </StandardsPanel>
        </SectionContainer>
      </StandardsSection>

      <CTASection>
        <SectionContainer>
          <CTABand data-aos="zoom-in">
            <CTAContent>
              <SectionLabel>Explore care</SectionLabel>
              <SectionTitle>
                Ready to see how DocX supports the next step in care?
              </SectionTitle>
              <CenteredBody>
                Browse our services to discover how appointments, virtual care,
                and digital prescription support come together in one
                professional patient experience.
              </CenteredBody>

              <CenteredActionRow>
                <HeroButton to="/services">
                  Explore Services <FaArrowRight />
                </HeroButton>
              </CenteredActionRow>
            </CTAContent>
          </CTABand>
        </SectionContainer>
      </CTASection>

      <Footer />
    </PageContainer>
  );
};

export default About;
