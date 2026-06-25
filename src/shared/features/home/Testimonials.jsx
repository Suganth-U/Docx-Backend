import React from 'react';
import styled from 'styled-components';
import { FaQuoteLeft, FaStar } from 'react-icons/fa';
import { assets } from "@/shared/lib/assets";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const THEME = {
  primary: "#8e24aa", 
  primaryLight: "rgba(142, 36, 170, 0.08)",
  text: "#12283a",
  textSoft: "#5c6b7b",
  white: "#ffffff",
  border: "#eaeef2",
  shadow: "0 10px 30px rgba(18, 40, 58, 0.04)",
  shadowHover: "0 20px 40px rgba(18, 40, 58, 0.08)",
  gradient: "linear-gradient(135deg, #8e24aa 0%, #ba68c8 100%)",
};

const Section = styled.section`
  padding: 100px 0; /* Full width for seamless bleed */
  background: transparent;
  text-align: center;
  overflow: hidden;
`;

const HeaderContainer = styled.div`
  max-width: 1200px;
  width: 100%;
  margin: 0 auto 60px;
  padding: 0 5%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const SubBadge = styled.span`
  display: inline-block;
  margin-bottom: 12px;
  color: ${THEME.primary};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: ${THEME.primaryLight};
  padding: 6px 14px;
  border-radius: 999px;
`;

const Title = styled.h2`
  margin: 0;
  color: ${THEME.text};
  font-family: "Barlow", sans-serif;
  font-size: clamp(2.2rem, 4vw, 3.2rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 700;
  width: 100%;
  white-space: nowrap;

  span {
    background: ${THEME.gradient};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  @media (max-width: 768px) {
    white-space: normal;
  }
`;

const CarouselWrapper = styled.div`
  width: 100%;
  max-width: 100vw;
  padding: 20px 0;
  
  .slick-list {
    overflow: visible; /* Allows shadows to not be clipped */
  }

  .slick-slide {
    padding: 20px 15px; /* space for hover shadow */
    transition: all 0.3s ease;
  }
  
  .slick-slide[aria-hidden="true"] {
    opacity: 0.6;
    transform: scale(0.98);
  }

  .slick-center {
    opacity: 1 !important;
    transform: scale(1) !important;
  }
`;

const QuoteCard = styled.div`
  background: ${THEME.white};
  padding: 40px;
  border-radius: 24px;
  text-align: left;
  border: 1px solid ${THEME.border};
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
  box-shadow: ${THEME.shadow};
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    box-shadow: ${THEME.shadowHover};
    transform: translateY(-5px);
    border-color: transparent;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: ${THEME.gradient};
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover::before { 
    opacity: 1; 
  }
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${THEME.primaryLight};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${THEME.primary};
  font-size: 20px;
  margin-bottom: 24px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  ${QuoteCard}:hover & {
    background: ${THEME.primary};
    color: ${THEME.white};
    transform: rotate(-10deg) scale(1.1);
  }
`;

const Text = styled.p`
  color: ${THEME.textSoft};
  font-size: 1.05rem;
  line-height: 1.7;
  margin: 0 0 32px 0;
  flex-grow: 1;
  font-family: "Inter", sans-serif;
`;

const User = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  border-top: 1px solid ${THEME.border};
  padding-top: 24px;
`;

const Avatar = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${THEME.border};
`;

const UserInfo = styled.div`
  h4 {
    font-size: 1.05rem;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 4px 0;
    font-family: "Barlow", sans-serif;
  }
  
  div {
    display: flex;
    gap: 4px;
    color: #FFB800; /* Richer star yellow */
    font-size: 14px;
  }
`;

const Testimonials = () => {
  const settings = {
    dots: false,
    infinite: true,
    speed: 8000,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    slidesToShow: 3.5,
    slidesToScroll: 1,
    arrows: false,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 2.5,
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1.2,
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        }
      }
    ]
  };

  const testimonialsData = [
    {
      text: "The digital prescription feature is a lifesaver. I didn't have to wait in line at the pharmacy, the medicines were delivered to my doorstep within 2 hours. Highly recommended!",
      name: "Sarah Jenkins",
      avatar: assets.patientAvatar
    },
    {
      text: "Dr. Richard was extremely professional during our virtual consultation. The video quality was great and I felt properly attended to without leaving my house.",
      name: "Michael Ross",
      avatar: assets.patientAvatar
    },
    {
      text: "DocX has completely changed how I manage my family's health checkups. Booking appointments is seamless and the reminders are very helpful.",
      name: "Emily Chen",
      avatar: assets.patientAvatar
    },
    {
      text: "The care hub makes it so easy to access all my past lab reports and share them with new specialists. It is a game changer for my ongoing treatments.",
      name: "David Peterson",
      avatar: assets.patientAvatar
    },
    {
      text: "I love how simple the interface is. I can quickly find the right doctor and book an appointment in less than a minute. Great experience overall.",
      name: "Jessica Alcott",
      avatar: assets.patientAvatar
    }
  ];

  return (
    <Section data-aos="fade-up">
      <HeaderContainer>
        <SubBadge>Testimonials</SubBadge>
        <Title>What our <span>patients say</span></Title>
      </HeaderContainer>
      
      <CarouselWrapper>
        <Slider {...settings}>
          {testimonialsData.map((testimonial, index) => (
            <div key={index}>
              <QuoteCard>
                <IconWrapper><FaQuoteLeft /></IconWrapper>
                <Text>"{testimonial.text}"</Text>
                <User>
                  <Avatar src={testimonial.avatar} alt={testimonial.name} />
                  <UserInfo>
                    <h4>{testimonial.name}</h4>
                    <div><FaStar /><FaStar /><FaStar /><FaStar /><FaStar /></div>
                  </UserInfo>
                </User>
              </QuoteCard>
            </div>
          ))}
        </Slider>
      </CarouselWrapper>
    </Section>
  );
};

export default Testimonials;

