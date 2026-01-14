const ping = require('ping');
const dotenv = require('dotenv');

dotenv.config();

module.exports = async function testAvailableDevicesInLocalNetwork(req, res) {
    console.log('Test Available Devices In Local Network Middleware Invoked');

    try {
        const task = [];

        for (let device = 0; device < 255; device++) {

            task.push(
                ping.promise.probe(`192.168.178.${device}`, { timeout: 0.3 }).then(result => ({
                    name: `Device ${device}`,
                    ip: `192.168.178.${device}`,
                    alive: result.alive,
                    time: result.time
                })
            ));
        }

        const results = await Promise.all(task);

        res.json(results);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
