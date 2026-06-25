const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Patient = require('../models/Patient');


const completeOnboarding = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    let patient = await Patient.findOne({ user_id: req.user._id });

    if (patient) {
        res.status(400);
        throw new Error('Patient profile already exists');
    }

    patient = await Patient.create({
        user_id: req.user._id,
        fullName: user.name,
        dob: req.body.dob,
        gender: req.body.gender,
        phone: req.body.phone,
        address: req.body.address,
        bloodGroup: req.body.bloodGroup,
        height: req.body.height,
        weight: req.body.weight,
        allergies: req.body.allergies || [],
        currentMedications: req.body.currentMedications || [],
        emergencyContact: req.body.emergencyContact
    });

    if (patient) {
        user.isProfileComplete = true;
        if (req.body.phone) user.phone = req.body.phone;
        if (req.body.location) user.location = req.body.address;

        await user.save();

        res.status(201).json({
            success: true,
            message: "Onboarding completed successfully",
            patient
        });
    } else {
        res.status(400);
        throw new Error('Invalid patient data');
    }
});

const getPatientProfile = asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ user_id: req.user._id });

    if (patient) {
        res.json(patient);
    } else {
        res.status(404);
        throw new Error('Patient profile not found');
    }
});

const updatePatientProfile = asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ user_id: req.user._id });

    if (patient) {
        patient.dob = req.body.dob || patient.dob;
        patient.gender = req.body.gender || patient.gender;
        patient.phone = req.body.phone || patient.phone;
        patient.address = req.body.address || patient.address;
        patient.bloodGroup = req.body.bloodGroup || patient.bloodGroup;
        patient.height = req.body.height || patient.height;
        patient.weight = req.body.weight || patient.weight;
        patient.allergies = req.body.allergies || patient.allergies;
        patient.currentMedications = req.body.currentMedications || patient.currentMedications;
        patient.emergencyContact = req.body.emergencyContact || patient.emergencyContact;

        const updatedPatient = await patient.save();
        res.json(updatedPatient);
    } else {
        res.status(404);
        throw new Error('Patient profile not found');
    }
});

module.exports = {
    completeOnboarding,
    getPatientProfile,
    updatePatientProfile
};

