#!/usr/bin/env node
const axios = require('axios')
const argv = require('minimist')(process.argv.slice(2));
const { format } = require('date-fns');
const startOfTomorrow = require('date-fns/startOfTomorrow')
const sound = require("sound-play");
const path = require("path");
const notificationSound = path.join(__dirname, "sounds/beep.mp3");
const districts = require('./master').districtsOfWbMap;
const sampleUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'

for (let i = 710; i < 738; i++) {
    pingCowin({
        age: 99,
        districtId: i,
        appointmentsListLimit: 10,
        date: format(startOfTomorrow(), 'dd-MM-yyyy')
    })
}


function pingCowin({ districtId, date }) {
    axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtId}&date=${date}`, { headers: { 'User-Agent': sampleUserAgent } }).then((result) => {
        const { centers } = result.data;
        let appointmentsAvailableCount = centers.reduce((p, c) => p + c.sessions.reduce((p, c) => p + c.available_capacity_dose1, 0), 0);

        if (appointmentsAvailableCount > 0) {
            console.log(`for [${districts[districtId]}] ${centers.filter(x => x.sessions.some(c => c.available_capacity_dose1)).length} centers, total ${appointmentsAvailableCount} available\n`);
        }
    }).catch((err) => {
        console.error(err);
        console.log("Error: " + err.message);
    });
}
