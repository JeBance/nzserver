const jsonRequest = {
	handshake: {
		net: 'ALPHA',
		prot: 'https',
		host: 'jebance.ru',
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
