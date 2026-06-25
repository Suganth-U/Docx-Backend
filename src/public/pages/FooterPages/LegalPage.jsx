import React from 'react';
import styled from 'styled-components';
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import { useLocation } from 'react-router-dom';

const Wrapper = styled.div`
  background-color: #fcfcfc;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
`;

const ContentContainer = styled.div`
  max-width: 900px;
  margin: 60px auto;
  padding: 40px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);

  @media (max-width: 768px) {
    margin: 20px;
    padding: 20px;
  }
`;

const Title = styled.h1`
  font-size: 36px;
  color: #333;
  margin-bottom: 10px;
  font-family: 'Philosopher', serif;
`;

const LastUpdated = styled.p`
  font-size: 14px;
  color: #888;
  margin-bottom: 40px;
  border-bottom: 1px solid #eee;
  padding-bottom: 20px;
`;

const Section = styled.div`
  margin-bottom: 30px;

  h2 {
    font-size: 20px;
    color: #444;
    margin-bottom: 15px;
    font-weight: 600;
  }

  p {
    color: #666;
    line-height: 1.7;
    margin-bottom: 15px;
  }

  ul {
    padding-left: 20px;
    margin-bottom: 15px;
    li {
      margin-bottom: 8px;
      color: #666;
    }
  }
`;

const LegalPage = ({ type }) => {
    const location = useLocation();
    const getPageData = () => {
        switch (type) {
            case 'terms':
                return {
                    title: 'Terms & Conditions',
                    date: 'October 24, 2025',
                    content: (
                        <>
                            <Section>
                                <h2>1. Introduction</h2>
                                <p>Welcome to DocX. By accessing our website and using our services, you agree to comply with and be bound by the following terms and conditions.</p>
                            </Section>
                            <Section>
                                <h2>2. User Accounts</h2>
                                <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.</p>
                            </Section>
                            <Section>
                                <h2>3. Medical Advice Disclaimer</h2>
                                <p>Content on DocX is for informational purposes only and does not substitute professional medical advice, diagnosis, or treatment. Always seek the advice of your physician.</p>
                            </Section>
                        </>
                    )
                };
            case 'privacy':
                return {
                    title: 'Privacy Policy',
                    date: 'October 24, 2025',
                    content: (
                        <>
                            <Section>
                                <h2>1. Information We Collect</h2>
                                <p>We collect personal information that you provide to us, such as your name, email address, and medical records when you use our appointments or EHR services.</p>
                            </Section>
                            <Section>
                                <h2>2. How We Use Your Information</h2>
                                <p>We use your information to provide and improve our services, facilitate appointments, and communicate with you about your health updates.</p>
                            </Section>
                            <Section>
                                <h2>3. Data Security</h2>
                                <p>We implement industry-standard security measures to protect your personal health information (PHI) in compliance with local regulations.</p>
                            </Section>
                        </>
                    )
                };
            case 'help':
                return {
                    title: 'Help Center',
                    date: 'Updated Recently',
                    content: (
                        <>
                            <Section>
                                <h2>Frequently Asked Questions</h2>
                                <p>Find answers to common questions about booking appointments, managing records, and payments.</p>
                                <ul>
                                    <li>How do I book an appointment?</li>
                                    <li>Can I cancel a consultation?</li>
                                    <li>Is my data secure?</li>
                                </ul>
                                <p>For more specific queries, please contact our support team at support@docx.com.</p>
                            </Section>
                        </>
                    )
                };
            case 'medicines':
                return {
                    title: 'Medicine Information',
                    date: 'Updated Daily',
                    content: (
                        <>
                            <Section>
                                <h2>Understanding Your Medication</h2>
                                <p>Access comprehensive information about prescribed medicines, including dosage, side effects, and interactions.</p>
                            </Section>
                            <Section>
                                <h2>Safety First</h2>
                                <p>Always consult your doctor before starting or stopping any medication. This medicine information is for educational purposes only.</p>
                            </Section>
                        </>
                    )
                };
            case 'directory':
                return {
                    title: 'Healthcare Directory',
                    date: '2025 Edition',
                    content: (
                        <>
                            <Section>
                                <h2>Find Providers Near You</h2>
                                <p>Browse our comprehensive directory of hospitals, clinics, and specialists across Sri Lanka.</p>
                            </Section>
                            <Section>
                                <h2>Categories</h2>
                                <ul>
                                    <li>General Physicians</li>
                                    <li>Cardiologists</li>
                                    <li>Dental Clinics</li>
                                    <li>Emergency Care Units</li>
                                </ul>
                            </Section>
                        </>
                    )
                };
            default:
                return {
                    title: 'Page Not Found',
                    content: <p>The requested page exists in the footer links but has not been populated with specific content yet.</p>
                };
        }
    };

    const data = getPageData();

    return (
        <Wrapper>
            <Navigationbar />
            <ContentContainer>
                <Title>{data.title}</Title>
                {data.date && <LastUpdated>Last updated: {data.date}</LastUpdated>}
                {data.content}
            </ContentContainer>
            <Footer />
        </Wrapper>
    );
};

export default LegalPage;
