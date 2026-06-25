import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import {
  FaArrowRight,
  FaBars,
  FaBell,
  FaChevronDown,
  FaFilePrescription,
  FaFlask,
  FaHeadset,
  FaHeart,
  FaInfoCircle,
  FaNewspaper,
  FaNotesMedical,
  FaPills,
  FaSearch,
  FaShoppingCart,
  FaTimes,
  FaUserShield,
  FaVideo,
} from "react-icons/fa";
import { assets } from "@/shared/lib/assets";
import CartSidebar from "@/shared/features/Epharmacy/CartSidebar";
import {
  fetchPatientNotifications,
  markAllPatientNotificationsRead,
  markPatientNotificationRead,
} from "@/patient/api/patientNotificationClient";
import { API_ORIGIN } from "@/shared/lib/apiBase";
import { getCart } from "@/shared/lib/storage";
import { AUTH_SESSION_EVENT, getStoredAuthSession, isPatientSession } from "@/shared/lib/authSession";

const NAV_SECTIONS = [
  {
    id: "doctors",
    label: "Doctors",
    activeMatcher: (pathname) =>
      pathname.startsWith("/find-doctors") ||
      pathname.startsWith("/find-doctor") ||
      pathname.startsWith("/book-appointment") ||
      pathname.startsWith("/appointment") ||
      pathname.startsWith("/virtual-consultation") ||
      pathname.startsWith("/session") ||
      pathname.startsWith("/specialties"),
    items: [
      {
        title: "Find a Doctor",
        description: "Search by name, specialty, or condition.",
        to: "/find-doctors",
        icon: FaSearch,
      },
      {
        title: "Virtual Consultation",
        description: "Connect with doctors online and keep care moving.",
        to: "/virtual-consultation",
        icon: FaVideo,
      },
    ],
    feature: {
      badge: "Care starts here",
      title: "Find the right doctor without losing momentum.",
      description:
        "Move from discovery into booking and consultation with a clearer care path.",
      ctaLabel: "Book Now",
      to: "/find-doctors",
      background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
      titleColor: "#1f3c63",
      ctaColor: "#2563eb",
      image: assets.doctor,
    },
  },
  {
    id: "care-hub",
    label: "Care Hub",
    activeMatcher: (pathname) =>
      pathname.startsWith("/care-hub") ||
      pathname.startsWith("/patient/ehr") ||
      pathname.startsWith("/patient/medical-records") ||
      pathname.startsWith("/patient/profile") ||
      pathname.startsWith("/my-profile") ||
      pathname.startsWith("/medical-records") ||
      pathname.startsWith("/lab-reports") ||
      pathname.startsWith("/patient/lab-reports") ||
      pathname.startsWith("/digital-prescription") ||
      pathname.startsWith("/request-prescription") ||
      pathname.startsWith("/plus") ||
      pathname.startsWith("/membership-checkout"),
    items: [
      {
        title: "Care Overview",
        description: "See how DocX keeps the full patient journey connected.",
        to: "/care-hub",
        icon: FaHeart,
      },
      {
        title: "Medical Records",
        description: "Open your full EHR timeline, files, and medications.",
        to: "/patient/ehr",
        icon: FaNotesMedical,
        requiresAuth: true,
      },
      {
        title: "Lab Reports",
        description: "Upload and review diagnostic PDFs and images.",
        to: "/patient/lab-reports",
        icon: FaFlask,
        requiresAuth: true,
      },
      {
        title: "Digital Prescriptions",
        description: "Request and manage prescription follow-up online.",
        to: "/digital-prescription",
        icon: FaFilePrescription,
        requiresAuth: true,
      },
      {
        title: "DocX Plus",
        description: "Priority care, savings, and long-term record support.",
        to: "/plus",
        icon: FaUserShield,
        requiresAuth: true,
      },
    ],
    feature: {
      badge: "Connected care",
      title: "One place for records, reports, prescriptions, and refills.",
      description:
        "DocX is designed to keep post-consultation care moving, not stop at booking.",
      ctaLabel: "Explore Care Hub",
      to: "/care-hub",
      background: "linear-gradient(135deg, #efe7ff, #d6c7fb)",
      titleColor: "#3d2660",
      ctaColor: "#683b93",
      image: assets.prescriptionImg,
    },
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    activeMatcher: (pathname) =>
      pathname.startsWith("/pharmacy") ||
      pathname.startsWith("/product") ||
      pathname.startsWith("/cart") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/wishlist") ||
      pathname.startsWith("/orders"),
    items: [
      {
        title: "Browse Medicines",
        description: "Order authentic medicines online.",
        to: "/pharmacy",
        icon: FaPills,
      },
      {
        title: "Prescription Refill",
        description: "Use the supported prescription request flow for follow-up care.",
        to: "/digital-prescription",
        icon: FaFilePrescription,
        requiresAuth: true,
      },
      {
        title: "Pharmacy Follow-up",
        description: "See how records, prescriptions, and refills stay connected.",
        to: "/care-hub",
        icon: FaHeart,
      },
    ],
    feature: {
      badge: "Medication flow",
      title: "Continue treatment inside the DocX experience.",
      description:
        "From prescription support to medicine access, the pharmacy journey stays closer to care.",
      ctaLabel: "Open Pharmacy",
      to: "/pharmacy",
      background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
      titleColor: "#1f5d3b",
      ctaColor: "#2e7d32",
      image: assets.pharmacy,
    },
  },
  {
    id: "resources",
    label: "Resources",
    activeMatcher: (pathname) =>
      pathname.startsWith("/blog") ||
      pathname.startsWith("/about") ||
      pathname.startsWith("/contact") ||
      pathname.startsWith("/faqs") ||
      pathname.startsWith("/faq"),
    items: [
      {
        title: "Health Blog",
        description: "Latest health tips and platform updates.",
        to: "/blog",
        icon: FaNewspaper,
      },
      {
        title: "About Us",
        description: "See the mission behind the DocX care model.",
        to: "/about-us",
        icon: FaInfoCircle,
      },
      {
        title: "Support",
        description: "Reach customer support when you need help navigating care.",
        to: "/contact-us",
        icon: FaHeadset,
      },
    ],
    feature: {
      badge: "Need help?",
      title: "Guidance, support, and product context in one place.",
      description:
        "Learn how DocX works and reach out when you need support with the experience.",
      ctaLabel: "Contact Support",
      to: "/contact-us",
      background: "linear-gradient(135deg, #fff3e0, #ffe0b2)",
      titleColor: "#a14b00",
      ctaColor: "#ef6c00",
    },
  },
];

const Nav = styled.nav`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 5%;
  z-index: 9999;
  color: #333;
  font-family: "Inter", sans-serif;
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);

  @media (max-width: 1024px) {
    padding: 15px 20px;
  }

  &.sticky {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    padding-top: 10px;
    padding-bottom: 10px;
    animation: slideDown 0.3s ease-in-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }

    to {
      transform: translateY(0);
    }
  }
`;

const LogoSpan = styled.span`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 160px;
  z-index: 10001;
`;

const LogoText = styled.h2`
  margin: 0;
  color: #2c3e50;
  cursor: pointer;
  font-family: "Philosopher", serif;
  font-size: 30px;
  font-weight: 700;
`;

const MenuContainer = styled.ul`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const MegaDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  z-index: 10000;
  display: flex;
  width: 680px;
  padding: 10px;
  overflow: hidden;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.03);
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(20px);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);

  &::before {
    content: "";
    position: absolute;
    top: -25px;
    left: 0;
    width: 100%;
    height: 30px;
    background: transparent;
  }

  .feature-section {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-width: 220px;
    margin-left: 10px;
    padding: 24px;
    overflow: hidden;
    border-radius: 16px;

    h4 {
      position: relative;
      z-index: 1;
      margin: 8px 0;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.25;
    }

    p {
      position: relative;
      z-index: 1;
      margin: 0;
      color: rgba(44, 62, 80, 0.9);
      font-size: 13px;
      line-height: 1.6;
    }
  }
`;

const MenuList = styled.ul`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 330px;
  padding: 10px;
  list-style: none;
`;

const NavItemContainer = styled.li`
  position: relative;

  &:hover ${MegaDropdown} {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(15px);
  }
`;

const NavLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 30px;
  color: #555;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #222;
    background: rgba(0, 0, 0, 0.04);
  }

  svg {
    color: #888;
    font-size: 10px;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: rotate(180deg);
  }

  &.active {
    background: #f4eeff;
    color: #683b93;
    font-weight: 700;

    svg {
      color: #683b93;
    }
  }
`;

const TopNavLink = styled(Link)`
  color: inherit;
  text-decoration: none;
`;

const MenuItemLink = styled(Link)`
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 12px 15px;
  border-radius: 12px;
  color: #333;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f9fa;
  }

  .icon-box {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #eee;
    border-radius: 10px;
    background: #fff;
    color: #683b93;
    font-size: 18px;
    transition: all 0.2s ease;
  }

  &:hover .icon-box {
    background: #683b93;
    border-color: #683b93;
    color: #fff;
  }

  .text-content {
    width: 100%;
  }

  .text-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 3px;
  }

  h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 14px;
    font-weight: 600;
  }

  span {
    display: block;
    color: #7f8c8d;
    font-size: 12px;
    line-height: 1.45;
  }
`;

const ItemTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f3ebff;
  color: #7b4ce2;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const FeatureBadge = styled.span`
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  color: #3d2660;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const FeatureImage = styled.img`
  position: absolute;
  right: -8px;
  bottom: -6px;
  width: 150px;
  opacity: 0.18;
  transform: rotate(-10deg);
`;

const FeatureLink = styled(Link)`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  color: inherit;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
`;

const UtilitiesContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const IconBtn = styled.button`
  position: relative;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  background: #ffffff;
  color: #555;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f9fa;
    border-color: #683b93;
    color: #683b93;
    box-shadow: 0 4px 10px rgba(104, 59, 147, 0.2);
  }

  .badge {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #683b93;
    color: #fff;
    font-size: 10px;
    font-weight: 500;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
`;

const InitialsAvatar = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #683b93;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(104, 59, 147, 0.2);
`;

const ProfileTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const NotificationWrap = styled.div`
  position: relative;
`;

const NotificationDropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  z-index: 10010;
  width: min(360px, calc(100vw - 32px));
  max-height: 430px;
  overflow: hidden;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #eee7fb;
  box-shadow: 0 18px 42px rgba(36, 20, 60, 0.16);
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f0e9fb;

  strong {
    color: #281a43;
  }

  button {
    border: none;
    background: transparent;
    color: #683b93;
    font-weight: 800;
    cursor: pointer;
  }
`;

const NotificationList = styled.div`
  max-height: 330px;
  overflow-y: auto;
`;

const NotificationItem = styled.button`
  width: 100%;
  border: none;
  border-bottom: 1px solid #f5f0fb;
  background: ${(props) => (props.$unread ? "#fbf7ff" : "#ffffff")};
  text-align: left;
  padding: 14px 16px;
  cursor: pointer;

  h4 {
    margin: 0 0 4px;
    color: #281a43;
    font-size: 0.92rem;
  }

  p {
    margin: 0;
    color: #6d6283;
    line-height: 1.45;
    font-size: 0.84rem;
  }
`;

const NotificationEmpty = styled.div`
  padding: 22px 16px;
  color: #6d6283;
  text-align: center;
`;

const LoginBtn = styled(Link)`
  padding: 10px 24px;
  border-radius: 30px;
  background: #8e7dbe;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(44, 62, 80, 0.2);
  transition: all 0.3s ease;

  &:hover {
    background: #855bab;
    box-shadow: 0 6px 20px rgba(44, 62, 80, 0.3);
  }

  @media (max-width: 640px) {
    padding: 9px 16px;
    font-size: 13px;
  }
`;

const MobileMenuButton = styled(IconBtn)`
  display: none;

  @media (max-width: 1024px) {
    display: flex;
  }
`;

const MobileOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10020;
  background: rgba(19, 10, 39, 0.48);
  opacity: ${(props) => (props.$open ? 1 : 0)};
  visibility: ${(props) => (props.$open ? "visible" : "hidden")};
  transition: opacity 0.25s ease, visibility 0.25s ease;
`;

const MobileDrawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 10021;
  width: min(420px, 88vw);
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%);
  box-shadow: -12px 0 40px rgba(25, 17, 45, 0.18);
  transform: translateX(${(props) => (props.$open ? "0" : "100%")});
  transition: transform 0.3s ease;
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 20px 18px;
  border-bottom: 1px solid #eee7fb;
`;

const DrawerBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DrawerBrandText = styled.div`
  strong {
    display: block;
    color: #2c3e50;
    font-family: "Philosopher", serif;
    font-size: 1.6rem;
    line-height: 1;
  }

  span {
    display: block;
    margin-top: 5px;
    color: #6e6482;
    font-size: 0.86rem;
  }
`;

const DrawerCloseButton = styled.button`
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #ece5fa;
  border-radius: 50%;
  background: #ffffff;
  color: #5d536e;
  cursor: pointer;
`;

const DrawerContent = styled.div`
  flex: 1;
  padding: 18px 18px 24px;
  overflow-y: auto;
`;

const DrawerHomeLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  border-radius: 18px;
  background: #f5f0ff;
  color: #3d2660;
  font-weight: 700;
  text-decoration: none;
`;

const DrawerSections = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DrawerSection = styled.div`
  border: 1px solid #eee7fb;
  border-radius: 22px;
  background: #ffffff;
  overflow: hidden;
`;

const DrawerSectionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: none;
  background: ${(props) => (props.$active ? "#f7f1ff" : "#ffffff")};
  color: ${(props) => (props.$active ? "#4b2e77" : "#2d243f")};
  font-size: 0.96rem;
  font-weight: 700;
  cursor: pointer;
`;

const DrawerChevron = styled(FaChevronDown)`
  transform: rotate(${(props) => (props.$open ? "180deg" : "0deg")});
  transition: transform 0.2s ease;
`;

const DrawerItems = styled.div`
  display: grid;
  gap: 10px;
  padding: ${(props) => (props.$open ? "0 16px 16px" : "0 16px")};
  max-height: ${(props) => (props.$open ? "560px" : "0")};
  overflow: hidden;
  transition: max-height 0.28s ease, padding 0.28s ease;
`;

const DrawerItemLink = styled(Link)`
  display: flex;
  gap: 12px;
  padding: 12px 0;
  color: #382d4d;
  text-decoration: none;
  border-top: 1px solid #f1ecfb;

  &:first-child {
    border-top: none;
  }

  .icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: #f6f1ff;
    color: #6f41d6;
  }

  .text {
    flex: 1;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  strong {
    color: #241937;
    font-size: 0.95rem;
  }

  p {
    margin: 0;
    color: #6d6480;
    font-size: 0.84rem;
    line-height: 1.55;
  }
`;

const DrawerTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  background: #f3ebff;
  color: #7b4ce2;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const DrawerFooter = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #eee7fb;
`;

const DrawerAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #eee7fb;
  color: #3d2660;
  text-decoration: none;
  font-weight: 700;
`;

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

export const Navigationbar = () => {
  const [sticky, setSticky] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState("care-hub");
  const [patientNotifications, setPatientNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);

  const unreadNotificationCount = useMemo(
    () => patientNotifications.filter((notification) => !notification.isRead).length,
    [patientNotifications]
  );

  const syncSessionState = () => {
    const session = getStoredAuthSession();
    const isPatient = isPatientSession(session);
    setIsLoggedIn(isPatient);
    setUser(isPatient ? session : null);
  };

  const syncCartCount = () => {
    const cart = getCart();
    const count = cart.reduce(
      (accumulator, item) => accumulator + (item.qty || 1),
      0
    );
    setCartCount(count);
  };

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > window.innerHeight * 0.05);
    };

    handleScroll();
    syncSessionState();
    syncCartCount();

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("cartUpdated", syncCartCount);
    window.addEventListener("storage", syncSessionState);
    window.addEventListener(AUTH_SESSION_EVENT, syncSessionState);
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(AUTH_SESSION_EVENT, syncCartCount);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("cartUpdated", syncCartCount);
      window.removeEventListener("storage", syncSessionState);
      window.removeEventListener(AUTH_SESSION_EVENT, syncSessionState);
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(AUTH_SESSION_EVENT, syncCartCount);
    };
  }, []);

  useEffect(() => {
    syncSessionState();
    syncCartCount();
  }, [location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoggedIn) {
      setPatientNotifications([]);
      setIsNotificationsOpen(false);
      return undefined;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const notifications = await fetchPatientNotifications();
        if (!cancelled) {
          setPatientNotifications(notifications);
        }
      } catch (error) {
        console.error("Failed to fetch patient notifications", error);
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    let token = "";
    try {
      token = getStoredAuthSession().accessToken || "";
    } catch {
      token = "";
    }

    if (!token) return undefined;

    const socket = io(API_ORIGIN || undefined, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("notification:new", (notification) => {
      if (notification?.recipientRole && notification.recipientRole !== "patient") return;

      setPatientNotifications((current) => {
        if (current.some((item) => item._id === notification._id)) {
          return current;
        }
        return [notification, ...current].slice(0, 50);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const isHomeActive = location.pathname === "/";
  const getNavDestination = (item) => item.to;

  const openNotification = async (notification) => {
    setIsNotificationsOpen(false);

    if (!notification.isRead) {
      try {
        const updated = await markPatientNotificationRead(notification._id);
        setPatientNotifications((current) =>
          current.map((item) => (item._id === updated._id ? updated : item))
        );
      } catch (error) {
        console.error("Failed to mark patient notification as read", error);
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllNotificationsRead = async (event) => {
    event.stopPropagation();

    try {
      await markAllPatientNotificationsRead();
      setPatientNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      console.error("Failed to mark patient notifications as read", error);
    }
  };

  return (
    <>
      <Nav className={sticky ? "sticky" : ""}>
        <LogoSpan>
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
          >
            <LogoText>DocX.</LogoText>
            <img src={assets.toplogo} alt="DocX logo" style={{ height: "40px" }} />
          </Link>
        </LogoSpan>

        <MenuContainer>
          <NavItemContainer>
            <NavLabel className={isHomeActive ? "active" : ""}>
              <TopNavLink to="/">Home</TopNavLink>
            </NavLabel>
          </NavItemContainer>

          {NAV_SECTIONS.map((section) => (
            <NavItemContainer key={section.id}>
              <NavLabel className={section.activeMatcher(location.pathname) ? "active" : ""}>
                <span>{section.label}</span>
                <FaChevronDown />
              </NavLabel>

              <MegaDropdown>
                <MenuList>
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <li key={item.title}>
                        <MenuItemLink to={getNavDestination(item)}>
                          <div className="icon-box">
                            <Icon />
                          </div>
                          <div className="text-content">
                            <div className="text-row">
                              <h3>{item.title}</h3>
                              {item.requiresAuth && !isLoggedIn ? <ItemTag>Sign In</ItemTag> : null}
                            </div>
                            <span>{item.description}</span>
                          </div>
                        </MenuItemLink>
                      </li>
                    );
                  })}
                </MenuList>

                <div
                  className="feature-section"
                  style={{ background: section.feature.background }}
                >
                  <FeatureBadge>{section.feature.badge}</FeatureBadge>
                  <h4 style={{ color: section.feature.titleColor }}>{section.feature.title}</h4>
                  <p>{section.feature.description}</p>
                  <FeatureLink to={section.feature.to} style={{ color: section.feature.ctaColor }}>
                    {section.feature.ctaLabel} <FaArrowRight size={10} />
                  </FeatureLink>
                  {section.feature.image ? (
                    <FeatureImage src={section.feature.image} alt="" aria-hidden="true" />
                  ) : null}
                </div>
              </MegaDropdown>
            </NavItemContainer>
          ))}
        </MenuContainer>

        <UtilitiesContainer>
          <IconBtn type="button" onClick={() => setIsCartOpen(true)} aria-label="Open cart">
            <FaShoppingCart />
            {cartCount > 0 ? <span className="badge">{cartCount}</span> : null}
          </IconBtn>

          {isLoggedIn ? (
            <>
              <NotificationWrap ref={notificationRef}>
                <IconBtn
                  type="button"
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                  aria-label="Open patient notifications"
                >
                  <FaBell />
                  {unreadNotificationCount > 0 ? (
                    <span className="badge">{unreadNotificationCount}</span>
                  ) : null}
                </IconBtn>

                {isNotificationsOpen ? (
                  <NotificationDropdown>
                    <NotificationHeader>
                      <strong>Notifications</strong>
                      {patientNotifications.length > 0 ? (
                        <button type="button" onClick={markAllNotificationsRead}>
                          Mark all read
                        </button>
                      ) : null}
                    </NotificationHeader>
                    <NotificationList>
                      {patientNotifications.length > 0 ? (
                        patientNotifications.map((notification) => (
                          <NotificationItem
                            key={notification._id}
                            type="button"
                            $unread={!notification.isRead}
                            onClick={() => openNotification(notification)}
                          >
                            <h4>{notification.title}</h4>
                            <p>{notification.message}</p>
                          </NotificationItem>
                        ))
                      ) : (
                        <NotificationEmpty>No notifications yet</NotificationEmpty>
                      )}
                    </NotificationList>
                  </NotificationDropdown>
                ) : null}
              </NotificationWrap>

              <ProfileTrigger
                type="button"
                onClick={() => navigate("/patient/profile")}
                aria-label="Open patient profile"
              >
                <InitialsAvatar>{getInitials(user?.name)}</InitialsAvatar>
              </ProfileTrigger>
            </>
          ) : (
            <LoginBtn to="/login">Sign In</LoginBtn>
          )}

          <MobileMenuButton
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <FaBars />
          </MobileMenuButton>
        </UtilitiesContainer>

        <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      </Nav>

      <MobileOverlay $open={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />

      <MobileDrawer $open={isMobileMenuOpen}>
        <DrawerHeader>
          <DrawerBrand>
            <img src={assets.toplogo} alt="DocX logo" style={{ height: "38px" }} />
            <DrawerBrandText>
              <strong>DocX.</strong>
              <span>Connected care navigation</span>
            </DrawerBrandText>
          </DrawerBrand>

          <DrawerCloseButton
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <FaTimes />
          </DrawerCloseButton>
        </DrawerHeader>

        <DrawerContent>
          <DrawerHomeLink to="/">
            <span>Home</span>
            <FaArrowRight size={13} />
          </DrawerHomeLink>

          <DrawerSections>
            {NAV_SECTIONS.map((section) => {
              const isOpen = openMobileSection === section.id;

              return (
                <DrawerSection key={section.id}>
                  <DrawerSectionButton
                    type="button"
                    $active={section.activeMatcher(location.pathname)}
                    onClick={() =>
                      setOpenMobileSection((current) =>
                        current === section.id ? "" : section.id
                      )
                    }
                  >
                    <span>{section.label}</span>
                    <DrawerChevron $open={isOpen} />
                  </DrawerSectionButton>

                  <DrawerItems $open={isOpen}>
                    {section.items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <DrawerItemLink
                          key={item.title}
                          to={getNavDestination(item)}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <div className="icon">
                            <Icon />
                          </div>
                          <div className="text">
                            <div className="row">
                              <strong>{item.title}</strong>
                              {item.requiresAuth && !isLoggedIn ? <DrawerTag>Sign In</DrawerTag> : null}
                            </div>
                            <p>{item.description}</p>
                          </div>
                        </DrawerItemLink>
                      );
                    })}
                  </DrawerItems>
                </DrawerSection>
              );
            })}
          </DrawerSections>

          <DrawerFooter>
            <DrawerAction to="/care-hub" onClick={() => setIsMobileMenuOpen(false)}>
              <span>Open Care Hub</span>
              <FaArrowRight size={13} />
            </DrawerAction>

            <DrawerAction to="/patient/ehr" onClick={() => setIsMobileMenuOpen(false)}>
              <span>{isLoggedIn ? "Open Health Records" : "Sign In for records"}</span>
              <FaArrowRight size={13} />
            </DrawerAction>
          </DrawerFooter>
        </DrawerContent>
      </MobileDrawer>
    </>
  );
};
