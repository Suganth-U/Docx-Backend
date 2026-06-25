const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const formatCurrency = (value) => {
    const amount = Number(value || 0);

    if (Number.isNaN(amount)) {
        return "LKR 0.00";
    }

    return `LKR ${amount.toFixed(2)}`;
};

const formatDoctorName = (name = "Doctor") => {
    const baseName = String(name || "Doctor")
        .trim()
        .replace(/^(dr\.?\s+)+/i, "")
        .trim() || "Doctor";

    return `Dr. ${baseName}`;
};

const wrapList = (items = []) =>
    items.length
        ? `<ul style="padding-left:20px;margin:8px 0 0;">${items
              .map(
                  (item) =>
                      `<li style="margin-bottom:6px;line-height:1.5;">${typeof item === "string" ? item : ""}</li>`
              )
              .join("")}</ul>`
        : "";

const button = (label, href) =>
    href
        ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(
              href
          )}" style="color:#1a73e8;text-decoration:none;font-weight:500;">${escapeHtml(
              label
          )}</a></p>`
        : "";

const section = (title, lines = []) => {
    const filtered = lines.filter(Boolean);

    if (!filtered.length) return "";

    return `
        <div style="margin-top:20px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#202124;">${escapeHtml(
                title
            )}</p>
            ${filtered
                .map((line) => {
                    const trimmed = String(line).trim();
                    const isBlockHtml = /^<(ul|ol|p|div|table)\b/i.test(trimmed);
                    const content = trimmed.startsWith("<") ? trimmed : escapeHtml(trimmed);

                    return isBlockHtml
                        ? content
                        : `<p style="margin:0 0 6px;color:#202124;line-height:1.5;">${content}</p>`;
                })
                .join("")}
        </div>
    `;
};

const buildTemplate = ({ title, intro, body = "", ctaLabel, ctaHref }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#202124;">
    <div style="max-width:640px;margin:0;padding:24px 20px;">
        <h2 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:500;color:#202124;">${escapeHtml(title)}</h2>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#202124;">${intro}</p>
        ${body}
        ${button(ctaLabel, ctaHref)}
        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#5f6368;">Need help? Reply to this email or contact the DocX support team.</p>
        <p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #dadce0;font-size:12px;color:#5f6368;">DocX Care Platform</p>
    </div>
</body>
</html>
`;

const templates = {
    WELCOME_PATIENT: ({ name = "there", frontendUrl = "" }) => ({
        subject: "Welcome to DocX",
        html: buildTemplate({
            title: "Your DocX account is ready",
            eyebrow: "Welcome",
            intro: `Hi ${escapeHtml(
                name
            )}, your DocX account has been created successfully. You can now book appointments, request virtual consultations, manage prescriptions, and track pharmacy orders in one place.`,
            body: section("What you can do now", [
                "Browse doctors and specialties",
                "Book in-person or virtual care",
                "Order medicines and track delivery",
            ]),
            ctaLabel: "Open DocX",
            ctaHref: frontendUrl,
        }),
    }),
    DOCTOR_APPLICATION_RECEIVED: ({ name = "Doctor" }) => ({
        subject: "DocX doctor application received",
        html: buildTemplate({
            title: "Application received",
            eyebrow: "Doctor onboarding",
            intro: `${escapeHtml(
                formatDoctorName(name)
            )}, we received your DocX doctor application and our team is reviewing it now.`,
            body: section("What happens next", [
                "Our admin team reviews your profile and submitted details.",
                "You will receive another email once your account is approved or if we need more information.",
            ]),
        }),
    }),
    LOGIN_ALERT: ({ name = "there", time = "", roleLabel = "account" }) => ({
        subject: "New login to your DocX account",
        html: buildTemplate({
            title: "Successful sign-in detected",
            eyebrow: "Security alert",
            intro: `Hi ${escapeHtml(
                name
            )}, a successful login was detected on your DocX ${escapeHtml(roleLabel)}.`,
            body: section("Login details", [
                time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                "If this was not you, please reset your password immediately.",
            ]),
        }),
    }),
    FORGOT_PASSWORD: ({ name = "there", resetUrl = "" }) => ({
        subject: "Reset your DocX password",
        html: buildTemplate({
            title: "Password reset request",
            eyebrow: "Security",
            intro: `Hi ${escapeHtml(
                name
            )}, we received a request to reset your DocX password. Use the secure link below to set a new password.`,
            body: section("Important", [
                "The reset link is time-limited for your protection.",
                "If you did not request this, you can safely ignore this email.",
            ]),
            ctaLabel: "Reset password",
            ctaHref: resetUrl,
        }),
    }),
    PASSWORD_RESET_SUCCESS: ({ name = "there", frontendUrl = "" }) => ({
        subject: "Your DocX password was changed",
        html: buildTemplate({
            title: "Password updated successfully",
            eyebrow: "Security",
            intro: `Hi ${escapeHtml(
                name
            )}, this is a confirmation that your DocX password has been changed successfully.`,
            body: section("If this was not you", [
                "Reset your password again immediately.",
                "Contact DocX support so we can help secure your account.",
            ]),
            ctaLabel: "Open DocX",
            ctaHref: frontendUrl,
        }),
    }),
    SYSTEM_ALERT_NEW_DOCTOR: ({ name = "Doctor", email = "", specialization = "" }) => ({
        subject: "Action required: new doctor registration",
        html: buildTemplate({
            title: "New doctor registration pending review",
            eyebrow: "Admin alert",
            intro: "A new doctor registration requires review in the DocX admin panel.",
            body: section("Doctor details", [
                `<strong>Name:</strong> ${escapeHtml(formatDoctorName(name))}`,
                email ? `<strong>Email:</strong> ${escapeHtml(email)}` : "",
                specialization ? `<strong>Specialization:</strong> ${escapeHtml(specialization)}` : "",
            ]),
        }),
    }),
    DOCTOR_APPROVED: ({ name = "Doctor", frontendUrl = "" }) => ({
        subject: "Your DocX doctor account is approved",
        html: buildTemplate({
            title: "Doctor account approved",
            eyebrow: "Doctor onboarding",
            intro: `${escapeHtml(
                formatDoctorName(name)
            )}, your DocX doctor account is now active and ready to use.`,
            body: section("You can now", [
                "Access the doctor dashboard",
                "Manage schedules and appointments",
                "Review virtual consultations and prescriptions",
            ]),
            ctaLabel: "Open dashboard",
            ctaHref: frontendUrl ? `${frontendUrl.replace(/\/$/, "")}/login` : frontendUrl,
        }),
    }),
    DOCTOR_REJECTED: ({ name = "Doctor", reason = "" }) => ({
        subject: "DocX doctor application update",
        html: buildTemplate({
            title: "Application update",
            eyebrow: "Doctor onboarding",
            intro: `${escapeHtml(
                formatDoctorName(name)
            )}, we’re sorry, but your DocX doctor application was not approved at this time.`,
            body: section("Review note", [
                reason
                    ? `<strong>Reason:</strong> ${escapeHtml(reason)}`
                    : "Please contact the DocX support team for more information.",
            ]),
        }),
    }),
    APPOINTMENT_BOOKING_HOLD: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        holdExpiresAt = "",
        type = "appointment",
    }) => ({
        subject: "Your DocX slot is reserved temporarily",
        html: buildTemplate({
            title: "Slot reserved",
            eyebrow: "Appointment update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, we reserved your ${escapeHtml(type)} slot with Dr. ${escapeHtml(
                doctorName
            )} while you complete payment.`,
            body: section("Reserved slot", [
                date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                holdExpiresAt
                    ? `<strong>Hold expires:</strong> ${escapeHtml(holdExpiresAt)}`
                    : "Please complete payment soon to keep this slot.",
            ]),
        }),
    }),
    APPOINTMENT_PAYMENT_SUCCESS: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        hospitalName = "",
        receiptNumber = "",
        queueNumber = "",
        meetingLink = "",
    }) => ({
        subject: "Your DocX appointment is confirmed",
        html: buildTemplate({
            title: "Appointment confirmed",
            eyebrow: "Appointment update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your appointment payment has been confirmed and your booking is now secured.`,
            body:
                section("Appointment details", [
                    `<strong>Doctor:</strong> Dr. ${escapeHtml(doctorName)}`,
                    date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                    time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                    hospitalName ? `<strong>Venue:</strong> ${escapeHtml(hospitalName)}` : "",
                    receiptNumber ? `<strong>Receipt number:</strong> ${escapeHtml(receiptNumber)}` : "",
                    queueNumber ? `<strong>Queue number:</strong> ${escapeHtml(queueNumber)}` : "",
                ]) +
                (meetingLink
                    ? section("Meeting access", [
                          `Use this link when it is time to join: <a href="${escapeHtml(
                              meetingLink
                          )}">${escapeHtml(meetingLink)}</a>`,
                      ])
                    : ""),
        }),
    }),
    APPOINTMENT_PAYMENT_FAILED: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        statusLabel = "failed",
    }) => ({
        subject: "Your DocX appointment payment was not completed",
        html: buildTemplate({
            title: "Appointment payment update",
            eyebrow: "Appointment update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your appointment payment for Dr. ${escapeHtml(
                doctorName
            )} was marked as ${escapeHtml(statusLabel)}.`,
            body: section("Booking details", [
                date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                "Your reserved slot may have been released. Please book again if you still need this appointment.",
            ]),
        }),
    }),
    APPOINTMENT_CANCELLED_BY_DOCTOR: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        hospitalName = "",
        reason = "",
    }) => ({
        subject: "Your DocX appointment was cancelled",
        html: buildTemplate({
            title: "Appointment cancelled",
            eyebrow: "Appointment update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, Dr. ${escapeHtml(doctorName)} cancelled your appointment.`,
            body: section("Cancelled booking", [
                date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                hospitalName ? `<strong>Venue:</strong> ${escapeHtml(hospitalName)}` : "",
                reason ? `<strong>Reason:</strong> ${escapeHtml(reason)}` : "",
                "Please book another slot if you still need this consultation.",
            ]),
        }),
    }),
    APPOINTMENT_REMINDER: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        hospitalName = "",
        meetingLink = "",
    }) => ({
        subject: "Reminder: your DocX appointment is coming up",
        html: buildTemplate({
            title: "Upcoming appointment reminder",
            eyebrow: "Reminder",
            intro: `Hi ${escapeHtml(
                patientName
            )}, this is a reminder about your upcoming appointment with Dr. ${escapeHtml(doctorName)}.`,
            body:
                section("Appointment details", [
                    date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                    time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                    hospitalName ? `<strong>Venue:</strong> ${escapeHtml(hospitalName)}` : "",
                ]) +
                (meetingLink
                    ? section("Join online", [
                          `Meeting link: <a href="${escapeHtml(meetingLink)}">${escapeHtml(
                              meetingLink
                          )}</a>`,
                      ])
                    : ""),
        }),
    }),
    VIRTUAL_REQUEST_RECEIVED: ({
        patientName = "there",
        doctorName = "your doctor",
        specialty = "",
        requestedDate = "",
        requestedTime = "",
    }) => ({
        subject: "Your DocX virtual consultation request was received",
        html: buildTemplate({
            title: "Virtual consultation request received",
            eyebrow: "Virtual care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, we received your request for a virtual consultation with Dr. ${escapeHtml(doctorName)}.`,
            body: section("Request details", [
                specialty ? `<strong>Specialty:</strong> ${escapeHtml(specialty)}` : "",
                requestedDate ? `<strong>Requested date:</strong> ${escapeHtml(requestedDate)}` : "",
                requestedTime ? `<strong>Requested time:</strong> ${escapeHtml(requestedTime)}` : "",
                "We’ll notify you once the doctor accepts or declines the request.",
            ]),
        }),
    }),
    VIRTUAL_APPROVED_PROMPT_PAYMENT: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
    }) => ({
        subject: "Your virtual consultation is approved",
        html: buildTemplate({
            title: "Consultation approved",
            eyebrow: "Virtual care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, Dr. ${escapeHtml(doctorName)} approved your virtual consultation request.`,
            body: section("Approved slot", [
                date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                "Please complete payment to confirm the session and unlock meeting access.",
            ]),
        }),
    }),
    VIRTUAL_REJECTED: ({ patientName = "there", doctorName = "your doctor", reason = "" }) => ({
        subject: "Your virtual consultation request was declined",
        html: buildTemplate({
            title: "Consultation update",
            eyebrow: "Virtual care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, Dr. ${escapeHtml(doctorName)} is unable to accept your virtual consultation request.`,
            body: section("Doctor note", [
                reason ? escapeHtml(reason) : "Please choose another doctor or request another slot.",
            ]),
        }),
    }),
    VIRTUAL_PAYMENT_CONFIRMED: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        meetingLink = "",
        meetingPending = false,
    }) => ({
        subject: meetingPending
            ? "Your virtual consultation payment is confirmed"
            : "Your virtual consultation is confirmed",
        html: buildTemplate({
            title: meetingPending
                ? "Payment confirmed, meeting link is coming next"
                : "Virtual consultation confirmed",
            eyebrow: "Virtual care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your payment for the virtual consultation with Dr. ${escapeHtml(
                doctorName
            )} has been confirmed.`,
            body:
                section("Consultation details", [
                    date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                    time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                ]) +
                section(
                    meetingPending ? "Next step" : "Meeting access",
                    meetingPending
                        ? ["We are preparing the meeting link and will send it in a follow-up email as soon as it is ready."]
                        : [
                              `Join using this secure link: <a href="${escapeHtml(
                                  meetingLink
                              )}">${escapeHtml(meetingLink)}</a>`,
                          ]
                ),
        }),
    }),
    VIRTUAL_MEETING_LINK_READY: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        meetingLink = "",
    }) => ({
        subject: "Your virtual consultation meeting link is ready",
        html: buildTemplate({
            title: "Meeting link ready",
            eyebrow: "Virtual care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, the meeting link for your virtual consultation with Dr. ${escapeHtml(
                doctorName
            )} is now ready.`,
            body:
                section("Session details", [
                    date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                    time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                ]) +
                section("Join online", [
                    `Meeting link: <a href="${escapeHtml(meetingLink)}">${escapeHtml(
                        meetingLink
                    )}</a>`,
                ]),
        }),
    }),
    VIRTUAL_PAYMENT_FAILED: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        statusLabel = "failed",
    }) => ({
        subject: "Your virtual consultation payment was not completed",
        html: buildTemplate({
            title: "Virtual consultation payment update",
            eyebrow: "Virtual care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your payment for the virtual consultation with Dr. ${escapeHtml(
                doctorName
            )} was marked as ${escapeHtml(statusLabel)}.`,
            body: section("Consultation details", [
                date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                "You can return to DocX to complete payment again if the consultation is still available.",
            ]),
        }),
    }),
    VIRTUAL_REMINDER: ({
        patientName = "there",
        doctorName = "your doctor",
        date = "",
        time = "",
        meetingLink = "",
    }) => ({
        subject: "Reminder: your DocX virtual consultation is coming up",
        html: buildTemplate({
            title: "Upcoming virtual consultation reminder",
            eyebrow: "Reminder",
            intro: `Hi ${escapeHtml(
                patientName
            )}, this is a reminder about your upcoming virtual consultation with Dr. ${escapeHtml(
                doctorName
            )}.`,
            body:
                section("Consultation details", [
                    date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                    time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
                ]) +
                (meetingLink
                    ? section("Join online", [
                          `Meeting link: <a href="${escapeHtml(meetingLink)}">${escapeHtml(
                              meetingLink
                          )}</a>`,
                      ])
                    : ""),
        }),
    }),
    PRESCRIPTION_REQUEST_RECEIVED: ({
        patientName = "there",
        doctorName = "our specialist team",
        specialist = "",
    }) => ({
        subject: "Your prescription request was received",
        html: buildTemplate({
            title: "Prescription request received",
            eyebrow: "Prescription care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your prescription request has been sent for review.`,
            body: section("Request details", [
                specialist ? `<strong>Requested specialty:</strong> ${escapeHtml(specialist)}` : "",
                `<strong>Review team:</strong> ${escapeHtml(doctorName)}`,
            ]),
        }),
    }),
    PRESCRIPTION_ISSUED: ({
        patientName = "there",
        doctorName = "your doctor",
        frontendUrl = "",
    }) => ({
        subject: "A new prescription was issued on DocX",
        html: buildTemplate({
            title: "Prescription issued",
            eyebrow: "Prescription care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, Dr. ${escapeHtml(doctorName)} issued your prescription successfully.`,
            body: section("Next step", [
                "Open your DocX patient area to view the prescription and continue with pharmacy fulfillment.",
            ]),
            ctaLabel: "Open patient portal",
            ctaHref: frontendUrl ? `${frontendUrl.replace(/\/$/, "")}/patient/profile` : frontendUrl,
        }),
    }),
    PRESCRIPTION_REJECTED: ({
        patientName = "there",
        doctorName = "your doctor",
        reason = "",
        frontendUrl = "",
    }) => ({
        subject: "Your prescription request was reviewed",
        html: buildTemplate({
            title: "Prescription request update",
            eyebrow: "Prescription care",
            intro: `Hi ${escapeHtml(
                patientName
            )}, Dr. ${escapeHtml(doctorName)} was unable to issue a digital prescription for this request.`,
            body: section("Doctor note", [
                reason || "Please review the request details in your patient portal and try again if needed.",
            ]),
            ctaLabel: "Open patient portal",
            ctaHref: frontendUrl ? `${frontendUrl.replace(/\/$/, "")}/patient/profile` : frontendUrl,
        }),
    }),
    EPRESCRIPTION_CREATED: ({ patientName = "Patient", doctorName = "Doctor" }) => ({
        subject: "New e-prescription waiting for pharmacy action",
        html: buildTemplate({
            title: "New e-prescription created",
            eyebrow: "Pharmacy alert",
            intro: "A new electronic prescription was created and is waiting for pharmacy processing.",
            body: section("Prescription details", [
                `<strong>Patient:</strong> ${escapeHtml(patientName)}`,
                `<strong>Doctor:</strong> Dr. ${escapeHtml(doctorName)}`,
            ]),
        }),
    }),
    EPRESCRIPTION_DISPENSED: ({ patientName = "there", doctorName = "your doctor" }) => ({
        subject: "Your DocX prescription is ready",
        html: buildTemplate({
            title: "Prescription dispensed",
            eyebrow: "Pharmacy update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your prescription from Dr. ${escapeHtml(doctorName)} has been dispensed successfully.`,
            body: section("Update", [
                "Your pharmacy fulfillment is complete.",
            ]),
        }),
    }),
    PHARMACY_ORDER_PLACED: ({ patientName = "there", orderId = "" }) => ({
        subject: "Your DocX pharmacy order was received",
        html: buildTemplate({
            title: "Pharmacy order received",
            eyebrow: "Pharmacy update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, we received your DocX pharmacy order and started processing it.`,
            body: section("Order details", [
                orderId ? `<strong>Order ID:</strong> ${escapeHtml(orderId)}` : "",
                "We’ll notify you when payment, verification, or delivery status changes.",
            ]),
        }),
    }),
    PHARMACY_PAYMENT_CONFIRMED: ({ patientName = "there", orderId = "", totalPrice = "" }) => ({
        subject: "Your DocX pharmacy payment is confirmed",
        html: buildTemplate({
            title: "Payment confirmed",
            eyebrow: "Pharmacy update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your pharmacy payment has been confirmed successfully.`,
            body: section("Order details", [
                orderId ? `<strong>Order ID:</strong> ${escapeHtml(orderId)}` : "",
                totalPrice ? `<strong>Total:</strong> ${escapeHtml(formatCurrency(totalPrice))}` : "",
            ]),
        }),
    }),
    PHARMACY_PAYMENT_FAILED: ({
        patientName = "there",
        orderId = "",
        statusLabel = "failed",
    }) => ({
        subject: "Your DocX pharmacy payment was not completed",
        html: buildTemplate({
            title: "Payment update",
            eyebrow: "Pharmacy update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your pharmacy payment was marked as ${escapeHtml(statusLabel)}.`,
            body: section("Order details", [
                orderId ? `<strong>Order ID:</strong> ${escapeHtml(orderId)}` : "",
                "Please return to DocX if you want to try payment again.",
            ]),
        }),
    }),
    PHARMACY_VERIFICATION_NEEDED: ({ orderId = "", patientName = "Patient", items = [] }) => ({
        subject: "Prescription verification needed for a pharmacy order",
        html: buildTemplate({
            title: "Verification required",
            eyebrow: "Pharmacy alert",
            intro: "A pharmacy order containing prescription medicines requires staff verification.",
            body:
                section("Order details", [
                    orderId ? `<strong>Order ID:</strong> ${escapeHtml(orderId)}` : "",
                    `<strong>Patient:</strong> ${escapeHtml(patientName)}`,
                ]) +
                (items.length
                    ? section(
                          "Prescription items",
                          [wrapList(items.map((item) => `${escapeHtml(item.name)} x ${escapeHtml(item.qty)}`))]
                      )
                    : ""),
        }),
    }),
    PHARMACY_VERIFICATION_UPDATE: ({
        patientName = "there",
        orderId = "",
        status = "Updated",
    }) => ({
        subject: "Your DocX pharmacy order has a verification update",
        html: buildTemplate({
            title: "Verification update",
            eyebrow: "Pharmacy update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your order’s prescription review status has been updated.`,
            body: section("Order details", [
                orderId ? `<strong>Order ID:</strong> ${escapeHtml(orderId)}` : "",
                `<strong>Status:</strong> ${escapeHtml(status)}`,
            ]),
        }),
    }),
    PHARMACY_ORDER_DELIVERED: ({ patientName = "there", orderId = "" }) => ({
        subject: "Your DocX pharmacy order was delivered",
        html: buildTemplate({
            title: "Order delivered",
            eyebrow: "Pharmacy update",
            intro: `Hi ${escapeHtml(
                patientName
            )}, your pharmacy order has been marked as delivered.`,
            body: section("Order details", [
                orderId ? `<strong>Order ID:</strong> ${escapeHtml(orderId)}` : "",
            ]),
        }),
    }),
    SYSTEM_CONSULTATION_REQUEST: ({
        patientName = "Patient",
        doctorName = "Doctor",
        date = "",
        time = "",
    }) => ({
        subject: "New virtual consultation request",
        html: buildTemplate({
            title: "Virtual consultation request needs attention",
            eyebrow: "Admin alert",
            intro: "A new virtual consultation request was submitted on DocX.",
            body: section("Consultation details", [
                `<strong>Patient:</strong> ${escapeHtml(patientName)}`,
                `<strong>Doctor:</strong> Dr. ${escapeHtml(doctorName)}`,
                date ? `<strong>Date:</strong> ${escapeHtml(date)}` : "",
                time ? `<strong>Time:</strong> ${escapeHtml(time)}` : "",
            ]),
        }),
    }),
    SYSTEM_LOW_STOCK: ({ items = [] }) => ({
        subject: "DocX low stock alert",
        html: buildTemplate({
            title: "Low stock alert",
            eyebrow: "Inventory alert",
            intro: "One or more medicines have reached the reorder threshold.",
            body: section(
                "Medicines needing attention",
                [wrapList(items.map((item) => `${escapeHtml(item.name)} - ${escapeHtml(item.stock)} remaining`))]
            ),
        }),
    }),
};

module.exports = templates;
