import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FaFileContract, FaShieldAlt, FaTimes } from "react-icons/fa";
import { LinkButton } from "@/shared/components/auth/AuthScaffold";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 17, 17, 0.56);
  backdrop-filter: blur(6px);
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 760px;
  max-height: min(88vh, 860px);
  overflow: auto;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 28px 70px rgba(17, 17, 17, 0.18);
  padding: 28px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
`;

const TitleWrap = styled.div`
  display: grid;
  gap: 8px;
`;

const Eyebrow = styled.span`
  color: #6B7280;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h3`
  margin: 0;
  color: #111827;
  font-size: 1.4rem;
  line-height: 1.2;
`;

const Intro = styled.p`
  margin: 0;
  color: #6B7280;
  font-size: 0.92rem;
  line-height: 1.7;
`;

const CloseButton = styled.button`
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 999px;
  background: #F3F4F6;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: #E5E7EB;
  }
`;

const TabRow = styled.div`
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  border-radius: 14px;
  background: #F3F4F6;
  margin-bottom: 22px;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  min-height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: ${(props) => (props.$active ? "#111111" : "transparent")};
  color: ${(props) => (props.$active ? "#ffffff" : "#4B5563")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
`;

const SectionGrid = styled.div`
  display: grid;
  gap: 18px;
`;

const Section = styled.section`
  padding: 18px 18px 16px;
  border-radius: 18px;
  background: #FAFAFA;
  border: 1px solid #F3F4F6;
`;

const SectionTitle = styled.h4`
  margin: 0 0 10px;
  color: #111827;
  font-size: 0.96rem;
  font-weight: 700;
`;

const SectionText = styled.p`
  margin: 0;
  color: #6B7280;
  font-size: 0.9rem;
  line-height: 1.7;
`;

const BulletList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: #4B5563;
  display: grid;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.7;
`;

const FooterNote = styled.p`
  margin: 18px 0 0;
  color: #6B7280;
  font-size: 0.84rem;
  line-height: 1.7;
`;

const InlinePolicyButton = styled(LinkButton)`
  display: inline;
  font-size: inherit;
  line-height: inherit;
  vertical-align: baseline;
`;

const POLICY_CONTENT = {
  terms: {
    eyebrow: "Account agreement",
    title: "Terms of Service",
    intro:
      "DocX connects patients, doctors, administrators, appointments, and pharmacy workflows in one platform. By continuing, you agree to use the correct portal, keep your information accurate, and use DocX responsibly.",
    sections: [
      {
        title: "Using the right portal",
        bullets: [
          "Patient, doctor, and administrator access is separated and must be used only by the correct account type.",
          "Doctors may access clinician tools only after verification and approval by DocX administrators.",
          "You are responsible for protecting your password, device access, and any account activity under your sign-in.",
        ],
      },
      {
        title: "Account and submission standards",
        bullets: [
          "Registration details, medical license information, and uploaded documents must be truthful and current.",
          "You must not impersonate another person, misuse medical workflows, or attempt to bypass verification controls.",
          "DocX may suspend or limit access if platform rules, safety expectations, or role restrictions are violated.",
        ],
      },
      {
        title: "Appointments, pharmacy, and care coordination",
        bullets: [
          "Appointments, prescriptions, and pharmacy requests depend on the information provided through your account.",
          "DocX supports clinical coordination but should not be used as a substitute for emergency medical services.",
          "Availability, fulfillment, and professional follow-up may vary based on provider approval, stock, and operational review.",
        ],
      },
    ],
    footer:
      "This overview is provided for clarity at sign-in and registration. Continuing with DocX means you accept these platform terms.",
  },
  privacy: {
    eyebrow: "Data overview",
    title: "Privacy Policy",
    intro:
      "DocX uses account, contact, medical, booking, and pharmacy information to operate the platform safely and deliver the services you request. We aim to collect only what is necessary for care coordination and secure account management.",
    sections: [
      {
        title: "What DocX collects",
        bullets: [
          "Basic account details such as your name, email address, login activity, and portal role.",
          "Healthcare workflow data such as appointments, doctor verification details, prescription requests, and pharmacy orders.",
          "Uploaded documents and supporting records when they are needed for onboarding, verification, or service completion.",
        ],
      },
      {
        title: "How your information is used",
        bullets: [
          "To authenticate accounts, protect role-based access, and maintain session security across the platform.",
          "To support appointments, messaging, prescription handling, pharmacy services, and administrator review processes.",
          "To improve operational reliability, investigate misuse, and maintain audit visibility for sensitive healthcare workflows.",
        ],
      },
      {
        title: "Sharing, protection, and retention",
        bullets: [
          "Relevant information may be visible to the doctors, patients, pharmacists, or administrators directly involved in your request.",
          "DocX uses access controls and verification checks to reduce unauthorized access to sensitive information.",
          "Information is kept only as long as needed for platform operations, compliance, account support, or dispute resolution.",
        ],
      },
    ],
    footer:
      "If you continue with DocX, you acknowledge this privacy overview and consent to the platform practices needed to run your account and requested services.",
  },
};

const TABS = [
  { key: "terms", label: "Terms of Service", icon: FaFileContract },
  { key: "privacy", label: "Privacy Policy", icon: FaShieldAlt },
];

const AuthPolicyDisclosure = ({
  prefix = "",
  between = " and ",
  suffix = "",
  termsLabel = "Terms of Service",
  privacyLabel = "Privacy Policy",
  renderAs = "span",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("terms");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const openTab = (tabKey) => {
    setActiveTab(tabKey);
    setIsOpen(true);
  };

  const content = POLICY_CONTENT[activeTab];
  const WrapperTag = renderAs;

  return (
    <>
      <WrapperTag className={className}>
        {prefix}
        <InlinePolicyButton type="button" onClick={() => openTab("terms")}>
          {termsLabel}
        </InlinePolicyButton>
        {between}
        <InlinePolicyButton type="button" onClick={() => openTab("privacy")}>
          {privacyLabel}
        </InlinePolicyButton>
        {suffix}
      </WrapperTag>

      {isOpen ? (
        <Overlay
          aria-modal="true"
          role="dialog"
          aria-labelledby="auth-policy-title"
          onClick={() => setIsOpen(false)}
        >
          <Dialog onClick={(event) => event.stopPropagation()}>
            <Header>
              <TitleWrap>
                <Eyebrow>{content.eyebrow}</Eyebrow>
                <Title id="auth-policy-title">{content.title}</Title>
                <Intro>{content.intro}</Intro>
              </TitleWrap>
              <CloseButton
                type="button"
                aria-label="Close policy overview"
                onClick={() => setIsOpen(false)}
              >
                <FaTimes />
              </CloseButton>
            </Header>

            <TabRow>
              {TABS.map((tab) => {
                const Icon = tab.icon;

                return (
                  <TabButton
                    key={tab.key}
                    type="button"
                    $active={tab.key === activeTab}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <Icon />
                    {tab.label}
                  </TabButton>
                );
              })}
            </TabRow>

            <SectionGrid>
              {content.sections.map((section) => (
                <Section key={section.title}>
                  <SectionTitle>{section.title}</SectionTitle>
                  {section.text ? <SectionText>{section.text}</SectionText> : null}
                  {section.bullets ? (
                    <BulletList>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </BulletList>
                  ) : null}
                </Section>
              ))}
            </SectionGrid>

            <FooterNote>{content.footer}</FooterNote>
          </Dialog>
        </Overlay>
      ) : null}
    </>
  );
};

export default AuthPolicyDisclosure;
