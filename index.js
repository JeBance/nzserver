#!/usr/bin/env node
const param = {
	config: null,
	db: null,
	net: null,
	host: null,
	port: null,
	user: null,
	mail: null,
	pass: null
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
	secureKey: null
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

let knownMessages = JSON.parse(DB.read(null, 'messages.json'));
if (!knownMessages) knownMessages = {};



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
			} else if ((req.hasOwnProperty('newMessage') === true)
			&& (req.newMessage.hasOwnProperty('hash') === true)
			&& (req.newMessage.hasOwnProperty('message') === true)
			&& (req.newMessage.hasOwnProperty('timestamp') === true)
			&& ((await DB.validateName(req.newMessage.hash)) === true)
			&& (Number.isInteger(req.newMessage.timestamp))
			&& (req.newMessage.hash === getHASH(req.newMessage.message, 'md5'))
			&& (knownMessages[req.newMessage.hash] === undefined)) {
				try {
					let currentTime = new Date().getTime();
					let infoNode = await NODE.getInfo({
						host: req.newMessage.host,
						port: req.newMessage.port
					});
					let inequal = currentTime - (infoNode.time + infoNode.ping);
					if (((await PGP.checkMessage(req.newMessage.message)) === true)
					&& (req.newMessage.timestamp > (currentTime - 900000))
					&& ((req.newMessage.timestamp + inequal) < currentTime)) {
						console.log('\x1b[1m%s\x1b[0m', 'New message:', req.newMessage.hash + ':', req.newMessage.timestamp);
						knownMessages[req.newMessage.hash] = req.newMessage.timestamp;
						await DB.write('messages', req.newMessage.hash, req.newMessage.message);
						await DB.write(null, 'messages.json', JSON.stringify(knownMessages));
						await NODE.sendMessageToAll({
							newMessage: {
								host: config.host,
								port: config.port,
								hash: req.newMessage.hash,
								timestamp: req.newMessage.timestamp,
								message: req.newMessage.message
							}
						});
					}
				} catch(e) {
//					console.log(e);
				}
			}

		// encrypted messages (just save and give)
		} else if ((await PGP.checkMessage(data)) === true) {
			res.writeHead(200);
			res.end(JSON.stringify({result:'Data successfully received'}));
			if (knownMessages[hash] === undefined) {
				console.log('\x1b[1m%s\x1b[0m', 'New message:', hash + ':', nonce);
				knownMessages[hash] = nonce;
				await DB.write('messages', hash, data);
				await DB.write(null, 'messages.json', JSON.stringify(knownMessages));
				await NODE.sendMessageToAll({
					newMessage: {
						host: config.host,
						port: config.port,
						hash: hash,
						timestamp: nonce,
						message: data
					}
				});
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
				res.end(JSON.stringify(knownMessages));
				break
			case '/getMessage':
				try {
					if ((args[0]) && (knownMessages[args[0]])) {
						let message = {
							hash: args[0],
							timestamp: knownMessages[args[0]],
							message: await DB.read('messages', args[0])
						};
						res.writeHead(200);
						res.end(JSON.stringify(message));
					} else {
						throw new Error();
					}
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



let checkingMessages = setInterval(async () => {
	let currentTime = new Date().getTime();
	let keys = Object.keys(knownMessages);
	for (let i = 0, l = keys.length; i < l; i++) {
		if (knownMessages[keys[i]] < (currentTime - 900000)) {	// 15 min
			// deleting old messages
			await DB.delete('messages', knownMessages[keys[i]]);
			delete knownMessages[keys[i]]
		}
	}
}, 10000);



let checkingNodes = setInterval(async () => {
	await NODE.checkingNodes();
}, 10000);

if (param.scan !== undefined && param.scan === 'on') {
	console.log('Network scan started');
	let searchingNodes = setInterval(async () => {
		await NODE.searchingNodes();
	}, 1000);
}


/*
const process = require('process');
console.log('nzserver');
console.log('just test');

class nzserver {
	test;

	constructor() {
		if (process.argv[0] != null && typeof process.argv[0] !== "undefined") console.log(process.argv[0]);
		if (process.argv[1] != null && typeof process.argv[1] !== "undefined") console.log(process.argv[1]);
		if (process.argv[2] != null && typeof process.argv[2] !== "undefined") console.log(process.argv[2]);
		if (process.argv[3] != null && typeof process.argv[3] !== "undefined") console.log(process.argv[3]);
		if (process.argv[4] != null && typeof process.argv[4] !== "undefined") console.log(process.argv[4]);
		if (process.argv[5] != null && typeof process.argv[5] !== "undefined") console.log(process.argv[5]);
		if (process.argv[6] != null && typeof process.argv[6] !== "undefined") console.log(process.argv[6]);
		console.log('Hello NZ!!! =))');
	}
	
	testMe() {
		console.log('Ok');
	}
}

const NZS = new nzserver(process);

module.exports = nzserver;
*/
