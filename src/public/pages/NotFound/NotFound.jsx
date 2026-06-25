import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaSearch, FaHome, FaEnvelope } from 'react-icons/fa';
import { assets } from "@/shared/lib/assets";
import FieldError from "@/shared/components/common/FieldError";

/* ── animations ── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* ── layout ── */
const Page = styled.div`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 48px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 20px 24px;
  }
`;

const Logo = styled.img`
  height: 30px;
`;

const TopLinks = styled.nav`
  display: flex;
  gap: 32px;

  a {
    color: #4b5563;
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 500;
    transition: color 0.2s;

    &:hover {
      color: #683b93;
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const Main = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  align-items: center;
  padding: 0 48px 48px;
  gap: 40px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 0 24px 48px;
  }
`;

/* ── left column ── */
const TextCol = styled.div`
  animation: ${fadeUp} 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @media (max-width: 960px) {
    order: 2;
  }
`;

const Heading = styled.h1`
  font-size: clamp(2.6rem, 5vw, 3.8rem);
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.03em;
  margin: 0 0 20px;
  line-height: 1.1;
`;

const SubText = styled.p`
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0 0 36px;
  line-height: 1.7;
  max-width: 420px;

  @media (max-width: 960px) {
    max-width: 100%;
  }
`;

const SearchWrapper = styled.form`
  display: flex;
  max-width: 460px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  padding: 6px 6px 6px 20px;
  transition: all 0.3s ease;
  margin-bottom: 32px;

  &:focus-within {
    border-color: #683b93;
    box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.1);
  }

  @media (max-width: 960px) {
    max-width: 100%;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 1rem;
  color: #111827;
  font-family: inherit;

  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchBtn = styled.button`
  background: #683b93;
  color: #fff;
  border: none;
  border-radius: 10px;
  height: 46px;
  padding: 0 22px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #5a3180;
    transform: translateY(-1px);
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 960px) {
    justify-content: center;
  }
`;

const ActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.25s ease;

  &.primary {
    background: #683b93;
    color: #ffffff;
    border: 2px solid #683b93;

    &:hover {
      background: #5a3180;
      border-color: #5a3180;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(104, 59, 147, 0.25);
    }
  }

  &.outline {
    background: transparent;
    color: #683b93;
    border: 2px solid #683b93;

    &:hover {
      background: #faf5ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(104, 59, 147, 0.1);
    }
  }
`;

/* ── right column illustration ── */
const IllustrationCol = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${fadeUp} 0.8s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media (max-width: 960px) {
    order: 1;
  }

  svg {
    width: 100%;
    max-width: 620px;
    height: auto;
  }
`;

const NotFound = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/find-doctors?search=${encodeURIComponent(searchQuery)}`);
      return;
    }
    setSearchError("Enter a doctor name or specialty to search.");
  };

  return (
    <Page>
      <TopBar>
        <Logo src={assets.toplogo} alt="DocX" />
        <TopLinks>
          <Link to="/">Home</Link>
          <Link to="/about-us">About</Link>
          <Link to="/find-doctors">Doctors</Link>
          <Link to="/contact-us">Contact</Link>
        </TopLinks>
      </TopBar>

      <Main>
        <TextCol>
          <Heading>
            Oops, Wrong Turn...
          </Heading>
          <SubText>
            Looks like you&apos;ve wandered off the beaten path. Our team is working to
            get you back on track and find what you&apos;re looking for.
          </SubText>

          <SearchWrapper onSubmit={handleSearch} noValidate>
            <SearchInput
              type="text"
              placeholder="Search doctors, specialties..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchError) setSearchError("");
              }}
              aria-invalid={Boolean(searchError)}
            />
            <SearchBtn type="submit">
              <FaSearch /> Search
            </SearchBtn>
          </SearchWrapper>
          <FieldError message={searchError} style={{ marginTop: -10, marginBottom: 18 }} />

          <Actions>
            <ActionLink to="/" className="primary">
              <FaHome /> Back To Home
            </ActionLink>
            <ActionLink to="/contact-us" className="outline">
              <FaEnvelope /> Help Center
            </ActionLink>
          </Actions>
        </TextCol>

        <IllustrationCol>
          {/* ── complex abstract healthcare illustration ── */}
          <svg viewBox="0 0 700 550" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* ground line */}
            <path d="M40 480 H660" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round"/>

            {/* large triangle bg */}
            <path d="M300 160 L440 480 L160 480 Z" fill="#683b93" fillOpacity="0.12" stroke="#683b93" strokeWidth="2"/>

            {/* large circle right */}
            <circle cx="520" cy="330" r="100" stroke="#1f2937" strokeWidth="2.5" fill="#fff"/>
            <circle cx="520" cy="330" r="70" stroke="#683b93" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* tilted rectangle 1 */}
            <rect x="280" y="100" width="140" height="100" rx="4" stroke="#1f2937" strokeWidth="2.5" fill="#fff" transform="rotate(-15, 350, 150)"/>
            
            {/* tilted rectangle 2 */}
            <rect x="200" y="140" width="110" height="80" rx="4" stroke="#1f2937" strokeWidth="2.5" fill="#fff" transform="rotate(10, 255, 180)"/>

            {/* cloud / blob shape */}
            <path d="M250 420 C220 420, 190 400, 200 370 C210 340, 250 340, 270 350 C280 330, 310 330, 330 350 C350 330, 380 340, 390 360 C410 350, 440 370, 430 400 C420 425, 390 430, 370 420 C350 440, 310 440, 300 420 Z" fill="#683b93" fillOpacity="0.08" stroke="#1f2937" strokeWidth="2"/>

            {/* stethoscope icon */}
            <g transform="translate(460, 180)">
              <circle cx="0" cy="0" r="30" fill="#683b93" fillOpacity="0.15" stroke="#683b93" strokeWidth="2"/>
              <path d="M-10 -8 C-10 -18, 10 -18, 10 -8 L10 4 C10 12, 4 16, 0 16 C-4 16, -10 12, -10 4 Z" stroke="#1f2937" strokeWidth="2" fill="none"/>
              <circle cx="0" cy="16" r="4" fill="#683b93"/>
            </g>

            {/* heart cross */}
            <g transform="translate(150, 200)">
              <path d="M0 -15 C-12 -30, -35 -20, -25 -5 L0 20 L25 -5 C35 -20, 12 -30, 0 -15 Z" fill="#683b93" fillOpacity="0.25" stroke="#683b93" strokeWidth="2"/>
              <line x1="0" y1="-8" x2="0" y2="12" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
              <line x1="-10" y1="2" x2="10" y2="2" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
            </g>

            {/* pill capsule */}
            <g transform="translate(580, 220) rotate(30)">
              <rect x="-12" y="-30" width="24" height="60" rx="12" stroke="#1f2937" strokeWidth="2" fill="#fff"/>
              <rect x="-12" y="0" width="24" height="30" rx="0" fill="#683b93" fillOpacity="0.3"/>
              <path d="M-12 0 L12 0" stroke="#1f2937" strokeWidth="1.5"/>
            </g>

            {/* abstract plant / leaf right */}
            <g transform="translate(620, 350)">
              <path d="M0 130 Q0 80, -20 50 Q-10 70, 0 60 Q10 70, 20 50 Q0 80, 0 130" stroke="#1f2937" strokeWidth="2" fill="none"/>
              <path d="M0 100 Q-30 60, -40 30 Q-20 50, 0 100" fill="#683b93" fillOpacity="0.15" stroke="#1f2937" strokeWidth="1.5"/>
              <path d="M0 80 Q30 40, 35 10 Q20 40, 0 80" fill="#683b93" fillOpacity="0.1" stroke="#1f2937" strokeWidth="1.5"/>
            </g>

            {/* scribble flower left */}
            <g transform="translate(100, 380)">
              <line x1="0" y1="100" x2="0" y2="40" stroke="#1f2937" strokeWidth="1.5"/>
              <circle cx="0" cy="35" r="12" stroke="#1f2937" strokeWidth="1.5" fill="none"/>
              <circle cx="0" cy="35" r="5" fill="#683b93" fillOpacity="0.4"/>
              <path d="M-5 60 Q-20 50, -15 70" stroke="#1f2937" strokeWidth="1.5" fill="none"/>
            </g>

            {/* scattered small shapes */}
            {/* dots */}
            <circle cx="440" cy="120" r="5" fill="#1f2937"/>
            <circle cx="180" cy="300" r="4" fill="#1f2937"/>
            <circle cx="500" cy="460" r="3" fill="#683b93"/>

            {/* small squares */}
            <rect x="550" cy="120" y="120" width="12" height="12" fill="#683b93" fillOpacity="0.5" transform="rotate(20, 556, 126)"/>
            <rect x="130" y="280" width="8" height="8" fill="#683b93" fillOpacity="0.35" transform="rotate(-15, 134, 284)"/>

            {/* small triangles */}
            <path d="M490 100 L498 86 L506 100 Z" fill="#683b93" fillOpacity="0.5"/>
            <path d="M110 330 L118 318 L126 330 Z" fill="#1f2937" fillOpacity="0.3"/>
            <path d="M580 430 L586 420 L592 430 Z" fill="#683b93" fillOpacity="0.4"/>

            {/* X marks */}
            <g transform="translate(400, 80)">
              <line x1="-6" y1="-6" x2="6" y2="6" stroke="#683b93" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="6" y1="-6" x2="-6" y2="6" stroke="#683b93" strokeWidth="2.5" strokeLinecap="round"/>
            </g>
            <g transform="translate(650, 280)">
              <line x1="-5" y1="-5" x2="5" y2="5" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="-5" x2="-5" y2="5" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>
            </g>

            {/* big open box */}
            <g transform="translate(350, 360)">
              <rect x="-60" y="-30" width="120" height="120" rx="4" stroke="#1f2937" strokeWidth="2.5" fill="#fff"/>
              {/* open lid */}
              <path d="M-60 -30 L-80 -60 L40 -60 L60 -30" stroke="#1f2937" strokeWidth="2.5" fill="#fff"/>
              <line x1="-80" y1="-60" x2="-60" y2="-30" stroke="#1f2937" strokeWidth="2.5"/>
              {/* question mark inside */}
              <text x="0" y="50" textAnchor="middle" fill="#683b93" fontSize="52" fontWeight="800" fontFamily="Inter, sans-serif" opacity="0.6">?</text>
            </g>

            {/* person peeking behind circle */}
            <g transform="translate(520, 250)">
              {/* head */}
              <circle cx="30" cy="-30" r="16" fill="#fff" stroke="#1f2937" strokeWidth="2"/>
              {/* eyes */}
              <circle cx="26" cy="-33" r="2.5" fill="#1f2937"/>
              <circle cx="34" cy="-33" r="2.5" fill="#1f2937"/>
              {/* body behind circle */}
              <path d="M20 -14 Q30 -8, 40 -14" stroke="#1f2937" strokeWidth="2" fill="none"/>
            </g>

            {/* spiral */}
            <g transform="translate(200, 350)">
              <path d="M0 0 C5 -8, 15 -8, 15 0 C15 8, 5 12, 0 8 C-5 4, -3 -4, 5 -4 C10 -4, 12 2, 8 5" stroke="#683b93" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </g>

            {/* floating circles with purple fills */}
            <circle cx="340" cy="260" r="18" fill="#683b93" fillOpacity="0.7"/>
            <circle cx="380" cy="290" r="12" fill="#1f2937"/>
            <circle cx="310" cy="300" r="8" fill="#683b93" fillOpacity="0.35"/>

            {/* abstract leaf left-bottom */}
            <g transform="translate(70, 410)">
              <path d="M0 70 C-15 40, -40 20, -30 0 C-20 -15, 0 5, 0 70" fill="#683b93" fillOpacity="0.12" stroke="#683b93" strokeWidth="1.5"/>
              <path d="M0 70 C15 40, 40 20, 30 0 C20 -15, 0 5, 0 70" fill="#683b93" fillOpacity="0.08" stroke="#683b93" strokeWidth="1.5"/>
              <line x1="0" y1="70" x2="0" y2="10" stroke="#683b93" strokeWidth="1" strokeDasharray="3 3"/>
            </g>

            {/* confetti bits */}
            <rect x="460" y="140" width="6" height="14" rx="2" fill="#683b93" fillOpacity="0.5" transform="rotate(25, 463, 147)"/>
            <rect x="160" y="150" width="5" height="12" rx="2" fill="#683b93" fillOpacity="0.35" transform="rotate(-30, 162, 156)"/>
            <rect x="550" y="400" width="5" height="10" rx="2" fill="#1f2937" fillOpacity="0.3" transform="rotate(40, 552, 405)"/>

            {/* dotted arc */}
            <path d="M420 450 C440 420, 480 420, 500 450" stroke="#683b93" strokeWidth="2" strokeDasharray="4 4" fill="none"/>
          </svg>
        </IllustrationCol>
      </Main>
    </Page>
  );
};

export default NotFound;
