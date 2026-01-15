const dotenv = require('dotenv');
dotenv.config();

module.exports = async function getKnownDevices(req, res) {
    console.log('Get Known Devices Middleware Invoked');

    try {
        res.json({
            devices: [
                { name: process.env.DEVICE1_NAME, ip: process.env.DEVICE1_IPV4 },
                { name: process.env.DEVICE2_NAME, ip: process.env.DEVICE2_IPV4 },
                { name: process.env.DEVICE3_NAME, ip: process.env.DEVICE3_IPV4 },
                { name: process.env.DEVICE4_NAME, ip: process.env.DEVICE4_IPV4 },
                { name: process.env.DEVICE5_NAME, ip: process.env.DEVICE5_IPV4 },
                { name: process.env.DEVICE6_NAME, ip: process.env.DEVICE6_IPV4 },
                { name: process.env.DEVICE7_NAME, ip: process.env.DEVICE7_IPV4 },
                { name: process.env.DEVICE8_NAME, ip: process.env.DEVICE8_IPV4 },
            ]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
