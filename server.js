// server.js

// 1. Import Dependencies (Using 'mysql2/promise' for async/await)
const express = require('express');
const mysql = require('mysql2/promise'); // <--- IMPORTANT CHANGE
const cors = require('cors');

const app = express();
const port = 3000;

// 2. Middleware Setup
app.use(cors()); // Allows frontend access
app.use(express.json()); // Allows parsing of JSON request bodies

// 3. Database Connection Configuration
// IMPORTANT: Use createPool() for a server application for better performance and stability
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1Lambinfor.', // <--- REPLACE THIS WITH YOUR ACTUAL PASSWORD
    database: 'todo_app'
};

let pool; // We will use a connection pool

// Function to establish connection and start the server
async function startServer() {
    try {
        // Create a connection pool
        pool = mysql.createPool(dbConfig);
        await pool.getConnection(); // Test the connection
        console.log('✅ MySQL database connected via Pool.');

        // 4. API Routes (CRUD)

        // ===================================
        // 4a. READ (GET /api/tasks) - Fetch all tasks
        // ===================================
        app.get('/api/tasks', async (req, res) => {
            try {
                // Use .execute() with the pool
                const [rows] = await pool.execute('SELECT id, task_name, is_completed FROM tasks ORDER BY id DESC');
                res.status(200).json(rows);
            } catch (error) {
                console.error('Error fetching tasks:', error.message);
                res.status(500).json({ message: 'Failed to fetch tasks from database.' });
            }
        });

        // ===================================
        // 4b. CREATE (POST /api/tasks) - Add a new task
        // ===================================
        app.post('/api/tasks', async (req, res) => {
            const { task_name } = req.body;
            if (!task_name) {
                return res.status(400).json({ message: 'Task name is required.' });
            }
            try {
                // Use prepared statement (the '?') to prevent SQL injection
                const [result] = await pool.execute(
                    'INSERT INTO tasks (task_name) VALUES (?)',
                    [task_name]
                );

                // Return the newly created task object to the frontend
                const newTask = {
                    id: result.insertId,
                    task_name: task_name,
                    is_completed: 0
                };
                res.status(201).json(newTask); // 201 Created
            } catch (error) {
                console.error('Error creating task:', error.message);
                res.status(500).json({ message: 'Failed to insert task into database.' });
            }
        });

        // ===================================
        // 4c. UPDATE (PATCH /api/tasks/:id) - Toggle completion or edit task name
        // ===================================
        app.patch('/api/tasks/:id', async (req, res) => {
            const taskId = req.params.id;
            const { is_completed, task_name } = req.body; // Can accept either or both
            let query = 'UPDATE tasks SET ';
            const params = [];

            // Dynamically build the query based on what was sent
            if (is_completed !== undefined) {
                query += 'is_completed = ?';
                params.push(is_completed);
            }
            if (task_name !== undefined) {
                if (params.length > 0) query += ', '; // Add comma if we already added is_completed
                query += 'task_name = ?';
                params.push(task_name);
            }
            
            // Check if any fields were actually provided
            if (params.length === 0) {
                 return res.status(400).json({ message: 'No fields provided for update.' });
            }

            query += ' WHERE id = ?';
            params.push(taskId);

            try {
                const [result] = await pool.execute(query, params);

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Task not found or no change made.' });
                }

                res.status(200).json({ message: 'Task updated successfully.' });
            } catch (error) {
                console.error('Error updating task:', error.message);
                res.status(500).json({ message: 'Failed to update task in database.' });
            }
        });


        // ===================================
        // 4d. DELETE (DELETE /api/tasks/:id) - Remove a task
        // ===================================
        app.delete('/api/tasks/:id', async (req, res) => {
            const taskId = req.params.id;
            try {
                const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Task not found.' });
                }

                res.status(204).send(); // 204 No Content
            } catch (error) {
                console.error('Error deleting task:', error.message);
                res.status(500).json({ message: 'Failed to delete task from database.' });
            }
        });

        // 5. Start the Server
        app.listen(port, () => {
            console.log(`🌍 Server is running on http://localhost:${port}`);
        });

    } catch (error) {
        console.error('❌ Failed to connect to database or start server:', error.message);
        process.exit(1); 
    }
}

startServer();