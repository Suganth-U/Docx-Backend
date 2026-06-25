const mongoose = require('mongoose');

const prescriptionRequestSchema = new mongoose.Schema({
    patientName: {
        type: String,
        required: true
    },
    age: {
        type: Number,
    },
    gender: {
        type: String,
    },
    symptoms: {
        type: String,
        required: true
    },
    history: {
        type: String
    },
    requestNotes: {
        type: String
    },
    specialist: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Issued', 'Rejected'],
        default: 'Pending'
    },
    doctorNote: {
        type: String
    },
    rejectionReason: {
        type: String
    },
    prescriptionFile: {
        type: String // URL or path to generated prescription, optional
    },
    issuedPrescriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    },
    issuedAt: {
        type: Date
    },
    pharmacyIntent: {
        source: {
            type: String,
            enum: ['', 'pharmacy_product', 'cart'],
            default: ''
        },
        returnPath: {
            type: String,
            default: ''
        },
        requestedItems: [
            {
                medicine: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Medicine',
                    required: true
                },
                medicineName: {
                    type: String,
                    required: true
                },
                category: {
                    type: String,
                    default: ''
                },
                qty: {
                    type: Number,
                    default: 1
                }
            }
        ]
    },
    requestType: {
        type: String,
        enum: ['refill', 'pharmacy_rx_item'],
        default: 'refill',
        index: true,
    },
    clinicalIntake: {
        requestType: {
            type: String,
            enum: ['refill', 'pharmacy_rx_item'],
            default: 'refill',
        },
        requestedMedicationName: {
            type: String,
            default: '',
            trim: true,
        },
        conditionOrReason: {
            type: String,
            default: '',
            trim: true,
        },
        symptomDuration: {
            type: String,
            default: '',
            trim: true,
        },
        previousDiagnosis: {
            type: String,
            default: '',
            trim: true,
        },
        previousPrescriber: {
            type: String,
            default: '',
            trim: true,
        },
        currentMedications: {
            type: String,
            default: '',
            trim: true,
        },
        allergies: {
            type: String,
            default: '',
            trim: true,
        },
        chronicConditions: {
            type: String,
            default: '',
            trim: true,
        },
        pregnancyStatus: {
            type: String,
            default: '',
            trim: true,
        },
        additionalContext: {
            type: String,
            default: '',
            trim: true,
        },
        questionAnswers: [
            {
                id: {
                    type: String,
                    default: '',
                    trim: true,
                },
                question: {
                    type: String,
                    default: '',
                    trim: true,
                },
                answer: {
                    type: String,
                    default: '',
                    trim: true,
                },
                answeredAt: {
                    type: Date,
                    default: Date.now,
                },
            }
        ],
        redFlags: [String],
        patientAttestation: {
            truthfulInfo: {
                type: Boolean,
                default: false,
            },
            notEmergency: {
                type: Boolean,
                default: false,
            },
            consentToDoctorReview: {
                type: Boolean,
                default: false,
            },
        },
    },
    aiTriage: {
        status: {
            type: String,
            enum: ['needs_more_info', 'ready_for_doctor', 'urgent_care', 'blocked'],
            default: 'needs_more_info',
            index: true,
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'blocked'],
            default: 'medium',
        },
        missingFields: [String],
        redFlags: [String],
        summaryForDoctor: {
            type: String,
            default: '',
            trim: true,
        },
        patientMessage: {
            type: String,
            default: '',
            trim: true,
        },
        questions: [
            {
                id: {
                    type: String,
                    default: '',
                    trim: true,
                },
                label: {
                    type: String,
                    default: '',
                    trim: true,
                },
                type: {
                    type: String,
                    enum: ['text', 'textarea', 'select', 'yes_no'],
                    default: 'textarea',
                },
                options: [String],
                required: {
                    type: Boolean,
                    default: true,
                },
            }
        ],
        model: {
            type: String,
            default: '',
        },
        evaluatedAt: {
            type: Date,
        },
    },
    proofFiles: [
        {
            storedName: {
                type: String,
                required: true,
            },
            originalName: {
                type: String,
                required: true,
            },
            mimeType: {
                type: String,
                required: true,
            },
            size: {
                type: Number,
                default: 0,
            },
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
        }
    ],
    auditTrail: [
        {
            action: {
                type: String,
                enum: ['intake_started', 'intake_updated', 'submitted', 'viewed', 'proof_downloaded', 'issued', 'rejected'],
                required: true,
            },
            actor: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            actorRole: {
                type: String,
                enum: ['patient', 'doctor', 'admin', 'system'],
                default: 'system',
            },
            note: {
                type: String,
                default: '',
                trim: true,
            },
            ip: {
                type: String,
                default: '',
            },
            userAgent: {
                type: String,
                default: '',
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }
    ],
    statusHistory: [
        {
            status: {
                type: String,
                enum: ['Pending', 'Issued', 'Rejected'],
                required: true
            },
            note: {
                type: String
            },
            changedByRole: {
                type: String,
                enum: ['patient', 'doctor', 'system'],
                default: 'system'
            },
            changedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

prescriptionRequestSchema.pre('save', function () {
    if (!this.statusHistory || this.statusHistory.length === 0) {
        this.statusHistory = [
            {
                status: this.status || 'Pending',
                note: 'Request submitted',
                changedByRole: 'patient',
                changedAt: this.createdAt || new Date()
            }
        ];
    }
    this.updatedAt = new Date();
});

prescriptionRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
prescriptionRequestSchema.index({ patientId: 1, createdAt: -1 });
prescriptionRequestSchema.index({ specialist: 1, status: 1, createdAt: -1 });
prescriptionRequestSchema.index({ requestType: 1, 'aiTriage.status': 1, createdAt: -1 });

module.exports = mongoose.model('PrescriptionRequest', prescriptionRequestSchema);
