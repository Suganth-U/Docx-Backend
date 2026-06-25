const dotenv = require('dotenv');
const http = require("http");
const connectDB = require('./config/db');
const { configureApp } = require("./app");
const { initializeSocket } = require("./socket");
const { backfillLegacyMessagesToConversations } = require("./utils/chatBackfill");

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = configureApp();
const server = http.createServer(app);
initializeSocket(server);

const PORT = process.env.PORT || 5001;

const bootstrap = async () => {
    try {
        await connectDB();

        const Appointment = require('./models/Appointment');
        const Conversation = require("./models/Conversation");
        const DoctorAvailability = require('./models/DoctorAvailability');
        const DoctorSchedule = require('./models/DoctorSchedule');
        const DoctorVirtualSchedule = require('./models/DoctorVirtualSchedule');
        const EmailNotificationLog = require('./models/EmailNotificationLog');
        const EHRAccessLog = require('./models/EHRAccessLog');
        const EHRDocument = require('./models/EHRDocument');
        const Message = require("./models/Message");
        const OnlineConsultation = require('./models/OnlineConsultation');
        const PatientMedication = require('./models/PatientMedication');
        const Prescription = require('./models/Prescription');
        const PrescriptionRequest = require('./models/PrescriptionRequest');

        await Promise.all([
            Appointment.syncIndexes(),
            Conversation.syncIndexes(),
            DoctorAvailability.syncIndexes(),
            DoctorSchedule.syncIndexes(),
            DoctorVirtualSchedule.syncIndexes(),
            EHRAccessLog.syncIndexes(),
            EHRDocument.syncIndexes(),
            EmailNotificationLog.syncIndexes(),
            Message.syncIndexes(),
            OnlineConsultation.syncIndexes(),
            PatientMedication.syncIndexes(),
            Prescription.syncIndexes(),
            PrescriptionRequest.syncIndexes(),
        ]);


        await backfillLegacyMessagesToConversations();
        require('./utils/cron')();

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error(`Server bootstrap failed: ${error.message}`);
        process.exit(1);
    }
};

bootstrap();
