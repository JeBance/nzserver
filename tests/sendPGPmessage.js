const message = `-----BEGIN PGP MESSAGE-----

KL4DBQGY4mV2fjoSAQdAJaKBeO3RMxtv7p4oHwk79SfhYa0ocXf06zRoH6Ly
KFowIojl8OwzQ6uI2D5boP+eq4PmcxLyRWY+YUvm/ydWp5P6E9VOcquwRDaA
Wv93jjrk0sAAASsrDUF6gk3Xhx51keQK4MLUr/LMzCIZdzXcoosu8dRg0yB4
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
