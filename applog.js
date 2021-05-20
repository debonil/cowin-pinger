#!/usr/bin/env node
const axios = require('axios')
const argv = require('minimist')(process.argv.slice(2));
const { format } = require('date-fns');
const startOfTomorrow = require('date-fns/startOfTomorrow')
const sound = require("sound-play");
const path = require("path");
const fs = require('fs');
const notificationSound = path.join(__dirname, "sounds/beep.mp3");
const districts = require('./master').districts;
const defaultInterval = 15; // interval between pings in minutes
const appointmentsListLimit = 2 // Increase/Decrease it based on the amount of information you want in the notification.
var timer = null;
const sampleUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'

checkParams();

function checkParams() {
    if (argv.help) {
        console.error('Refer documentation for more details');
    } else if (argv._ && argv._.length && argv._.includes('run')) {
        if (argv.key && typeof argv.key !== 'string') {
            console.error('Please provide a valid IFTTT Webook API Key by appending --key=<IFTTT-KEY> to recieve mobile notification \nRefer documentation for more details');
            return;
        } else if (argv.hook && typeof argv.hook !== 'string') {
            console.error('Please provide a valid IFTTT Webook Name Key by appending --hook=<IFTTT-WEBHOOK-NAME> to recieve mobile notification \nRefer documentation for more details');
            return;
        } else if (argv.hook && !argv.key || !argv.hook && argv.key) {
            console.error('Please provide both IFTTT Webook Name Key and IFTTT Webhook Key to recieve mobile notification \nRefer documentation for more details');
            return;
        } else if (!argv.age) {
            console.error('Please provide your age by appending --age=<YOUR-AGE> \nRefer documentation for more details');
            return;
        } else if (!argv.district) {
            console.error('Please provide required district id by appending --district=<DISTRICT-ID> \nRefer documentation for more details');
            return;
        } else if (argv.interval && argv.interval < 0) {
            console.error('Please provide an interval greater than 0 minutes');
            return;
        } else {
            // Required arguments provided through cli and checks passed
            const logdir = path.join(__dirname, `logs`);
            if (!fs.existsSync(logdir)) {
                fs.mkdirSync(logdir);
            }
            const filehandle = fs.openSync(path.join(logdir, `${argv.district}-${districts[argv.district]}.txt`), 'a');
            const params = {
                key: argv.key,
                hook: argv.hook,
                age: argv.age,
                districtId: argv.district,
                interval: argv.interval || defaultInterval,
                appointmentsListLimit: argv.appts || appointmentsListLimit,
                date: format(startOfTomorrow(), 'dd-MM-yyyy'),
                filehandle: filehandle
            }

            console.log('\nCowin Pinger started succesfully\n');
            console.log(`Age= ${params.age}`);
            console.log(`District ID= ${params.districtId}`);
            console.log(`Time interval= ${params.interval} minutes (default is 15)`);
            console.log(`Appointment Count= ${params.appointmentsListLimit} (default is 2)`);
            if (params.hook && params.key) {
                console.log(`IFTTT API Key= ${params.key || "not configured"}`);
                console.log(`IFTTT Hook Name= ${params.hook || "not configured"}`);
            } else {
                console.log('\nMake sure to turn up the volume to hear the notifcation sound')
            }
            console.log('\n\n')
            scheduleCowinPinger(params);
        }
    } else {
        console.log('\nInvalid command\n\nRun `cowin-pinger run` with all required params to start pinging cowin portal\nRefer documentation for instructions on how to run package\n');
    }
}

function scheduleCowinPinger(params) {
    let pingCount = 0;
    console.clear();
    pingCount += 1;
    pingCowin(params);
    console.log("Ping Count - ", pingCount);
    timer = setInterval(() => {
        console.clear();
        pingCount += 1;
        pingCowin(params);
        console.log("Ping Count - ", pingCount);
    }, params.interval * 60000);
}

function pingCowin({ filehandle, age, districtId, appointmentsListLimit, date }) {
    axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtId}&date=${date}`, { headers: { 'User-Agent': sampleUserAgent } }).then((result) => {
        const { centers } = result.data;
        let appointmentsAvailableCount = centers.reduce((p, c) => p + c.sessions.reduce((p, c) => p + c.available_capacity, 0), 0);
        const avlCenters = centers.filter(x => x.sessions.some(c => c.available_capacity));
        if (appointmentsAvailableCount > 0) {
            console.log(avlCenters.map(x => x.name));
            console.log('Slots found\n')
            sound.play(notificationSound);
        }
        fileLog(filehandle, `${new Date().toLocaleString()} Available : ${appointmentsAvailableCount} apnmnts in  ${avlCenters.length} slots`);
    }).catch((err) => {
        console.log("Error: " + err.message);
    });
}
function fileLog(filehandle, msg) {
    fs.appendFileSync(filehandle, msg + '\n');
}