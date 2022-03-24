const express = require('express');
const Database = require('@replit/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const { makeError, makeSuccess } = require('./utils');

const app = express();
const db = new Database();
/*
Database format:
users: {
	${username}: ${userId}
}

chats: {
	${chatId}: [${userId}]
}

users-${userId}: {
	username: String,
	password: String,
	token: String,
}

chats-${chatId}: {
	users: userId[],
	messages: [{
		content: String,
		timestamp: Date,
		author: userId,
	}]
}
*/

app.use(express.json());

app.get('/', (_, res) => res.send('Server is up'));

app.post('/auth/create', async (req, res) => {
	const userData = req.body;
	if (!userData || !userData.username || !userData.password) return res.json(makeError('InvalidArgs'));
	const { username, password } = userData;
	const users = await db.get('users');
	if (username in users) {
		return res.json(makeError('UserExists'));
	}
	const encryptedPassword = await bcrypt.hash(password, 10);
	const userId = nanoid(10);
	const token = jwt.sign(
		{ userId },
		process.env.PRIVATE_KEY,
		{
			expiresIn: '1d',
		}
	)
	const dbUser = {
		username,
		password: encryptedPassword,
		token
	};
	users[username] = userId;
	await db.set(`users-${userId}`, dbUser);
	await db.set('users', users);
	return res.json(makeSuccess({ userId, token }));
});

app.post('/auth/login', async (req, res) => {
	const { username, password } = req.body;
	if (!username || !password) return res.json(makeError('InvalidArgs'));
	const users = await db.get('users');
	if (username in users === false) {
		return res.json(makeError('UserNotFound'));
	}
	const userId = users[username];
	const dbUser = await db.get(`users-${userId}`);
	if (await bcrypt.compare(password, dbUser.password)) {
		const token = jwt.sign(
			{ userId },
			process.env.PRIVATE_KEY,
			{
				expiresIn: '1d',
			}
		)
		dbUser.token = token;
		db.set(`users-${userId}`, dbUser);
		return res.json(makeSuccess({ userId, token }));
	} else return res.json(makeError('IncorrectPassword'))
});

app.listen(3000, async () => {
	if (process.env.DB_WIPE) {
		console.log('DB_WIPE enabled, wiping db...')
		const keys = await db.list();
		for (const key of keys) {
			await db.delete(key);
		}
	}
	if (!(await db.get('users'))) await db.set('users', {});
	if (!(await db.get('chats'))) await db.set('chats', {});
	console.log('Server is up');
});
