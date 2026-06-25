const {
    sendAdminTemplatedEmail,
    sendTemplatedEmail,
} = require('../utils/email/dispatcher');
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const Order = require("../models/Order");
const PrescriptionRequest = require("../models/PrescriptionRequest");
const {
    buildPaymentPayload,
    isPayHereConfigured,
    mapPayHereStatus,
    verifyPayHereNotification,
} = require("../utils/payhere");
const {
    assertPayPalCaptureMatches,
    assertStripeSessionMatches,
    capturePayPalOrder,
    createPayPalOrder,
    createStripeCheckoutSession,
    isPayPalConfigured,
    isStripeConfigured,
    retrieveStripeCheckoutSession,
} = require("../utils/paymentGateways");
const { normalizePublicPath, toAbsoluteUrl } = require("../utils/storagePaths");

const parseAmount = (value) => Number(Number(value || 0).toFixed(2));
const normalizeId = (value) => String(value?._id || value || "").trim();
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(normalizeId(value));
const normalizePrescriptionUpload = (value = {}) => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const fileName = String(value.fileName || value.name || "").trim();
    if (!fileName) {
        return null;
    }

    const uploadedAt = value.uploadedAt ? new Date(value.uploadedAt) : new Date();

    return {
        source: String(value.source || "patient_upload").trim(),
        fileName,
        fileType: String(value.fileType || value.type || "").trim(),
        fileSize: Math.max(0, Number(value.fileSize ?? value.size ?? 0) || 0),
        uploadedAt: Number.isNaN(uploadedAt.getTime()) ? new Date() : uploadedAt,
        fileUrl: String(value.fileUrl || value.url || "").trim(),
        storageName: String(value.storageName || value.filename || "").trim(),
        patientName: String(value.patientName || value.fullName || "").trim(),
        patientPhone: String(value.patientPhone || value.mobileNumber || "").trim(),
        notes: String(value.notes || "").trim(),
    };
};
const hasUploadedPrescriptionProof = (item = {}) => {
    const upload = normalizePrescriptionUpload(item.prescriptionUpload);
    return Boolean(upload?.fileName && (upload.fileUrl || upload.storageName));
};

const ensurePatientOrderSession = (req, res) => {
    if (req.user?.role === "patient") {
        return;
    }

    res.status(403);
    throw new Error("Please sign in with a patient account to continue checkout.");
};

const normalizeOrderItems = (orderItems = []) =>
    orderItems.map((item) => ({
        name: item.name,
        qty: Number(item.qty || 1),
        image: item.image,
        price: parseAmount(item.price),
        medicine: item.medicine || item.medicineId,
        prescriptionRequest: item.prescriptionRequest || item.prescriptionRequestId,
        prescription: item.prescription || item.prescriptionId,
        prescriptionUpload: normalizePrescriptionUpload(item.prescriptionUpload),
    }));

const validateOrderPayload = (payload = {}) => {
    const orderItems = normalizeOrderItems(payload.orderItems || []);

    if (!orderItems.length) {
        return { error: "No order items" };
    }

    const hasInvalidItem = orderItems.some((item) =>
        !item.name ||
        !item.image ||
        !item.medicine ||
        !isObjectId(item.medicine) ||
        !item.price ||
        !item.qty
    );

    if (hasInvalidItem) {
        return { error: "Each order item must include medicine, name, image, price and quantity" };
    }

    const fullName = payload.fullName || payload.contact?.fullName || "";
    const email = payload.email || payload.contact?.email || "";
    const phone = payload.phone || payload.contact?.phone || "";
    const shippingAddress = {
        addressLine1: payload.shippingAddress?.addressLine1 || "",
        addressLine2: payload.shippingAddress?.addressLine2 || "",
        city: payload.shippingAddress?.city || "",
        postalCode: payload.shippingAddress?.postalCode || "",
        country: payload.shippingAddress?.country || "Sri Lanka",
        deliveryNotes: payload.shippingAddress?.deliveryNotes || "",
    };

    if (!fullName || !email || !phone) {
        return { error: "Full name, email and phone are required" };
    }

    if (!shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode) {
        return { error: "Complete shipping details are required" };
    }

    const itemsPrice = parseAmount(
        orderItems.reduce((total, item) => total + item.price * item.qty, 0)
    );
    const shippingPrice = parseAmount(payload.shippingPrice);
    const taxPrice = parseAmount(payload.taxPrice);
    const totalPrice = parseAmount(payload.totalPrice);
    const expectedTotal = parseAmount(itemsPrice + shippingPrice + taxPrice);

    if (Math.abs(itemsPrice - parseAmount(payload.itemsPrice)) > 0.01) {
        return { error: "Items total does not match server calculation" };
    }

    if (Math.abs(expectedTotal - totalPrice) > 0.01) {
        return { error: "Order total does not match server calculation" };
    }

    return {
        orderItems,
        fullName,
        email,
        phone,
        shippingAddress,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
    };
};

const validatePrescriptionLinkedItems = async ({ orderItems = [], userId }) => {
    const medicineIds = [...new Set(orderItems.map((item) => normalizeId(item.medicine)).filter(Boolean))];

    if (!medicineIds.length) {
        return null;
    }

    const prescriptionMedicines = await Medicine.find({
        _id: { $in: medicineIds },
        requiresPrescription: true,
    })
        .select("_id name")
        .lean();
    const rxMedicineMap = new Map(
        prescriptionMedicines.map((medicine) => [String(medicine._id), medicine])
    );
    const rxItems = orderItems.filter((item) => rxMedicineMap.has(normalizeId(item.medicine)));

    if (!rxItems.length) {
        return null;
    }

    const missingLinkedPrescription = rxItems.find((item) => {
        if (hasUploadedPrescriptionProof(item)) {
            return false;
        }

        return !isObjectId(item.prescriptionRequest) || !isObjectId(item.prescription);
    });

    if (missingLinkedPrescription) {
        const medicine = rxMedicineMap.get(normalizeId(missingLinkedPrescription.medicine));
        return `${medicine?.name || missingLinkedPrescription.name} requires a prescription upload or an issued DocX prescription before checkout`;
    }

    const linkedRxItems = rxItems.filter((item) => !hasUploadedPrescriptionProof(item));

    if (!linkedRxItems.length) {
        return null;
    }

    if (!userId) {
        return "Issued DocX prescriptions require a signed-in patient account before checkout";
    }

    const requestIds = [...new Set(linkedRxItems.map((item) => normalizeId(item.prescriptionRequest)))];
    const requests = await PrescriptionRequest.find({
        _id: { $in: requestIds },
        userId,
        status: "Issued",
    })
        .select("_id userId status issuedPrescriptionId pharmacyIntent")
        .lean();
    const requestMap = new Map(requests.map((request) => [String(request._id), request]));

    const invalidLinkedPrescription = linkedRxItems.find((item) => {
        const request = requestMap.get(normalizeId(item.prescriptionRequest));
        const medicineId = normalizeId(item.medicine);
        const prescriptionId = normalizeId(item.prescription);

        if (!request) return true;
        if (normalizeId(request.issuedPrescriptionId) !== prescriptionId) return true;

        return !(request.pharmacyIntent?.requestedItems || []).some(
            (requestedItem) => normalizeId(requestedItem.medicine) === medicineId
        );
    });

    if (invalidLinkedPrescription) {
        const medicine = rxMedicineMap.get(normalizeId(invalidLinkedPrescription.medicine));
        return `${medicine?.name || invalidLinkedPrescription.name} is not linked to a valid issued prescription request for this patient`;
    }

    return null;
};

const getPrescriptionItemsForOrder = async (orderItems = []) => {
    const medicineIds = orderItems.map((item) => item.medicine).filter(Boolean);

    if (!medicineIds.length) {
        return [];
    }

    const prescriptionMedicines = await Medicine.find({
        _id: { $in: medicineIds },
        requiresPrescription: true,
    })
        .select("_id")
        .lean();

    const rxIdSet = new Set(prescriptionMedicines.map((medicine) => String(medicine._id)));

    return orderItems.filter((item) => rxIdSet.has(String(item.medicine)));
};

const sendOrderCreationEmails = async (order, fullName, email) => {
    await sendTemplatedEmail({
        eventKey: 'PHARMACY_ORDER_PLACED',
        recipient: email || order.email,
        data: { patientName: fullName || order.fullName, orderId: order._id.toString() },
        dedupeKey: `order-placed:${order._id}`,
        relatedEntity: order._id,
        relatedEntityModel: 'Order',
        category: 'transactional'
    });

    const prescriptionItems = await getPrescriptionItemsForOrder(order.orderItems || []);

    if (prescriptionItems.length) {
        await sendAdminTemplatedEmail({
            eventKey: 'PHARMACY_VERIFICATION_NEEDED',
            data: {
                patientName: fullName || order.fullName,
                orderId: order._id.toString(),
                items: prescriptionItems.map((item) => ({
                    name: item.name,
                    qty: item.qty,
                })),
            },
            dedupeKey: `order-rx-verification:${order._id}`,
            relatedEntity: order._id,
            relatedEntityModel: 'Order',
            category: 'system',
        });
    }
};

const assertOrderOwner = (order, req) => {
    const ownerId = normalizeId(order.user);
    const requesterId = normalizeId(req.user);
    const requesterRole = req.user?.role;

    if (ownerId && requesterRole !== "admin" && ownerId !== requesterId) {
        const error = new Error("Please sign in with the patient account that created this order.");
        error.statusCode = 401;
        throw error;
    }
};

const markOrderPaid = async (order, paymentUpdate = {}) => {
    if (order.paymentStatus === "paid" && order.isPaid) {
        return order;
    }

    order.isPaid = true;
    order.paymentStatus = "paid";
    order.paidAt = new Date();
    order.paymentProvider = paymentUpdate.paymentProvider || order.paymentProvider;
    order.gatewayOrderId = paymentUpdate.gatewayOrderId || order.gatewayOrderId;
    order.paymentResult = paymentUpdate.paymentResult || order.paymentResult;

    const updatedOrder = await order.save();

    await sendTemplatedEmail({
        eventKey: 'PHARMACY_PAYMENT_CONFIRMED',
        recipient: updatedOrder.email,
        data: { patientName: updatedOrder.fullName || 'Valued Customer', orderId: updatedOrder._id.toString(), totalPrice: updatedOrder.totalPrice },
        dedupeKey: `order-paid:${updatedOrder._id}:${paymentUpdate.paymentResult?.id || paymentUpdate.gatewayOrderId || "gateway"}`,
        relatedEntity: updatedOrder._id,
        relatedEntityModel: 'Order',
        category: 'transactional'
    });

    return updatedOrder;
};

const markOrderPaymentFailed = async (order, paymentStatus, paymentResult = {}) => {
    order.isPaid = false;
    order.paymentStatus = paymentStatus;
    order.paymentProvider = paymentResult.paymentProvider || order.paymentProvider;
    order.gatewayOrderId = paymentResult.gatewayOrderId || order.gatewayOrderId;
    order.paymentResult = paymentResult.paymentResult || order.paymentResult;
    await order.save();

    await sendTemplatedEmail({
        eventKey: 'PHARMACY_PAYMENT_FAILED',
        recipient: order.email,
        data: {
            patientName: order.fullName || 'Valued Customer',
            orderId: order._id.toString(),
            statusLabel: paymentStatus,
        },
        dedupeKey: `order-payment-failed:${order._id}:${paymentStatus}:${paymentResult.gatewayOrderId || "gateway"}`,
        relatedEntity: order._id,
        relatedEntityModel: 'Order',
        category: 'transactional'
    });

    return order;
};

const addOrderItems = asyncHandler(async (req, res) => {
    ensurePatientOrderSession(req, res);

    const validated = validateOrderPayload(req.body);

    if (validated.error) {
        res.status(400);
        throw new Error(validated.error);
    }

    const prescriptionError = await validatePrescriptionLinkedItems({
        orderItems: validated.orderItems,
        userId: req.user?._id,
    });

    if (prescriptionError) {
        res.status(400);
        throw new Error(prescriptionError);
    }

    const isDemo = req.body.paymentMethod === "DEMO";

    const order = new Order({
        ...validated,
        ...(req.user?._id ? { user: req.user._id } : {}),
        paymentMethod: req.body.paymentMethod || "COD",
        paymentProvider: isDemo ? "DEMO" : "COD",
        paymentStatus: isDemo ? "paid" : "pending",
        currency: req.body.currency || "LKR",
    });

    const createdOrder = await order.save();

    await sendOrderCreationEmails(createdOrder, validated.fullName, validated.email);

    res.status(201).json(createdOrder);
});

const uploadPrescriptionProof = asyncHandler(async (req, res) => {
    ensurePatientOrderSession(req, res);

    if (!req.file) {
        res.status(400);
        throw new Error("Please upload a prescription image or PDF.");
    }

    const publicPath = normalizePublicPath(req.file.path);
    const prescriptionUpload = normalizePrescriptionUpload({
        source: "patient_upload",
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedAt: new Date(),
        fileUrl: toAbsoluteUrl(req, publicPath),
        storageName: req.file.filename,
        patientName: req.body.patientName,
        patientPhone: req.body.patientPhone,
        notes: req.body.notes,
    });

    res.status(201).json({
        prescriptionUpload,
    });
});

const createPayHereSession = asyncHandler(async (req, res) => {
    ensurePatientOrderSession(req, res);

    if (!isPayHereConfigured()) {
        res.status(503);
        throw new Error(
            "Secure online payment is not available right now. Please try another payment option or contact support."
        );
    }

    const validated = validateOrderPayload(req.body);

    if (validated.error) {
        res.status(400);
        throw new Error(validated.error);
    }

    const prescriptionError = await validatePrescriptionLinkedItems({
        orderItems: validated.orderItems,
        userId: req.user?._id,
    });

    if (prescriptionError) {
        res.status(400);
        throw new Error(prescriptionError);
    }

    const order = await Order.create({
        ...validated,
        ...(req.user?._id ? { user: req.user._id } : {}),
        paymentMethod: "CARD",
        paymentProvider: "PAYHERE",
        paymentStatus: "pending",
        currency: req.body.currency || "LKR",
    });

    await sendOrderCreationEmails(order, validated.fullName, validated.email);

    const payment = buildPaymentPayload({
        order,
        fullName: validated.fullName,
        email: validated.email,
        phone: validated.phone,
        shippingAddress: validated.shippingAddress,
        frontendOrigin: req.get("origin") || req.body.origin || "",
    });

    res.status(201).json({
        orderId: order._id,
        payment,
    });
});

const createGatewayOrder = async (req, provider) => {
    const validated = validateOrderPayload(req.body);

    if (validated.error) {
        const error = new Error(validated.error);
        error.statusCode = 400;
        throw error;
    }

    const prescriptionError = await validatePrescriptionLinkedItems({
        orderItems: validated.orderItems,
        userId: req.user?._id,
    });

    if (prescriptionError) {
        const error = new Error(prescriptionError);
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.create({
        ...validated,
        ...(req.user?._id ? { user: req.user._id } : {}),
        paymentMethod: "ONLINE",
        paymentProvider: provider,
        paymentStatus: "pending",
        currency: req.body.currency || "LKR",
    });

    await sendOrderCreationEmails(order, validated.fullName, validated.email);

    return { order, validated };
};

const createStripeSession = asyncHandler(async (req, res) => {
    ensurePatientOrderSession(req, res);

    if (!isStripeConfigured()) {
        res.status(503);
        throw new Error("Stripe checkout is not configured. Add STRIPE_SECRET_KEY on the server.");
    }

    const { order, validated } = await createGatewayOrder(req, "STRIPE");
    const session = await createStripeCheckoutSession({
        targetType: "order",
        targetId: order._id,
        amount: order.totalPrice,
        currency: order.currency,
        label:
            order.orderItems.length === 1
                ? order.orderItems[0].name
                : `DocX Pharmacy order (${order.orderItems.length} items)`,
        customerEmail: validated.email,
        successPath: `/orders/${order._id}`,
        cancelPath: "/checkout",
        frontendOrigin: req.get("origin") || req.body.origin || "",
        metadata: {
            patientId: String(req.user?._id || ""),
        },
    });

    order.gatewayOrderId = session.id;
    order.paymentResult = {
        id: session.id,
        status: "pending",
        update_time: new Date().toISOString(),
        method: "stripe_checkout",
        status_message: "Stripe Checkout session created",
        secureHash: session.secureHash,
        checkoutUrl: session.checkoutUrl,
    };
    await order.save();

    res.status(201).json({
        orderId: order._id,
        provider: "STRIPE",
        checkoutUrl: session.checkoutUrl,
        sessionId: session.id,
    });
});

const verifyStripeSession = asyncHandler(async (req, res) => {
    ensurePatientOrderSession(req, res);

    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    assertOrderOwner(order, req);

    const sessionId = req.body.sessionId || req.query.session_id;
    if (!sessionId || String(sessionId) !== String(order.gatewayOrderId)) {
        res.status(400);
        throw new Error("Stripe checkout session does not match this order.");
    }

    const session = await retrieveStripeCheckoutSession(sessionId);
    assertStripeSessionMatches({
        session,
        targetType: "order",
        targetId: order._id,
        amount: order.totalPrice,
        currency: order.currency,
        secureHash: order.paymentResult?.secureHash,
    });

    if (session.payment_status === "paid") {
        const updatedOrder = await markOrderPaid(order, {
            paymentProvider: "STRIPE",
            gatewayOrderId: session.id,
            paymentResult: {
                id: session.id,
                status: "paid",
                update_time: new Date().toISOString(),
                email_address: session.customer_details?.email || order.email,
                method: "stripe_checkout",
                status_message: "Stripe Checkout payment verified",
                secureHash: order.paymentResult?.secureHash,
            },
        });
        res.json(updatedOrder);
        return;
    }

    if (["expired", "complete"].includes(session.status) && session.payment_status !== "paid") {
        await markOrderPaymentFailed(order, session.status === "expired" ? "canceled" : "failed", {
            paymentProvider: "STRIPE",
            gatewayOrderId: session.id,
            paymentResult: {
                id: session.id,
                status: session.payment_status || session.status,
                update_time: new Date().toISOString(),
                method: "stripe_checkout",
                status_message: "Stripe Checkout payment was not completed",
                secureHash: order.paymentResult?.secureHash,
            },
        });
    }

    res.json(order);
});

const createPayPalSession = asyncHandler(async (req, res) => {
    ensurePatientOrderSession(req, res);

    if (!isPayPalConfigured()) {
        res.status(503);
        throw new Error("PayPal checkout is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the server.");
    }

    const { order } = await createGatewayOrder(req, "PAYPAL");
    const paypalOrder = await createPayPalOrder({
        targetType: "order",
        targetId: order._id,
        amount: order.totalPrice,
        currency: order.currency,
        label:
            order.orderItems.length === 1
                ? order.orderItems[0].name
                : `DocX Pharmacy order (${order.orderItems.length} items)`,
        returnPath: `/orders/${order._id}`,
        cancelPath: "/checkout",
        frontendOrigin: req.get("origin") || req.body.origin || "",
    });

    order.gatewayOrderId = paypalOrder.id;
    order.paymentResult = {
        id: paypalOrder.id,
        status: "pending",
        update_time: new Date().toISOString(),
        method: "paypal",
        status_message: "PayPal order created",
        secureHash: paypalOrder.secureHash,
        checkoutUrl: paypalOrder.approvalUrl,
    };
    await order.save();

    res.status(201).json({
        orderId: order._id,
        provider: "PAYPAL",
        paypalOrderId: paypalOrder.id,
        approvalUrl: paypalOrder.approvalUrl,
    });
});

const capturePayPalPayment = asyncHandler(async (req, res) => {
    ensurePatientOrderSession(req, res);

    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    assertOrderOwner(order, req);

    if (order.paymentStatus === "paid" && order.isPaid) {
        res.json(order);
        return;
    }

    const paypalOrderId = req.body.paypalOrderId || req.body.token || req.query.token;
    if (!paypalOrderId || String(paypalOrderId) !== String(order.gatewayOrderId)) {
        res.status(400);
        throw new Error("PayPal order does not match this DocX order.");
    }

    const capture = await capturePayPalOrder(paypalOrderId);
    assertPayPalCaptureMatches({
        capture,
        targetId: order._id,
        amount: order.totalPrice,
        currency: order.currency,
        secureHash: order.paymentResult?.secureHash,
    });

    const paypalCapture = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const updatedOrder = await markOrderPaid(order, {
        paymentProvider: "PAYPAL",
        gatewayOrderId: paypalOrderId,
        paymentResult: {
            id: paypalCapture?.id || paypalOrderId,
            status: "paid",
            update_time: paypalCapture?.update_time || new Date().toISOString(),
            email_address: capture.payer?.email_address || order.email,
            method: "paypal",
            status_message: "PayPal payment captured",
            secureHash: order.paymentResult?.secureHash,
        },
    });

    res.json(updatedOrder);
});

const notifyPayHerePayment = asyncHandler(async (req, res) => {
    if (!verifyPayHereNotification(req.body)) {
        res.status(400).send("invalid signature");
        return;
    }

    const order = await Order.findById(req.body.order_id);

    if (!order) {
        res.status(404).send("order not found");
        return;
    }

    const paymentStatus = mapPayHereStatus(req.body.status_code);
    order.paymentProvider = "PAYHERE";
    order.paymentStatus = paymentStatus;
    order.gatewayOrderId = req.body.payment_id || order.gatewayOrderId;
    order.paymentResult = {
        id: req.body.payment_id,
        status: paymentStatus,
        update_time: new Date().toISOString(),
        email_address: order.email,
        method: req.body.method,
        status_message: req.body.status_message,
    };

    if (paymentStatus === "paid") {
        order.isPaid = true;
        order.paidAt = new Date();

        // 📧 Payment Confirmed
        await sendTemplatedEmail({
            eventKey: 'PHARMACY_PAYMENT_CONFIRMED',
            recipient: order.email || req.body.email_address,
            data: { patientName: order.fullName || 'Valued Customer', orderId: order._id.toString(), totalPrice: order.totalPrice },
            dedupeKey: `order-paid:${order._id}:${paymentStatus}`,
            relatedEntity: order._id,
            relatedEntityModel: 'Order',
            category: 'transactional'
        });

    } else if (["failed", "canceled", "chargedback"].includes(paymentStatus)) {
        order.isPaid = false;

        await sendTemplatedEmail({
            eventKey: 'PHARMACY_PAYMENT_FAILED',
            recipient: order.email || req.body.email_address,
            data: {
                patientName: order.fullName || 'Valued Customer',
                orderId: order._id.toString(),
                statusLabel: paymentStatus,
            },
            dedupeKey: `order-payment-failed:${order._id}:${paymentStatus}`,
            relatedEntity: order._id,
            relatedEntityModel: 'Order',
            category: 'transactional'
        });
    }

    await order.save();
    res.status(200).send("ok");
});

const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    const ownerId = normalizeId(order.user);
    const requesterId = normalizeId(req.user);
    const requesterRole = req.user?.role;

    if (ownerId && requesterRole !== "admin" && ownerId !== requesterId) {
        res.status(401);
        throw new Error("Please sign in to view this order.");
    }

    res.json(order);
});

const updateOrderToPaid = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isPaid = true;
        order.paymentStatus = "paid";
        order.paidAt = Date.now();
        order.paymentProvider = req.body.provider || order.paymentProvider || "MANUAL";
        order.paymentResult = {
            id: req.body.id,
            status: req.body.status || "paid",
            update_time: req.body.update_time,
            email_address: req.body.email_address || order.email,
            method: req.body.method || order.paymentProvider,
            status_message: req.body.status_message,
        };

        const updatedOrder = await order.save();

        // 📧 Payment Confirmed Manual
        await sendTemplatedEmail({
            eventKey: 'PHARMACY_PAYMENT_CONFIRMED',
            recipient: updatedOrder.email,
            data: { patientName: updatedOrder.fullName || 'Valued Customer', orderId: updatedOrder._id.toString(), totalPrice: updatedOrder.totalPrice },
            dedupeKey: `order-paid:${updatedOrder._id}:manual`,
            relatedEntity: updatedOrder._id,
            relatedEntityModel: 'Order',
            category: 'transactional'
        });

        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error("Order not found");
    }
});

const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
});

module.exports = {
    addOrderItems,
    capturePayPalPayment,
    uploadPrescriptionProof,
    createPayPalSession,
    createPayHereSession,
    createStripeSession,
    notifyPayHerePayment,
    getOrderById,
    markOrderPaid,
    markOrderPaymentFailed,
    updateOrderToPaid,
    verifyStripeSession,
    getMyOrders,
};
