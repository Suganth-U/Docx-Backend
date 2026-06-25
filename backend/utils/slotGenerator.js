/**
 * Generates available time slots based on doctor's schedule start/end time and interval.
 * 
 * @param {string} startTime - "HH:mm" (e.g., "09:00")
 * @param {string} endTime - "HH:mm" (e.g., "12:00")
 * @param {number} slotDuration - duration in minutes (e.g., 15)
 * @param {Array<string>} bookedSlots - array of already booked "HH:mm" strings
 * @returns {Array<{ time: string, isAvailable: boolean, tokenNumber: number }>}
 */
const generateAvailableSlots = (startTime, endTime, slotDuration, bookedSlots = []) => {
    const slots = [];

    // Convert times to minutes from midnight for easier calculation
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);

    let currentMins = startParts[0] * 60 + startParts[1];
    const endMins = endParts[0] * 60 + endParts[1];

    let tokenCounter = 1;

    while (currentMins + slotDuration <= endMins) {
        // Format current minutes back to "HH:mm"
        const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
        const m = (currentMins % 60).toString().padStart(2, '0');
        const timeString = `${h}:${m}`;

        slots.push({
            time: timeString,
            isAvailable: !bookedSlots.includes(timeString),
            tokenNumber: tokenCounter // Represents the sequential sequence number
        });

        currentMins += slotDuration;
        tokenCounter++;
    }

    return slots;
};

/**
 * Calculates the exact token number for a specific time slot given a schedule shift.
 * Useful when just a single slot string is provided without needing the full array.
 * 
 * @param {string} startTime - "HH:mm"
 * @param {number} slotDuration - minutes
 * @param {string} targetTime - "HH:mm"
 * @returns {number|null} - 1-based sequential token index
 */
const getSlotTokenNumber = (startTime, slotDuration, targetTime) => {
    const startParts = startTime.split(':').map(Number);
    const targetParts = targetTime.split(':').map(Number);

    const startMins = startParts[0] * 60 + startParts[1];
    const targetMins = targetParts[0] * 60 + targetParts[1];

    const diffMins = targetMins - startMins;

    if (diffMins < 0 || diffMins % slotDuration !== 0) {
        return null; // Invalid target time according to interval
    }

    return (diffMins / slotDuration) + 1;
};

module.exports = {
    generateAvailableSlots,
    getSlotTokenNumber
};
