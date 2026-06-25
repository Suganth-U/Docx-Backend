import React from "react";
import MessagingInbox from "@/shared/features/Messaging/MessagingInbox";

const DoctorMessages = () => {
  return (
    <MessagingInbox
      viewerRole="doctor"
      title="A calmer inbox for patient follow-up and ongoing care."
      description="Review appointment-linked conversations in one place, search message history quickly, and respond in realtime without losing context."
      backTo="/doctor/dashboard"
      backLabel="Back to dashboard"
    />
  );
};

export default DoctorMessages;
