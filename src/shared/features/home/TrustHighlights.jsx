import React from "react";
import styled from "styled-components";
import {
  FaCapsules,
  FaCheckCircle,
  FaFlask,
  FaNotesMedical,
  FaVideo,
} from "react-icons/fa";

const THEME = {
  background: "#ffffff",
  surface: "#fafafa",
  border: "#f4f4f5",
  borderStrong: "#e4e4e7",
  text: "#18181b",
  textSoft: "#71717a",
  accent: "#7b4ce2",
  accentSoft: "#efe6ff",
};

const Section = styled.section`
  width: 100%;
  padding: 20px 40px 0;

  @media (max-width: 768px) {
    padding: 20px 20px 0;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 28px;
  background: ${THEME.background};
`;

const Header = styled.div`
  max-width: 620px;
  margin-bottom: 24px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: ${THEME.accent};
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0 0 10px;
    color: ${THEME.text};
    font-family: "Barlow", sans-serif;
    font-size: clamp(1.8rem, 3.5vw, 2.5rem);
    line-height: 1.02;
    letter-spacing: -0.03em;
  }

  p {
    margin: 0;
    color: ${THEME.textSoft};
    line-height: 1.7;
  }
`;

const HeaderIcon = styled.span`
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${THEME.accent};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 700px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  padding: 24px;
  border-radius: 16px;
  border: 1px solid ${THEME.borderStrong};
  background: ${THEME.surface};
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${THEME.accent};
  }
`;

const IconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${THEME.accentSoft};
  color: ${THEME.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

const Stat = styled.p`
  margin: 0 0 8px;
  color: ${THEME.text};
  font-family: "Barlow", sans-serif;
  font-size: 1.4rem;
  line-height: 1;
`;

const Label = styled.p`
  margin: 0 0 6px;
  color: ${THEME.text};
  font-weight: 700;
`;

const Detail = styled.p`
  margin: 0;
  color: ${THEME.textSoft};
  font-size: 0.94rem;
  line-height: 1.6;
`;

const items = [
  {
    icon: FaCheckCircle,
    stat: "Verified",
    label: "Appointment paths",
    detail: "Start with trusted discovery and move patients into care without queue-first friction.",
  },
  {
    icon: FaNotesMedical,
    stat: "Unified",
    label: "Medical records",
    detail: "Keep consultations, history, and follow-up context accessible in one place.",
  },
  {
    icon: FaVideo,
    stat: "Remote",
    label: "Video consultation",
    detail: "Continue care when an in-person visit is not ideal or practical.",
  },
  {
    icon: FaFlask,
    stat: "Tracked",
    label: "Lab reports",
    detail: "Review diagnostics and recent results without relying on paper handoffs.",
  },
  {
    icon: FaCapsules,
    stat: "End-to-end",
    label: "Prescription follow-up",
    detail: "Turn digital instructions into medicine access and refill-ready next steps.",
  },
];

const TrustHighlights = () => {
  return (
    <Section data-aos="fade-up">
      <Container>
        <Header>
          <span>
            <HeaderIcon>
              <FaCheckCircle size={12} />
            </HeaderIcon>
            Why Patients Trust DocX
          </span>
          <h3>Make the first visit simple and the next step connected.</h3>
          <p>
            DocX should reassure patients quickly, then show that care does not
            stop at booking. Records, reports, prescriptions, and pharmacy
            follow-up stay part of the same experience.
          </p>
        </Header>

        <Grid>
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.label}>
                <IconWrap>
                  <Icon size={20} />
                </IconWrap>
                <Stat>{item.stat}</Stat>
                <Label>{item.label}</Label>
                <Detail>{item.detail}</Detail>
              </Card>
            );
          })}
        </Grid>
      </Container>
    </Section>
  );
};

export default TrustHighlights;
