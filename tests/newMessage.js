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
