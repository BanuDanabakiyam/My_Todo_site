import { useMemo, useState, useEffect } from "react";
import "./App.css";
import todoBG from "../src/assets/nature.jpeg";

function App() {
	const [taskInput, setTaskInput] = useState("");
	const [todos, setTodos] = useState([]);
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

	const debugLog = (payload) => {
		fetch("http://127.0.0.1:7917/ingest/07f7972e-9c91-4b19-a09d-b566832d3346", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Debug-Session-Id": "67f5a1",
			},
			body: JSON.stringify({
				sessionId: "67f5a1",
				runId: "initial-debug",
				timestamp: Date.now(),
				...payload,
			}),
		}).catch(() => {});
	};

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
		const trimmedTask = taskInput.trim();
		const formattedTask = formatTaskText(trimmedTask);
		// #region agent log
		debugLog({
			hypothesisId: "H1",
			location: "src/App.jsx:36",
			message: "Add todo submit received",
			data: { taskInput, trimmedTaskLength: trimmedTask.length },
		});
		// #endregion

		if (!formattedTask) {
			setFormError("");
			return;
		}
		if (
			todos.some(
				(todo) =>
					todo.text.trim().toLowerCase() === formattedTask.toLowerCase(),
			)
		) {
			setFormError("Task already exists.");
			return;
		}

		// #region agent log
		debugLog({
			hypothesisId: "H2",
			location: "src/App.jsx:47",
			message: "Attempting todo id creation",
			data: { cryptoAvailable: typeof crypto !== "undefined" },
		});
		// #endregion
		const newTodo = {
			id: crypto.randomUUID(),
			text: formattedTask,
			completed: false,
		};

		setTodos((currentTodos) => [newTodo, ...currentTodos]);
		setTaskInput("");
		setFormError("");
	};

	const handleToggleTodo = (todoId) => {
		// #region agent log
		debugLog({
			hypothesisId: "H3",
			location: "src/App.jsx:61",
			message: "Toggle requested",
			data: { todoId },
		});
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
		debugLog({
			hypothesisId: "H3",
			location: "src/App.jsx:74",
			message: "Delete requested",
			data: { todoId },
		});
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
		const trimmedTask = editInput.trim();
		const formattedTask = formatTaskText(trimmedTask);
		if (!formattedTask) {
			setEditError("Task name is required.");
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
			return;
		}

		setTodos((currentTodos) =>
			currentTodos.map((todo) =>
				todo.id === todoId ? { ...todo, text: formattedTask } : todo,
			),
		);
		handleCancelEditTodo();
	};

	useEffect(() => {
		// #region agent log
		debugLog({
			hypothesisId: "H4",
			location: "src/App.jsx:81",
			message: "Todo state and counters recomputed",
			data: {
				total: todos.length,
				completedCount,
				notCompletedCount,
				ids: todos.map((todo) => todo.id),
			},
		});
		// #endregion
	}, [todos, completedCount, notCompletedCount]);

	useEffect(() => {
		// #region agent log
		debugLog({
			hypothesisId: "H5",
			location: "src/App.jsx:111",
			message: "App mounted instrumentation probe",
			data: { userAgent: navigator.userAgent.slice(0, 80) },
		});
		// #endregion
	}, []);

	useEffect(() => {
		// #region agent log
		debugLog({
			hypothesisId: "H6",
			location: "src/App.jsx:122",
			message: "Task input changed",
			data: { taskInputLength: taskInput.length },
		});
		// #endregion
	}, [taskInput]);

	return (
		<div className="app-shell" style={{ backgroundImage: `url(${todoBG})` }}>
			<div className="todo-app">
				<div className="todo-header">
					<h1>My Todo List</h1>
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
				<p className="subtitle">Plan your day, one task at a time.</p>

				<form className="todo-form" onSubmit={handleAddTodo}>
					<input
						type="text"
						value={taskInput}
						onChange={(event) => {
							setTaskInput(event.target.value);
							if (formError) setFormError("");
						}}
						placeholder="Add a new todo..."
						aria-label="Todo task"
					/>
					<button type="submit">Add</button>
				</form>
				{formError ? <p className="form-error">{formError}</p> : null}

				<section className="todo-meta">
					<span>Total: {todos.length}</span>
					<span>Completed: {completedCount}</span>
					<span>NotCompleted: {notCompletedCount}</span>
				</section>

				<ul className="todo-list">
					{todos.length === 0 ? (
						<li className="empty-state">No todos yet. Add your first task.</li>
					) : (
						todos.map((todo) => (
							<li key={todo.id} className="todo-item">
								<label>
									<input
										type="checkbox"
										checked={todo.completed}
										disabled={
											deletingTodoId === todo.id || editingTodoId === todo.id
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
