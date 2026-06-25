import React, { useState } from 'react';
import styled from 'styled-components';
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import { FaRocket, FaHeartbeat, FaCode, FaUsers, FaArrowRight, FaMapMarkerAlt, FaBriefcase } from 'react-icons/fa';

const PageWrapper = styled.div`
  background: white;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
`;

const HeroSection = styled.div`
  background: linear-gradient(135deg, #683B93 0%, #a25ccf 100%);
  padding: 100px 5% 80px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url('hero-pattern.svg'); /* pattern overlay */
    opacity: 0.1;
  }
`;

const HeroTitle = styled.h1`
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 20px;
  font-family: 'Philosopher', serif;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 18px;
  max-width: 600px;
  margin: 0 auto 40px;
  opacity: 0.9;
  line-height: 1.6;
`;

const ValuesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  padding: 80px 10%;
  background: #f8f9fa;
`;

const ValueCard = styled.div`
  background: white;
  padding: 40px 30px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  text-align: center;
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-10px);
  }

  .icon {
    width: 60px;
    height: 60px;
    background: #f3e5f5;
    color: #683B93;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin: 0 auto 20px;
  }

  h3 {
    font-size: 20px;
    margin-bottom: 15px;
    color: #333;
  }

  p {
    color: #666;
    line-height: 1.5;
  }
`;

const JobsSection = styled.div`
  padding: 80px 10%;
`;

const SectionTitle = styled.h2`
  text-align: center;
  font-size: 36px;
  margin-bottom: 60px;
  color: #333;
  font-family: 'Philosopher', serif;
`;

const JobCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #eee;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 5px 20px rgba(104, 59, 147, 0.1);
    border-color: #683B93;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
`;

const JobInfo = styled.div`
  h3 {
    font-size: 18px;
    margin: 0 0 10px;
    color: #333;
  }
  .meta {
    display: flex;
    gap: 20px;
    color: #777;
    font-size: 14px;
    
    span { display: flex; align-items: center; gap: 5px; }
  }
`;

const ApplyButton = styled.button`
  background: #683B93;
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover { background: #5a2d82; }
`;

const FilterTabs = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 40px;
  flex-wrap: wrap;

  button {
    padding: 10px 20px;
    border: 1px solid #eee;
    background: white;
    border-radius: 30px;
    cursor: pointer;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;

    &:hover, &.active {
      background: #683B93;
      color: white;
      border-color: #683B93;
    }
  }
`;

const Careers = () => {
    const [filter, setFilter] = useState('All');

    const jobs = [
        { title: "Senior Frontend Engineer", team: "Engineering", location: "Remote / Colombo", type: "Full-time" },
        { title: "UI/UX Designer", team: "Design", location: "Colombo", type: "Full-time" },
        { title: "Medical Consultant", team: "Medical", location: "Kandy", type: "Part-time" },
        { title: "Customer Success Lead", team: "Operations", location: "Remote", type: "Full-time" },
        { title: "Backend Developer (Node.js)", team: "Engineering", location: "Colombo", type: "Full-time" }
    ];

    const filteredJobs = filter === 'All' ? jobs : jobs.filter(job => job.team === filter);

    return (
        <PageWrapper>
            <Navigationbar />

            <HeroSection>
                <HeroTitle>Join the Future of Healthcare</HeroTitle>
                <HeroSubtitle>
                    We are building the digital backbone of healthcare in Sri Lanka.
                    Help us connect patients with the care they need, faster and better.
                </HeroSubtitle>
                <ApplyButton style={{ marginTop: '20px', padding: '15px 40px', fontSize: '16px' }}>View Open Roles</ApplyButton>
            </HeroSection>

            <ValuesGrid>
                <ValueCard>
                    <div className="icon"><FaHeartbeat /></div>
                    <h3>Patient First</h3>
                    <p>We prioritize patient well-being in every decision we make. Empathy is at our core.</p>
                </ValueCard>
                <ValueCard>
                    <div className="icon"><FaRocket /></div>
                    <h3>Move Fast</h3>
                    <p>Healthcare needs innovation. We iterate quickly to deliver value to our users.</p>
                </ValueCard>
                <ValueCard>
                    <div className="icon"><FaUsers /></div>
                    <h3>Together</h3>
                    <p>We are a diverse team of doctors, engineers, and designers working as one unit.</p>
                </ValueCard>
            </ValuesGrid>

            <JobsSection>
                <SectionTitle>Open Positions</SectionTitle>

                <FilterTabs>
                    {['All', 'Engineering', 'Design', 'Medical', 'Operations'].map(tab => (
                        <button
                            key={tab}
                            className={filter === tab ? 'active' : ''}
                            onClick={() => setFilter(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </FilterTabs>

                {filteredJobs.length > 0 ? (
                    filteredJobs.map((job, index) => (
                        <JobCard key={index}>
                            <JobInfo>
                                <h3>{job.title}</h3>
                                <div className="meta">
                                    <span><FaBriefcase /> {job.team}</span>
                                    <span><FaMapMarkerAlt /> {job.location}</span>
                                </div>
                            </JobInfo>
                            <ApplyButton>Apply Now</ApplyButton>
                        </JobCard>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', color: '#6B5690', padding: '40px' }}>
                        No openings found in {filter} right now. Check back later!
                    </div>
                )}
            </JobsSection>

            <Footer />
        </PageWrapper>
    );
};

export default Careers;
