const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { ensureUploadDirectories, uploadsRoot } = require("./utils/storagePaths");

const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const userRoutes = require("./routes/userRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const patientRoutes = require("./routes/patientRoutes");
const chatRoutes = require("./routes/chatRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const cmsRoutes = require("./routes/cmsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const doctorNotificationRoutes = require("./routes/doctorNotificationRoutes");
const ehrRoutes = require("./routes/ehrRoutes");
const pharmacyAdminRoutes = require("./routes/pharmacyAdminRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const onlineConsultationRoutes = require("./routes/onlineConsultationRoutes");
const membershipPaymentRoutes = require("./routes/membershipPaymentRoutes");
const paymentWebhookRoutes = require("./routes/paymentWebhookRoutes");

const configureApp = () => {
    ensureUploadDirectories();

    const app = express();

    app.use(
        cors({
            origin: [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                process.env.FRONTEND_URL,
            ].filter(Boolean),
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        })
    );
    app.use("/api/payment-webhooks", paymentWebhookRoutes);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use("/uploads", express.static(uploadsRoot));

    app.get("/", (_req, res) => {
        res.status(200).send("DocX API is running...");
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/doctor/notifications", doctorNotificationRoutes);
    app.use("/api/doctor", doctorRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/doctors", doctorRoutes);
    app.use("/api/prescriptions", prescriptionRoutes);
    app.use("/api/appointments", appointmentRoutes);
    app.use("/api/medicines", medicineRoutes);
    app.use("/api/orders", orderRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/admin/notifications", notificationRoutes);
    app.use("/api/patient", patientRoutes);
    app.use("/api/chat", chatRoutes);
    app.use("/api/assistant", assistantRoutes);
    app.use("/api/cms", cmsRoutes);
    app.use("/api/ehr", ehrRoutes);
    app.use("/api/admin/pharmacy", pharmacyAdminRoutes);
    app.use("/api/admin/settings", settingsRoutes);
    app.use("/api/consultations", onlineConsultationRoutes);
    app.use("/api/membership-payments", membershipPaymentRoutes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
};

module.exports = {
    configureApp,
};
