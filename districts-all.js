#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const path = require("path");
const { format } = require('date-fns');
const startOfTomorrow = require('date-fns/startOfTomorrow')
const { states, stateWiseDistricts } = require('./master');
const sampleUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'

const logdir = path.join(__dirname, `logs`);
if (!fs.existsSync(logdir)) {
    fs.mkdirSync(logdir);
}
const filehandle = fs.openSync(path.join(logdir, `all-districts-${new Date().getTime()}.csv`), 'a');

function fileLog(msg) {
    // console.log(msg);
    fs.appendFileSync(filehandle, msg + '\n');
}

states.forEach(async (state) => {
    // console.log(`${state.state_id}. ${state.state_name} :`);
    const ps = stateWiseDistricts[state.state_id].map(district => {
        return pingCowin({
            state: state.state_name,
            district: district,
            date: format(startOfTomorrow(), 'dd-MM-yyyy'),
        });
    });
    const r = await Promise.all(ps);
    console.log(`${state.state_id}, ${state.state_name}, ${r.reduce((p, c) => p + c, 0)}`);
    await setTimeout[Object.getOwnPropertySymbols(setTimeout)[0]](60000) // 60 sec wait for next
});

function pingCowin({ state, district, date }) {
    return axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${district.district_id}&date=${date}`, { headers: { 'User-Agent': sampleUserAgent } }).then((result) => {
        const { centers } = result.data;
        let appointmentsAvailableCount = centers.reduce((p, c) => p + c.sessions.reduce((p, c) => p + c.available_capacity, 0), 0);

        if (appointmentsAvailableCount > 0) {
            fileLog(`${state}, ${district.district_name}, ${centers.filter(x => x.sessions.some(c => c.available_capacity)).length}, ${appointmentsAvailableCount},`);
        }
        return appointmentsAvailableCount;
    }).catch((err) => {
        console.error(err);
        console.log("Error: " + err.message);
    });
}
