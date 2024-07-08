const express = require("express");
const wretch = require("wretch");
const cron = require("node-cron");
require('dotenv').config();

const app = express();
const port = 3000;

const apiToken = process.env.API_KEY;
const inverterId = process.env.INVERTER_ID;

const batteryReserve = 60; // 60% battery reserve while discharging
const mainBatteryReserve = 6; // 6% battery reserve while not discharging
const ecoMode = false; // Eco Mode disabled


const inverterRequest = wretch(`https://api.givenergy.cloud/v1/inverter/${inverterId}`)
    .auth(`Bearer ${apiToken}`)
    .content("application/json")
    .accept("application/json");

const post_request = (path, data = {}) => inverterRequest.url(path).post(data).json();
const get_request = (path) => inverterRequest.url(path).get().json();

let latestResults = [];

const settingsMap = {
    24: "Eco Mode",
    53: "DC Discharge Start Time",
    54: "DC Discharge End Time",
    56: "DC Discharge Enable",
    71: "Battery Reserve Limit"
};

async function setSetting(settingId, value) {
    const context = "Power Grid Automation";
    await post_request(`/settings/${settingId}/write`, { value, context });
    const settingName = settingsMap[settingId] || `Setting ${settingId}`;
    return `${settingName} updated to ${value}`;
}


async function getSetting(settingId) {
    const response = await post_request(`/settings/${settingId}/read`, { "context": "Power Grid Automation" });
    if (typeof response === 'object' && response !== null && 'data' in response) {
        return response.data.value;
    } else {
        throw new Error("Invalid response format");
    }
}

async function getBatteryStatus() {
    const response = await get_request("/system-data/latest");
    if (typeof response === 'object' && response !== null && 'data' in response) {
        return response.data.battery.percent;
    } else {
        throw new Error("Invalid response format");
    }
}

function isWithinDischargeTime(currentTime, startTime, endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const start = new Date(currentTime);
    start.setHours(startHour, startMinute, 0);
    const end = new Date(currentTime);
    end.setHours(endHour, endMinute, 0);
    console.log("Start Time: ", start, "End Time: ", end, "Current Time: ", currentTime, "Current Time: ", currentTime >= start && currentTime <= end)

    return currentTime >= start && currentTime <= end;
}

async function updateSettings(updateType) {
    let results = [];

    const currentSettings = {
        ecoMode: await getSetting(24),
        dcDischargeStartTime: await getSetting(53),
        dcDischargeEndTime: await getSetting(54),
        dcDischargeEnable: await getSetting(56),
        batteryReserveLimit: await getSetting(71)
    };

    const currentTime = new Date();
    const dischargeStartTime = "16:00";
    const dischargeEndTime = "19:00";

    results.push(`Executed time: ${currentTime.toISOString()}`);

    const batteryPercentage = await getBatteryStatus();
    results.push(`Current battery percentage: ${batteryPercentage}%`);

    if (batteryPercentage > batteryReserve && isWithinDischargeTime(currentTime, dischargeStartTime, dischargeEndTime)) {
        if (currentSettings.dcDischargeEnable == false) {
            results.push(await setSetting(56, true));  // Enable DC Discharge
        }
        if (currentSettings.ecoMode == true) {
            results.push(await setSetting(24, false));   // Disable Eco Mode
        }
        if (currentSettings.batteryReserveLimit !== batteryReserve) {
            results.push(await setSetting(71, batteryReserve));      // Set Battery Reserve % Limit to batteryReserve
        }
    } else {

        if (currentSettings.dcDischargeEnable == true) {
            results.push(await setSetting(56, false));
            results.push(await setSetting(24, ecoMode));
            results.push(await setSetting(71, mainBatteryReserve));
        }
    }

    // Additional logic to handle dynamic changes based on conditions
    results.push(`Update Type: ${updateType}`);

    latestResults = results;
    console.log(results);
    return results;
}

function formatResponse(results) {
    return {
        status: "success",
        timestamp: new Date().toISOString(),
        results: results.map((result, index) => ({
            step: index + 1,
            message: result
        }))
    };
}

// Schedule the updateSettings function to run every 15 minutes
cron.schedule("*/15 * * * *", async () => {
    console.log("Running scheduled settings update...");
    await updateSettings("Scheduled");
});

app.get('/update-settings', async (req, res) => {
    try {
        const results = await updateSettings("Manual");
        res.json(formatResponse(results));
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            res.status(500).json({ status: "error", message: "An error occurred while updating settings.", details: error.message });
        } else {
            res.status(500).json({ status: "error", message: "An unknown error occurred." });
        }
    }
});

app.get('/latest-results', (req, res) => {
    res.json(formatResponse(latestResults));
});

app.get("/kill", async (req, res) => {
    res.json({ status: "success", message: "Server shutting down..." });
    await setSetting(24, true);
    await setSetting(56, false);
    await setSetting(71, 6);
    console.log("kill command received, shutting down server...");
    process.exit();
});

app.get('/setting/:id', async (req, res) => {
    const settingId = parseInt(req.params.id);
    try {
        const currentValue = await getSetting(settingId);
        res.json({ status: "success", setting: settingsMap[settingId] || `Setting ${settingId}`, currentValue });
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            res.status(500).json({ status: "error", message: "An error occurred while retrieving the setting.", details: error.message });
        } else {
            res.status(500).json({ status: "error", message: "An unknown error occurred." });
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
