/**************************************************************************************
 *
 *  $Id: demo.js 32624 2018-10-10 13:23:29Z seb $
 *
 *  Trivial CommonJS API for reading a Yoctopuce light sensor
 *
 *  You can find more information on our web site:
 *   Yocto-Light documentation:
 *      https://www.yoctopuce.com/EN/products/yocto-light/doc.html
 *   Yoctopuce EcmaScript API Reference:
 *      https://www.yoctopuce.com/EN/doc/reference/yoctolib-ecmascript-EN.html
 *
 **************************************************************************************/

"use strict";

require('yoctolib-es2017/yocto_api.js');
require('yoctolib-es2017/yocto_lightsensor.js');

class LightSensorInterface
{
    // Argument: IP address, or "usb" for locally connected device
    //
    constructor(sensor_address)
    {
        this.hubAddr = sensor_address;  // IP address, or "usb" for direct connection
        this.currentLuminosity = -1;    // luminosity in [lux], or -1 when not available
        this.terminate = false;

        // trigger asynchronous connection to the hub
        this._enableLightSensor();
    }

    // Callback invoked periodically when a new averaged light measurement is available
    //
    async _lightSensorCallback(sensor, measure)
    {
        this.currentLuminosity = measure.get_averageValue();
        //console.log('Average luminosity: ' + this.currentLuminosity + ' lux');
    }

    // Callback invoked whenever a new Yoctopuce device is connected
    //
    async _deviceArrivalCallback(module)
    {
        let product = await module.get_productName();
        let serial = await module.get_serialNumber();
        console.log('Yoctopuce device connected: '+product+' ('+serial+')');
        if(!product.match(/^Yocto-Light/)) return;

        // If a Yocto-Light (any version) is found, retrieve average luminosity twice per minute
        let sensor = YLightSensor.FindLightSensor(serial+'.lightSensor');
        await sensor.set_reportFrequency("2/m");
        await sensor.registerTimedReportCallback((s,m) => { this._lightSensorCallback(s,m); });
        // initialize current luminosity with current instant value, until we get the averaged value
        this.currentLuminosity = await sensor.get_currentValue();
    }

    // Callback invoked whenever a new Yoctopuce device is disconnected
    //
    async _deviceRemovalCallback(module)
    {
        let product = await module.get_productName();
        let serial = await module.get_serialNumber();
        console.log('Yoctopuce device disconnected: '+product+' ('+serial+')');
        if(!product.match(/^Yocto-Light/)) return;

        this.currentLuminosity = -1;
    }

    // Private method to enable light sensor monitoring, asynchronously
    //
    async _enableLightSensor()
    {
        // Use soft error handling to avoid quitting the application
        await YAPI.LogUnhandledPromiseRejections();
        await YAPI.DisableExceptions();

        // Attempt to connect to the light sensor hub, without triggering
        // an error in case the hub is momentarily not reachable
        await YAPI.PreregisterHub(this.hubAddr, new YErrorMsg());

        // Get a callback whenever the light sensor is connected or disconnected
        await YAPI.RegisterDeviceArrivalCallback((m) => { this._deviceArrivalCallback(m); });
        await YAPI.RegisterDeviceRemovalCallback((m) => { this._deviceRemovalCallback(m); });

        // Monitor plug events until requested to exit
        while(!this.terminate) {
            await YAPI.UpdateDeviceList(new YErrorMsg());
            await YAPI.Sleep(1000);
        }

        // Disconnect, free ressources
        await YAPI.FreeAPI();
    }

    // Public method to get latest light reading, or -1 if not available
    //
    getLuminosity()
    {
        return this.currentLuminosity;
    }

    // Public method to disconnect from the light sensor
    //
    disconnect()
    {
        this.terminate = true;
    }
}


module.exports = LightSensorInterface;
