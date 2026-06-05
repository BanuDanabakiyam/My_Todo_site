const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const awsClient = require("../config/aws");

const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddbDocClient = DynamoDBDocumentClient.from(awsClient);

const isValidEmail = (email) =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateLoginInput = (email, password) => {
	if (!email || !password) {
		return "Email and password are required.";
	}
	if (!isValidEmail(email)) {
		return "Please enter a valid email address.";
	}
	if (password.length < 8) {
		return "Password must be at least 8 characters.";
	}
	return null;
};

const validateSignupInput = (username, email, password) => {
	if (!username || !email || !password) {
		return "Username, email, and password are required.";
	}
	if (username.trim().length < 3) {
		return "Username must be at least 3 characters.";
	}
	if (!isValidEmail(email)) {
		return "Please enter a valid email address.";
	}
	if (password.length < 8) {
		return "Password must be at least 8 characters.";
	}
	return null;
};

const findUserByEmail = async (email) => {
	const normalizedEmail = email.toLowerCase();
	const result = await ddbDocClient.send(
		new ScanCommand({
			TableName: "users",
			FilterExpression: "email = :email OR username = :email",
			ExpressionAttributeValues: {
				":email": normalizedEmail,
			},
		}),
	);
	return result.Items?.[0] ?? null;
};

router.post("/validateUser", async (req, res) => {
	console.log("validateUser endpoint started here....");

	try {
		const { email, password } = req.body;
		const normalizedEmail = email?.trim().toLowerCase();
		const validationError = validateLoginInput(normalizedEmail, password);

		if (validationError) {
			return res.status(400).json({
				success: false,
				message: validationError,
			});
		}

		const user = await findUserByEmail(normalizedEmail);

		if (!user || user.password !== password) {
			return res.status(401).json({
				success: false,
				message: "Invalid credentials",
			});
		}

		const { username } = user;

		// GENERATE JWT TOKEN
		const token = jwt.sign({ username }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});

		// STORE SESSION
		await ddbDocClient.send(
			new PutCommand({
				TableName: "user_sessions",
				Item: {
					username,
					token,
					loginTime: new Date().toISOString(),
				},
			}),
		);

		return res.status(200).json({
			success: true,
			token,
			username,
			email: user.email,
		});
	} catch (error) {
		console.log(error);

		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
});
router.post("/signup", async (req, res) => {
	try {
		console.log("signup endpoint started....");
		const { username, email, password } = req.body;
		const normalizedUsername = username?.trim();
		const normalizedEmail = email?.trim().toLowerCase();
		const validationError = validateSignupInput(
			normalizedUsername,
			normalizedEmail,
			password,
		);

		if (validationError) {
			return res.status(400).json({
				success: false,
				message: validationError,
			});
		}

		// check username already exists
		const existingUser = await ddbDocClient.send(
			new GetCommand({
				TableName: "users",
				Key: {
					username: normalizedUsername,
				},
			}),
		);

		if (existingUser.Item) {
			return res.status(400).json({
				success: false,
				message: "Username already exists",
			});
		}

		const existingEmailUser = await findUserByEmail(normalizedEmail);

		if (existingEmailUser) {
			return res.status(400).json({
				success: false,
				message: "Email already registered",
			});
		}

		// store new user
		await ddbDocClient.send(
			new PutCommand({
				TableName: "users",
				Item: {
					username: normalizedUsername,
					email: normalizedEmail,
					password,
				},
			}),
		);

		res.status(201).json({
			success: true,
			message: "Signup successful",
		});
	} catch (error) {
		console.log(error);

		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
});

router.post("/saveTodos", async (req, res) => {
	try {
		console.log("saveTodos endpoint started here...");
		const { username, todos } = req.body;

		await ddbDocClient.send(
			new PutCommand({
				TableName: "user_todos",
				Item: {
					username,
					todos,
				},
			}),
		);

		res.status(200).json({
			success: true,
			message: "Todos saved successfully",
		});
	} catch (error) {
		console.log(error);

		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
});

router.get("/getTodos/:username", async (req, res) => {
	try {
		console.log("getTodos endpoint started here...");
		const { username } = req.params;

		const response = await ddbDocClient.send(
			new GetCommand({
				TableName: "user_todos",
				Key: {
					username,
				},
			}),
		);

		res.status(200).json({
			success: true,
			todos: response.Item?.todos || [],
		});
	} catch (error) {
		console.log(error);

		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
});
module.exports = router;
