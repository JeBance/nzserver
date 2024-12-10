#!/usr/bin/env node

let config = {
	autoDel: 0,
	log: true
};

const process = require('process');
const nzcli = require('nzcli');
const nzconfig = require('nzconfig');
const nzrl = require('nzrl');

const cli = new nzcli(config, process);

if (config.config !== undefined) {
	config = new nzconfig(config);
	config.writeConfigFile();
}

if (config.log === 'false') config.log = false;

try {
	if (!config.listen) throw new Error('The required parameter "listen" is missing.');
	if (!config.net) throw new Error('The required parameter "net" is missing.');
	let listen = config.listen.split(':');
	if (!listen[0] || !listen[1]) throw new Error('The required "listen" parameter must be of the form "host:port". For example, "192.168.0.10:28262" or "https://domain.com:28262".');
	if (listen[0] === 'http' || listen[0] === 'https') {
		const { port, hostname } = new URL(config.listen);
		config.prot = listen[0];
		config.host = hostname;
		config.port = port || '28262';
	} else {
		config.prot = 'http';
		config.host = listen[0];
		config.port = listen[1] || '28262';
	}
	config.port = parseInt(config.port);
} catch(e) {
	if (config.log) console.log(e);
	process.exit(1);
}

const rl = new nzrl(config);
const requestListener = (async (req, res) => {
	rl.requestListener(req, res);
});

if (!config.log) process.stdout.write('\x1Bc');
console.log('\x1b[7m%s\x1b[0m', 'nzserver');
console.log(process.platform + '/' + process.arch);
console.log('pid ' + process.ppid);
var childProcess = require('child_process');
var dir_server = __dirname;
console.log(childProcess.execSync(`cd ${dir_server} && npm list`).toString());

if (config.prot === 'https' && config.key && config.cert) {
	const fs = require('fs');
	const options = {
		key: fs.readFileSync(config.key),	// private-key.pem (or privkey.pem for certbot)
		cert: fs.readFileSync(config.cert)	// certificate.pem (or fullchain.pem for certbot)
	};
	const https = require('https');
	https.createServer(options, requestListener).listen(config.port, config.host, () => {
		console.log('\x1b[7m%s\x1b[0m', `Server is running on ${config.prot}://${config.host}:${config.port}`);
	});
} else {
	const http = require('http');
	http.createServer(requestListener).listen(config.port, config.host, () => {
		console.log('\x1b[7m%s\x1b[0m', `Server is running on ${config.prot}://${config.host}:${config.port}`);
	});
}
