# nzserver
[nzserver](https://jebance.github.io/nzserver/) is a decentralized service for delivering encrypted messages.

**Table of Contents**

- [nzserver](#nzserver)
	- [Getting started](#getting-started)
		- [Node.js](#nodejs)
		- [Configuring the server](#configuring-the-server)
		- [Additional options when starting the server](#additional-options-when-starting-the-server)
	- [API](#api)
	- [GET requests](#get-requests)
		- [info](#info)
		- [getNodes](#getNodes)
		- [getMessages](#getMessages)
		- [getMessage](#getMessage)
	- [POST requests](#post-requests)
		- [handshake](#handshake)
		- [newMessage](#newMessage)
	- [Receiving messages from the client](#receiving-messages-from-the-client)
	- [License](#license)

### nzserver

* The server accepts, stores and deletes after a specified time PGP messages of the type: `-----BEGIN PGP MESSAGE----- ... -----END PGP MESSAGE-----`.

* The server uses a system of nodes to replicate incoming messages.

* The server can be used both in internal and external networks.

* The server can be run on a separate network of nodes.

* The `index.js` package works well in Node.js. It is used by default when you `nzserver listen="http://domain.com:port" net="ALPHA"` in the terminal.


### Getting started

#### Node.js

Install NodeJS 23.X:

```sh
sudo apt update && sudo apt upgrade
curl -fsSL https://deb.nodesource.com/setup_23.x | sudo -E bash -
sudo apt install nodejs
node -v && npm -v
```

Install nzserver using npm:

```sh
npm install -g nzserver
```

Or update nzserver using npm:

```sh
npm update -g nzserver
```

#### Configuring the server

When starting the server, use the `key="value"` arguments to pass parameters.

```sh
nzserver listen="http://domain.com:port" net="ALPHA"
```

or

```sh
nzserver listen="IP_address:port" net="ALPHA"
```

Required parameters for server configuration:

`listen` - server address in the external network. For example, `192.168.1.10:28262` or `http://domain.com:16556`.

`net` - name of the network of nodes. Nodes from "ALPHA" network do not communicate with nodes from "SIGMA" network.

#### Additional options when starting the server

`scan` - scanning the local network for other nodes with port `28262`. Use `scan="on"` to turn on.

`autoDel` - automatically delete messages after a specified time in minutes. Use `autoDel="15"` to set the time parameter. Autodelete is disabled by default.

`key` - is the absolute path to the private key file. For example, `key="/test/keys/privkey.pem"`.

`cert` - is the absolute path to the certificate file. For example, `cert="/test/keys/fullchain.pem"`.

`config` - absolute path to the configuration file. For example, `config="/home/user/nz/config.json"`. The first time you run it, a configuration file will be created with all the parameters entered. Subsequently, you can run the server with only the config parameter to load the saved parameters.

`db` - absolute path to the database folder. For example, `db="/home/user/nz/DB/"`. If this parameter is missing, the data is stored in RAM while the program is running and is not saved to disk.

`log` - display information and errors that occur during server operation. By default, `true`. To disable, enter `log="false"`.

### API

The server uses two types of requests: GET and POST. GET requests are used to update information. POST requests are used to send commands between nodes and receive PGP messages. The server responds to all requests in json format.

### GET requests

Use host + port + request name for GET request. For example, `http://domain.com:28262/info` or `192.168.1.10:28262/getNodes`.

#### info

`info` - returns node information.

```sh
curl 192.168.1.10:28262/info
```

```json
{
  "keyID": "0fa208709bdbe958016d4c72bf61c7a5",
  "net": "ALPHA",
  "prot": "https",
  "host": "jebance.ru",
  "port": 28262,
  "time": 1738030657608,
  "autoDel": 0,
  "autoCheckNodes": 1000,
  "autoCheckMessages": 10000,
  "firstMessage": {
    "hash": "095f5a0566a3ff1dd76aad2400fdc938",
    "timestamp": 1733839298941
  },
  "lastMessage": {
    "hash": "e3ffc0c8d9cc447ecab3e5e577ef6803",
    "timestamp": 1737461752833
  }
}
```

#### getNodes

`getNodes` - returns known nodes.

```sh
curl 192.168.1.10:28262/getNodes
```

```json
{
  "cebbe3fb84d4977184ce954777528321": {
    "net": "ALPHA",
    "prot": "http",
    "host": "194.87.214.40",
    "port": 28262,
    "ping": 13
  }
}
```

#### getMessages

`getMessages` - returns known messages.

```sh
curl 192.168.1.10:28262/getMessages
```

```json
{
  "095f5a0566a3ff1dd76aad2400fdc938": 1733839298941,
  "ac4b925d4b5cbdbe266b4681744dc1fe": 1733839318859,
  "8d03e97aa504f42c2933395326f20af9": 1733839347377,
  "63dae3412e6bce006de61760b7ae92cf": 1737033651927,
  "f7b655809c0110410b4cf5de7ac2dd55": 1737037308098,
  "8cc4b4f49b52d24a515e34733c615ccd": 1737202197983,
  "b2d5f0b74cc92d8439f2dcdebe266669": 1737377676786,
  "f6c643f3cb27c7d8464a7f3a19896cb6": 1737377759899,
  "70d3f070453be3c9cbebf6e83325ed80": 1737377847852,
  "755cf1b98c75c96a0b440ba0cadf3b0e": 1737461464210,
  "e3ffc0c8d9cc447ecab3e5e577ef6803": 1737461752833
}
```

#### getMessage

`getMessage` - returns the message body.

```sh
curl 192.168.1.10:28262/getMessage?755cf1b98c75c96a0b440ba0cadf3b0e
```

```json
{
  "hash": "755cf1b98c75c96a0b440ba0cadf3b0e",
  "timestamp": 1737461464210,
  "message": "-----BEGIN PGP MESSAGE-----\n\nwV4DnvIUAxOdiVsSAQdAX1UpS6hzW2iJHW1GJBAdvUYsUFa1rVaGL9b3PYQ7\nogMwrK+RAJJQ4q+KxEh844o0EnB6R95OXrxNAIaTF3TW5fSYCah5YuWYMK2s\nHf6zRwsX0sBJAfom93A4yTcfU2Atrz8iz3ZHjfYrqu2KMN7E6rFJokk09G58\nlXQmKr6svriBctEbzU1J0msCjTvplb2+VJPRQi3WlDMLXCb34BFGG2M0SY3J\n0PF628MJKijebZMX6O0l33jZNQcjjJaWsnvUyp34ageGuj2JC1c+9qD81Uu9\nNvxQGrQPldyFLkDFcNH/RPMAciphspYiGVjg6uFbivDhzd8BcltrnCss2IfQ\nh3iA/dsO6TMyVor8fygNlSEyGf9aaiW6cPKW84UVh318DzgJeuYz0FyJTwLf\n/kL8xRs0He4uenDML98BiCCEQDOzGVefzf8t1vupneAcfgRawAebmF3li0Ao\n4RvQYw==\n=lW1H\n-----END PGP MESSAGE-----\n"
}
```


### POST requests


#### handshake

`handshake` - is used to send your host and port.

```js
const jsonRequest = {
	handshake: {
		net: 'ALPHA',
		prot: 'http',
		host: '194.87.214.40',
		port: 28262
	}
};

(async () => {
	try {
		let url = 'https://jebance.ru:28262/';
		let response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': (JSON.stringify(jsonRequest)).length
			},
			body: (JSON.stringify(jsonRequest))
		});
		console.log(response);
		if (response.ok) console.log(await response.json());
	} catch(e) {
		console.error(e);
	}
})();
```

#### newMessage

`newMessage` - used to transmit a received new message to other nodes in the network.

```js
const crypto = require('crypto');

const message = `-----BEGIN PGP MESSAGE-----

wV4DBQGY4mV2fjoSAQdAJaKBeO3RMxtv7p4oHwk79SfhYa0ocXf06zRoH6Ly
LFowIojl8OwzQ6uI2D5boP+eq4PmcxLyRWY+YUvm/ydWp5P6E9VOcquwRDaA
Wv93jjrk0sAAASsrDUF6gk3Xhx51keQK4MLUr/LMzCIZdzXcoosu8dRg0yB4
UQnTPF0vfhBkoMQJLkvxSnbdaUrWDOlLjKP2mhFm3aIQEIcGlZaMLt/TA78w
hzviZ2oJs9HmyZom88qUFz1ieC20tna8DgiosH8vfwmF+LH8nDm1Vsubiudj
KApD6/lHcnJJ5XHVokBtx2H864eIc2JjwlPNKYgrHxe+2Jxoj6a+CgmiHGIl
PsPeg1YsDf5xGdIlB1ksl3kF/URe
=ciNI
-----END PGP MESSAGE-----`;

const hash = crypto.createHash('md5').update(message).digest('hex');

const jsonRequest = {
	newMessage: {
		net: 'ALPHA',
		prot: 'https',
		host: 'jebance.ru',
		port: 28262,
		hash: hash,
		timestamp: new Date().getTime(),
		message: message
	}
};

(async () => {
	try {
		let url = 'https://jebance.ru:28262/';
		let response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': (JSON.stringify(jsonRequest)).length
			},
			body: (JSON.stringify(jsonRequest))
		});
		console.log(response);
		if (response.ok) console.log(await response.json());
	} catch(e) {
		console.error(e);
	}
})();
```


### Receiving messages from the client

For messages received from the client, the POST request header must contain `'Content-Type': 'text/html'`.

```js
const message = `-----BEGIN PGP MESSAGE-----

MN4090GJNdkoijglfdfkcsdergfregev7p4oHwk79SfhYa0ocXf06zRoH6Ly
KFowIojl8OwzQ6uI2D5boP+eq4PmcxLyRWY+YUvm/ydWp5P6E9VOcquwRDaA
WssddsvedrgvfSsrDUF6gk3Xhx51keQK4MLUr/LMzCIZdzXcoosu8dRg0yB4
UUUTPF0vfhBkoMQJLkvxSnbdaUrWDOlLjKP2mhFm3aIQEIcGlZaMLt/TA78w
hzviZ2oJs9HmyZom88qUFz1ieC20tna8DgiosH8vfwmF+LH8nDm1Vsubiudj
KApD6/lHcnJJ5XHVokBtx2H864eIc2JjwlPNKYgrHxe+2Jxoj6a+CgmiHGIl
PsPeg1YsDf5xGdIlB1ksl3kF/URe
=ciNI
-----END PGP MESSAGE-----`;

console.log(message.slice(0,27));
console.log(message.slice(message.length - 25));

if ((message.slice(0,27) === '-----BEGIN PGP MESSAGE-----')
&& (message.slice(message.length - 25) === '-----END PGP MESSAGE-----')) {
	console.log('Message has PGP structure');
}

(async () => {
	try {
		let url = 'http://194.87.214.40:28262/';
		let response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'text/html',
				'Content-Length': message.length
			},
			body: message
		});
		console.log(response);
		if (response.ok) console.log(await response.json());
	} catch(e) {
		console.error(e);
	}
})();
```

### License

[GNU Lesser General Public License](https://www.gnu.org/licenses/lgpl-3.0.en.html) (3.0 or any later version). Please take a look at the [LICENSE](LICENSE) file for more information.
