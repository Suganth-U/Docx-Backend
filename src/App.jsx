import React from "react";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";

import Home from "@/public/pages/Home/Home";
import About from "@/public/pages/About/About";
import Services from "@/public/pages/Services/Services";
import Faqs from "@/public/pages/FAQ/Faqs";
import Blog from "@/public/pages/Blog/Blog";
import BlogDetail from "@/public/pages/Blog/BlogDetail";
import Contact from "@/public/pages/Contact/Contact";
import CareHub from "@/public/pages/CareHub/CareHub";
import Portfolio from "@/public/pages/Portfolio/Portfolio";
import Membership from "@/public/pages/Membership/Membership";
import MembershipCheckout from "@/public/pages/Membership/MembershipCheckout";
import SpecialtyOverview from "@/public/pages/Specialties/SpecialtyOverview";

import DocDashboard from "@/doctor/DocDashboard/DocDashboard";
import DoctorDashboard from "@/doctor/Dashboard/Dashboard";
import MySchedule from "@/doctor/pages/MySchedule";

// Admin Imports
import AdminLayout from "@/admin/AdminLayout";
import AdminDashboard from "@/admin/Dashboard/Dashboard";
import AdminProfile from "@/admin/Profile/Profile";
import Doctor from "@/admin/Doctors/Doctor";
import Appointments from "@/admin/Appointments/Appointments";
import AdminPatientManagement from "@/admin/Patients/AdminPatientManagement";
import AdminPatientDetails from "@/admin/Patients/AdminPatientDetails";
import EHR from "@/admin/EHR/EHR";
import OnlineConsultation from "@/admin/OnlineConsultation/OnlineConsultation";
import AdminNotifications from "@/admin/Notifications/AdminNotifications";

// Basic Admin Modules
import AdminPharmacy from "@/admin/Pharmacy/AdminPharmacy";
import AdminSettings from "@/admin/Settings/AdminSettings";
import AdminBlogs from "@/admin/CMS/AdminBlogs";
import AdminFaqs from "@/admin/CMS/AdminFaqs";
import AdminPayments from "@/admin/Payments/AdminPayments";

import Appointment from "@/shared/features/booking/Appointment";
import AppointmentReceipt from "@/shared/features/booking/AppointmentReceipt";
import FindDoctor from "@/shared/features/booking/FindDoctor";
import RequestPrescription from "@/shared/features/prescription/RequestPrescription";
import Pharmacy from "@/shared/features/Epharmacy/Pharmacy";
import ProductDetails from "@/shared/features/Epharmacy/ProductDetails";
import Cart from "@/shared/features/Epharmacy/Cart";
import Checkout from "@/shared/features/Epharmacy/Checkout";
import Wishlist from "@/shared/features/Epharmacy/Wishlist";
import Orders from "@/shared/features/Epharmacy/Orders";
import OrderDetails from "@/shared/features/Epharmacy/OrderDetails";
import Session from "@/shared/features/consultation/Session";
import ConsultationStatus from "@/shared/features/consultation/ConsultationStatus";
import VirtualConsultationMeeting from "@/shared/features/consultation/VirtualConsultationMeeting";
import DocProfile from "@/doctor/Profile/DocProfile";
import DoctorAppointments from "@/doctor/Appointments/Appointments";
import AppointmentDetails from "@/doctor/Appointments/AppointmentDetails";
import DoctorPrescription from "@/doctor/Prescription/DoctorPrescription";
import DoctorRequests from "@/doctor/Prescription/DoctorRequests";
import DoctorNotifications from "@/doctor/Notifications/DoctorNotifications";
import Sessions from "@/doctor/VideoSession/Sessions";
import Login from "@/shared/features/Auth/Login";
import AdminLogin from "@/admin/Login/AdminLogin";
import Signup from "@/shared/features/Auth/Signup";
import ForgotPassword from "@/shared/features/Auth/ForgotPassword";
import ResetPassword from "@/shared/features/Auth/ResetPassword";
import DoctorRegistration from "@/shared/features/Auth/DoctorRegistration";

import Patients from "@/doctor/Patients/Patients";
import DoctorMessages from "@/doctor/Messaging/DoctorMessages";
import LabReports from "@/patient/pages/LabReports";
import PatientEHR from "@/patient/pages/PatientEHR";
import PatientMessages from "@/patient/pages/PatientMessages";
import PatientProfile from "@/patient/pages/PatientProfile";
import MyAppointments from "@/patient/pages/MyAppointments";
import Settings from "@/patient/pages/Settings";
import PatientOnboarding from "@/patient/pages/PatientOnboarding";
// Basic Doctor Modules
import DoctorSettings from "@/doctor/Settings/Settings";
import Careers from "@/public/pages/FooterPages/Careers";
import LegalPage from "@/public/pages/FooterPages/LegalPage";
import BusinessPage from "@/public/pages/FooterPages/BusinessPage";
import RequireAuth from "@/shared/components/common/RequireAuth";
import { ToastProvider } from "@/shared/context/ToastContext";
import NotFound from "@/public/pages/NotFound/NotFound";
import HealthAssistantWidget from "@/shared/components/assistant/HealthAssistantWidget";

const App = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Public Pages  */}
          <Route path="/about-us" element={<About />} />
          <Route path="/about" element={<About />} /> 

          <Route path="/services" element={<Services />} />
          <Route path="/service" element={<Services />} /> 
          <Route path="/specialties/:slug" element={<SpecialtyOverview />} />

          <Route path="/faqs" element={<Faqs />} />
          <Route path="/faq" element={<Faqs />} /> 

          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:title" element={<BlogDetail />} />

          <Route path="/contact-us" element={<Contact />} />
          <Route path="/contact" element={<Contact />} /> 
          <Route path="/care-hub" element={<CareHub />} />

          <Route path="/portfolio" element={<Portfolio />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/join-as-doctor" element={<DoctorRegistration />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Services & Booking */}
          <Route path="/find-doctors" element={<FindDoctor />} />
          <Route path="/find-doctor" element={<FindDoctor />} /> {/* Alias */}

          <Route path="/book-appointment" element={<Appointment />} />
          <Route path="/appointment/receipt/:id" element={<AppointmentReceipt />} />

          {/* Footer & Informational Pages */}
          <Route path="/careers" element={<Careers />} />

          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/help" element={<LegalPage type="help" />} />
          <Route path="/directory" element={<LegalPage type="directory" />} />
          <Route path="/medicines" element={<LegalPage type="medicines" />} />

          <Route path="/reach" element={<BusinessPage type="reach" />} />
          <Route path="/reach/hospital" element={<BusinessPage type="pro" />} /> {/* Alias for Hospital Reach */}
          <Route path="/pro" element={<BusinessPage type="pro" />} />
          <Route path="/wellness" element={<BusinessPage type="wellness" />} />

          <Route path="/search/clinics" element={<FindDoctor />} /> {/* Reuse FindDoctor for now */}
          <Route path="/search/hospitals" element={<FindDoctor />} />
          <Route path="/appointment" element={<Appointment />} /> {/* Alias */}

          <Route path="/virtual-consultation" element={<Session />} />
          <Route path="/virtual-consultation/status/:id" element={<ConsultationStatus />} />
          <Route path="/session" element={<Session />} /> {/* Alias */}

          <Route path="/pharmacy" element={<Pharmacy />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders/:id" element={<OrderDetails />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<RequireAuth allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/profile" element={<AdminLayout><AdminProfile /></AdminLayout>} />
            <Route path="/admin/doctors" element={<AdminLayout><Doctor /></AdminLayout>} />
            <Route path="/admin/patients" element={<AdminLayout><AdminPatientManagement /></AdminLayout>} />
            <Route path="/admin/patients/:id" element={<AdminLayout><AdminPatientDetails /></AdminLayout>} />
            <Route path="/admin/appointments" element={<AdminLayout><Appointments /></AdminLayout>} />
            <Route path="/admin/ehr" element={<AdminLayout><EHR /></AdminLayout>} />
            <Route path="/admin/online-consultation" element={<AdminLayout><OnlineConsultation /></AdminLayout>} />
            <Route path="/admin/notifications" element={<AdminLayout><AdminNotifications /></AdminLayout>} />
            <Route path="/admin/payments" element={<AdminLayout><AdminPayments /></AdminLayout>} />

            {/* Admin Inventory */}
            <Route path="/admin/pharmacy" element={<AdminLayout><AdminPharmacy /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
            <Route path="/admin/blogs" element={<AdminLayout><AdminBlogs /></AdminLayout>} />
            <Route path="/admin/faqs" element={<AdminLayout><AdminFaqs /></AdminLayout>} />
          </Route>

          {/* Shared Virtual Meeting Route */}
          <Route element={<RequireAuth allowedRoles={['patient', 'doctor']} />}>
            <Route path="/virtual-consultation/meeting/:id" element={<VirtualConsultationMeeting />} />
          </Route>

          {/* Doctor Routes - Enterprise */}
          <Route element={<RequireAuth allowedRoles={['doctor']} />}>
            <Route element={<DocDashboard />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/profile" element={<DocProfile />} />
              <Route path="/doctor/appointments" element={<DoctorAppointments />} />
              <Route path="/doctor/appointments/:id" element={<AppointmentDetails />} />
              <Route path="/doctor/prescription" element={<DoctorPrescription />} />
              <Route path="/doctor/requests" element={<DoctorRequests />} />
              <Route path="/doctor/notifications" element={<DoctorNotifications />} />
              <Route path="/doctor/schedule" element={<Sessions />} />
              <Route path="/doctor/my-schedule" element={<MySchedule />} />
              <Route path="/doctor/patients" element={<Patients />} />
              <Route path="/doctor/messages" element={<DoctorMessages />} />
              <Route path="/doctor/settings" element={<DoctorSettings />} />
            </Route>
          </Route>

          {/* Patient Routes - Professionalized */}
          <Route element={<RequireAuth allowedRoles={['patient']} />}>
            <Route path="/patient/ehr" element={<PatientEHR />} />
            <Route path="/patient/medical-records" element={<PatientEHR />} />
            <Route path="/medical-records" element={<PatientEHR />} />

            <Route path="/patient/appointments" element={<MyAppointments />} />

            <Route path="/patient/onboarding" element={<PatientOnboarding />} />

            <Route path="/patient/lab-reports" element={<LabReports />} />
            <Route path="/lab-reports" element={<LabReports />} /> {/* Alias */}

            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/my-profile" element={<PatientProfile />} /> {/* Alias */}
            <Route path="/patient/messages" element={<PatientMessages />} />

            <Route path="/digital-prescription" element={<RequestPrescription />} />
            <Route path="/request-prescription" element={<RequestPrescription />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment" element={<Navigate to="/checkout" replace />} />

            <Route path="/patient/settings" element={<Settings />} />
            <Route path="/settings" element={<Settings />} /> {/* Alias */}

            <Route path="/my-orders" element={<Orders />} />
            <Route path="/plus" element={<Membership />} />
            <Route path="/membership-checkout" element={<MembershipCheckout />} />
          </Route>

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes >
        <HealthAssistantWidget />
      </BrowserRouter >
    </ToastProvider>
  );
};

export default App;
