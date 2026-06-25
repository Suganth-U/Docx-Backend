import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const COLORS = {
  footerBg: "#8e7dbe",
  textHeading: "#fff",
  textBody: "#fff",
  textLight: "#fff",
  hoverColor: "#f4f3ee"
};

const FooterContainer = styled.footer`
  width: 100%;
  background: ${COLORS.footerBg};
  color: ${COLORS.textBody};
  font-family: 'Roboto', sans-serif;
  padding: 60px 80px 20px 80px;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #eee;
  position: relative;

  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

const FooterContent = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 40px;
  margin-bottom: 40px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FooterLeftSection = styled.div`
  flex: 1;
  min-width: 250px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FooterLogo = styled.div`
  font-size: 50px;
  font-weight: 700;
  color: ${COLORS.textHeading};
  font-family: 'Philosopher', serif;
  display: flex;
  align-items: center;
  gap: 5px;
  font-style: italic;
`;

const HeadquartersInfo = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: ${COLORS.textBody};
`;

const HeadquartersTitle = styled.span`
  font-weight: 700;
  display: block;
  margin-left: 0px;
  margin-bottom: 5px;
  color: ${COLORS.textHeading};
`;

const MissionStatement = styled.div`
  width: 100%; /* Changed from fixed 400px to avoid overflow issues */
  max-width: 400px;
  margin-top: 10px;
  font-weight: 300;
  font-size: 30px;
  line-height: 1.2;
  color: #fff;
  font-family: "Story Script", sans-serif;
`;

const FooterLinksContainer = styled.div`
  flex: 3;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;

  @media (max-width: 1024px) {
    gap: 30px;
  }
  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
`;

const FooterColumn = styled.div`
  flex: 1;
  min-width: 140px;

  h4 {
    color: ${COLORS.textHeading};
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
    text-decoration: underline;
  }

  h4.mt-20 {
    margin-top: 20px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin-bottom: 0px;
  }

  a {
    text-decoration: none;
    color: ${COLORS.textHeading};
    font-size: 14px;
    font-weight: 400;
    transition: color 0.2s;

    &:hover {
      color: ${COLORS.hoverColor};
      text-decoration: underline;
    }
  }
`;

const FooterBottomBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 40px;
  font-size: 12px;
  color: ${COLORS.textLight};

  @media (max-width: 768px) {
    flex-direction: column-reverse;
    gap: 20px;
    align-items: flex-start;
  }
`;

const SocialIcons = styled.div`
  display: flex;
  gap: 20px;

  i {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #fff;
    display: flex; 
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: ${COLORS.footerBg};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: ${COLORS.footerBg};
      color: #fff;
      border: 0.2px solid #fff;
    }
  }
`;

// Helper component for links
const MockLink = ({ to, children }) => <Link to={to}>{children}</Link>;

const Footer = () => {
  return (
    <>
      {/* FontAwesome CDN for Icons - typically should be in index.html but keeping here as requested/found */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

      <FooterContainer className="footer">

        <FooterContent>
          <FooterLeftSection>
            <FooterLogo>
              DocX.
            </FooterLogo>

            <HeadquartersInfo>
              <HeadquartersTitle>Headquarters</HeadquartersTitle>
              DocX Healthcare Limited.<br />
              Dehiwala,<br />
              Colombo 06.<br />
              Phone: +94701796765<br />
              Email: support@DocX.com
            </HeadquartersInfo>

            <MissionStatement>
              &quot; Empowering all people
              everywhere to live
              their healthiest lives. &quot;
            </MissionStatement>
          </FooterLeftSection>

          <FooterLinksContainer>

            <FooterColumn>
              <h4>DocX</h4>
              <ul>
                <li><MockLink to="/about-us">About</MockLink></li>
                <li><MockLink to="/services">Our Services</MockLink></li>
                <li><MockLink to="/blog">Blog</MockLink></li>
                <li><MockLink to="/careers">Careers</MockLink></li>
                <li><MockLink to="/faqs">FAQs</MockLink></li>
                <li><MockLink to="/contact-us">Contact Us</MockLink></li>
              </ul>
            </FooterColumn>

            <FooterColumn>
              <h4>For patients</h4>
              <ul>
                <li><MockLink to="/find-doctors">Search for doctors</MockLink></li>
                <li><MockLink to="/search/clinics">Search for clinics</MockLink></li>
                <li><MockLink to="/search/hospitals">Search for hospitals</MockLink></li>
                <li><MockLink to="/find-doctors">Book Appointments</MockLink></li>
                <li><MockLink to="/virtual-consultation">Virtual Consultation</MockLink></li>
                <li><MockLink to="/plus">DocX Membership</MockLink></li>
                <li><MockLink to="/pharmacy">DocX Care Pharmacy</MockLink></li>
                <li><MockLink to="/blog">Read health articles</MockLink></li>
                <li><MockLink to="/medicines">Read about medicines</MockLink></li>
              </ul>
            </FooterColumn>

            <FooterColumn>
              <h4>For doctors</h4>
              <ul>
                <li><MockLink to="/login">Doctor Profile</MockLink></li>
              </ul>

              <h4 className="mt-20">For clinics</h4>
              <ul>
                <li><MockLink to="/reach">DocX Reach</MockLink></li>
                <li><MockLink to="/pro">DocX Pro</MockLink></li>
              </ul>
            </FooterColumn>

            <FooterColumn>
              <h4>For hospitals</h4>
              <ul>
                <li><MockLink to="/admin/login">Admin Login</MockLink></li>
                <li><MockLink to="/reach/hospital">DocX Reach</MockLink></li>
              </ul>

              <h4 className="mt-20">For Corporates</h4>
              <ul>
                <li><MockLink to="/wellness">Wellness Plans</MockLink></li>
              </ul>
            </FooterColumn>

            <FooterColumn>
              <h4>More</h4>
              <ul>
                <li><MockLink to="/help">Help</MockLink></li>
                <li><MockLink to="/developers">Developers</MockLink></li>
                <li><MockLink to="/privacy">Privacy Policy</MockLink></li>
                <li><MockLink to="/terms">Terms & Conditions</MockLink></li>
                <li><MockLink to="/directory">Healthcare Directory</MockLink></li>
              </ul>
            </FooterColumn>

          </FooterLinksContainer>
        </FooterContent>

        <FooterBottomBar>
          <div>
            © 2025 DocX Healthcare Limited.
          </div>
          <SocialIcons>
            <i className="fa-brands fa-facebook-f"></i>
            <i className="fa-brands fa-instagram"></i>
            <i className="fa-brands fa-linkedin-in"></i>
            <i className="fa-brands fa-youtube"></i>
            <i className="fa-brands fa-x-twitter"></i>
          </SocialIcons>
        </FooterBottomBar>

      </FooterContainer>
    </>
  );
};

export default Footer;
