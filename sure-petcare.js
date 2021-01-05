/**************************************************************************************
 *
 *  $Id: demo.js 32624 2018-10-10 13:23:29Z seb $
 *
 *  CommonJS API for controlling a Sure Petcare Microchip Cat Door Connect
 *
 *  This work is heavily inspired from Wylan Swets api code
 *      https://github.com/wylanswets/sure_petcare
 *
 **************************************************************************************/

"use strict";

const axios = require('axios');

const SUREHUB_SERVER = 'https://app.api.surehub.io/';

class SurePetcareInterface
{
    static STATE_NAMES = ['unlocked', 'locked-in', 'locked-out', 'fully locked'];

    static PET_DOOR_NOCHANGE = -1;
    static PET_DOOR_UNKNOWN  = -1;
    static PET_DOOR_UNLOCKED = 0;
    static PET_LOCKED_IN     = 1;
    static PET_LOCKED_OUT    = 2;
    static PET_DOOR_LOCKED   = 3;

    // Argument: surepetcare.io login credentials
    //
    constructor(str_email, str_pwd)
    {
        this._login_email = str_email;           // surepetcare.io login email
        this._login_pwd = str_pwd;               // surepetcare.io login password
        this._token = null;
        this._surehubData = null;
        this._batteryLevel = 'unknown';
        this._doorLockState = SurePetcareInterface.PET_DOOR_UNKNOWN;
        this._desiredLockState = SurePetcareInterface.PET_DOOR_NOCHANGE;

        // trigger asynchronous monitoring of the pet door every minute
        this._monitorPetDoor();
        setInterval(() => { this._monitorPetDoor(); }, 10000);
    }

    // Private async method to perform a POST API query
    //
    async _apiPostRequest(str_apipath, obj_body)
    {
        let request = await axios.post(SUREHUB_SERVER+str_apipath, obj_body);
        return request.data.data;
    }

    // Private async method to perform a GET API query
    //
    async _apiGetRequest(str_apipath)
    {
        if(!this._token) {
            if(!await this._login()) return null;
        }
        let request = await axios.get(SUREHUB_SERVER+str_apipath, {
            headers: { 'Authorization': 'bearer '+this._token }
        });
        return request.data.data;
    }

    // Private async method to perform a PUT API query
    //
    async _apiPutRequest(str_apipath, obj_data)
    {
        if(!this._token) {
            if(!await this._login()) return null;
        }
        let request = await axios.put(SUREHUB_SERVER+str_apipath, obj_data, {
            headers: { 'Authorization': 'bearer '+this._token }
        });
        return request.data.data;
    }

    // Private async method tolog into Surepet API
    //
    // Returns true iff the login succeeded
    //
    async _login()
    {
        try {
            let res = await this._apiPostRequest('api/auth/login', {
                'email_address': this._login_email,
                'password': this._login_pwd,
                'device_id': this._login_email
            });
            this._token = res.token;
            //console.log('Surehub login successful for '+res.user.email_address);
        } catch(e) {
            let errmsg = (e.response ? e.response.statusText : e.code);
            console.error('Surehub login failed: '+errmsg);
            return false;
        }
        return true;
    }

    // Private async method to perform a REST API query
    //
    async _monitorPetDoor()
    {
        // Force a new login at every iteration to avoid token expiration
        this._token = null;

        // Load all data from our account
        this._surehubData = await this._apiGetRequest('api/me/start');
        for(let i = 0; i < this._surehubData.devices.length; i++) {
            // enumerate Surehub devices, skip anything that has no lock
            let suredev = this._surehubData.devices[i];
            if(!suredev.status || !suredev.status.locking) continue;

            // read the current battery level and door state to cache
            let batteryLevel = Math.round((suredev.status.battery - 5) * 100);
            batteryLevel = Math.min(Math.max(batteryLevel, 0), 100);
            this._batteryLevel = batteryLevel+'%';
            this._doorLockState = suredev.status.locking.mode;
            let statename = SurePetcareInterface.STATE_NAMES[this._doorLockState];
            //console.log(suredev.name+': '+statename+', battery '+ this._batteryLevel);

            // change the lock state if requested
            if(this._desiredLockState !== SurePetcareInterface.PET_DOOR_NOCHANGE) {
                if(this._desiredLockState !== this._doorLockState) {
                    let newstatename = SurePetcareInterface.STATE_NAMES[this._desiredLockState];
                    console.log('Surehub: changing state to '+newstatename);
                    let res = await this._apiPutRequest('api/device/' + suredev.id + '/control', {
                        "locking": this._desiredLockState
                    });
                    this._doorLockState = res.locking;
                }
                this._desiredLockState = SurePetcareInterface.PET_DOOR_NOCHANGE;
            }
        }
    }

    // Public method to get the door battery level as a string (eg. '75%')
    //
    getDoorBatteryLevel()
    {
        return this._batteryLevel;
    }

    // Public method to get the current door lock state (eg. SurePetcareInterface.PET_DOOR_UNLOCKED)
    //
    getDoorLockState()
    {
        return this._doorLockState;
    }

    // Public method to get the current door lock state as a user-friendly string
    //
    getDoorLockStateName()
    {
        if(this._doorLockState < 0 || this._doorLockState >= SurePetcareInterface.STATE_NAMES.length) return 'unknown';
        return SurePetcareInterface.STATE_NAMES[this._doorLockState];
    }

    // Public method to request a new door lock state
    //
    setDoorLockState(newstate)
    {
        this._desiredLockState = newstate;
    }
}

module.exports = SurePetcareInterface;
