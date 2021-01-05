/**************************************************************************************
 *
 *  $Id: demo.js 32624 2018-10-10 13:23:29Z seb $
 *
 *  An example that show how to use a Yocto-Light to control a Sure PetCare car door
 *
 *  You can find more information on our web site:
 *   Yocto-Light documentation:
 *      https://www.yoctopuce.com/EN/products/yocto-light/doc.html
 *   Yoctopuce EcmaScript API Reference:
 *      https://www.yoctopuce.com/EN/doc/reference/yoctolib-ecmascript-EN.html
 *
 **************************************************************************************/

"use strict";

const LightSensorInterface = require('./light-sensor.js');
const SurePetcareInterface = require('./sure-petcare.js');

/**************************************************************************************
 *
 *                  Configuration parameters (setup your own values!)
 *
 **************************************************************************************/

// Light sensor IP address (when connected via a YoctoHub or a remote computer)
// or simply 'usb' when the light sensor is connected direcly on the control machine
let LIGHT_SENSOR_IP = '127.0.0.1';

const DAYLIGHT_LUMINOSITY = 10;             // acceptable daylight luminosity, measured in [lux]

// Sure petcare credentials
let SURE_PETCARE_API_EMAIL = 'your.e-mail@address.com';
let SURE_PETCARE_API_PWD = 'your.password';

// Curfew time table
//
// Note: you should also configure Sure Petcare standalone curfew to DAYLIGHT_TIME/NIGHT_TIME
//       to guarantee time-based automated switch in case this software is unable to run
//       for any unpredictable reason
const MORNING_TIME = 8.1;                   // 08:06 AM: earliest time for going out
const DAYLIGHT_TIME = 10;                   // 10:00 AM: end of morning daylight monitoring time
const EVENING_TIME = 16;                    // 04:00 PM: start of evening monitoring time
const NIGHT_TIME = 22;                      // 10:00 PM: end of evening monitoring time

/**************************************************************************************
 *
 *                  Main application state machine
 *
 **************************************************************************************/

const STATE_UNKNOWN = 0;                    // Whenever we need to detect what to be done next
const STATE_NIGHT = 1;
const STATE_MORNING = 2;
const STATE_DAYLIGHT = 3;
const STATE_EVENING = 4;

function runApplication()
{
    let lightSensor = new LightSensorInterface(LIGHT_SENSOR_IP);
    let surePetCare = new SurePetcareInterface(SURE_PETCARE_API_EMAIL, SURE_PETCARE_API_PWD);
    let lastLog = -1;
    let state = STATE_UNKNOWN;

    // State machine, processed no more than once every 3 second to keep CPU relax
    setInterval(() => {
        // 1. Perform state switches related to time
        let date = new Date();
        let hour = date.getHours() + (date.getMinutes() / 60);
        if(hour < MORNING_TIME || hour >= NIGHT_TIME) {
            state = STATE_NIGHT;
        } else if(hour >= DAYLIGHT_TIME && hour < EVENING_TIME) {
            state = STATE_DAYLIGHT;
        } else if(state === STATE_UNKNOWN) {
            state = (hour < DAYLIGHT_TIME ? STATE_MORNING : STATE_EVENING);
        }

        // 2. Perform state switches related to luminosity and external lock state changes
        let luminosity = lightSensor.getLuminosity();
        let luminosityStr = (luminosity < 0 ? 'unknown' : luminosity + ' lux');
        let lockState = surePetCare.getDoorLockState();
        switch(state) {
            case STATE_MORNING:
                if(lockState === SurePetcareInterface.PET_LOCKED_IN && luminosity >= DAYLIGHT_LUMINOSITY) {
                    // Daylight has come
                    console.log("Luminosity is "+luminosityStr+", disabling curfew");
                    surePetCare.setDoorLockState(SurePetcareInterface.PET_DOOR_UNLOCKED);
                    state = STATE_DAYLIGHT;
                } else if(lockState === SurePetcareInterface.PET_DOOR_UNLOCKED) {
                    // Someone has unlocked the door manually
                    console.log("Curfew has been disabled externally");
                    state = STATE_DAYLIGHT;
                }
                break;
            case STATE_EVENING:
                if(lockState === SurePetcareInterface.PET_DOOR_UNLOCKED && luminosity < DAYLIGHT_LUMINOSITY) {
                    // Night has come
                    console.log("Luminosity is "+luminosityStr+", enabling curfew");
                    surePetCare.setDoorLockState(SurePetcareInterface.PET_LOCKED_IN);
                    state = STATE_NIGHT;
                } else if(lockState === SurePetcareInterface.PET_LOCKED_IN) {
                    // Someone has locked the cat in manually
                    console.log("Curfew has been enabled externally");
                    state = STATE_NIGHT;
                }
                break;
        }

        // 3. Every hour, log current system state
        if((hour >> 0) !== (lastLog >> 0)) {
            let lockStateName = surePetCare.getDoorLockStateName();
            console.log((hour >> 0)+'h: luminosity is '+luminosityStr+', pet door is '+lockStateName);
            lastLog = hour;
        }
    }, 3000);
}

runApplication();
