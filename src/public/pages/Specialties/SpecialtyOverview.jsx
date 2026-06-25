import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Link, useParams } from "react-router-dom";
import {
  FaArrowRight,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaStethoscope,
} from "react-icons/fa";
import Footer from "@/shared/components/layout/Footer/Footer";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import api from "@/shared/lib/api";
import {
  getSpecialtyBySlug,
  matchesSpecialtyValue,
} from "@/shared/data/specialties";

const THEME = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f8f6fb",
  border: "#efebf4",
  accent: "#6d3ea2",
  accentSoft: "rgba(109, 62, 162, 0.08)",
  accentDark: "#512a84",
  text: "#2a1639",
  textSoft: "#6a5c78",
  warning: "#9b5f12",
  warningSoft: "#fff4e5",
  shadow: "0 12px 30px rgba(78, 44, 117, 0.05)",
};

const Page = styled.div`
  min-height: 100vh;
  background: #ffffff;
`;

const Content = styled.main`
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 120px 40px 80px;

  @media (max-width: 768px) {
    padding: 104px 20px 64px;
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
  align-items: stretch;
  margin-bottom: 34px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const HeroPanel = styled.div`
  padding: 34px;
  border-radius: 32px;
  background: linear-gradient(145deg, #4a2d6b 0%, #7f57b3 100%);
  color: #ffffff;
  box-shadow: 0 24px 40px rgba(74, 45, 107, 0.2);

  @media (max-width: 768px) {
    padding: 24px;
  }

  span {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.82);
  }

  h1 {
    margin: 0 0 14px;
    font-family: "Barlow", sans-serif;
    font-size: clamp(2.4rem, 6vw, 4.2rem);
    line-height: 0.96;
    letter-spacing: -0.05em;
  }

  p {
    margin: 0;
    max-width: 720px;
    font-size: 1rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.9);
  }
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 24px;
`;

const PrimaryAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 14px;
  background: #ffffff;
  color: ${THEME.accentDark};
  text-decoration: none;
  font-weight: 700;
  box-shadow: 0 12px 22px rgba(74, 45, 107, 0.18);
`;

const SecondaryAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  color: #ffffff;
  text-decoration: none;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
`;

const SurfaceAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px solid ${THEME.border};
  background: ${THEME.background};
  color: ${THEME.text};
  text-decoration: none;
  font-weight: 700;
`;

const UrgentCard = styled.div`
  padding: 28px;
  border-radius: 32px;
  border: 1px solid #f3d8b5;
  background: linear-gradient(180deg, ${THEME.warningSoft} 0%, #ffffff 100%);
  box-shadow: 0 18px 30px rgba(195, 109, 29, 0.08);

  h2 {
    margin: 0 0 10px;
    color: ${THEME.text};
    font-family: "Barlow", sans-serif;
    font-size: 1.8rem;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  p {
    margin: 0;
    color: ${THEME.textSoft};
    line-height: 1.8;
  }
`;

const UrgentTop = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: ${THEME.warning};
  font-weight: 700;
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.36fr);
  gap: 24px;
  margin-bottom: 34px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Surface = styled.div`
  padding: 32px;
  border-radius: 32px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  box-shadow: ${THEME.shadow};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 20px 40px rgba(74, 45, 107, 0.08);
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 16px;
  color: ${THEME.text};
  font-family: "Barlow", sans-serif;
  font-size: 2rem;
  line-height: 1;
  letter-spacing: -0.04em;
`;

const SectionCopy = styled.p`
  margin: 0 0 18px;
  color: ${THEME.textSoft};
  line-height: 1.7;
`;

const ChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const InfoChip = styled.span`
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid ${THEME.border};
  background: ${THEME.background};
  color: ${THEME.text};
  font-size: 0.94rem;
  font-weight: 600;
`;

const CareList = styled.div`
  display: grid;
  gap: 12px;
`;

const CareItem = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: ${THEME.textSoft};
  line-height: 1.7;

  svg {
    margin-top: 4px;
    color: ${THEME.accent};
    flex-shrink: 0;
  }
`;

const DoctorSection = styled.section`
  margin-top: 6px;
`;

const DoctorHeader = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
`;

const DoctorMeta = styled.p`
  margin: 0;
  color: ${THEME.textSoft};
  line-height: 1.7;
`;

const DoctorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const DoctorCard = styled.div`
  padding: 24px;
  border-radius: 28px;
  border: 1px solid ${THEME.border};
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(74, 45, 107, 0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(74, 45, 107, 0.08);
    border-color: ${THEME.accentSoft};
  }
`;

const DoctorTop = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
`;

const DoctorAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: linear-gradient(135deg, ${THEME.accent} 0%, #9c74d4 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Barlow", sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DoctorName = styled.h3`
  margin: 0 0 4px;
  color: ${THEME.text};
  font-family: "Barlow", sans-serif;
  font-size: 1.45rem;
  line-height: 1;
`;

const DoctorSpecialty = styled.p`
  margin: 0;
  color: ${THEME.accent};
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const DoctorLine = styled.p`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 10px 0 0;
  color: ${THEME.textSoft};
  line-height: 1.6;

  svg {
    margin-top: 4px;
    color: ${THEME.accent};
    flex-shrink: 0;
  }
`;

const SlotWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
`;

const SlotChip = styled.span`
  padding: 8px 12px;
  border-radius: 999px;
  background: ${THEME.accentSoft};
  color: ${THEME.accentDark};
  font-size: 0.88rem;
  font-weight: 700;
`;

const DoctorAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  color: ${THEME.accent};
  text-decoration: none;
  font-weight: 700;
`;

const RelatedGrid = styled.div`
  display: grid;
  gap: 14px;
`;

const RelatedCard = styled(Link)`
  display: block;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid ${THEME.border};
  background: ${THEME.background};
  text-decoration: none;
  color: ${THEME.text};
  font-weight: 700;
`;

const EmptyState = styled(Surface)`
  text-align: center;
`;

const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
`;

const getInitials = (name = "") =>
  name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const SpecialtyOverview = () => {
  const { slug } = useParams();
  const specialty = getSpecialtyBySlug(slug);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/doctor");
        setDoctors(data);
      } catch (error) {
        console.error("Failed to load doctors for specialty overview", error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [slug]);

  if (!specialty) {
    return (
      <Page>
        <Navigationbar />
        <Content>
          <EmptyState>
            <SectionTitle>Specialty not found</SectionTitle>
            <SectionCopy>
              This specialty is not in the current DocX catalog yet. You can
              still browse all doctors or go back to the specialty list.
            </SectionCopy>
            <EmptyActions>
              <PrimaryAction to="/services">
                Browse specialties <FaArrowRight size={14} />
              </PrimaryAction>
              <SurfaceAction to="/find-doctors">View all doctors</SurfaceAction>
            </EmptyActions>
          </EmptyState>
        </Content>
        <Footer />
      </Page>
    );
  }

  const matchedDoctors = doctors
    .filter((doctor) => matchesSpecialtyValue(doctor.specialty, specialty.slug))
    .slice(0, 4);

  const hasDoctors = matchedDoctors.length > 0;
  const SpecialtyIcon = specialty.icon;

  return (
    <Page>
      <Navigationbar />

      <Content>
        <Hero>
          <HeroPanel>
            <span>{specialty.name}</span>
            <h1>Start your {specialty.name.toLowerCase()} care path with clarity.</h1>
            <p>{specialty.shortDescription}</p>

            <HeroActions>
              <PrimaryAction to={`/find-doctors?specialty=${encodeURIComponent(specialty.slug)}`}>
                Book {specialty.name} appointment <FaArrowRight size={14} />
              </PrimaryAction>
              <SecondaryAction to="/find-doctors">
                View all doctors <FaArrowRight size={14} />
              </SecondaryAction>
            </HeroActions>
          </HeroPanel>

          <UrgentCard>
            <UrgentTop>
              <FaExclamationTriangle />
              Know when to seek urgent care
            </UrgentTop>
            <h2>Do not ignore severe symptoms.</h2>
            <p>{specialty.urgentWarning}</p>
          </UrgentCard>
        </Hero>

        <Grid>
          <Surface>
            <SectionTitle>What this specialty treats</SectionTitle>
            <SectionCopy>
              Use this page to understand when {specialty.name.toLowerCase()} is
              the right next step before choosing a doctor.
            </SectionCopy>

            <ChipWrap>
              {specialty.treats.map((item) => (
                <InfoChip key={item}>{item}</InfoChip>
              ))}
            </ChipWrap>

            <DoctorSection>
              <SectionTitle style={{ marginTop: 28 }}>Common reasons to book</SectionTitle>
              <SectionCopy>
                Patients often start here when these symptoms or concerns are
                affecting daily life.
              </SectionCopy>
              <CareList>
                {specialty.symptoms.map((symptom) => (
                  <CareItem key={symptom}>
                    <FaCheckCircle />
                    <span>{symptom}</span>
                  </CareItem>
                ))}
              </CareList>
            </DoctorSection>
          </Surface>

          <Surface>
            <SectionTitle>Related services</SectionTitle>
            <SectionCopy>
              Continue care with connected services inside DocX.
            </SectionCopy>
            <RelatedGrid>
              {specialty.relatedServices.map((service) => (
                <RelatedCard to={service.path} key={service.label}>
                  {service.label}
                </RelatedCard>
              ))}
            </RelatedGrid>

            <DoctorSection>
              <SectionTitle style={{ marginTop: 28 }}>Care fit</SectionTitle>
              <CareList>
                <CareItem>
                  <SpecialtyIcon />
                  <span>{specialty.shortDescription}</span>
                </CareItem>
                <CareItem>
                  <FaStethoscope />
                  <span>Use the doctor list to compare availability and book the right visit.</span>
                </CareItem>
              </CareList>
            </DoctorSection>
          </Surface>
        </Grid>

        <Surface>
          <DoctorHeader>
            <div>
              <SectionTitle style={{ marginBottom: 8 }}>Top available doctors</SectionTitle>
              <DoctorMeta>
                {loading
                  ? "Checking current doctor availability for this specialty."
                  : hasDoctors
                    ? `Showing currently available doctors in ${specialty.name}.`
                    : `No verified ${specialty.name.toLowerCase()} doctors are available right now, but patients can still continue to the full directory.`}
              </DoctorMeta>
            </div>

            <PrimaryAction to={`/find-doctors?specialty=${encodeURIComponent(specialty.slug)}`}>
              View all {specialty.name} doctors <FaArrowRight size={14} />
            </PrimaryAction>
          </DoctorHeader>

          {loading ? (
            <SectionCopy>Loading doctors...</SectionCopy>
          ) : hasDoctors ? (
            <DoctorGrid>
              {matchedDoctors.map((doctor) => (
                <DoctorCard key={doctor.id}>
                  <DoctorTop>
                    <DoctorAvatar>
                      {doctor.image ? (
                        <img src={doctor.image} alt={doctor.name} />
                      ) : (
                        getInitials(doctor.name)
                      )}
                    </DoctorAvatar>

                    <div>
                      <DoctorName>{doctor.name}</DoctorName>
                      <DoctorSpecialty>{doctor.specialty}</DoctorSpecialty>
                    </div>
                  </DoctorTop>

                  <DoctorLine>
                    <FaMapMarkerAlt />
                    <span>{doctor.hospitals?.[0] || doctor.location || "Location shared during booking"}</span>
                  </DoctorLine>

                  <DoctorLine>
                    <FaClock />
                    <span>{doctor.nextAvailableDate || doctor.nextAvailableSlot || "Availability updating"}</span>
                  </DoctorLine>

                  {doctor.availableSlots?.length > 0 && (
                    <SlotWrap>
                      {doctor.availableSlots.slice(0, 3).map((slot) => (
                        <SlotChip key={slot}>{slot}</SlotChip>
                      ))}
                    </SlotWrap>
                  )}

                  <DoctorAction
                    to={`/appointment?doctorId=${encodeURIComponent(doctor.id)}&doctorName=${encodeURIComponent(doctor.name)}&specialty=${encodeURIComponent(doctor.specialty)}&consultationType=PHYSICAL`}
                  >
                    Choose slot with {doctor.name.replace(/^Dr\.\s*/i, "").split(" ")[0]} <FaArrowRight size={14} />
                  </DoctorAction>
                </DoctorCard>
              ))}
            </DoctorGrid>
          ) : (
            <EmptyState as="div">
              <SectionTitle>No doctors listed yet for this specialty</SectionTitle>
              <SectionCopy>
                The specialty guidance is still available, and patients can
                continue to the main directory to find nearby or related care.
              </SectionCopy>
              <EmptyActions>
                <PrimaryAction to="/find-doctors">
                  View all doctors <FaArrowRight size={14} />
                </PrimaryAction>
                <SurfaceAction to="/services">Browse more specialties</SurfaceAction>
              </EmptyActions>
            </EmptyState>
          )}
        </Surface>
      </Content>

      <Footer />
    </Page>
  );
};

export default SpecialtyOverview;
