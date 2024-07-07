# GivEnergy Inverter Automation

## Overview

This program automates the management of GivEnergy inverter settings. It uses the GivEnergy API to fetch current inverter settings and battery status, then adjusts settings based on predefined criteria. The program runs on an Express server and uses Node-Cron for scheduling tasks.

## Features

- **Scheduled Updates**: Automatically updates inverter settings every 15 minutes.
- **Manual Updates**: Allows manual updates via a web endpoint.
- **Status Reporting**: Provides the latest results of the automated or manual updates.
- **Individual Setting Retrieval**: Fetches the current value of a specific inverter setting.
- **Server Shutdown**: Gracefully shuts down the server and resets inverter settings.

## Requirements

- Node.js
- Express
- Wretch
- Node-Cron
- Dotenv

## Installation

1. **Clone the repository:**

    ```sh
    git clone <repository_url>
    cd <repository_folder>
    ```

2. **Install dependencies:**

    ```sh
    npm install
    ```

3. **Set up environment variables:**

    Create a `.env` file in the root directory with the following content:

    ```env
    API_KEY=your_api_key_here
    ```

## Usage

1. **Start the server:**

    ```sh
    node index.js
    ```

2. **Access endpoints:**

    - **Manual update of settings:**

        ```sh
        GET http://localhost:3000/update-settings
        ```

    - **Retrieve latest update results:**

        ```sh
        GET http://localhost:3000/latest-results
        ```

    - **Retrieve a specific setting:**

        ```sh
        GET http://localhost:3000/setting/:id
        ```

        Replace `:id` with the setting ID you wish to retrieve (e.g., 24, 53, 54, 56, 71).

    - **Shut down the server:**

        ```sh
        GET http://localhost:3000/kill
        ```

## Modifying the Scheduled Update Time

The scheduled update is controlled by Node-Cron and is set to run every 15 minutes. To change the schedule:

1. **Open `index.js` file.**

2. **Locate the cron schedule setup:**

    ```javascript
    cron.schedule("*/15 * * * *", async () => {
        console.log("Running scheduled settings update...");
        await updateSettings("Scheduled");
    });
    ```

3. **Modify the schedule expression** according to the [cron syntax](https://crontab.guru/):

    ```javascript
    cron.schedule("new_cron_expression", async () => {
        console.log("Running scheduled settings update...");
        await updateSettings("Scheduled");
    });
    ```

## Error Handling

- **Update Settings Endpoint**: If an error occurs while updating settings, a JSON response with the error message and details is returned.
- **Retrieve Setting Endpoint**: If an error occurs while fetching a setting, a JSON response with the error message and details is returned.

## Additional Information

- **Settings Map**: The following settings are managed:

    - `24`: Eco Mode
    - `53`: DC Discharge Start Time
    - `54`: DC Discharge End Time
    - `56`: DC Discharge Enable
    - `71`: Battery Reserve Limit

- **Battery Status Check**: The script checks the current battery percentage and adjusts settings based on predefined thresholds.

## Example Response

### Update Settings Response

```json
{
    "status": "success",
    "timestamp": "2024-07-07T12:34:56.789Z",
    "results": [
        { "step": 1, "message": "Executed time: 2024-07-07T12:34:56.789Z" },
        { "step": 2, "message": "Current battery percentage: 80%" },
        { "step": 3, "message": "Eco Mode updated to false" }
    ]
}
