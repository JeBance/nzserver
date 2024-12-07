#!/usr/bin/env node
let config = {
	autoDel: 0,
	log: true
};
const process = require('process');
const nzcli = require('nzcli');
const nzconfig = require('nzconfig');
const fs = require('fs');
const { getHASH,
		hasPGPstructure,
		hasJsonStructure } = require('nzfunc');
const nzmessage = require('nzmessage');
const nznode = require('nznode');
const cli = new nzcli(config, process);

if ((config.config !== undefined) && (typeof config.config === 'string')) {
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
	if (config.log) console.log('Error:', e);
	process.exit(1);
}

let MESSAGE = new nzmessage(config);
MESSAGE.autoDel();

let NODE = new nznode(config);
(async () => { config.keyID = await NODE.getNodeHash(config) })();
NODE.firstNodeSearch();
NODE.searchNodesInLocalNetwork();
NODE.checkNodes(MESSAGE);

process.stdout.write('\x1Bc');
console.log('\x1b[7m%s\x1b[0m', 'nzserver');
console.log(process.platform + '/' + process.arch);
console.log('pid ' + process.ppid);

const requestListener = (async (req, res) => {
	let nonce = new Date().getTime();
	res.setHeader('Content-Type', 'application/json');

	if (req.method == 'POST') {

		const buffers = [];
		for await (const chunk of req) {
			buffers.push(chunk);
		}
		const data = Buffer.concat(buffers).toString();
		let hash = await getHASH(data, 'md5');

		// command messages (for interaction between nodes)
		if (hasJsonStructure(data) === true) {
			res.writeHead(200);
			res.end(JSON.stringify({result:'Data successfully received'}));
			req = JSON.parse(data);
			if (config.log) console.log(req);

			// handshake
			if (req.hasOwnProperty('handshake') === true) {
				try {
					let senderHash = await getHASH(JSON.stringify(req.handshake), 'md5');
					if (NODE.nodes[senderHash]) throw new Error('The node is already in the list of known nodes.');
					if (req.handshake.net !== config.net) throw new Error('The node does not match the selected network.');
					let senderNodeInfo = await NODE.getInfo(req.handshake);
					if (!senderNodeInfo) throw new Error('Failed to get information from node ' + req.handshake.host + ':' + req.handshake.port);
					if (req.handshake.net !== senderNodeInfo.net) throw new Error();
					await NODE.add({
						keyID: senderHash,
						net: req.handshake.net,
						prot: req.handshake.prot,
						host: req.handshake.host,
						port: req.handshake.port,
						ping: senderNodeInfo.ping
					});
				} catch(e) {
					if (config.log) console.log('Error:', e);
				}

			// newMessage
			} else if (req.hasOwnProperty('newMessage') === true) {
				try {
					if (!(await MESSAGE.checkMessageStructure(req.newMessage))
					|| MESSAGE.list[req.newMessage.hash] !== undefined) throw new Error();
					let currentTime = new Date().getTime();
					let infoNode = await NODE.getInfo({
						prot: req.newMessage.prot,
						host: req.newMessage.host,
						port: req.newMessage.port
					});
					let inequal = currentTime - (infoNode.time + infoNode.ping);
					if (!hasPGPstructure(req.newMessage.message)
					|| (MESSAGE.hasExpired(req.newMessage.timestamp))
					|| !((req.newMessage.timestamp + inequal) < currentTime)
					|| (infoNode.net !== config.net)) throw new Error();
					await MESSAGE.add(req.newMessage);
					req.newMessage.prot = config.prot;
					req.newMessage.host = config.host;
					req.newMessage.port = config.port;
					await NODE.sendMessageToAll({ newMessage: req.newMessage });
				} catch(e) {
					if (config.log) console.log('Error:', e);
				}
			}

		// encrypted messages (just save and give)
		} else if (hasPGPstructure(data)) {
			res.writeHead(200);
			try {
				if (MESSAGE.list[hash] !== undefined) throw new Error('The message is already in the list of known messages.');
				res.end(JSON.stringify({
					result: 'Data successfully received',
					hash: hash,
					timestamp: nonce
				}));
				let message = {
					prot: config.prot,
					host: config.host,
					port: config.port,
					hash: hash,
					timestamp: nonce,
					message: data
				};
				await MESSAGE.add(message);
				await NODE.sendMessageToAll({ newMessage: message });
			} catch(e) {
				let message = await MESSAGE.getMessage(hash);
				res.end(JSON.stringify({
					result: 'Data successfully received',
					hash: hash,
					timestamp: message.timestamp
				}));
				if (config.log) console.log('Error:', e);
			}

		} else {
			res.writeHead(500);
			res.end(JSON.stringify({error:'Invalid request'}));
		}

	} else {

		let url = (req.url).split('?');
		let args = {};
		if (typeof url[1] === 'string') {
			args = url[1].split('&');
		} else {
			args = false;
		}

		switch (url[0]) {
			case '/':
			case '/index.html':
			case '/info':
				let info = JSON.stringify({
					net: config.net,
					prot: config.prot,
					host: config.host,
					port: config.port,
					time: new Date().getTime(),
					autoDel: config.autoDel,
					firstMessage: MESSAGE.getFirstMessageHash(),
					lastMessage: MESSAGE.getLastMessageHash()
				});
				res.writeHead(200);
				res.end(info);
				break
			case '/getNodes':
				res.writeHead(200);
				res.end(JSON.stringify(NODE.nodes));
				break
			case '/getMessages':
				res.writeHead(200);
				res.end(JSON.stringify(MESSAGE.list));
				break
			case '/getMessage':
				try {
					let message = await MESSAGE.getMessage(args[0]);
					if (!message) throw new Error();
					res.writeHead(200);
					res.end(JSON.stringify(message));
				} catch(e) {
					res.writeHead(404);
					res.end(JSON.stringify({error:'Resource not found'}));
				}
				break
			default:
				res.writeHead(404);
				res.end(JSON.stringify({error:'Resource not found'}));
		}

	}

});



const http = require('http');
const https = require('https');
if (config.prot === 'https' && config.key && config.cert) {
	const options = {
		key: fs.readFileSync(config.key),	// private-key.pem (or privkey.pem for certbot)
		cert: fs.readFileSync(config.cert)	// certificate.pem (or fullchain.pem for certbot)
	};
	// create server
	https.createServer(options, requestListener).listen(config.port, config.host, () => {
		console.log('\x1b[7m%s\x1b[0m', `Server is running on ${config.prot}://${config.host}:${config.port}`);
	});
} else {
	// create server
	http.createServer(requestListener).listen(config.port, config.host, () => {
		console.log('\x1b[7m%s\x1b[0m', `Server is running on ${config.prot}://${config.host}:${config.port}`);
	});
}

