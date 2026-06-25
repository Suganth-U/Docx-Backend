import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import {
  completeConsultation,
  fetchMeetingAccess,
  recordMeetingEvent,
} from "@/shared/features/Consultations/consultationClient";
import { useToast } from "@/shared/context/ToastContext";
import PatientMedicalTimeline from "@/shared/components/common/PatientMedicalTimeline";
import { fetchEhrSummary } from "@/shared/lib/ehrApi";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";

const Page = styled.div`
  min-height: 100vh;
  background: #f8f9fb;
  padding: 28px;
  font-family: "DM Sans", sans-serif;
`;

const Shell = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  gap: 20px;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;

  h1 {
    margin: 0;
    color: #281a43;
    font-size: 1.7rem;
  }

  p {
    margin: 6px 0 0;
    color: #6d6283;
  }
`;

const Button = styled.button`
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid ${(props) => (props.$primary ? "#683b93" : "#e3dced")};
  background: ${(props) => (props.$primary ? "#683b93" : "#ffffff")};
  color: ${(props) => (props.$primary ? "#ffffff" : "#683b93")};
  font-weight: 800;
  padding: 0 16px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const MeetingCard = styled.section`
  min-height: 640px;
  border-radius: 22px;
  overflow: hidden;
  background: #111827;
  border: 1px solid rgba(104, 59, 147, 0.14);
  box-shadow: 0 18px 38px rgba(36, 20, 60, 0.1);
`;

const MeetingMount = styled.div`
  width: 100%;
  height: 640px;

  iframe {
    border: 0;
  }
`;

const Notice = styled.div`
  padding: 28px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(104, 59, 147, 0.12);
  color: #4f4268;
  line-height: 1.7;

  strong {
    display: block;
    color: #281a43;
    margin-bottom: 6px;
  }
`;

const FormCard = styled.form`
  padding: 24px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid rgba(104, 59, 147, 0.12);
  display: grid;
  gap: 16px;

  h2 {
    margin: 0;
    color: #281a43;
  }
`;

const EHRPanel = styled.section`
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(104, 59, 147, 0.12);
  display: grid;
  gap: 14px;

  h2 {
    margin: 0;
    color: #281a43;
    font-size: 1.05rem;
  }

  .ehr-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }

  .ehr-strip div {
    display: grid;
    gap: 4px;
    background: #fbfaff;
    border: 1px solid #eee8f7;
    border-radius: 8px;
    padding: 10px;
  }

  .ehr-strip span {
    color: #7c6a98;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .ehr-strip strong {
    color: #281a43;
    font-size: 0.9rem;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
  color: #4f4268;
  font-weight: 700;

  textarea {
    min-height: 96px;
    border: 1px solid rgba(104, 59, 147, 0.14);
    border-radius: 14px;
    padding: 12px 14px;
    font: inherit;
    resize: vertical;
    color: #281a43;
    background: #fbfaff;
  }
`;

const getReasonLabel = (access) => {
  switch (access?.reason) {
    case "not_open":
      return "Join Now is not open yet. It opens 30 minutes before the approved appointment time.";
    case "closed":
      return "This consultation join window has closed.";
    case "payment_required":
      return "Payment must be completed before joining this consultation.";
    case "setup_pending":
      return "Secure meeting setup is still pending. Please refresh again shortly.";
    case "completed":
      return "This virtual consultation is already completed.";
    default:
      return "Join access is not available yet.";
  }
};

const loadJitsiScript = (domain, appId) =>
  new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://${domain}/${appId}/external_api.js`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the secure video client."));
    document.body.appendChild(script);
  });

const VirtualConsultationMeeting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [ehrSummary, setEhrSummary] = useState(null);
  const [ehrForm, setEhrForm] = useState({
    symptoms: "",
    diagnosis: "",
    doctorNotes: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const loadAccess = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMeetingAccess(id);
      setAccess(data);
      setError("");
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Could not load meeting access.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  useEffect(() => {
    const patientId = access?.patient?.id;
    if (!patientId || access?.participantRole !== "doctor") {
      setEhrSummary(null);
      return;
    }

    fetchEhrSummary(patientId)
      .then(setEhrSummary)
      .catch((error) => {
        console.error("Failed to load EHR summary", error);
        setEhrSummary(null);
      });
  }, [access?.patient?.id, access?.participantRole]);

  useEffect(() => {
    if (access?.canJoin || access?.reason === "closed" || access?.reason === "completed") {
      return undefined;
    }

    const intervalId = window.setInterval(loadAccess, 30000);
    return () => window.clearInterval(intervalId);
  }, [access?.canJoin, access?.reason, loadAccess]);

  useEffect(() => {
    if (!access?.canJoin || access.provider !== "jitsi" || !mountRef.current) {
      return undefined;
    }

    let disposed = false;

    const startMeeting = async () => {
      try {
        await loadJitsiScript(access.domain, access.appId);
        if (disposed || !mountRef.current || !window.JitsiMeetExternalAPI) return;

        apiRef.current = new window.JitsiMeetExternalAPI(access.domain, {
          roomName: access.roomName,
          jwt: access.jwt,
          width: "100%",
          height: "100%",
          parentNode: mountRef.current,
          configOverwrite: {
            prejoinPageEnabled: false,
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
          },
        });

        apiRef.current.addListener("videoConferenceJoined", () => {
          recordMeetingEvent(id, "joined").catch(() => {});
        });

        apiRef.current.addListener("videoConferenceLeft", () => {
          recordMeetingEvent(id, "left").catch(() => {});
          if (access.participantRole === "doctor") {
            setShowCompletion(true);
          }
        });
      } catch (startError) {
        setError(startError.message || "Could not start the secure video session.");
      }
    };

    startMeeting();

    return () => {
      disposed = true;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
      if (mountRef.current) {
        mountRef.current.innerHTML = "";
      }
    };
  }, [access, id]);

  const handleComplete = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequiredFields(ehrForm, {
      symptoms: "Symptoms",
      diagnosis: "Diagnosis",
      doctorNotes: "Doctor notes",
    });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setCompleting(true);

    try {
      await completeConsultation(id, ehrForm);
      toast.success("Consultation completed and EHR note saved.");
      navigate("/doctor/schedule", { replace: true });
    } catch (completeError) {
      toast.error(
        completeError.response?.data?.message ||
          "Could not save the EHR note for this consultation."
      );
    } finally {
      setCompleting(false);
    }
  };

  const canComplete = access?.participantRole === "doctor";

  return (
    <Page>
      <Shell>
        <Header>
          <div>
            <h1>Secure video consultation</h1>
            <p>Join access is verified for the assigned patient and doctor only.</p>
          </div>
          <Button type="button" onClick={() => navigate(-1)}>
            Back
          </Button>
        </Header>

        {loading ? (
          <Notice>
            <strong>Checking access</strong>
            We are verifying your appointment, payment, and join window.
          </Notice>
        ) : error ? (
          <Notice>
            <strong>Meeting unavailable</strong>
            {error}
          </Notice>
        ) : !access?.canJoin ? (
          <Notice>
            <strong>Join Now is disabled</strong>
            {getReasonLabel(access)}
          </Notice>
        ) : access.provider === "external" ? (
          <Notice>
            <strong>Backup meeting link ready</strong>
            <p>This consultation is using a backup meeting link.</p>
            <Button
              type="button"
              $primary
              onClick={() => window.open(access.launchUrl, "_blank", "noopener,noreferrer")}
            >
              Join Now
            </Button>
          </Notice>
        ) : (
          <MeetingCard>
            <MeetingMount ref={mountRef} />
          </MeetingCard>
        )}

        {access?.participantRole === "doctor" && access?.patient?.id ? (
          <EHRPanel>
            <h2>{access.patient.name || "Patient"} EHR</h2>
            {ehrSummary ? (
              <div className="ehr-strip">
                <div><span>Allergies</span><strong>{ehrSummary.patient?.allergies?.join(", ") || "None recorded"}</strong></div>
                <div><span>Active meds</span><strong>{ehrSummary.activeMedications?.length || 0}</strong></div>
                <div><span>Files</span><strong>{ehrSummary.counts?.documents || 0}</strong></div>
                <div><span>Past notes</span><strong>{ehrSummary.counts?.encounters || 0}</strong></div>
              </div>
            ) : null}
            <PatientMedicalTimeline
              patientId={access.patient.id}
              compact
              filters={{ limit: 5, sortBy: "lastUpdatedAt" }}
            />
          </EHRPanel>
        ) : null}

        {canComplete ? (
          <FormCard onSubmit={handleComplete} noValidate>
            <h2>Post-call EHR note</h2>
            {!showCompletion ? (
              <Notice>
                <strong>Complete after the call</strong>
                This note is required once the virtual consultation ends.
              </Notice>
            ) : null}
            <Field>
              Symptoms
              <textarea
                value={ehrForm.symptoms}
                onChange={(event) => {
                  setEhrForm((current) => ({ ...current, symptoms: event.target.value }));
                  clearFieldError(setFieldErrors, "symptoms");
                }}
                placeholder="Summarize symptoms discussed during the call"
                aria-invalid={Boolean(fieldErrors.symptoms)}
              />
              <FieldError message={fieldErrors.symptoms} />
            </Field>
            <Field>
              Diagnosis
              <textarea
                value={ehrForm.diagnosis}
                onChange={(event) => {
                  setEhrForm((current) => ({ ...current, diagnosis: event.target.value }));
                  clearFieldError(setFieldErrors, "diagnosis");
                }}
                placeholder="Record diagnosis or clinical impression"
                aria-invalid={Boolean(fieldErrors.diagnosis)}
              />
              <FieldError message={fieldErrors.diagnosis} />
            </Field>
            <Field>
              Doctor notes
              <textarea
                value={ehrForm.doctorNotes}
                onChange={(event) => {
                  setEhrForm((current) => ({ ...current, doctorNotes: event.target.value }));
                  clearFieldError(setFieldErrors, "doctorNotes");
                }}
                placeholder="Add follow-up instructions and clinical comments"
                aria-invalid={Boolean(fieldErrors.doctorNotes)}
              />
              <FieldError message={fieldErrors.doctorNotes} />
            </Field>
            <Button type="submit" $primary disabled={completing}>
              {completing ? "Saving EHR note..." : "Complete consultation"}
            </Button>
          </FormCard>
        ) : null}
      </Shell>
    </Page>
  );
};

export default VirtualConsultationMeeting;
