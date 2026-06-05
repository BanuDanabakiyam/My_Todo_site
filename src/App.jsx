import { useMemo, useState, useEffect } from "react";
import { OrbitProgress } from "react-loading-indicators";
import "./App.css";
import todoBG from "../src/assets/nature.jpeg";

const API_BASE_URL = "http://localhost:3000";

const USER_STORAGE_KEY = "todoAppUser";

const getTodosStorageKey = (username) => `todoAppTodos_${username}`;

const isValidEmail = (email) =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const timeToMinutes = (time) => {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

const formatTime12Hour = (time) => {
	const [hours, minutes] = time.split(":").map(Number);
	const period = hours >= 12 ? "PM" : "AM";
	const hour12 = hours % 12 || 12;
	return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
};

const doTimesOverlap = (startA, endA, startB, endB) => {
	const aStart = timeToMinutes(startA);
	const aEnd = timeToMinutes(endA);
	const bStart = timeToMinutes(startB);
	const bEnd = timeToMinutes(endB);
	return aStart < bEnd && bStart < aEnd;
};

const loadUserFromStorage = () => {
	try {
		const saved = localStorage.getItem(USER_STORAGE_KEY);
		if (!saved) return null;
		const parsed = JSON.parse(saved);
		if (parsed?.username) {
			return { username: parsed.username, email: parsed.email ?? "" };
		}
		if (parsed?.email) {
			return { username: parsed.email, email: parsed.email };
		}
	} catch {
		/* ignore invalid storage */
	}
	return null;
};

const loadTodosForUser = (username) => {
	try {
		const saved = localStorage.getItem(getTodosStorageKey(username));
		if (!saved) return [];
		const parsed = JSON.parse(saved);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		/* ignore invalid storage */
	}
	return [];
};

function App() {
	const [user, setUser] = useState(() => loadUserFromStorage());
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [showSignUpModal, setShowSignUpModal] = useState(false);
	const [isLoginLoading, setIsLoginLoading] = useState(false);
	const [isSavingLoading, setIsSavingLoading] = useState(false);
	const [isAddLoading, setIsAddLoading] = useState(false);
	const [isLogoutLoading, setIsLogoutLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [pendingLoginUser, setPendingLoginUser] = useState(null);
	const [loginEmail, setLoginEmail] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const [signupUsername, setSignupUsername] = useState("");
	const [signupEmail, setSignupEmail] = useState("");
	const [signupPassword, setSignupPassword] = useState("");
	const [loginError, setLoginError] = useState("");
	const [taskInput, setTaskInput] = useState("");
	const [startTimeInput, setStartTimeInput] = useState("");
	const [endTimeInput, setEndTimeInput] = useState("");
	const [todos, setTodos] = useState(() => {
		const savedUser = loadUserFromStorage();
		return savedUser ? loadTodosForUser(savedUser.username) : [];
	});
	const [deletingTodoId, setDeletingTodoId] = useState(null);
	const [formError, setFormError] = useState("");
	const [editingTodoId, setEditingTodoId] = useState(null);
	const [editInput, setEditInput] = useState("");
	const [editError, setEditError] = useState("");
	const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

	const formatTaskText = (text) => {
		const trimmed = text.trim();
		if (!trimmed) return "";
		return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	};

	// const debugLog = async (payload) => {
	// 	console.log("INSIDE");
	// 	try {
	// 		const response = await fetch(
	// 			"http://127.0.0.1:7917/ingest/07f7972e-9c91-4b19-a09d-b566832d3346",
	// 			{
	// 				method: "POST",
	// 				headers: {
	// 					"Content-Type": "application/json",
	// 					"X-Debug-Session-Id": "67f5a1",
	// 				},
	// 				body: JSON.stringify({
	// 					timestamp: Date.now(),
	// 					...payload,
	// 				}),
	// 			},
	// 		);

	// 		console.log("response object:", response);

	// 		const data = await response.json();

	// 		console.log("response data:", data);
	// 	} catch (error) {
	// 		console.log("error:", error);
	// 	}
	// };
	const completedCount = useMemo(
		() => todos.filter((todo) => todo.completed).length,
		[todos],
	);
	const notCompletedCount = useMemo(
		() => todos.filter((todo) => !todo.completed).length,
		[todos],
	);

	const handleAddTodo = (event) => {
		event.preventDefault();
		setIsAddLoading(true);

		const trimmedTask = taskInput.trim();
		const formattedTask = formatTaskText(trimmedTask);

		if (!formattedTask) {
			setFormError("Add a todo.");
			setIsAddLoading(false);
			return;
		}

		if (!startTimeInput || !endTimeInput) {
			setFormError("Start and end time are required.");
			setIsAddLoading(false);
			return;
		}

		if (timeToMinutes(endTimeInput) <= timeToMinutes(startTimeInput)) {
			setFormError("End time must be after start time.");
			setIsAddLoading(false);
			return;
		}

		if (
			todos.some(
				(todo) =>
					todo.text.trim().toLowerCase() === formattedTask.toLowerCase(),
			)
		) {
			setFormError("Task already exists.");
			setIsAddLoading(false);
			return;
		}

		const overlappingTodo = todos.find(
			(todo) =>
				todo.startTime &&
				todo.endTime &&
				doTimesOverlap(
					startTimeInput,
					endTimeInput,
					todo.startTime,
					todo.endTime,
				),
		);

		if (overlappingTodo) {
			setFormError(
				`Time overlaps with "${overlappingTodo.text}" (${formatTime12Hour(overlappingTodo.startTime)} to ${formatTime12Hour(overlappingTodo.endTime)}).`,
			);
			setIsAddLoading(false);
			return;
		}

		const newTodo = {
			id: crypto.randomUUID(),
			text: formattedTask,
			startTime: startTimeInput,
			endTime: endTimeInput,
			completed: false,
		};

		window.setTimeout(() => {
			setTodos((currentTodos) => [newTodo, ...currentTodos]);
			setTaskInput("");
			setStartTimeInput("");
			setEndTimeInput("");
			setFormError("");
			setIsAddLoading(false);
		}, 2000);
	};

	const handleToggleTodo = (todoId) => {
		// #region agent log
		// debugLog({
		// 	hypothesisId: "H3",
		// 	location: "src/App.jsx:61",
		// 	message: "Toggle requested",
		// 	data: { todoId },
		// });
		// #endregion
		setTodos((currentTodos) =>
			currentTodos.map((todo) =>
				todo.id === todoId ? { ...todo, completed: !todo.completed } : todo,
			),
		);
	};

	const handleDeleteTodo = (todoId) => {
		if (deletingTodoId === todoId) return;
		// #region agent log
		// debugLog({
		// 	hypothesisId: "H3",
		// 	location: "src/App.jsx:74",
		// 	message: "Delete requested",
		// 	data: { todoId },
		// });
		// #endregion
		setDeletingTodoId(todoId);

		window.setTimeout(() => {
			setTodos((currentTodos) =>
				currentTodos.filter((todo) => todo.id !== todoId),
			);
			setDeletingTodoId(null);
		}, 1000);
	};

	const handleOpenDeleteAllModal = () => {
		setShowDeleteAllModal(true);
	};

	const handleConfirmDeleteAllTodos = () => {
		setTodos([]);
		setDeletingTodoId(null);
		setEditingTodoId(null);
		setEditInput("");
		setEditError("");
		setShowDeleteAllModal(false);
	};

	const handleCancelDeleteAllTodos = () => {
		setShowDeleteAllModal(false);
	};

	const handleOpenLoginModal = () => {
		setLoginError("");
		setShowLoginModal(true);
	};
	const handleOpenSignupModal = () => {
		setLoginError("");
		setShowLoginModal(false);
		setShowSignUpModal(true);
	};

	const handleCancelLogin = () => {
		setShowLoginModal(false);
		setShowSignUpModal(false);
		setLoginEmail("");
		setLoginPassword("");
		setSignupUsername("");
		setSignupEmail("");
		setSignupPassword("");
		setLoginError("");
	};

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
		return "";
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
		return "";
	};

	const handleLogin = async (event) => {
		event.preventDefault();
		const email = loginEmail.trim().toLowerCase();
		const password = loginPassword;

		const validationError = validateLoginInput(email, password);
		if (validationError) {
			setLoginError(validationError);
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/validateUser`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				setLoginError(data.message || "Invalid email or password.");
				return;
			}

			setShowLoginModal(false);
			setLoginEmail("");
			setLoginPassword("");
			setIsLoginLoading(true);
			setPendingLoginUser({
				username: data.username,
				email: data.email ?? email,
			});
			setLoginError("");
		} catch (err) {
			setLoginError("Could not reach server");
		}
	};

	const handleSignUp = async (event) => {
		event.preventDefault();
		const username = signupUsername.trim();
		const email = signupEmail.trim().toLowerCase();
		const password = signupPassword;

		const validationError = validateSignupInput(username, email, password);
		if (validationError) {
			setLoginError(validationError);
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/signup`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, email, password }),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				setLoginError(data.message || "Could not create account.");
				return;
			}

			setShowLoginModal(false);
			setShowSignUpModal(false);
			setSignupUsername("");
			setSignupEmail("");
			setSignupPassword("");
			setIsLoginLoading(true);
			setPendingLoginUser({ username, email });
			setLoginError("");
		} catch (err) {
			setLoginError("Could not reach server");
		}
	};

	useEffect(() => {
		if (!isLoginLoading || !pendingLoginUser) return;

		const timer = window.setTimeout(() => {
			setUser(pendingLoginUser);
			setTodos(loadTodosForUser(pendingLoginUser.username));
			setIsLoginLoading(false);
			setPendingLoginUser(null);
		}, 2000);

		return () => window.clearTimeout(timer);
	}, [isLoginLoading, pendingLoginUser]);

	useEffect(() => {
		if (!isLogoutLoading) return;
		const timer = window.setTimeout(() => {
			setIsLogoutLoading(false);
		}, 2000);

		return () => window.clearTimeout(timer);
	}, [isLogoutLoading]);

	const handleLogout = () => {
		if (user) {
			localStorage.setItem(
				getTodosStorageKey(user.username),
				JSON.stringify(todos),
			);
		}
		localStorage.removeItem(USER_STORAGE_KEY);
		setUser(null);
		setTodos([]);
		setTaskInput("");
		setStartTimeInput("");
		setEndTimeInput("");
		setFormError("");
		setEditingTodoId(null);
		setEditInput("");
		setEditError("");
		setShowDeleteAllModal(false);
		setShowLoginModal(false);
		setIsLoginLoading(false);
		setIsAddLoading(false);
		setIsLogoutLoading(true);
		setPendingLoginUser(null);
	};

	const handleStartEditTodo = (todo) => {
		setEditingTodoId(todo.id);
		setEditInput(todo.text);
		setEditError("");
	};

	const handleCancelEditTodo = () => {
		setEditingTodoId(null);
		setEditInput("");
		setEditError("");
	};

	const handleSaveEditTodo = (todoId) => {
		setIsSavingLoading(true);

		const trimmedTask = editInput.trim();
		const formattedTask = formatTaskText(trimmedTask);

		if (!formattedTask) {
			setEditError("Task name is required.");
			setIsSavingLoading(false);
			return;
		}

		if (
			todos.some(
				(todo) =>
					todo.id !== todoId &&
					todo.text.trim().toLowerCase() === formattedTask.toLowerCase(),
			)
		) {
			setEditError("Task already exists.");
			setIsSavingLoading(false);
			return;
		}

		window.setTimeout(() => {
			setTodos((currentTodos) =>
				currentTodos.map((todo) =>
					todo.id === todoId ? { ...todo, text: formattedTask } : todo,
				),
			);

			setIsSavingLoading(false);
			handleCancelEditTodo();
		}, 2000);
	};
	// useEffect(() => {
	// 	// #region agent log
	// 	debugLog({
	// 		hypothesisId: "H4",
	// 		location: "src/App.jsx:81",
	// 		message: "Todo state and counters recomputed",
	// 		data: {
	// 			total: todos.length,
	// 			completedCount,
	// 			notCompletedCount,
	// 			ids: todos.map((todo) => todo.id),
	// 		},
	// 	});
	// 	// #endregion
	// }, [todos, completedCount, notCompletedCount]);

	useEffect(() => {
		if (user?.username) {
			localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
		}
	}, [user]);

	useEffect(() => {
		if (!user) return;
		localStorage.setItem(
			getTodosStorageKey(user.username),
			JSON.stringify(todos),
		);
	}, [todos, user]);
	const handleSaveTodos = async () => {
		if (!user) return;
		setIsSaving(true);

		try {
			const response = await fetch(`${API_BASE_URL}/saveTodos`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username: user.username,
					todos: todos,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setIsSaving(false);
				console.log("Todos saved successfully");
			} else {
				setIsSaving(true);
				console.log(data.message);
			}
		} catch (error) {
			console.log(error);
		}
	};
	const fetchTodos = async () => {
		if (!user) return;

		try {
			const response = await fetch(`${API_BASE_URL}/getTodos/${user.username}`);

			const data = await response.json();

			if (data.success) {
				setTodos(data.todos || []);
			}
		} catch (error) {
			console.log(error);
		}
	};
	useEffect(() => {
		if (user) {
			fetchTodos();
		}
	}, [user]);

	// useEffect(() => {
	// 	// #region agent log
	// 	debugLog({
	// 		hypothesisId: "H5",
	// 		location: "src/App.jsx:111",
	// 		message: "App mounted instrumentation probe",
	// 		data: { userAgent: navigator.userAgent.slice(0, 80) },
	// 	});
	// 	// #endregion
	// }, []);

	// useEffect(() => {
	// 	// #region agent log
	// 	debugLog({
	// 		hypothesisId: "H6",
	// 		location: "src/App.jsx:122",
	// 		message: "Task input changed",
	// 		data: { taskInputLength: taskInput.length },
	// 	});
	// 	// #endregion
	// }, [taskInput]);

	return (
		<div className="app-shell" style={{ backgroundImage: `url(${todoBG})` }}>
			<div className="header-actions">
				{user ? (
					<>
						<span className="user-greeting">Hi, {user.username}</span>

						<button type="button" className="logout-btn" onClick={handleLogout}>
							Logout
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							className="signup-btn"
							onClick={handleOpenSignupModal}
						>
							Signup
						</button>

						<button
							type="button"
							className="login-btn"
							onClick={handleOpenLoginModal}
						>
							Login
						</button>
					</>
				)}
			</div>

			<div className="todo-app">
				<div className="todo-header">
					<h1>My Todo List</h1>
					<div>
						{todos.length > 0 ? (
							<button
								type="button"
								className="delete-all-btn"
								onClick={handleOpenDeleteAllModal}
							>
								Delete All
							</button>
						) : null}
					</div>
				</div>
				<p className="subtitle">Plan your day, one task at a time.</p>

				{!user ? (
					<p className="login-prompt">
						Please log in to add and manage your todos.
					</p>
				) : null}

				<form className="todo-form" onSubmit={handleAddTodo}>
					<div className="todo-form-fields">
						<div className="todo-input-group">
							<input
								type="text"
								value={taskInput}
								disabled={!user}
								onChange={(event) => {
									setTaskInput(event.target.value);
									if (formError) setFormError("");
								}}
								placeholder="Add a new todo..."
								aria-label="Todo task"
							/>
							{formError ? (
								<p className="form-error todo-input-error">{formError}</p>
							) : null}
						</div>
						<div className="time-inputs">
							<label className="time-input-label">
								<span>From</span>
								<input
									type="time"
									value={startTimeInput}
									disabled={!user}
									onChange={(event) => {
										setStartTimeInput(event.target.value);
										if (formError) setFormError("");
									}}
									aria-label="Start time"
								/>
							</label>
							<label className="time-input-label">
								<span>To</span>
								<input
									type="time"
									value={endTimeInput}
									disabled={!user}
									onChange={(event) => {
										setEndTimeInput(event.target.value);
										if (formError) setFormError("");
									}}
									aria-label="End time"
								/>
							</label>
						</div>
					</div>
					<button type="submit" disabled={!user || isAddLoading}>
						{isAddLoading ? "Adding..." : "Add"}
					</button>
				</form>

				{user ? (
					<>
						<section className="todo-meta">
							<span>Total: {todos.length}</span>
							<span>Completed: {completedCount}</span>
							<span>NotCompleted: {notCompletedCount}</span>
						</section>

						<ul className="todo-list">
							{todos.length === 0 ? (
								<li className="empty-state">
									No todos yet. Add your first task.
								</li>
							) : (
								todos.map((todo) => (
									<li key={todo.id} className="todo-item">
										<label>
											<input
												type="checkbox"
												checked={todo.completed}
												disabled={
													deletingTodoId === todo.id ||
													editingTodoId === todo.id
												}
												onChange={() => handleToggleTodo(todo.id)}
											/>
											{editingTodoId === todo.id ? (
												<input
													type="text"
													className="todo-edit-input"
													value={editInput}
													onChange={(event) => {
														setEditInput(event.target.value);
														if (editError) setEditError("");
													}}
												/>
											) : (
												<span className={todo.completed ? "done" : ""}>
													{todo.text}
													{todo.startTime && todo.endTime ? (
														<span className="todo-time">
															{" "}
															{formatTime12Hour(todo.startTime)} to{" "}
															{formatTime12Hour(todo.endTime)}
														</span>
													) : null}
												</span>
											)}
										</label>
										<div className="todo-actions">
											{editingTodoId === todo.id ? (
												<>
													<button
														type="button"
														onClick={() => handleSaveEditTodo(todo.id)}
													>
														Save
													</button>
													<button
														type="button"
														className="cancel-btn"
														onClick={handleCancelEditTodo}
													>
														Cancel
													</button>
												</>
											) : (
												<button
													type="button"
													disabled={deletingTodoId === todo.id}
													onClick={() => handleStartEditTodo(todo)}
												>
													Update
												</button>
											)}
											<button
												type="button"
												disabled={deletingTodoId === todo.id}
												onClick={() => handleDeleteTodo(todo.id)}
											>
												{deletingTodoId === todo.id ? "Deleting..." : "Delete"}
											</button>
										</div>
									</li>
								))
							)}
						</ul>
						{editError ? <p className="form-error">{editError}</p> : null}
					</>
				) : null}
				<div className="save_item">
					<button
						type="button"
						disabled={!user}
						className="save"
						onClick={handleSaveTodos}
					>
						Save
					</button>
				</div>

				{showLoginModal ? (
					<div
						className="modal-overlay"
						role="presentation"
						onClick={handleCancelLogin}
					>
						<div
							className="modal-dialog login-modal"
							role="dialog"
							aria-modal="true"
							aria-labelledby="login-modal-title"
							onClick={(event) => event.stopPropagation()}
						>
							<form className="login-form" onSubmit={handleLogin}>
								<label>
									Email
									<input
										type="email"
										value={loginEmail}
										onChange={(event) => {
											setLoginEmail(event.target.value);
											if (loginError) setLoginError("");
										}}
										autoComplete="email"
										placeholder="Enter email"
									/>
								</label>
								<label>
									Password
									<input
										type="password"
										value={loginPassword}
										onChange={(event) => {
											setLoginPassword(event.target.value);
											if (loginError) setLoginError("");
										}}
										autoComplete="current-password"
										placeholder="Enter password (min 8 characters)"
										minLength={8}
									/>
								</label>
								{loginError ? (
									<p className="form-error login-form-error">{loginError}</p>
								) : null}
								<div className="modal-actions">
									<button type="submit" className="modal-btn-login">
										Ok
									</button>
									<button
										type="button"
										className="modal-btn-no"
										onClick={handleCancelLogin}
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				) : null}

				{showSignUpModal ? (
					<div
						className="modal-overlay"
						role="presentation"
						onClick={handleCancelLogin}
					>
						<div
							className="modal-dialog login-modal"
							role="dialog"
							aria-modal="true"
							aria-labelledby="login-modal-title"
							onClick={(event) => event.stopPropagation()}
						>
							<form className="login-form" onSubmit={handleSignUp}>
								<label>
									Username
									<input
										type="text"
										value={signupUsername}
										onChange={(event) => {
											setSignupUsername(event.target.value);
											if (loginError) setLoginError("");
										}}
										autoComplete="username"
										placeholder="Enter username"
									/>
								</label>
								<label>
									Email
									<input
										type="email"
										value={signupEmail}
										onChange={(event) => {
											setSignupEmail(event.target.value);
											if (loginError) setLoginError("");
										}}
										autoComplete="email"
										placeholder="Enter email"
									/>
								</label>
								<label>
									Password
									<input
										type="password"
										value={signupPassword}
										onChange={(event) => {
											setSignupPassword(event.target.value);
											if (loginError) setLoginError("");
										}}
										autoComplete="new-password"
										placeholder="Enter password (min 8 characters)"
										minLength={8}
									/>
								</label>
								{loginError ? (
									<p className="form-error login-form-error">{loginError}</p>
								) : null}
								<div className="modal-actions">
									<button type="submit" className="modal-btn-login">
										Ok
									</button>
									<button
										type="button"
										className="modal-btn-no"
										onClick={handleCancelLogin}
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				) : null}

				{isLoginLoading || isSavingLoading || isAddLoading ? (
					<div
						className="login-loading-overlay"
						role="status"
						aria-live="polite"
						aria-label={
							isLoginLoading
								? "Signing in"
								: isAddLoading
									? "Adding todo"
									: "Saving todos"
						}
					>
						<OrbitProgress color="#32cd32" size="small" text="" textColor="" />
					</div>
				) : null}

				{isSaving ? (
					<div
						className="login-loading-overlay"
						role="status"
						aria-live="polite"
						aria-label="Signing in"
					>
						<OrbitProgress color="#32cd32" size="small" text="" textColor="" />
					</div>
				) : null}

				{isLogoutLoading ? (
					<div
						className="login-loading-overlay"
						role="status"
						aria-live="polite"
						aria-label="Signing in"
					>
						<OrbitProgress color="#32cd32" size="small" text="" textColor="" />
					</div>
				) : null}

				{showDeleteAllModal ? (
					<div
						className="modal-overlay"
						role="presentation"
						onClick={handleCancelDeleteAllTodos}
					>
						<div
							className="modal-dialog"
							role="dialog"
							aria-modal="true"
							aria-labelledby="delete-all-modal-title"
							onClick={(event) => event.stopPropagation()}
						>
							<h2 id="delete-all-modal-title">Delete all todos?</h2>
							<p>Are you sure you want to delete all the todo list?</p>
							<div className="modal-actions">
								<button
									type="button"
									className="modal-btn-yes"
									onClick={handleConfirmDeleteAllTodos}
								>
									Yes
								</button>
								<button
									type="button"
									className="modal-btn-no"
									onClick={handleCancelDeleteAllTodos}
								>
									No
								</button>
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}

export default App;
