const axios = require("axios");

const getZoomConfig = () => ({
    accountId: process.env.ZOOM_ACCOUNT_ID || "",
    clientId: process.env.ZOOM_CLIENT_ID || "",
    clientSecret: process.env.ZOOM_CLIENT_SECRET || "",
    userId: process.env.ZOOM_USER_ID || process.env.ZOOM_HOST_EMAIL || "me",
});

const isZoomConfigured = () => {
    const config = getZoomConfig();
    return Boolean(config.accountId && config.clientId && config.clientSecret);
};

const getZoomAccessToken = async () => {
    const config = getZoomConfig();

    if (!isZoomConfigured()) {
        throw new Error(
            "Zoom is not configured. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET."
        );
    }

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${config.accountId}`;

    const { data } = await axios.post(tokenUrl, null, {
        headers: {
            Authorization: `Basic ${credentials}`,
        },
    });

    return data.access_token;
};

const createZoomMeeting = async ({
    topic,
    agenda,
    startTime,
    durationMinutes,
}) => {
    const config = getZoomConfig();
    const accessToken = await getZoomAccessToken();

    const { data } = await axios.post(
        `https://api.zoom.us/v2/users/${encodeURIComponent(config.userId)}/meetings`,
        {
            topic,
            agenda,
            type: 2,
            start_time: new Date(startTime).toISOString(),
            duration: durationMinutes,
            timezone: process.env.TZ || "Asia/Colombo",
            settings: {
                waiting_room: true,
                host_video: true,
                participant_video: true,
                join_before_host: false,
                mute_upon_entry: true,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );

    return {
        meetingId: String(data.id || ""),
        joinUrl: data.join_url || "",
        startUrl: data.start_url || "",
        platform: "zoom",
    };
};

module.exports = {
    createZoomMeeting,
    getZoomConfig,
    isZoomConfigured,
};
