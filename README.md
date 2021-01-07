Rationale
---------

Even if cats are naturally nocturnal animals, it is often recommended not to let them out at night: not only is it when they have a higher tendency to bring back live toys in the house, but it's also during the night that they are more often victims of accidents. This is why automatic cat flap manufacturers propose a *curfew* mode - very trendy - enabling you to stop the animals going out on a defined schedule. 

![Configuring the curfew at fixed times](https://www.yoctopuce.com/pubarchive/2021-01/surepet-ui-EN_1.png)

Except that... between September, when we mounted the cat flap, and January, the hours of the night have changed quite a bit, and the cat flap thus stays open several hours after nightfall and opens well before the sun is up - and even more so as the time change wasn't taken correctly into account. Too bad! So today, we propose an improvement of this connected cat flap, which consists in simply using an ambient light sensor to automatically adapt the opening schedule during the whole year.

Principle
---------

The principle is simple: somewhere in the house, a [Yocto-Light-V3](https://www.yoctopuce.com/EN/products/usb-environmental-sensors/yocto-light-v3) sensor connected to the network measures the outside luminosity. The simplest way is to mount it directly on a [YoctoHub-Ethernet](https://www.yoctopuce.com/EN/products/extensions-and-networking/yoctohub-ethernet) or a [YoctoHub-Wireless-n](https://www.yoctopuce.com/EN/products/extensions-and-networking/yoctohub-wireless-n) close to a network access point and to a window. Somewhere else, a monitoring computer periodically checks the ambient luminosity and (un)locks the cat flap depending on the hour and on the light, by contacting the Surepet Care server. 

![Controlling the cat flap with a light sensor](https://www.yoctopuce.com/pubarchive/2021-01/catdoor-with-light-sensor-components-EN_2.png)

Design
------

You must pay particular attention to the robustness of the solution, especially to the tolerance of network losses which are unavoidable. We take the opportunity of this not too complex project to show

-   how to separate from the application logic the different interfaces to the outside, and
-   how to implement the application logic with a finite state machine.

The separation enables us to simplify the application by splitting it into components which we can design, test and document independently from one another. The implementation with a finite state machine enables us to make sure that the distinct possible states of the system are clearly defined, and that all the transition cases from one state to the other are taken care of. Here is the design that we propose: 

![Articulation of the controlling system](https://www.yoctopuce.com/pubarchive/2021-01/catdoor-with-light-sensor-design-EN_1.png)

We decided to perform the implementation in Node.js, but you can very easily translate this code into any other language.

Implementation
--------------

For detailled explanations about the implementation, see [our blog article describing it](https://www.yoctopuce.com/EN/article/a-light-sensor-for-a-connected-cat-flap).

Credits
-------

The interface to Surepet API was heavily inspired from a previous by Wylan Swets and [published under MIT license on GitHub](https://github.com/wylanswets/sure_petcare). We are very thankful to him to have done all the protocol analysis work and to have made the result available to all.
