import React from "react";
import styled from "styled-components";
import { assets } from "@/shared/lib/assets";
import { Heart, ShieldCheck, Video, Clock } from "lucide-react";

const THEME = {
  background: "#fdfcff",
  surface: "#ffffff",
  border: "#ecdff5",
  text: "#2a1639",
  textSoft: "#6d5b7c",
  accent: "#683B93",
  accentDark: "#55307a",
  accentSoft: "#f3e8fc",
  accentGlow: "rgba(104, 59, 147, 0.15)",
};

const Section = styled.section`
  width: 100%;
  padding: 100px 40px;
  font-family: "Inter", "Barlow", sans-serif;

  @media (max-width: 900px) {
    padding: 70px 20px;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8%;

  @media (max-width: 980px) {
    flex-direction: column;
    gap: 80px;
  }
`;

const ImageSide = styled.div`
  position: relative;
  width: 45%;
  max-width: 500px;

  @media (max-width: 980px) {
    width: 100%;
    max-width: 600px;
  }
`;

const HeroImage = styled.img`
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 120px 20px 120px 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
`;

const CrossShape = styled.div`
  position: absolute;
  bottom: -40px;
  left: -40px;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;

  &::before {
    content: '';
    position: absolute;
    width: 44px;
    height: 140px;
    background-color: ${THEME.accentDark};
    border-radius: 4px;
  }

  &::after {
    content: '';
    position: absolute;
    width: 140px;
    height: 44px;
    background-color: ${THEME.accentDark};
    border-radius: 4px;
  }
  
  @media (max-width: 600px) {
    width: 100px;
    height: 100px;
    bottom: -20px;
    left: -20px;
    
    &::before {
      width: 32px;
      height: 100px;
    }
    
    &::after {
      width: 100px;
      height: 32px;
    }
  }
`;

const TextSide = styled.div`
  width: 50%;

  @media (max-width: 980px) {
    width: 100%;
  }
`;

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${THEME.accent};
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 24px;
  letter-spacing: 0.5px;

  &::before {
    content: '';
    width: 14px;
    height: 14px;
    background-color: ${THEME.accent};
    border-radius: 2px;
  }
`;

const Title = styled.h2`
  font-size: clamp(2.4rem, 4vw, 3.8rem);
  font-weight: 800;
  color: ${THEME.text};
  line-height: 1.3;
  margin: 0 0 28px;
  letter-spacing: -0.02em;
  
  span {
    background-color: ${THEME.accent};
    padding: 0px 14px;
    border-radius: 12px;
    color: #ffffff;
    display: inline-block;
    margin: 0 4px;
  }
`;

const Description = styled.p`
  color: ${THEME.textSoft};
  line-height: 1.7;
  font-size: 1.05rem;
  margin-bottom: 48px;
  max-width: 560px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px 30px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
`;

const FeatureItem = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
`;

const IconContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: ${THEME.accentDark};
  flex-shrink: 0;
  
  svg {
    width: 32px;
    height: 32px;
    stroke-width: 1.5;
  }

  &::after {
    content: '';
    width: 32px;
    height: 2px;
    background-color: ${THEME.accent};
  }
`;

const FeatureContent = styled.div`
  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 10px 0;
  }
  
  p {
    font-size: 0.95rem;
    color: ${THEME.textSoft};
    line-height: 1.6;
    margin: 0;
  }
`;

const features = [
  {
    icon: <Heart />,
    title: "Care Built Around You",
    description: "Designed for families who want healthcare to feel welcoming and stress-free."
  },
  {
    icon: <ShieldCheck />,
    title: "Private & Safe",
    description: "Trust digital healthcare with an experience that keeps your personal details secure."
  },
  {
    icon: <Video />,
    title: "Doctors Close By",
    description: "From virtual advice to follow-up prescriptions, stay connected to care anywhere."
  },
  {
    icon: <Clock />,
    title: "Fast Booking",
    description: "Schedule appointments that fit your busy life, with minimal wait times."
  }
];

const WhyUs = () => {
  return (
    <Section data-aos="fade-up">
      <Container>
        <ImageSide>
          <HeroImage src={assets.whyBlog} alt="Care and Support" />
          <CrossShape />
        </ImageSide>

        <TextSide>
          <Eyebrow>Why Choose Us?</Eyebrow>
          <Title>
            Digital Healthcare That<br/>
            Still Feels <span>Human</span> & <span>Warm</span>
          </Title>
          <Description>
            Technology shouldn't make healthcare feel colder. DocX creates a simpler way to ask for help, understand your next step, and care for your family with confidence across discovery and follow-up care.
          </Description>

          <Grid>
            {features.map((feature, index) => (
              <FeatureItem key={index}>
                <IconContainer>
                  {feature.icon}
                </IconContainer>
                <FeatureContent>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </FeatureContent>
              </FeatureItem>
            ))}
          </Grid>
        </TextSide>
      </Container>
    </Section>
  );
};

export default WhyUs;
