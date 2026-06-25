const { startEmailScheduler } = require("./email/scheduler");
const { startConsultationMeetingScheduler } = require("./consultationScheduler");

module.exports = () => {
    startEmailScheduler();
    startConsultationMeetingScheduler();
};
