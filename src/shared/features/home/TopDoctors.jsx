import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaStar,
  FaUserMd,
} from "react-icons/fa";
import api from "@/shared/lib/api";

const THEME = {
  background: "#f7f2ff",
  surface: "#ffffff",
  border: "#e6dcf4",
  text: "#1c122e",
  textSoft: "#6b6279",
  accent: "#7c3aed",
  accentDark: "#5b21b6",
  accentSoft: "#f4eeff",
  success: "#10b981",
  rating: "#f59e0b",
  wash: "#faf7ff",
};

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Section = styled.section`
  width: 100%;
  padding: 100px 40px;
  background: transparent;

  @media (max-width: 768px) {
    padding: 64px 20px;
  }
`;

const Container = styled.div`
  max-width: 1320px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 60px;
  gap: 32px;

  @media (max-width: 980px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const HeaderText = styled.div`
  max-width: 680px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 8px 16px;
    border-radius: 100px;
    background: linear-gradient(135deg, ${THEME.accentSoft} 0%, #eaddff 100%);
    color: ${THEME.accentDark};
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08);
  }

  h3 {
    margin: 0 0 16px;
    color: ${THEME.text};
    font-family: "Barlow", sans-serif;
    font-size: clamp(2.4rem, 4.5vw, 3.8rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 800;
  }

  p {
    margin: 0;
    color: ${THEME.textSoft};
    font-size: 1.1rem;
    line-height: 1.7;
  }
`;

const HeaderAside = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 20px;

  @media (max-width: 980px) {
    align-items: flex-start;
    width: 100%;
  }
`;

const AllDoctorsLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  border-radius: 999px;
  background: ${THEME.surface};
  color: ${THEME.text};
  border: 1px solid ${THEME.border};
  text-decoration: none;
  font-weight: 800;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 10px 30px rgba(28, 18, 46, 0.04);

  &:hover {
    border-color: ${THEME.accent};
    color: ${THEME.accentDark};
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(124, 58, 237, 0.12);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border-radius: 32px;
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  box-shadow: 0 20px 48px rgba(28, 18, 46, 0.06);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    border-color: #d8caef;
    box-shadow: 0 30px 58px rgba(91, 33, 182, 0.14);

    .book-btn {
      background-size: 200% auto;
      animation: ${shimmer} 2s linear infinite;
    }
  }
`;

const ProfileSectionBg = styled.div`
  position: relative;
  background: linear-gradient(135deg, ${THEME.accentDark} 0%, ${THEME.accent} 100%);
  padding: 24px 28px 28px;
  color: #ffffff;
`;

const BadgesContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const GlassBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffffff;

  &.success {
    background: rgba(16, 185, 129, 0.25);
    border-color: rgba(16, 185, 129, 0.4);
  }
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
`;

const AvatarContainer = styled.div`
  width: 76px;
  height: 76px;
  border-radius: 22px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
`;

const AvatarInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Barlow", sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  color: ${THEME.accent};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
`;

const Name = styled.h4`
  margin: 0 0 4px;
  color: #ffffff;
  font-family: "Barlow", sans-serif;
  font-size: 1.35rem;
  line-height: 1.2;
  font-weight: 800;
`;

const Specialty = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 24px 28px 28px;
  text-align: left;
`;

const Summary = styled.p`
  margin: 0 0 24px;
  color: ${THEME.textSoft};
  font-size: 0.95rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
`;

const InfoPill = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  background: ${THEME.wash};
  border-radius: 20px;
  border: 1px solid rgba(124, 58, 237, 0.06);

  small {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${THEME.textSoft};
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  strong {
    color: ${THEME.text};
    font-size: 0.95rem;
    font-weight: 800;
  }
`;

const SlotsWrapper = styled.div`
  margin-top: auto;
  margin-bottom: 24px;
  background: rgba(244, 238, 255, 0.5);
  border-radius: 20px;
  padding: 16px;
  text-align: left;
`;

const SlotHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 800;
    color: ${THEME.text};
    letter-spacing: 0.05em;
    text-transform: uppercase;

    svg {
      color: ${THEME.success};
    }
  }

  .date {
    color: ${THEME.accent};
  }
`;

const SlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const SlotChip = styled.div`
  background: ${THEME.surface};
  border: 1px solid rgba(124, 58, 237, 0.15);
  color: ${THEME.accentDark};
  padding: 8px 4px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
`;

const EmptySlots = styled.div`
  font-size: 0.85rem;
  color: ${THEME.textSoft};
  line-height: 1.5;
`;

const ActionBtn = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, ${THEME.accent} 0%, #a56bff 50%, ${THEME.accent} 100%);
  background-size: 200% auto;
  color: #ffffff;
  text-decoration: none;
  font-weight: 800;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 12px 24px rgba(124, 58, 237, 0.25);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }

  &:hover::after {
    transform: translateX(100%);
  }
`;

const LoadingCard = styled(Card)`
  min-height: 480px;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: ${THEME.textSoft};
  text-align: center;
  font-weight: 700;
`;

const getInitials = (name = "") =>
  name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const specialtyLabel = (specialty) => specialty || "General Care";

const shortLocation = (doctor) =>
  doctor.hospitals?.[0] || doctor.location || "Location shared during booking";

const nextOpening = (doctor) =>
  doctor.nextAvailableDate || doctor.nextAvailableSlot || "Availability updating";

const doctorSummary = (doctor) => {
  const specialty = specialtyLabel(doctor.specialty);
  const location = doctor.hospitals?.[0] || doctor.location;
  if (location) {
    return `${specialty} care with active booking availability in ${location}.`;
  }
  return `${specialty} care with active booking availability right now.`;
};

const bookingLink = (doctor) =>
  `/appointment?doctorId=${encodeURIComponent(
    doctor._id || doctor.id
  )}&doctorName=${encodeURIComponent(
    doctor.name || "Doctor"
  )}&specialty=${encodeURIComponent(
    doctor.specialty || ""
  )}&consultationType=PHYSICAL`;

const TopDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const fetchDoctors = async () => {
      try {
        const { data } = await api.get("/doctor");
        const rankedDoctors = [...data]
          .sort((left, right) => {
            const leftSlots = left.availableSlots?.length || 0;
            const rightSlots = right.availableSlots?.length || 0;
            return rightSlots - leftSlots;
          })
          .slice(0, 3);
        setDoctors(rankedDoctors);
      } catch (error) {
        console.warn("Top doctors are temporarily unavailable.");
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  return (
    <Section data-aos="fade-up">
      <Container>
        <Header>
          <HeaderText>
            <span>
              <FaBolt size={12} /> Live Availability
            </span>
            <h3>Book a doctor while the slot is open.</h3>
            <p>
              The home page now highlights doctors with the strongest active
              availability, so patients can move from discovery to booking faster.
            </p>
          </HeaderText>

          <HeaderAside>
            <AllDoctorsLink to="/find-doctors">
              Explore all doctors <FaArrowRight size={14} />
            </AllDoctorsLink>
          </HeaderAside>
        </Header>

        <Grid>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <LoadingCard key={index}>Loading availability...</LoadingCard>
            ))
          ) : doctors.length > 0 ? (
            doctors.map((doctor, index) => (
              <Card key={doctor._id || doctor.id || index}>
                <ProfileSectionBg>
                  <BadgesContainer>
                    <GlassBadge>
                      <FaUserMd /> Specialist
                    </GlassBadge>
                    <GlassBadge className="success">
                      <FaCheckCircle /> Verified
                    </GlassBadge>
                  </BadgesContainer>

                  <ProfileSection>
                    <AvatarContainer>
                      <AvatarInner>
                        {doctor.image ? (
                          <img src={doctor.image} alt={doctor.name || "Doctor"} />
                        ) : (
                          getInitials(doctor.name || "Doctor")
                        )}
                      </AvatarInner>
                    </AvatarContainer>

                    <ProfileInfo>
                      <Name title={doctor.name || "Doctor"}>{doctor.name || "Doctor"}</Name>
                      <Specialty title={specialtyLabel(doctor.specialty)}>{specialtyLabel(doctor.specialty)}</Specialty>
                    </ProfileInfo>
                  </ProfileSection>
                </ProfileSectionBg>

                <CardBody>
                  <Summary>{doctorSummary(doctor)}</Summary>

                  <InfoGrid>
                    <InfoPill>
                      <small><FaMapMarkerAlt /> Venue</small>
                      <strong>{shortLocation(doctor)}</strong>
                    </InfoPill>
                    <InfoPill>
                      <small><FaStar style={{ color: THEME.rating }} /> Rating</small>
                      <strong>{doctor.rating || "4.8"} / 5.0</strong>
                    </InfoPill>
                  </InfoGrid>

                  <SlotsWrapper>
                    <SlotHeader>
                      <span><FaRegCalendarAlt /> Availability</span>
                      <span className="date">{nextOpening(doctor)}</span>
                    </SlotHeader>
                    
                    {doctor.availableSlots?.length > 0 ? (
                      <SlotGrid>
                        {doctor.availableSlots.slice(0, 3).map((slot, i) => (
                          <SlotChip key={`${slot}-${i}`}>{slot}</SlotChip>
                        ))}
                      </SlotGrid>
                    ) : (
                      <EmptySlots>
                        Fresh slot times are updating. Continue to booking to review the latest availability.
                      </EmptySlots>
                    )}
                  </SlotsWrapper>

                  <ActionBtn to={bookingLink(doctor)} className="book-btn">
                    Book Appointment <FaArrowRight size={14} />
                  </ActionBtn>
                </CardBody>
              </Card>
            ))
          ) : (
            <LoadingCard as="div" style={{ gridColumn: "1 / -1" }}>
              Doctor availability is updating right now. Patients can still browse the full directory.
            </LoadingCard>
          )}
        </Grid>
      </Container>
    </Section>
  );
};

export default TopDoctors;
