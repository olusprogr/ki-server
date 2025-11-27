const ping = require('ping');
const dotenv = require('dotenv');

dotenv.config();

module.exports = async function testAvailableDevicesInLocalNetwork(req, res) {
    console.log('Test Available Devices In Local Network Middleware Invoked');

    let results = [];

    const devices = [
        { name: 'Device 1', ip: process.env.DEVICE1_IPV4 },
        { name: 'Device 2', ip: process.env.DEVICE2_IPV4 },
        { name: 'Device 3', ip: process.env.DEVICE3_IPV4 }
    ];

    try {
        for (const device of devices) {
            const result = await ping.promise.probe(device.ip, { timeout: 2 });

            console.log(result);
            results.push({
                name: device.name,
                ip: device.ip,
                alive: result.alive,
                time: result.time
            });
        }

        res.json(results);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
