#!/usr/bin/env node
const config = {
	listen: null,
	net: null,
	host: null,
	port: null,
	autoDel: null
};
const process = require('process');
const nzcli = require('nzcli');
const cli = new nzcli(config, process);

if (!config.listen) {
	console.error('The required parameter "listen" is missing.');
	process.exit(1);
}

if (!config.net) {
	console.error('The required parameter "net" is missing.');
	process.exit(1);
}

const listen = config.listen.split(':');
if (listen[0] && listen[1]) {
	config.host = listen[0];
	config.port = listen[1];
} else {
	console.error('The required "listen" parameter must be of the form "host:port". For example, "192.168.0.10:28262" or "https://domain.com:28262".');
	process.exit(1);
}

const http = require('http');

const securePGPstorage = require('secure-pgp-storage');
const PGP = new securePGPstorage();

const { getHASH,
		hasJsonStructure,
		doRequest,
		getResponse } = require('nzfunc');

const nznode = require('nznode');
let NODE = new nznode(config);

const nzmessage = require('nzmessage');
let MESSAGE = new nzmessage(config);

//process.stdout.write('\x1Bc');
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
		let hash = getHASH(data, 'md5');

		// command messages (for interaction between nodes)
		if (hasJsonStructure(data) === true) {
			res.writeHead(200);
			res.end(JSON.stringify({result:'Data successfully received'}));
			req = JSON.parse(data);

			// handshake
			if (req.hasOwnProperty('handshake') === true) {
				try {
					let senderHash = getHASH(JSON.stringify(req.handshake), 'md5');
					if (NODE.nodes[senderHash]) throw new Error();
					if (!req.handshake.hasOwnProperty('net')) throw new Error();
					if (req.handshake.net !== config.net) throw new Error();
					if (!req.handshake.hasOwnProperty('host')) throw new Error();
					if (!req.handshake.hasOwnProperty('port')) throw new Error();
					await NODE.add({
						keyID: senderHash,
						net: req.handshake.net,
						host: req.handshake.host,
						port: req.handshake.port
					});
				} catch(e) {
//					console.log(e);
				}

			// newMessage
			} else if (req.hasOwnProperty('newMessage') === true) {
				try {
					if (!MESSAGE.checkMessageStructure(req.newMessage)
					|| MESSAGE.list[req.newMessage.hash] !== undefined) throw new Error();
					let currentTime = new Date().getTime();
					let infoNode = await NODE.getInfo({
						host: req.newMessage.host,
						port: req.newMessage.port
					});
					let inequal = currentTime - (infoNode.time + infoNode.ping);
					if (((await PGP.checkMessage(req.newMessage.message)) !== true)
					|| (MESSAGE.hasExpired(req.newMessage.timestamp))
					|| !((req.newMessage.timestamp + inequal) < currentTime)) throw new Error();
					await MESSAGE.add(req.newMessage);
					req.newMessage.host = config.host;
					req.newMessage.port = config.port;
					await NODE.sendMessageToAll({ newMessage: req.newMessage });
				} catch(e) {
//					console.log(e);
				}
			}

		// encrypted messages (just save and give)
		} else if (await PGP.checkMessage(data)) {
			res.writeHead(200);
			res.end(JSON.stringify({result:'Data successfully received'}));
			try {
				if (MESSAGE.list[hash] !== undefined) throw new Error();
				let message = {
					host: config.host,
					port: config.port,
					hash: hash,
					timestamp: nonce,
					message: data
				};
				await MESSAGE.add(message);
				await NODE.sendMessageToAll({ newMessage: message });
			} catch(e) {
//				console.log(e);
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
			case '/info':
				let info = JSON.stringify({
					net: config.net,
					host: config.host,
					port: config.port,
					time: new Date().getTime(),
					fingerprint: PGP.fingerprint,
					publicKey: PGP.publicKeyArmored
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
					let message = MESSAGE.getMessage(args[0]);
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



const server = http.createServer(requestListener);
server.listen(config.port, config.host, () => {
	console.log('\x1b[7m%s\x1b[0m', `Server is running on http://${config.host}:${config.port}`);
});



if (config.autoDel !== undefined) config.autoDel = Number(config.autoDel);
if (config.autoDel !== null && config.autoDel !== 0) {
	console.log('Automatic message deletion enabled (' + config.autoDel + ' min)');
	let checkingMessages = setInterval(async () => {
		let currentTime = new Date().getTime();
		let keys = Object.keys(MESSAGE.list);
		for (let i = 0, l = keys.length; i < l; i++) {
			if (MESSAGE.hasExpired(MESSAGE.list[keys[i]])) {
				MESSAGE.remove(keys[i]);
			}
		}
	}, 1000);
}

let checkingNodes = setInterval(async () => {
	await NODE.checkingNodes();
}, 5000);

if (config.scan !== undefined && config.scan === 'on') {
	console.log('Local network scan started');
	NODE.searchingNodes();
}

(async () => {
	console.log('Message update started');
	let messages = {};
	let keys = Object.keys(NODE.nodes);
	for (let i = 0, l = keys.length; i < l; i++) {
		messages = await NODE.getMessages(NODE.nodes[keys[i]]);
		await MESSAGE.updateMessages(messages, NODE.nodes[keys[i]], NODE);
	}
})();

