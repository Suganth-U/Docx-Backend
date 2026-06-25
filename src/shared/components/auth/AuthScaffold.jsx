import React from "react";
import styled from "styled-components";
import { FaCheckCircle, FaQuoteLeft } from "react-icons/fa";
import { assets } from "@/shared/lib/assets";


const toneMap = {
  purple: {
    accent: "#111111",
    accentStrong: "#000000",
    accentSoft: "rgba(17, 17, 17, 0.10)",
    accentBorder: "rgba(17, 17, 17, 0.14)",
    surfaceTint: "#F5F5F5",
    pageGlow: "rgba(255, 255, 255, 0.06)",
    panelGradient: "linear-gradient(160deg, #050505 0%, #111111 56%, #242424 100%)",
    panelGlow: "rgba(255, 255, 255, 0.08)",
    panelLine: "rgba(255, 255, 255, 0.14)",
    panelCard: "rgba(255, 255, 255, 0.05)",
    panelMuted: "rgba(229, 229, 229, 0.76)",
  },
  admin: {
    accent: "#111111",
    accentStrong: "#000000",
    accentSoft: "rgba(17, 17, 17, 0.10)",
    accentBorder: "rgba(17, 17, 17, 0.14)",
    surfaceTint: "#F5F5F5",
    pageGlow: "rgba(255, 255, 255, 0.06)",
    panelGradient: "linear-gradient(160deg, #060606 0%, #121212 56%, #2B2B2B 100%)",
    panelGlow: "rgba(255, 255, 255, 0.08)",
    panelLine: "rgba(255, 255, 255, 0.14)",
    panelCard: "rgba(255, 255, 255, 0.05)",
    panelMuted: "rgba(229, 229, 229, 0.76)",
  },
};

const getTone = (tone) => toneMap[tone] || toneMap.purple;
const getAsideImage = (tone, image) => image || (tone === "admin" ? assets.adminLogin : assets.loginModel);


export const AuthPage = styled.div`
  min-height: 100vh;
  display: flex;
  background: #FAFAFA;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;

export const AuthShell = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: ${(props) => props.$gridTemplate || "1fr 1fr"};

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;


export const AuthMain = styled.main`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 40px 60px;
  background: #FAFAFA;

  @media (max-width: 960px) {
    padding: 32px 24px;
    justify-content: center;
  }
`;

export const MainInner = styled.div`
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

/* ── Right Panel (Testimonial & Visuals) ── */
export const AuthAside = styled.aside`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px;
  background-color: #ECEFF1;
  background-image: url(${(props) => props.$bgImage});
  background-size: cover;
  background-position: center;
  border-left: 1px solid #E5E7EB;

  @media (max-width: 960px) {
    display: none;
  }
`;




/* ── Form Typography ── */
export const MainTitle = styled.h2`
  margin: 0 0 16px;
  color: #111827;
  font-size: 1.85rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-weight: 500;
`;

export const MainSubtitle = styled.p`
  margin: 0;
  color: #6B7280;
  line-height: 1.6;
  font-size: 0.9rem;
`;

export const ContextEyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-bottom: 10px;
  color: #111111;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const TextLinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 12px;
  color: #6B7280;
  font-size: 0.84rem;
  line-height: 1.6;

  a {
    color: #111111;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

/* ── Tabs ── */
export const Tabs = styled.div`
  display: inline-flex;
  width: fit-content;
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: #F3F4F6;
`;

export const TabButton = styled.button`
  min-height: 36px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: ${(props) => (props.$active ? "#ffffff" : "transparent")};
  color: ${(props) => (props.$active ? getTone(props.$tone || "purple").accent : "#6B7280")};
  box-shadow: ${(props) => (props.$active ? "0 2px 8px rgba(0,0,0,0.06)" : "none")};
  font-size: 0.85rem;
  font-weight: ${(props) => (props.$active ? 600 : 500)};
  cursor: pointer;
  transition: all 0.18s ease;
`;

/* ── Form Elements ── */
export const FormBlock = styled.form`
  display: grid;
  gap: 14px;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: ${(props) => props.$columns || "repeat(2, minmax(0, 1fr))"};
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldGroup = styled.div`
  display: grid;
  gap: 6px;
`;

export const FieldLabel = styled.label`
  color: #374151;
  font-size: 0.82rem;
  font-weight: 600;
`;

export const InputShell = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid ${(props) => (props.$error ? "#EF4444" : "#E5E7EB")};
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:focus-within {
    border-color: #3B82F6;
    box-shadow: 0 0 0 1px #3B82F6;
  }
`;

export const LeadingIcon = styled.span`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  font-size: 0.9rem;
  pointer-events: none;
`;

export const FormInput = styled.input`
  width: 100%;
  min-height: 42px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: transparent;
  color: #111827;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 0
    ${(props) => (props.$withAction ? "44px" : "14px")}
    0
    ${(props) => (props.$withIcon ? "42px" : "14px")};

  &::placeholder {
    color: #9CA3AF;
  }
`;

export const FormSelect = styled.select`
  appearance: none;
  width: 100%;
  min-height: 46px;
  border: none;
  outline: none;
  border-radius: 10px;
  background: transparent;
  color: #111827;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 0 36px 0 ${(props) => (props.$withIcon ? "42px" : "14px")};
  cursor: pointer;
`;

export const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  border: none;
  outline: none;
  border-radius: 10px;
  background: transparent;
  color: #111827;
  font-size: 0.9rem;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  padding: 14px
    ${(props) => (props.$withAction ? "44px" : "14px")}
    14px
    ${(props) => (props.$withIcon ? "42px" : "14px")};

  &::placeholder {
    color: #9CA3AF;
  }
`;

export const ActionIconButton = styled.button`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;

  &:hover {
    color: ${(props) => getTone(props.$tone || "purple").accent};
  }
`;

export const HelperRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: #6B7280;
  font-size: 0.82rem;
`;

export const CheckboxRow = styled.label`
  display: inline-flex;
  align-items: ${(props) => (props.$top ? "flex-start" : "center")};
  gap: 8px;
  color: #6B7280;
  font-size: 0.82rem;
  line-height: 1.5;
  cursor: pointer;

  input {
    margin-top: ${(props) => (props.$top ? "3px" : "0")};
    accent-color: ${(props) => getTone(props.$tone || "purple").accent};
    width: 16px;
    height: 16px;
  }

  a {
    color: ${(props) => getTone(props.$tone || "purple").accent};
    font-weight: 600;
    text-decoration: none;
  }
`;

export const LinkButton = styled.button`
  padding: 0;
  background: none;
  border: none;
  color: ${(props) => getTone(props.$tone || "purple").accent};
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
`;

export const InlineLink = styled.a`
  color: ${(props) => getTone(props.$tone || "purple").accent};
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
`;

/* ── Buttons ── */
export const PrimaryButton = styled.button`
  min-height: 40px;
  border: none;
  border-radius: 6px;
  background: #111111;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s ease;
  width: fit-content;
  padding: 0 24px;

  &:hover {
    background: #000000;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 46px;
  border-radius: 10px;
  border: 1px solid #E5E7EB;
  background: #ffffff;
  color: #374151;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease;

  &:hover {
    border-color: #D1D5DB;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #9CA3AF;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: lowercase;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #E5E7EB;
  }
`;

export const SocialButton = styled.button`
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: none;
  background: #1F2937;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.18s ease, transform 0.18s ease;

  &:hover {
    background: #111827;
    transform: translateY(-1px);
  }

  svg {
    font-size: 1rem;
  }
`;

export const SocialButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;

export const FooterText = styled.p`
  margin: 0;
  color: #6B7280;
  font-size: 0.85rem;
  line-height: 1.6;
  text-align: center;

  a {
    color: ${(props) => getTone(props.$tone || "purple").accent};
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const InlineAlert = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: ${(props) => (props.$type === "error" ? "#FEF2F2" : "#F0FDF4")};
  border: 1px solid ${(props) => (props.$type === "error" ? "#FECACA" : "#BBF7D0")};
  color: ${(props) => (props.$type === "error" ? "#DC2626" : "#16A34A")};
  font-size: 0.85rem;
  line-height: 1.5;
`;

export const FieldHint = styled.span`
  color: ${(props) => (props.$error ? "#DC2626" : "#9CA3AF")};
  font-size: 0.76rem;
  line-height: 1.4;
`;

/* ── Compact Layout (used in modals) ── */
export const CompactShell = styled.div`
  width: 100%;
  max-width: 520px;
  padding: 32px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #F3F4F6;
  box-shadow: 0 20px 50px rgba(30, 16, 53, 0.14);

  @media (max-width: 640px) {
    padding: 24px 18px;
  }
`;

export const CompactInner = styled.div`
  display: grid;
  gap: 20px;
`;

export const CompactIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: ${(props) => getTone(props.$tone).accentSoft};
  color: ${(props) => getTone(props.$tone).accent};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
`;

/* ═══════════════════════════════════════════════════════════
   AUTH LAYOUT – Primary wrapper component
   ═══════════════════════════════════════════════════════════ */
export const AuthLayout = ({
  tone = "purple",
  asideImage,
  title,
  description,
  quote = "",
  quoteAuthor = "",
  quoteRole = "",
  innerStyle = {},
  gridTemplate,
  children,
}) => {
  return (
    <AuthPage $tone={tone}>
      <AuthShell $gridTemplate={gridTemplate}>
        {/* ─── LEFT: Form Panel ─── */}
        <AuthMain>
          <MainInner style={innerStyle}>
            {children}
          </MainInner>
        </AuthMain>

        {/* ─── RIGHT: Visuals Panel ─── */}
        <AuthAside $tone={tone} $bgImage={getAsideImage(tone, asideImage)}>
        </AuthAside>
      </AuthShell>
    </AuthPage>
  );
};
