# nzserver
[nzserver](https://jebance.github.io/nzserver/) is a decentralized service for delivering encrypted messages.

**Table of Contents**

- [nzserver](#nzserver)
    - [Getting started](#getting-started)
        - [Node.js](#nodejs)
        - [Configuring the server](#configuring-the-server)
        - [Starting a configured server](#starting-a-configured-server)
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
    - [License](#license)

### nzserver

* The server accepts, stores and deletes after a specified time PGP messages of the type: `-----BEGIN PGP MESSAGE----- ... -----END PGP MESSAGE-----`.

* The server uses a system of nodes to replicate incoming messages.

* The server can be used both in internal and external networks.

* The server can be run on a separate network of nodes.

* The `index.js` package works well in Node.js. It is used by default when you `nzserver config=/some/path/to/config/` in the terminal.


### Getting started

#### Node.js

Install nzserver using npm:

```sh
npm install -g nzserver
```

Or update nzserver using npm:

```sh
npm update -g nzserver
```

#### Configuring the server

The first launch requires configuring the server. Use `key="value"` arguments to pass parameters.

```sh
nzserver config="/home/user/somedir/" db="/home/user/somedir/DB/" net="ALPHA" host="192.168.1.10" port="28262" user="User Name" mail="username@somemail.com" pass="strongpassphrase"
```

Required parameters for server configuration:

`config` - path to the directory where the `config.json` configuration file will be stored.

`db` - path to the directory where the nosql database will be stored.

`net` - name of the network of nodes. Nodes from "Alpha" network do not communicate with nodes from "Sigma" network.

`host` - host that will listen to the server. For example, `192.168.1.10` or `http://domain.com`.

`port` - port the server will listen to.

`user` - name or nickname of the server administrator. Will be used to generate a PGP key.

`mail` - email address of the server administrator. Will be used to generate a PGP key.

`pass` - a strong passphrase for the PGP key.

#### Starting a configured server
After configuring the server, the server can be started with the required `config` parameter.

```sh
nzserver config="/home/user/somedir/"
```

#### Additional options when starting the server
`scan` - scanning the local network for other nodes with port `28262`. Use `scan="on"` to turn on.


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
  "net": "ALPHA",
  "host": "192.168.1.10",
  "port": "28262",
  "time": 1731683656118,
  "fingerprint": "df4b30f8a8e5022b9b114d606bc7041747b9f2c9",
  "publicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZzdZGBYJKwYBBAHaRw8BAQdAaL0zH5vQmG1KKKfzyCIPEtlaBY/A/74w\n6hwIUVjrMK/NJU9sZWcgUHJ1ZGtvdiA8b2xlZy5wcnVka292QGdtYWlsLmNv\nbT7CjAQQFgoAPgWCZzdZGAQLCQcICZBrxwQXR7nyyQMVCAoEFgACAQIZAQKb\nAwIeARYhBN9LMPio5QIrmxFNYGvHBBdHufLJAACsmAEAqtL6h92JScLtl79B\nKhmOJ+W/aqsPe5c5v0YuGl8NCJUBAIxJa48m3VyglizHfydaUuh6ByOIafQm\nV6FKJ6DFo64GzjgEZzdZGBIKKwYBBAGXVQEFAQEHQK2beqfv6hLQNYKlznBF\nPVJtfiBSG196VzZ1atXTMLZoAwEIB8J4BBgWCgAqBYJnN1kYCZBrxwQXR7ny\nyQKbDBYhBN9LMPio5QIrmxFNYGvHBBdHufLJAAA7LgEAzElp6e2wvPtu+3jY\nfxAALOZMSrnrUCnr8Oh10S5UwbkA/1Z+v/ApXKfmWuLBi7dLd272Y9PZp2VU\n8IQ23PlA9gMP\n=lzOh\n-----END PGP PUBLIC KEY BLOCK-----\n"
}
```

#### getNodes

`getNodes` - returns known nodes.

```sh
curl 192.168.1.10:28262/getNodes
```

```json
{
  "net": "ALPHA",
  "host": "192.168.1.10",
  "port": "28262",
  "time": 1731683656118,
  "fingerprint": "df4b30f8a8e5022b9b114d606bc7041747b9f2c9",
  "publicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZzdZGBYJKwYBBAHaRw8BAQdAaL0zH5vQmG1KKKfzyCIPEtlaBY/A/74w\n6hwIUVjrMK/NJU9sZWcgUHJ1ZGtvdiA8b2xlZy5wcnVka292QGdtYWlsLmNv\nbT7CjAQQFgoAPgWCZzdZGAQLCQcICZBrxwQXR7nyyQMVCAoEFgACAQIZAQKb\nAwIeARYhBN9LMPio5QIrmxFNYGvHBBdHufLJAACsmAEAqtL6h92JScLtl79B\nKhmOJ+W/aqsPe5c5v0YuGl8NCJUBAIxJa48m3VyglizHfydaUuh6ByOIafQm\nV6FKJ6DFo64GzjgEZzdZGBIKKwYBBAGXVQEFAQEHQK2beqfv6hLQNYKlznBF\nPVJtfiBSG196VzZ1atXTMLZoAwEIB8J4BBgWCgAqBYJnN1kYCZBrxwQXR7ny\nyQKbDBYhBN9LMPio5QIrmxFNYGvHBBdHufLJAAA7LgEAzElp6e2wvPtu+3jY\nfxAALOZMSrnrUCnr8Oh10S5UwbkA/1Z+v/ApXKfmWuLBi7dLd272Y9PZp2VU\n8IQ23PlA9gMP\n=lzOh\n-----END PGP PUBLIC KEY BLOCK-----\n"
}
```

#### getMessages

`getMessages` - returns known messages.

```sh
curl 192.168.1.10:28262/getMessages
```

```json
{
  "23ea0c83aebcd6f19d5cd11d1e5857e8": 1731684000961,
  "0934kfi3op4ijcv1erfrefref344frw4": 1731684001234,
  "3487o5yj89mr874corymd3o8x4r7hy88": 1731684005312
}
```

#### getMessage

`getMessage` - returns the message body.

```sh
curl 192.168.1.10:28262/getMessage?23ea0c83aebcd6f19d5cd11d1e5857e8
```

```json
{
  "hash": "23ea0c83aebcd6f19d5cd11d1e5857e8",
  "timestamp": 1731684000961,
  "message": "-----BEGIN PGP MESSAGE-----\n\nwV4DBQGY4mV2fjoSAQdA0/RtZfXvRSK3/u2KimWaM2SN0bsht7mHDDrTRYZj\nikIwDqKLlP71OeptmCA64FOaUMg1Ocf9DibuEmEMG2qFnxhGMZtfIy3H01Ny\nQQCqLipo0sAAAUVo1+15lnhqqOdaUEEjGCS68taQs2Q+27fqkg62iZPhyzFv\namoI4VlhmM6qT+6vH2YAcNLqaGs0i0IWpSppV0uQ8+lnNkjFgCFXgd1WYUSa\nXER8V429Dc3CrFFJV8TBwRv6LfEzsVQQPXAprpmi/r2eW49a3mm13fckQsOj\nlJiNweKsHc/Dh+209vblASHLezHbpFNDcYt4djgSHbsyyvsxxD5UMsmzNZvx\nZUHEyW/jeqlAyswuvJQ4nqRGi7AZ\n=WYqw\n-----END PGP MESSAGE-----\n"
}
```


### POST requests

To perform a POST request, some information must be encrypted for the server with the recipient's public key. The encrypted message is signed with the sender's private key during encryption. The request method is specified and an encrypted message is assigned to it. Upon receiving the request, the server recognizes the request method and attempts to decrypt the message containing the command. If the server successfully decrypts the message and verifies the sender against its database of known nodes, the command will be accepted and executed.

#### handshake

`handshake` - is used to send your host and port in an encrypted message that is signed with your PGP private key.

```js
const http = require('http');
const securePGPstorage = require('secure-pgp-storage');
const letsconfig = require('letsconfig');

const config = new letsconfig({}, '/home/user/path/to/config/');
const PGP = new securePGPstorage();

let host = config.host;
let port = config.port;
let jsonCommand = {    host: host, port: port };
let encryptedMessage = '';
let jsonReq = { handshake: '' };

const encrypt = new Promise((resolve, reject) => {
    try{
        (async () => {
            await PGP.decryptStorage(config.secureKey, config.passphrase)
            encryptedMessage = await PGP.encryptMessage(JSON.stringify(jsonCommand), PGP.publicKeyArmored, true);
            jsonReq.handshake = encryptedMessage;
            console.log(JSON.stringify(jsonReq));
            resolve(true);
        })();
    } catch(e) {
        console.log(e);
    }
});

encrypt.then((value) => {
    console.log('\nSending request...');

    let options = {
        host: config.host,
        port: config.port,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': (JSON.stringify(jsonReq)).length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`statusCode: ${res.statusCode}`)
        res.on('data', (d) => {
            console.log(JSON.parse(d));
        })
    })

    req.on('error', (error) => {
        console.error(error);
    })

    req.write(JSON.stringify(jsonReq));
    req.end();
});
```

#### newMessage

`newMessage` - used to transmit a received new message to other nodes in the network.

```js
const http = require('http');
const securePGPstorage = require('secure-pgp-storage');
const letsconfig = require('letsconfig');

const config = new letsconfig({}, '/home/user/path/to/config/');
const PGP = new securePGPstorage();

let host = config.host;
let port = config.port;
let jsonCommand = {
    hash: '23ea0c83aebcd6f19d5cd11d1e5857e8',
    timestamp: 1731684000961,
    message: '-----BEGIN PGP MESSAGE----- ... -----END PGP MESSAGE-----\n'
};
let encryptedMessage = '';
let jsonReq = { newMessage: '' };

const encrypt = new Promise((resolve, reject) => {
    try{
        (async () => {
            await PGP.decryptStorage(config.secureKey, config.passphrase)
            encryptedMessage = await PGP.encryptMessage(JSON.stringify(jsonCommand), PGP.publicKeyArmored, true);
            jsonReq.handshake = encryptedMessage;
            console.log(JSON.stringify(jsonReq));
            resolve(true);
        })();
    } catch(e) {
        console.log(e);
    }
});

encrypt.then((value) => {
    let messageSender = setInterval(async () => {
        console.log('\nSending request...');

        let options = {
            host: config.host,
            port: config.port,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'text/html',
                'Content-Length': encryptedMessage.length
            }
        };

        const req = http.request(options, (res) => {
            console.log(`statusCode: ${res.statusCode}`)
            res.on('data', (d) => {
                console.log(JSON.parse(d));
            })
        })

        req.on('error', (error) => {
            console.error(error);
        })

        req.write(encryptedMessage);
        req.end();
    }, 5000);
});
```


### License

[GNU Lesser General Public License](https://www.gnu.org/licenses/lgpl-3.0.en.html) (3.0 or any later version). Please take a look at the [LICENSE](LICENSE) file for more information.
