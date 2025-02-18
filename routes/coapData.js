// importing packages
const express = require('express');
const coap = require('coap');
const server = coap.createServer();

const router = express.Router();

router.post(`/`, (httpReq, httpRes) => {
	const req = coap.request(httpReq.body.targetURL)
    
	req.on('response', (res) => {
        res.on('data', (chunk)=> {
            let dataRaw = chunk.toString().split("\n");
            if (check_gps_scell_data(dataRaw)) {
                
                let validData = validateData(dataRaw);

                // if valid, this VVV else error+warn
                if (validData) {
                    let dataOut = {
                        latlng: dataRaw[0].split(","),
                        acc: Number(dataRaw[1].split(" ")[0]),
                        time: dataRaw[2],
                    };
                    httpRes.status(200).json(dataOut);
                } else {
                    httpRes.status(400);
                    console.warn('Invalid target URL');
                }
            }
            else {
                let location = get_scell_location(dataRaw);
                if (location) {
                    let dataOut = {
                        latlng: [location[0], location[1]],
                        acc: location[2],
                        time: new Date().toISOString(),
                    };
                    httpRes.status(200).json(dataOut); 
                } else {
                    httpRes.status(400);
                    console.warn('Invalid target URL');
                }   
            }
        });
	})

	req.end();
});

function check_gps_scell_data(data) {
    // Check if the data is GPS or SCell data. If it is GPS data, return true, else return false.
    return data[1].includes('m');
}

function get_scell_location(data) {
    mcc = data[0];
    mnc = data[1];
    lac = data[2];
    cid = data[3];
    api_token = "pk.e0a04c0b0f5116d10ca99414e9127044";
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://eu1.unwiredlabs.com/v2/process",
        "method": "POST",
        "headers": {},
        "processData": false,
        "data": "{\"token\": \"" + api_token + "\",\"radio\": \"lte\",\"mcc\": " + mcc + ",\"mnc\": " + mnc + ",\"cells\": [{\"lac\": " + lac + ",\"cid\": " + cid + "}],\"address\": 0}"
      }
    $.ajax(settings).done(function (response) {
        return [response.lat, response.lon, response.accuracy];
    });
}

function validateData(data) {
    // valid data should look like this:
    // [ '59.923513,10.668951', '29.5 m', '2022-10-11 17:06:332' ]    

    let latlngRegex = /[-]?([0-9]*[.])?[0-9]+,[-]?([0-9]*[.])?[0-9]+/ig;
    let accuracyRegex = /([0-9]*[.])?[0-9]+ m/;
    let date = new Date(data[2]);

    return data.length === 3 &&
    latlngRegex.test(data[0]) &&
    accuracyRegex.test(data[1]) &&
    date.toString() !== 'Invalid Date';
}

module.exports = router;