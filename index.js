#!/usr/bin/env node
const param = {
	config: null,
	db: null,
	net: null,
	host: null,
	port: null,
	user: null,
	mail: null,
	pass: null,
	autoDel: null
};
const process = require('process');
const nzcli = require('nzcli');
const cli = new nzcli(param, process);

const letsconfig = require('letsconfig');
const config = new letsconfig({
	DB: param.db,
	net: param.net,
	host: param.host,
	port: param.port,
	passphrase: param.pass,
	secureKey: null,
	autoDel: Number(param.autoDel)
}, param.config, 'config.json');

const nzfsdb = require('nzfsdb');
const DB = new nzfsdb(config.DB);
if (!DB.checkExists()) process.exit(1);

const http = require('http');
const URL = require('url');

const securePGPstorage = require('secure-pgp-storage');
const PGP = new securePGPstorage();

const { getHASH,
		hasJsonStructure,
		isUrlValid,
		isIPv4withTCPportValid,
		doRequest,
		getResponse } = require('nzfunc');

process.stdout.write('\x1Bc');
console.log('\x1b[7m%s\x1b[0m', 'nzserver');
console.log(process.platform + '/' + process.arch);
console.log('pid ' + process.ppid);

const nznode = require('nznode');
let NODE = new nznode(config, DB, PGP);

const nzmessage = require('nzmessage');
let MESSAGE = new nzmessage(config, DB);



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
//					let { decrypted, result } = await NODE.senderCommandVerification(req.handshake);
//					console.log(decrypted);
//					console.log(result);
					let decrypted = await PGP.decryptMessage(req.handshake);
					if (decrypted) {
						let senderKeyID, senderPublicKeyArmored;
						senderKeyID = decrypted.signatures[0].keyID.toHex();
						if (NODE.nodes[senderKeyID]) {
							senderPublicKeyArmored = await DB.read('nodes', senderKeyID);
							decrypted = await PGP.decryptMessage(req.handshake, senderPublicKeyArmored);
							await decrypted.signatures[0].verified; // throws on invalid signature
						}
						// update node key
						if (hasJsonStructure(decrypted.data) === true) {
							decrypted = JSON.parse(decrypted.data);
							if ((decrypted.hasOwnProperty('host') === true)
							&& (decrypted.hasOwnProperty('port') === true)) {
								let info = await NODE.getInfo({
									host: decrypted.host,
									port: decrypted.port
								});
								if (info.publicKey) {
									let key = await PGP.readKey(info.publicKey);
									if (key) {
										newSenderKeyID = key.getKeyID().toHex();
										if (((NODE.nodes[senderKeyID]) && (senderKeyID !== newSenderKeyID))
										|| (!NODE.nodes[senderKeyID])) {
											await NODE.add({
												keyID: newSenderKeyID,
												host: decrypted.host,
												port: decrypted.port,
												ping: info.ping,
												publicKey: info.publicKey
											});
										}
										if ((NODE.nodes[senderKeyID])
										&& (senderKeyID !== newSenderKeyID)) {
											await NODE.remove(senderKeyID);
										}
									}
								}
							}
						}
					}
				} catch(e) {
//					console.log(e);
				}

			// newMessage
			} else if (req.hasOwnProperty('newMessage') === true) {
				try {
					let { decrypted, result } = await NODE.senderCommandVerification(req.newMessage);
					if (!result) throw new Error();
					req.newMessage = decrypted.data
					if (!MESSAGE.checkMessageStructure(req.newMessage)
					|| MESSAGE.messages[req.newMessage.hash] !== undefined) throw new Error();
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
					let command = JSON.stringify({
						host: config.host,
						port: config.port,
						hash: req.newMessage.hash,
						timestamp: req.newMessage.timestamp,
						message: req.newMessage.message
					});
					let encrypted = await PGP.encryptMessage(command, PGP.publicKeyArmored, true);
					await NODE.sendMessageToAll({ newMessage: encrypted });
				} catch(e) {
//					console.log(e);
				}
			}

		// encrypted messages (just save and give)
		} else if (await PGP.checkMessage(data)) {
			res.writeHead(200);
			res.end(JSON.stringify({result:'Data successfully received'}));
			try {
				if (MESSAGE.messages[hash] !== undefined) throw new Error();
				let message = {
					host: config.host,
					port: config.port,
					hash: hash,
					timestamp: nonce,
					message: data
				};
				await MESSAGE.add(message);
				// create the command "newMessage"
				let command = JSON.stringify(message);
				let encrypted = await PGP.encryptMessage(command, PGP.publicKeyArmored, true);
				await NODE.sendMessageToAll({ newMessage: encrypted });
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
				res.end(JSON.stringify(MESSAGE.messages));
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



const server = http.createServer(requestListener);



const checkingKeychain = new Promise((resolve, reject) => {
	// when you generate keychain
	// if you see:
	// error:25066067:DSO support routines:dlfcn_load:could not load the shared library
	// then run:
	// export OPENSSL_CONF=/dev/null
	try {
		(async () => {
			if ((param.user != null && typeof param.user !== "undefined")
			|| (param.mail != null && typeof param.mail !== "undefined")
			|| (param.pass != null && typeof param.pass !== "undefined")) {
				console.log('Generate keychain...');

				(async () => {
					await PGP.createStorage(param.user, param.mail, param.pass);
					console.log('publicKey generated successfully ✔️');
					console.log('privateKey generated successfully ✔️');
					config.passphrase = param.pass;
					let encryptedStorage = await PGP.encryptStorage();
					config.secureKey = encryptedStorage;
					config.writeConfigFile();
					console.log('Keychain saved successfully ✔️');
					resolve(true);
				})();

			} else {

				console.log('Checking keychain...')
				if ((await PGP.checkMessage(config.secureKey))
				&& (await PGP.decryptStorage(config.secureKey, config.passphrase))) {
					console.log('Keychain available ✔️');
					resolve(true);
				} else {
					console.log('\x1b[1m%s\x1b[0m', 'Missing keychain ❌');
					console.error('\x1b[1m%s\x1b[0m', 'Run the server with the DB, Host, Port, Nickname, Email and Passphrase parameters. For example: ` nzserver config db="/home/Username/DB/" host="http://mydomain.com" port="28262" user="User Name" mail="myemail@somemail.com" pass="1q2w3e" `.');
					process.exit(1);
				}

			}
		})();
	} catch(e) {
		console.error('\x1b[1m%s\x1b[0m', `Failed to create keychain: ${e}`);
		process.exit(1);
	}
});



checkingKeychain
	.then((value) => {
		server.listen(config.port, config.host, () => {
			console.log('\x1b[7m%s\x1b[0m', `Server is running on http://${config.host}:${config.port}`);
		});
	})



if (param.autoDel !== undefined) config.autoDel = Number(param.autoDel);
if (config.autoDel !== null) {
	console.log('Automatic message deletion enabled (' + config.autoDel + ' min)');
	let checkingMessages = setInterval(async () => {
		let currentTime = new Date().getTime();
		let keys = Object.keys(MESSAGE.messages);
		for (let i = 0, l = keys.length; i < l; i++) {
			if (MESSAGE.hasExpired(MESSAGE.messages[keys[i]])) {
				await MESSAGE.remove(keys[i]);
			}
		}
	}, 1000);
}


let checkingNodes = setInterval(async () => {
	await NODE.checkingNodes();
}, 10000);

if (param.scan !== undefined && param.scan === 'on') {
	console.log('Network scan started');
	let searchingNodes = setInterval(async () => {
		await NODE.searchingNodes();
	}, 1000);
}

if (param.update !== undefined && param.update === 'on') {
	console.log('Message update started');
	(async () => {
		let messages;
		let keys = Object.keys(NODE.nodes);
		for (let i = 0, l = keys.length; i < l; i++) {
			messages = await NODE.getMessages(NODE.nodes[keys[i]]);
			await MESSAGE.updateMessages(messages, NODE.nodes[keys[i]], NODE);
		}
	})();
}

