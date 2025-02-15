// importing packages
const express = require('express');
const coap = require('coap');
const fs = require('fs');
const csv = require('csv-parser');
const server = coap.createServer();

const router = express.Router();

let cellTowers = [];

// Load cell towers data from CSV files
function loadCellTowers() {
    fs.createReadStream('combined_filenames.csv')
        .pipe(csv())
        .on('data', (row) => {
            cellTowers.push(row);
        })
        .on('end', () => {
            console.log('Cell towers data loaded.');
        });
}

// Lookup function to find longitude and latitude based on MCC, MNC, TAC, and Cell ID
function lookupCellTower(mcc, mnc, tac, cellId) {
    return cellTowers.find(tower => 
        tower.mcc == mcc && 
        tower.net == mnc && 
        tower.area == tac && 
        tower.cell == cellId
    );
}

router.post(`/`, (httpReq, httpRes) => {
	const req = coap.request(httpReq.body.targetURL)
    
	req.on('response', (res) => {
        res.on('data', (chunk)=> {
            let dataRaw = chunk.toString().split("\n");
            
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
        });
	})

	req.end();
});

router.post('/', (httpReq, httpRes) => {
    const req = coap.request(httpReq.body.targetURL)
    req.on('response', (res) => {
        res.on('locationcell', (chunk)=> {
            let dataRaw = chunk.toString().split("\n");
            
            const tower = lookupCellTower(mcc, mnc, tac, cellId);
            
            if (tower) {
                let dataOut = {
                    latlng: [tower.lat, tower.lon, tower.range],
                    time: new Date().toISOString(),
                };
                httpRes.status(200).json(dataOut);
            } else {
                httpRes.status(400).json({ error: 'Invalid data format' });
                console.warn('Invalid target URL');
            }
        });
    })

    req.end();
});

loadCellTowers();

function validateData(data) {
    // valid data should look like this:
    // [ '59.923513,10.668951', '29.5 m', '2022-10-11 17:06:332' ]    

    let latlngRegex = /[-]?([0-9]*[.])?[0-9]+,[-]?([0-9]*[.])?[0-9]+/ig;
    let accuracyRegex = /([0-9]*[.])?[0-9]+ m/
    let date = new Date(data[2]);

    return data.length === 3 &&
    latlngRegex.test(data[0]) &&
    accuracyRegex.test(data[1]) &&
    date.toString() !== 'Invalid Date';
}

module.exports = router;