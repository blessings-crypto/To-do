// =========================================================
// 1. GLOBAL VARIABLES AND SETUP
// =========================================================
const addBtn = document.getElementById("addBtn");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const darkModeToggle = document.getElementById("darkModeToggle");

// **NEW** API Base URL - This must match your server's port and route convention
const API_URL = 'http://localhost:3000/api/tasks'; 

// =========================================================
// 2. EVENT LISTENERS
// =========================================================
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
});

// Enable dark mode (retained from original code)
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    // ... (SVG toggle logic remains the same)
    darkModeToggle.innerHTML = document.body.classList.contains("dark")
    ? `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
           d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.021 12.021l-.707-.707M6.343 17.657l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
           d="M21 12.79A9 9 0 1111.21 3a7 7 0 0010 9.79z" />
       </svg>`;
});


// =========================================================
// 3. CORE FUNCTIONS (Refactored for API)
// =========================================================

// **NEW** Function to create and append the DOM element (Separated from addTask)
function renderTask(task) {
    // task object structure: {id, task_name, is_completed}

    const li = document.createElement("li");
    li.className = "task";
    // Store the database ID on the DOM element for easy access
    li.dataset.id = task.id; 

    const circle = document.createElement("div");
    circle.className = "circle";
    
    const textSpan = document.createElement("span");
    textSpan.className = "task-text";
    textSpan.textContent = task.task_name;

    // Apply 'done' classes if the task is already completed (is_completed = 1)
    if (task.is_completed) {
        circle.classList.add('done');
        textSpan.classList.add('done');
    }

    // Toggle done state (now calls the API to UPDATE the database)
    circle.addEventListener("click", async () => {
        const newStatus = task.is_completed === 1 ? 0 : 1; // Toggle 1 to 0, or 0 to 1
        
        try {
            await fetch(`${API_URL}/${task.id}`, {
                method: 'PATCH', // Use PATCH for updating partial data
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: newStatus })
            });
            
            // If API succeeds, update the DOM immediately
            circle.classList.toggle("done");
            textSpan.classList.toggle("done");
            task.is_completed = newStatus; // Update local task status
            
        } catch (error) {
            console.error('Failed to update task status:', error);
        }
    });

    // EDIT BUTTON (Only updates the DOM for now, needs API logic for persistence)
    const editBtn = document.createElement("button");
    editBtn.className = "action-btn edit";
    editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.213l-4.243.707.707-4.243L16.862 3.487z" />
                         </svg>`;

    editBtn.addEventListener("click", () => {
        const newText = prompt("Edit task:", textSpan.textContent);
        // NOTE: For full integration, this needs a PUT/PATCH API call to update the DB
        if (newText !== null && newText.trim() !== "") {
            textSpan.textContent = newText;
        }
    });

    // DELETE BUTTON (Now calls the API to DELETE from the database)
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn delete";
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 7h12M9 7V5h6v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                           </svg>`;

    deleteBtn.addEventListener("click", async () => {
        try {
            await fetch(`${API_URL}/${task.id}`, {
                method: 'DELETE'
            });
            // If API succeeds, remove the task from the DOM
            li.remove();
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    });

    li.appendChild(circle);
    li.appendChild(textSpan);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    taskList.prepend(li); // Use prepend to show new tasks at the top
}


// **MODIFIED** addTask function (Now calls the POST API route)
async function addTask() {
    const taskText = taskInput.value.trim();
    if (taskText === "") return;
    
    try {
        // 1. Call the Backend API (POST request)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_name: taskText }) // Send the task name to the server
        });

        const newTask = await response.json(); // Server should return the new task object (including its new ID)

        if (response.ok) {
            // 2. Render the task using the data returned from the server
            renderTask(newTask); 
            taskInput.value = ""; // Clear input only after successful API call
        } else {
            throw new Error(newTask.message || 'Failed to add task.');
        }

    } catch (error) {
        console.error('Error adding task:', error);
        alert('Could not add task. Check server connection.');
    }
}


// **NEW** Function to load tasks on page start (using GET API route)
async function loadTasks() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const tasksFromDB = await response.json();
        
        taskList.innerHTML = ''; // Clear any placeholders

        // Render each task fetched from the database
        tasksFromDB.forEach(task => {
            renderTask(task); 
        });

    } catch (error) {
        console.error('Could not load tasks:', error);
        // Show an error message on the page if loading fails
        taskList.innerHTML = '<li style="color: red; list-style: none;">Could not connect to the API to load tasks.</li>';
    }
}


// =========================================================
// 4. INITIALIZATION (Retained dark mode logic)
// =========================================================
const toggleDarkModeBtn = document.getElementById("darkModeToggle"); // Corrected variable name from original code

function setMoonIcon() {
    // ... (SVG content)
}
function setSunIcon() {
    // ... (SVG content)
}

// ... (dark mode listener block from original code, removed the duplicate block at the end)

// Load tasks when the page initially loads
loadTasks();