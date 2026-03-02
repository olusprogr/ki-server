const os = require('os');
const { execSync } = require('child_process');

module.exports = async function getServerStats(req, res) {
    console.log('Get Server Stats Middleware Invoked');

    try {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        // CPU usage berechnen
        const cpuStart = os.cpus();
        await new Promise(resolve => setTimeout(resolve, 100));
        const cpuEnd = os.cpus();

        let totalIdle = 0;
        let totalTick = 0;
        for (let i = 0; i < cpuStart.length; i++) {
            const startTimes = cpuStart[i].times;
            const endTimes = cpuEnd[i].times;
            const idle = endTimes.idle - startTimes.idle;
            const total = (endTimes.user - startTimes.user)
                + (endTimes.nice - startTimes.nice)
                + (endTimes.sys - startTimes.sys)
                + (endTimes.irq - startTimes.irq)
                + idle;
            totalIdle += idle;
            totalTick += total;
        }
        const cpuUsage = totalTick > 0 ? ((1 - totalIdle / totalTick) * 100) : 0;

        // Background Tasks via ps
        let backgroundTasks = [];
        try {
            const psOutput = execSync(
                'ps aux --sort=-%cpu | head -16',
                { encoding: 'utf-8', timeout: 2000 }
            );
            const lines = psOutput.trim().split('\n').slice(1); // Header überspringen
            backgroundTasks = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    pid: parseInt(parts[1]),
                    name: parts[10] || parts[parts.length - 1],
                    cpu: parseFloat(parts[2]) || 0,
                    memory: parseFloat(((parseFloat(parts[5]) || 0) / 1024).toFixed(1)),
                    status: parts[7] === 'S' || parts[7] === 'Sl' ? 'sleeping'
                        : parts[7] === 'R' ? 'running'
                        : parts[7] === 'T' ? 'stopped'
                        : parts[7] || 'unknown'
                };
            });
        } catch (_) {}

        res.json({
            cpu: {
                usage: Math.round(cpuUsage * 10) / 10,
                cores: cpus.length,
                model: cpus[0].model,
                loadAvg: os.loadavg()
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                usagePercent: Math.round((usedMem / totalMem) * 1000) / 10
            },
            uptime: Math.floor(os.uptime()),
            hostname: os.hostname(),
            platform: os.platform(),
            backgroundTasks
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
