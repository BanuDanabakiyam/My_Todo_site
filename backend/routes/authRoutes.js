const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { GetCommand } = require("@aws-sdk/lib-dynamodb");

const awsClient = require("../config/aws");

const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddbDocClient = DynamoDBDocumentClient.from(awsClient);

router.post("/validateUser", async (req, res) => {
	console.log("validateUser endpoint started here....");
	try {
		const { username, password } = req.body;

		if (username === "admin" && password === "1234") {
			const token = jwt.sign({ username }, process.env.JWT_SECRET, {
				expiresIn: "1h",
			});

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
			});
		}

		res.status(401).json({
			success: false,
			message: "Invalid credentials",
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
		const { username, password } = req.body;

		// check user already exists
		const existingUser = await ddbDocClient.send(
			new GetCommand({
				TableName: "users",
				Key: {
					username,
				},
			}),
		);

		if (existingUser.Item) {
			return res.status(400).json({
				success: false,
				message: "User already exists",
			});
		}

		// store new user
		await ddbDocClient.send(
			new PutCommand({
				TableName: "users",
				Item: {
					username,
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
module.exports = router;
