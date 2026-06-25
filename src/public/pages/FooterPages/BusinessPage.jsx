import React from 'react';
import styled from 'styled-components';
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import { FaChartLine, FaUserMd, FaHospital, FaCheckCircle, FaBuilding, FaCalendarCheck, FaHeartbeat } from 'react-icons/fa';

const Wrapper = styled.div`
  font-family: 'Inter', sans-serif;
`;

const Hero = styled.section`
  background: #1a202c;
  color: white;
  padding: 120px 5%;
  text-align: center;
  
  h1 {
    font-size: 48px;
    font-family: 'Philosopher', serif;
    margin-bottom: 20px;
    background: linear-gradient(to right, #fff, #a29bfe);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  p {
    font-size: 18px;
    color: #cbd5e0;
    max-width: 700px;
    margin: 0 auto 40px;
    line-height: 1.6;
  }

  button {
    background: #683B93;
    color: white;
    padding: 15px 35px;
    border: none;
    border-radius: 30px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(104, 59, 147, 0.4);
    }
  }
`;

const FeaturesSection = styled.section`
  padding: 100px 10%;
  background: white;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
`;

const FeatureCard = styled.div`
  padding: 30px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  
  .icon {
    font-size: 30px;
    color: #683B93;
    margin-bottom: 20px;
  }
  
  h3 {
    margin-bottom: 15px;
    font-size: 20px;
    color: #2d3748;
  }
  
  p {
    color: #718096;
    line-height: 1.6;
  }
`;

const BusinessPage = ({ type }) => {
    const getContent = () => {
        switch (type) {
            case 'reach':
                return {
                    title: "Grow Your Practice with DocX Reach",
                    subtitle: "Connect with thousands of patients daily. Boost your visibility and manage appointments effortlessly.",
                    cta: "Join DocX Reach",
                    features: [
                        { icon: <FaChartLine />, title: "Increased Visibility", desc: "Showcase your clinic to thousands of patients searching for specialists in your area." },
                        { icon: <FaCalendarCheck />, title: "Smart Scheduling", desc: "Automated booking system that reduces no-shows and fills your calendar." },
                        { icon: <FaUserMd />, title: "Patient Management", desc: "Digital records and easy follow-ups to improve patient retention." }
                    ]
                };
            case 'pro':
                return {
                    title: "DocX Pro for Hospitals",
                    subtitle: "Enterprise-grade solution for managing large-scale hospital operations, OPD, and IPD.",
                    cta: "Request Demo",
                    features: [
                        { icon: <FaHospital />, title: "Integrated HMS", desc: "Complete Hospital Management System covering everything from admission to discharge." },
                        { icon: <FaCheckCircle />, title: "Efficiency Boost", desc: "Streamline workflows between departments - Lab, Pharmacy, and Wards." },
                        { icon: <FaChartLine />, title: "Analytics Dashboard", desc: "Real-time insights into hospital performance and revenue cycles." }
                    ]
                };
            case 'wellness':
                return {
                    title: "Corporate Wellness Plans",
                    subtitle: "Healthy employees are happy employees. Comprehensive health coverage for your workforce.",
                    cta: "Contact Sales",
                    features: [
                        { icon: <FaBuilding />, title: "Customized Plans", desc: "Tailored health packages including checkups, consultations, and mental wellness." },
                        { icon: <FaUserMd />, title: "On-site Camps", desc: "Regular health camps and vaccination drives at your office." },
                        { icon: <FaHeartbeat />, title: "24/7 Support", desc: "Dedicated helpline for your employees and their families." }
                    ]
                };
            default:
                return { title: "Business Solutions", subtitle: "", features: [] };
        }
    };

    const content = getContent();

    // Helper for icon since we need to import specific ones or reuse generic
    // I used some vars above but let's fix the undefined FaCalendarCheck, FaHeartbeat in features array context
    // To avoid complexity, I'll just use a generic render or ensure icons are imported.
    // Imported: FaChartLine, FaUserMd, FaHospital, FaCheckCircle, FaBuilding.
    // Missing in import: FaCalendarCheck, FaHeartbeat (used in usage).
    // I will add them to import.

    return (
        <Wrapper>
            <Navigationbar />
            <Hero>
                <h1>{content.title}</h1>
                <p>{content.subtitle}</p>
                <button>{content.cta}</button>
            </Hero>
            <FeaturesSection>
                <Grid>
                    {content.features.map((feat, i) => (
                        <FeatureCard key={i}>
                            <div className="icon">{feat.icon}</div>
                            <h3>{feat.title}</h3>
                            <p>{feat.desc}</p>
                        </FeatureCard>
                    ))}
                </Grid>
            </FeaturesSection>
            <Footer />
        </Wrapper>
    );
};
export default BusinessPage;
