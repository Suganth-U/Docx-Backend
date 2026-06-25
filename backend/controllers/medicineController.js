const asyncHandler = require('express-async-handler');
const Medicine = require('../models/Medicine');
const Notification = require('../models/Notification');

const normalizeCatalogKeyPart = (value) =>
    String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const getMedicineCatalogKey = (medicine = {}) =>
    [
        medicine.name,
        medicine.category,
        medicine.manufacturer,
        Number(medicine.price || 0).toFixed(2),
    ]
        .map(normalizeCatalogKeyPart)
        .join('|');

const dedupeMedicineCatalog = (medicines = []) => {
    const uniqueMedicines = new Map();

    medicines.forEach((medicine) => {
        const key = getMedicineCatalogKey(medicine);
        if (!uniqueMedicines.has(key)) {
            uniqueMedicines.set(key, medicine);
        }
    });

    return [...uniqueMedicines.values()];
};

const getMedicines = asyncHandler(async (req, res) => {
    const medicines = await Medicine.find({}).sort({ name: 1, updatedAt: -1 });
    res.json(dedupeMedicineCatalog(medicines));
});

const getMedicineById = asyncHandler(async (req, res) => {
    const medicine = await Medicine.findById(req.params.id);

    if (medicine) {
        res.json(medicine);
    } else {
        res.status(404);
        throw new Error('Medicine not found');
    }
});


const deleteMedicine = asyncHandler(async (req, res) => {
    const medicine = await Medicine.findById(req.params.id);

    if (medicine) {
        await medicine.deleteOne();
        res.json({ message: 'Medicine removed' });
    } else {
        res.status(404);
        throw new Error('Medicine not found');
    }
});

const createMedicine = asyncHandler(async (req, res) => {
    const {
        name,
        price,
        description,
        image,
        category,
        manufacturer,
        stock,
        requiresPrescription,
        isHighRisk,
        restrictedPrescriptionCategory,
        reorderLevel,
        reorderQuantity,
    } = req.body;

    const medicine = new Medicine({
        name,
        price,
        description,
        image,
        category,
        manufacturer,
        stock,
        requiresPrescription: requiresPrescription || false,
        isHighRisk: Boolean(isHighRisk),
        restrictedPrescriptionCategory: restrictedPrescriptionCategory || '',
        reorderLevel: reorderLevel || 50,
        reorderQuantity: reorderQuantity || 100,
    });

    const createdMedicine = await medicine.save();

    const threshold = reorderLevel || 50;
    if (stock <= threshold) {
        await Notification.create({
            type: 'LOW_STOCK_ALERT',
            title: 'Low Stock Alert',
            message: `${name} is low on stock (${stock} remaining). Reorder level: ${threshold}.`,
            link: '/admin/pharmacy'
        });
    }

    res.status(201).json(createdMedicine);
});


const updateMedicine = asyncHandler(async (req, res) => {
    const {
        name,
        price,
        description,
        image,
        category,
        manufacturer,
        stock,
        requiresPrescription,
        isHighRisk,
        restrictedPrescriptionCategory,
        reorderLevel,
        reorderQuantity,
    } = req.body;

    const medicine = await Medicine.findById(req.params.id);

    if (medicine) {
        medicine.name = name ?? medicine.name;
        medicine.price = price ?? medicine.price;
        medicine.description = description ?? medicine.description;
        medicine.image = image ?? medicine.image;
        medicine.category = category ?? medicine.category;
        medicine.manufacturer = manufacturer ?? medicine.manufacturer;
        medicine.stock = stock ?? medicine.stock;
        medicine.requiresPrescription = requiresPrescription ?? medicine.requiresPrescription;
        medicine.isHighRisk = isHighRisk ?? medicine.isHighRisk;
        medicine.restrictedPrescriptionCategory = restrictedPrescriptionCategory ?? medicine.restrictedPrescriptionCategory;
        medicine.reorderLevel = reorderLevel ?? medicine.reorderLevel;
        medicine.reorderQuantity = reorderQuantity ?? medicine.reorderQuantity;

        const updatedMedicine = await medicine.save();

        if (updatedMedicine.stock <= updatedMedicine.reorderLevel) {
            await Notification.create({
                type: 'LOW_STOCK_ALERT',
                title: 'Low Stock Alert',
                message: `${updatedMedicine.name} is low on stock (${updatedMedicine.stock} remaining). Reorder level: ${updatedMedicine.reorderLevel}.`,
                link: '/admin/pharmacy'
            });
        }

        res.json(updatedMedicine);
    } else {
        res.status(404);
        throw new Error('Medicine not found');
    }
});

module.exports = {
    getMedicines,
    getMedicineById,
    deleteMedicine,
    createMedicine,
    updateMedicine,
};
