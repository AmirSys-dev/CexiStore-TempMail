const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m'
};

class ConsoleLogger {
    constructor() {
        this.records = {
            functions: new Map(),
            methods: new Map(),
            localMethods: new Map(),
            attacks: [],
            activities: [],
            errors: [],
            api: []
        };
        this.startTime = Date.now();
        this.sessionId = this.generateSessionId();
        this.loadMethods();
        this.logFile = path.join(__dirname, '..', 'logs', 'activity.log');
        this.ensureLogDirectory();
    }

    generateSessionId() {
        return `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    ensureLogDirectory() {
        const logDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    loadMethods() {
        try {
            const methodsPath = path.join(__dirname, '..', 'methods.json');
            const localMethodsPath = path.join(__dirname, '..', 'local_methods.json');
            
            if (fs.existsSync(methodsPath)) {
                const methods = JSON.parse(fs.readFileSync(methodsPath, 'utf-8'));
                methods.forEach(m => {
                    this.records.methods.set(m.name, {
                        ...m,
                        callCount: 0,
                        lastUsed: null,
                        totalDuration: 0,
                        errors: 0
                    });
                });
            }
            
            if (fs.existsSync(localMethodsPath)) {
                const localMethods = JSON.parse(fs.readFileSync(localMethodsPath, 'utf-8'));
                localMethods.forEach(m => {
                    this.records.localMethods.set(m.name, {
                        ...m,
                        callCount: 0,
                        lastUsed: null,
                        totalDuration: 0,
                        errors: 0,
                        successCount: 0
                    });
                });
            }
        } catch (error) {
            this.logError('loadMethods', error);
        }
    }

    getTimestamp() {
        const now = new Date();
        return now.toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatUptime() {
        const uptime = Date.now() - this.startTime;
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    logFunction(functionName, params = {}, result = null, duration = 0) {
        const entry = {
            name: functionName,
            params: params,
            result: result ? 'success' : 'pending',
            duration: duration,
            timestamp: this.getTimestamp(),
            timestampMs: Date.now()
        };
        
        if (!this.records.functions.has(functionName)) {
            this.records.functions.set(functionName, {
                callCount: 0,
                totalDuration: 0,
                lastCall: null,
                errors: 0
            });
        }
        
        const funcRecord = this.records.functions.get(functionName);
        funcRecord.callCount++;
        funcRecord.totalDuration += duration;
        funcRecord.lastCall = this.getTimestamp();
        
        this.printLog('FUNCTION', functionName, params, 'cyan');
        this.writeToFile(`[FUNCTION] ${functionName} - ${JSON.stringify(params)}`);
        
        return entry;
    }

    logMethod(methodName, target, duration, port = 443, userId = null) {
        const entry = {
            method: methodName,
            target: target,
            port: port,
            duration: duration,
            userId: userId,
            timestamp: this.getTimestamp(),
            timestampMs: Date.now(),
            status: 'started'
        };
        
        this.records.attacks.push(entry);
        
        if (this.records.methods.has(methodName)) {
            const methodRecord = this.records.methods.get(methodName);
            methodRecord.callCount++;
            methodRecord.lastUsed = this.getTimestamp();
            methodRecord.totalDuration += parseInt(duration) || 0;
        }
        
        this.printLog('METHOD', methodName, { target, duration, port }, 'magenta');
        this.writeToFile(`[METHOD] ${methodName} -> ${target}:${port} for ${duration}s`);
        
        return entry;
    }

    logLocalMethod(methodName, params = {}, pid = null) {
        const entry = {
            method: methodName,
            params: params,
            pid: pid,
            timestamp: this.getTimestamp(),
            timestampMs: Date.now(),
            status: 'running'
        };
        
        if (this.records.localMethods.has(methodName)) {
            const localRecord = this.records.localMethods.get(methodName);
            localRecord.callCount++;
            localRecord.lastUsed = this.getTimestamp();
        }
        
        this.printLog('LOCAL_METHOD', methodName, params, 'yellow');
        this.writeToFile(`[LOCAL_METHOD] ${methodName} - PID: ${pid || 'N/A'}`);
        
        return entry;
    }

    logActivity(activity, details = {}, userId = null) {
        const entry = {
            activity: activity,
            details: details,
            userId: userId,
            timestamp: this.getTimestamp(),
            timestampMs: Date.now()
        };
        
        this.records.activities.push(entry);
        
        if (this.records.activities.length > 1000) {
            this.records.activities = this.records.activities.slice(-500);
        }
        
        this.printLog('ACTIVITY', activity, details, 'green');
        this.writeToFile(`[ACTIVITY] ${activity} - User: ${userId || 'System'}`);
        
        return entry;
    }

    logAPI(endpoint, method, status, responseTime = 0) {
        const entry = {
            endpoint: endpoint,
            method: method,
            status: status,
            responseTime: responseTime,
            timestamp: this.getTimestamp(),
            timestampMs: Date.now()
        };
        
        this.records.api.push(entry);
        
        if (this.records.api.length > 500) {
            this.records.api = this.records.api.slice(-250);
        }
        
        const statusColor = status >= 200 && status < 300 ? 'green' : 'red';
        this.printLog('API', `${method} ${endpoint}`, { status, responseTime: `${responseTime}ms` }, statusColor);
        this.writeToFile(`[API] ${method} ${endpoint} - ${status} (${responseTime}ms)`);
        
        return entry;
    }

    logError(source, error, details = {}) {
        const entry = {
            source: source,
            message: error.message || error,
            stack: error.stack || null,
            details: details,
            timestamp: this.getTimestamp(),
            timestampMs: Date.now()
        };
        
        this.records.errors.push(entry);
        
        if (this.records.errors.length > 200) {
            this.records.errors = this.records.errors.slice(-100);
        }
        
        if (this.records.functions.has(source)) {
            this.records.functions.get(source).errors++;
        }
        
        this.printLog('ERROR', source, { message: error.message || error }, 'red');
        this.writeToFile(`[ERROR] ${source}: ${error.message || error}`);
        
        return entry;
    }

    printLog(type, name, data, color = 'white') {
        const timestamp = this.getTimestamp();
        const colorCode = colors[color] || colors.white;
        const typeColors = {
            'FUNCTION': colors.cyan,
            'METHOD': colors.magenta,
            'LOCAL_METHOD': colors.yellow,
            'ACTIVITY': colors.green,
            'API': colors.blue,
            'ERROR': colors.red,
            'INFO': colors.white,
            'SUCCESS': colors.green,
            'WARNING': colors.yellow
        };
        
        const typeColor = typeColors[type] || colorCode;
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
        
        console.log(`${colors.dim}[${timestamp}]${colors.reset} ${typeColor}[${type}]${colors.reset} ${colors.bright}${name}${colors.reset} ${colors.dim}${dataStr}${colors.reset}`);
    }

    writeToFile(message) {
        try {
            const logLine = `[${this.getTimestamp()}] ${message}\n`;
            fs.appendFileSync(this.logFile, logLine);
        } catch (error) {
        }
    }

    getMethodsStats() {
        const stats = {
            methods: [],
            localMethods: [],
            totalCalls: 0,
            mostUsed: null
        };
        
        this.records.methods.forEach((value, key) => {
            stats.methods.push({
                name: key,
                ...value
            });
            stats.totalCalls += value.callCount;
        });
        
        this.records.localMethods.forEach((value, key) => {
            stats.localMethods.push({
                name: key,
                ...value
            });
            stats.totalCalls += value.callCount;
        });
        
        const allMethods = [...stats.methods, ...stats.localMethods];
        if (allMethods.length > 0) {
            stats.mostUsed = allMethods.reduce((prev, current) => 
                (prev.callCount > current.callCount) ? prev : current
            );
        }
        
        return stats;
    }

    getFunctionsStats() {
        const stats = {
            functions: [],
            totalCalls: 0,
            totalErrors: 0,
            avgDuration: 0
        };
        
        let totalDuration = 0;
        
        this.records.functions.forEach((value, key) => {
            stats.functions.push({
                name: key,
                ...value,
                avgDuration: value.callCount > 0 ? Math.round(value.totalDuration / value.callCount) : 0
            });
            stats.totalCalls += value.callCount;
            stats.totalErrors += value.errors;
            totalDuration += value.totalDuration;
        });
        
        stats.avgDuration = stats.totalCalls > 0 ? Math.round(totalDuration / stats.totalCalls) : 0;
        
        return stats;
    }

    getActivityStats() {
        const last24h = Date.now() - (24 * 60 * 60 * 1000);
        const recentActivities = this.records.activities.filter(a => a.timestampMs > last24h);
        
        return {
            total: this.records.activities.length,
            last24h: recentActivities.length,
            recent: this.records.activities.slice(-10)
        };
    }

    getAttackStats() {
        const now = Date.now();
        const ongoing = this.records.attacks.filter(a => {
            const endTime = a.timestampMs + (parseInt(a.duration) * 1000);
            return endTime > now;
        });
        
        return {
            total: this.records.attacks.length,
            ongoing: ongoing.length,
            ongoingDetails: ongoing,
            recent: this.records.attacks.slice(-10)
        };
    }

    getFullReport() {
        return {
            sessionId: this.sessionId,
            uptime: this.formatUptime(),
            timestamp: this.getTimestamp(),
            methods: this.getMethodsStats(),
            functions: this.getFunctionsStats(),
            activities: this.getActivityStats(),
            attacks: this.getAttackStats(),
            errors: {
                total: this.records.errors.length,
                recent: this.records.errors.slice(-5)
            },
            api: {
                total: this.records.api.length,
                recent: this.records.api.slice(-10)
            }
        };
    }

    printDashboard() {
        const report = this.getFullReport();
        const divider = '═'.repeat(60);
        const thinDivider = '─'.repeat(60);
        
        console.log(`\n${colors.cyan}╔${divider}╗${colors.reset}`);
        console.log(`${colors.cyan}║${colors.reset} ${colors.bright}${colors.magenta}CEXISTORE CONSOLE DASHBOARD${colors.reset}${' '.repeat(31)}${colors.cyan}║${colors.reset}`);
        console.log(`${colors.cyan}╠${divider}╣${colors.reset}`);
        
        console.log(`${colors.cyan}║${colors.reset} ${colors.yellow}Session:${colors.reset} ${report.sessionId.substring(0, 30)}...`);
        console.log(`${colors.cyan}║${colors.reset} ${colors.yellow}Uptime:${colors.reset}  ${report.uptime}`);
        console.log(`${colors.cyan}╠${thinDivider}╣${colors.reset}`);
        
        console.log(`${colors.cyan}║${colors.reset} ${colors.green}[METHODS STATS]${colors.reset}`);
        console.log(`${colors.cyan}║${colors.reset}   Total Calls: ${report.methods.totalCalls}`);
        console.log(`${colors.cyan}║${colors.reset}   API Methods: ${report.methods.methods.length}`);
        console.log(`${colors.cyan}║${colors.reset}   Local Methods: ${report.methods.localMethods.length}`);
        if (report.methods.mostUsed) {
            console.log(`${colors.cyan}║${colors.reset}   Most Used: ${report.methods.mostUsed.name} (${report.methods.mostUsed.callCount} calls)`);
        }
        console.log(`${colors.cyan}╠${thinDivider}╣${colors.reset}`);
        
        console.log(`${colors.cyan}║${colors.reset} ${colors.blue}[FUNCTIONS STATS]${colors.reset}`);
        console.log(`${colors.cyan}║${colors.reset}   Total Functions: ${report.functions.functions.length}`);
        console.log(`${colors.cyan}║${colors.reset}   Total Calls: ${report.functions.totalCalls}`);
        console.log(`${colors.cyan}║${colors.reset}   Total Errors: ${report.functions.totalErrors}`);
        console.log(`${colors.cyan}║${colors.reset}   Avg Duration: ${report.functions.avgDuration}ms`);
        console.log(`${colors.cyan}╠${thinDivider}╣${colors.reset}`);
        
        console.log(`${colors.cyan}║${colors.reset} ${colors.magenta}[ATTACKS]${colors.reset}`);
        console.log(`${colors.cyan}║${colors.reset}   Total: ${report.attacks.total}`);
        console.log(`${colors.cyan}║${colors.reset}   Ongoing: ${report.attacks.ongoing}`);
        console.log(`${colors.cyan}╠${thinDivider}╣${colors.reset}`);
        
        console.log(`${colors.cyan}║${colors.reset} ${colors.green}[ACTIVITIES]${colors.reset}`);
        console.log(`${colors.cyan}║${colors.reset}   Total: ${report.activities.total}`);
        console.log(`${colors.cyan}║${colors.reset}   Last 24h: ${report.activities.last24h}`);
        console.log(`${colors.cyan}╠${thinDivider}╣${colors.reset}`);
        
        console.log(`${colors.cyan}║${colors.reset} ${colors.red}[ERRORS]${colors.reset} Total: ${report.errors.total}`);
        console.log(`${colors.cyan}║${colors.reset} ${colors.blue}[API CALLS]${colors.reset} Total: ${report.api.total}`);
        
        console.log(`${colors.cyan}╚${divider}╝${colors.reset}\n`);
    }

    printMethodsList() {
        const stats = this.getMethodsStats();
        
        console.log(`\n${colors.magenta}╔${'═'.repeat(70)}╗${colors.reset}`);
        console.log(`${colors.magenta}║${colors.reset} ${colors.bright}METHODS & LOCAL METHODS RECORDS${colors.reset}${' '.repeat(37)}${colors.magenta}║${colors.reset}`);
        console.log(`${colors.magenta}╠${'═'.repeat(70)}╣${colors.reset}`);
        
        console.log(`${colors.magenta}║${colors.reset} ${colors.yellow}[API METHODS]${colors.reset}`);
        stats.methods.forEach(m => {
            const status = m.sts === 'ON' ? `${colors.green}ON${colors.reset}` : `${colors.red}OFF${colors.reset}`;
            console.log(`${colors.magenta}║${colors.reset}   ${m.name.padEnd(15)} | Calls: ${String(m.callCount).padEnd(5)} | Status: ${status}`);
        });
        
        console.log(`${colors.magenta}╠${'─'.repeat(70)}╣${colors.reset}`);
        
        console.log(`${colors.magenta}║${colors.reset} ${colors.cyan}[LOCAL METHODS]${colors.reset}`);
        stats.localMethods.forEach(m => {
            const status = m.sts === 'ON' ? `${colors.green}ON${colors.reset}` : `${colors.red}OFF${colors.reset}`;
            console.log(`${colors.magenta}║${colors.reset}   ${m.name.padEnd(15)} | Calls: ${String(m.callCount).padEnd(5)} | Type: ${m.type} | ${status}`);
        });
        
        console.log(`${colors.magenta}╚${'═'.repeat(70)}╝${colors.reset}\n`);
    }

    printRecentActivity(limit = 10) {
        const activities = this.records.activities.slice(-limit);
        
        console.log(`\n${colors.green}╔${'═'.repeat(70)}╗${colors.reset}`);
        console.log(`${colors.green}║${colors.reset} ${colors.bright}RECENT ACTIVITIES${colors.reset}${' '.repeat(51)}${colors.green}║${colors.reset}`);
        console.log(`${colors.green}╠${'═'.repeat(70)}╣${colors.reset}`);
        
        if (activities.length === 0) {
            console.log(`${colors.green}║${colors.reset}   No recent activities`);
        } else {
            activities.forEach((a, i) => {
                console.log(`${colors.green}║${colors.reset} ${i + 1}. [${a.timestamp}] ${a.activity}`);
                if (a.userId) {
                    console.log(`${colors.green}║${colors.reset}    User: ${a.userId}`);
                }
            });
        }
        
        console.log(`${colors.green}╚${'═'.repeat(70)}╝${colors.reset}\n`);
    }
}

const logger = new ConsoleLogger();

module.exports = logger;
