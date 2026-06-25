import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AOS from "aos";
import "aos/dist/aos.css";
// import { assets } from "@/shared/lib/assets"; // Not actively used in this clean version, but handy to keep
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import ContactUs from "@/shared/features/home/ContactUs";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

// --- Styled Components ---

const PageWrapper = styled.div`
  background-color: #f8f9fa;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
`;

const HeaderSection = styled.div`
  background: linear-gradient(135deg, #8e24aa 0%, #4a148c 100%);
  padding: 100px 20px 120px;
  text-align: center;
  color: white;
  border-radius: 0 0 50px 50px;
  margin-bottom: -60px; /* Overlap effect */
  position: relative;
  z-index: 1;

  h1 {
    font-size: 42px;
    font-weight: 700;
    margin-bottom: 20px;
  }
  
  p {
    font-size: 18px;
    max-width: 600px;
    margin: 0 auto;
    opacity: 0.9;
  }
`;

const FAQContainer = styled.div`
  max-width: 900px;
  margin: 0 auto 80px;
  padding: 0 20px;
  position: relative;
  z-index: 2;
`;

const FAQItem = styled.div`
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid transparent;

  &.active {
    border-color: #8e24aa;
    box-shadow: 0 10px 25px rgba(142, 36, 170, 0.1);
  }
`;

const Question = styled.div`
  padding: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: white;
  user-select: none;
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .icon {
    color: #8e24aa;
    font-size: 16px;
    transition: transform 0.3s;
  }
`;

const Answer = styled.div`
  padding: 0 25px;
  max-height: 0;
  overflow: hidden;
  transition: all 0.3s ease;
  color: #666;
  line-height: 1.6;
  opacity: 0;

  &.open {
    padding-bottom: 25px;
    max-height: 500px; /* Approximate max height */
    opacity: 1;
  }
`;

const ContactWrapper = styled.div`
  background: white;
  padding-bottom: 60px;
`;

const Faqs = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [faqData, setFaqData] = useState([]);

  const staticFaqs = [
    { question: "What services does the hospital offer?", answer: "Our hospital provides a wide range of healthcare services, including general consultations, emergency care, specialized treatments, surgeries, and diagnostics. We focus on providing quality medical care in a compassionate and comfortable environment." },
    { question: "How can I book an appointment with a doctor?", answer: "You can book an appointment through our website by filling out the online appointment form or calling our reception directly. Our team will assist you in scheduling your visit based on your preferred doctor and available time slots." },
    { question: "What specialties are available at the hospital?", answer: "Our hospital offers a variety of specialties, including cardiology, orthopedics, pediatrics, dermatology, gynecology, and neurology, among others. We are committed to providing expert care across a broad range of medical fields." },
    { question: "Do you provide emergency services?", answer: "Yes, we have a fully equipped emergency department that is available 24/7 to provide urgent medical care for accidents, injuries, and medical emergencies. Our skilled emergency staff is always ready to assist you." },
    { question: "What is the process for inpatient admission?", answer: "Inpatient admission can be arranged after a consultation with one of our doctors. Based on your condition, the doctor will recommend the necessary treatment plan, and our admissions team will guide you through the process." },
  ];

  const handleQuestionClick = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 1000 });

    const fetchFaqs = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/cms/faqs");
        const data = await res.json();
        const activeFaqs = data.filter(f => f.isActive);
        setFaqData(activeFaqs.length > 0 ? activeFaqs : staticFaqs);
      } catch {
        setFaqData(staticFaqs);
      }
    };
    fetchFaqs();
  }, []);

  return (
    <PageWrapper>
      <Navigationbar />

      <HeaderSection >
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about our services, appointments, and hospital policies.</p>
      </HeaderSection>

      <FAQContainer>
        {faqData.map((item, index) => (
          <FAQItem key={index} className={activeIndex === index ? "active" : ""}>
            <Question onClick={() => handleQuestionClick(index)}>
              <h3>{item.question}</h3>
              <div className="icon">
                {activeIndex === index ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </Question>
            <Answer className={activeIndex === index ? "open" : ""}>
              <p>{item.answer}</p>
            </Answer>
          </FAQItem>
        ))}
      </FAQContainer>

      <ContactWrapper>
        <ContactUs />
      </ContactWrapper>

      <Footer />
    </PageWrapper>
  );
};

export default Faqs;
