const makeError = (errorCode) => ({
	success: false,
	error: errorCode
});

const makeSuccess = (data) => ({
	success: true,
	...data
});

module.exports = { makeError, makeSuccess };