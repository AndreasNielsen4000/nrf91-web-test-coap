// importing packages
const express = require('express');
const coap = require('coap');
const axios = require('axios');
const server = coap.createServer();

const router = express.Router();

const api_token = "pk.e0a04c0b0f5116d10ca99414e9127044";

let mcc = null;
let mnc = null;
let lac = null;
let cid = null;

let { lat, lon, accuracy } = [null, null, null];

router.post(`/`, (httpReq, httpRes) => {
    const req = coap.request(httpReq.body.targetURL);
    
    req.on('response', async (res) => {
        res.on('data', async (chunk) => {
            let dataRaw = chunk.toString().split("\n");
            console.log("DataRaw:", dataRaw);

            switch (getDataType(dataRaw)) {
                case 'GPS':
                    handleGPSData(dataRaw, httpRes);
                    break;
                case 'SCell':
                    await handleSCellData(dataRaw, httpRes);
                    break;
                case 'WiFi':
                    handleWiFiData(dataRaw, httpRes);
                    break;
                default:
                    httpRes.status(400).send('Invalid data type');
                    console.warn('Invalid data type');
            }
        });
    });

    req.end();
});

function getDataType(data) {
    if (data[0].includes("g")) {
        return 'GPS';
    } else if (data[0].includes("s")) {
        return 'SCell';
    } else if (data[0].includes("w")) {
        return 'WiFi';
    }
}

function handleGPSData(dataRaw, httpRes) {
    let validData = validateData(dataRaw);

    if (validData) {
        let dataOut = {
            latlng: dataRaw[1].split(","),
            acc: Number(dataRaw[2].split(" ")[0]),
            time: dataRaw[3],
        };
        httpRes.status(200).json(dataOut);
    } else {
        httpRes.status(400);
        console.warn('Invalid GPS data');
    }
}

async function handleSCellData(dataRaw, httpRes) {
    let location = await getSCellLocation(dataRaw);
    console.log("Location:", location);
    if (location[0] === undefined || location[1] === undefined || location[2] === undefined) {
        httpRes.status(400).send('Error fetching SCell location');
    } else {
        let dataOut = {
            latlng: [location[0], location[1]],
            acc: location[2],
            time: new Date().toISOString(),
        };
        console.log("DataOut:", dataOut);
        httpRes.status(200).json(dataOut);
    }
}

function handleWiFiData(dataRaw, httpRes) {
    // Implement WiFi data handling logic here
    httpRes.status(200).send('WiFi data handling not implemented');
}

async function getSCellLocation(data) {
    data[4] = data[4].replace("}", "");
    if (mcc != data[1] || mnc != data[2] || lac != data[3] || cid != data[4] || lat === undefined || lon === undefined || accuracy === undefined) {
        mcc = data[1];
        mnc = data[2];
        lac = data[3];
        cid = data[4];
        //remove "{" and "}" from the string
        console.log('Fetching SCell location...');
        console.log('MCC:', mcc);
        console.log('MNC:', mnc);
        console.log('LAC:', lac);
        console.log('CID:', cid);

        const settings = {
            async: true,
            crossDomain: true,
            method: 'POST',
            url: 'https://eu1.unwiredlabs.com/v2/process',
            headers: {},
            data: "{\"token\": \"" + api_token + "\",\"radio\": \"lte\",\"mcc\": " + mcc + ",\"mnc\": " + mnc + ",\"cells\": [{\"lac\": " + lac + ",\"cid\": " + cid + "}],\"address\": 0}"
        };

        try {
            const response = await axios(settings);
            ({ lat, lon, accuracy } = response.data);
            console.log('SCell location:', lat, lon, accuracy);
            return [lat, lon, accuracy];
        } catch (error) {
            console.error('Error fetching SCell location:', error);
            return [null, null, null];
        }
    } else {
        console.log('SCell location unchanged');
        console.log('SCell location:', lat, lon, accuracy);
        return [lat, lon, accuracy];
    }
}

function validateData(data) {
    // valid data should look like this:
    // [ '59.923513,10.668951', '29.5 m', '2022-10-11 17:06:332' ]    

    let latlngRegex = /[-]?([0-9]*[.])?[0-9]+,[-]?([0-9]*[.])?[0-9]+/ig;
    let accuracyRegex = /([0-9]*[.])?[0-9]+ m/;
    let date = new Date(data[3]);

    return data.length === 4 &&
    latlngRegex.test(data[1]) &&
    accuracyRegex.test(data[2]) &&
    date.toString() !== 'Invalid Date';
}

module.exports = router;