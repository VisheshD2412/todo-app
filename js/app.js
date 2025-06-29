// TaskMaster - Modern Todo App
// Main Application JavaScript

class TaskMaster {
  constructor() {
    this.tasks = [];
    this.currentFilter = "all";
    this.currentTagFilter = "";
    this.editingTaskId = null;
    this.reminders = new Map();

    this.init();
  }

  init() {
    this.loadFromLocalStorage();
    this.setupEventListeners();
    this.renderTasks();
    this.updateTaskCount();
    this.loadTheme();
    this.setupReminders();
  }

  // Local Storage Management
  saveToLocalStorage() {
    localStorage.setItem("taskmaster_tasks", JSON.stringify(this.tasks));
    localStorage.setItem(
      "taskmaster_theme",
      document.body.classList.contains("dark-theme") ? "dark" : "light"
    );
  }

  loadFromLocalStorage() {
    const savedTasks = localStorage.getItem("taskmaster_tasks");
    if (savedTasks) {
      this.tasks = JSON.parse(savedTasks);
    }
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("taskmaster_theme");
    if (savedTheme === "dark") {
      this.toggleTheme();
    }
  }

  // Event Listeners Setup
  setupEventListeners() {
    // Add task
    document
      .getElementById("addTaskBtn")
      .addEventListener("click", () => this.addTask());
    document.getElementById("taskInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addTask();
    });

    // Theme toggle
    document
      .getElementById("themeToggle")
      .addEventListener("click", () => this.toggleTheme());

    // Filters
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.setFilter(e.target.dataset.filter)
      );
    });

    document.getElementById("tagFilter").addEventListener("change", (e) => {
      this.currentTagFilter = e.target.value;
      this.renderTasks();
    });

    // Clear completed
    document
      .getElementById("clearCompleted")
      .addEventListener("click", () => this.clearCompleted());

    // Modal events
    document
      .getElementById("closeModal")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("cancelEdit")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("saveEdit")
      .addEventListener("click", () => this.saveEdit());
    document.getElementById("editModal").addEventListener("click", (e) => {
      if (e.target.id === "editModal") this.closeModal();
    });

    // Reminder notification
    document
      .getElementById("closeReminder")
      .addEventListener("click", () => this.hideReminder());
  }

  // Task Management
  addTask() {
    const taskInput = document.getElementById("taskInput");
    const taskText = taskInput.value.trim();

    if (!taskText) {
      this.showError(taskInput, "Please enter a task");
      return;
    }

    const task = {
      id: Date.now().toString(),
      text: taskText,
      completed: false,
      tag: document.getElementById("taskTag").value,
      dueDate: document.getElementById("taskDueDate").value,
      dueTime: document.getElementById("taskDueTime").value,
      createdAt: new Date().toISOString(),
    };

    this.tasks.unshift(task);
    this.saveToLocalStorage();
    this.renderTasks();
    this.updateTaskCount();
    this.setupTaskReminder(task);

    // Clear form
    taskInput.value = "";
    document.getElementById("taskTag").value = "";
    document.getElementById("taskDueDate").value = "";
    document.getElementById("taskDueTime").value = "";
    taskInput.focus();
  }

  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveToLocalStorage();
      this.renderTasks();
      this.updateTaskCount();

      if (task.completed) {
        this.clearTaskReminder(id);
      } else {
        this.setupTaskReminder(task);
      }
    }
  }

  editTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      this.editingTaskId = id;
      document.getElementById("editTaskText").value = task.text;
      document.getElementById("editTaskTag").value = task.tag || "";
      document.getElementById("editTaskDueDate").value = task.dueDate || "";
      document.getElementById("editTaskDueTime").value = task.dueTime || "";
      this.openModal();
    }
  }

  saveEdit() {
    if (!this.editingTaskId) return;

    const taskText = document.getElementById("editTaskText").value.trim();
    if (!taskText) {
      this.showError(
        document.getElementById("editTaskText"),
        "Please enter a task"
      );
      return;
    }

    const task = this.tasks.find((t) => t.id === this.editingTaskId);
    if (task) {
      task.text = taskText;
      task.tag = document.getElementById("editTaskTag").value;
      task.dueDate = document.getElementById("editTaskDueDate").value;
      task.dueTime = document.getElementById("editTaskDueTime").value;

      this.saveToLocalStorage();
      this.renderTasks();
      this.setupTaskReminder(task);
      this.closeModal();
    }
  }

  deleteTask(id) {
    if (confirm("Are you sure you want to delete this task?")) {
      this.tasks = this.tasks.filter((t) => t.id !== id);
      this.saveToLocalStorage();
      this.renderTasks();
      this.updateTaskCount();
      this.clearTaskReminder(id);
    }
  }

  clearCompleted() {
    const completedTasks = this.tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) return;

    if (
      confirm(
        `Are you sure you want to delete ${completedTasks.length} completed task(s)?`
      )
    ) {
      completedTasks.forEach((task) => this.clearTaskReminder(task.id));
      this.tasks = this.tasks.filter((t) => !t.completed);
      this.saveToLocalStorage();
      this.renderTasks();
      this.updateTaskCount();
    }
  }

  // Filtering
  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add("active");
    this.renderTasks();
  }

  getFilteredTasks() {
    let filtered = this.tasks;

    // Filter by status
    if (this.currentFilter === "active") {
      filtered = filtered.filter((t) => !t.completed);
    } else if (this.currentFilter === "completed") {
      filtered = filtered.filter((t) => t.completed);
    }

    // Filter by tag
    if (this.currentTagFilter) {
      filtered = filtered.filter((t) => t.tag === this.currentTagFilter);
    }

    return filtered;
  }

  // Rendering
  renderTasks() {
    const container = document.getElementById("tasksContainer");
    const emptyState = document.getElementById("emptyState");
    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      container.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    container.innerHTML = filteredTasks
      .map((task) => this.createTaskHTML(task))
      .join("");
  }

  createTaskHTML(task) {
    const dueInfo = this.getDueInfo(task);
    const tagClass = task.tag ? `task-tag ${task.tag}` : "";
    const tagText = task.tag ? task.tag : "";

    return `
            <div class="task-item ${
              task.completed ? "completed" : ""
            }" data-id="${task.id}">
                <div class="task-checkbox ${
                  task.completed ? "checked" : ""
                }" onclick="app.toggleTask('${task.id}')"></div>
                <div class="task-content">
                    <div class="task-text ${
                      task.completed ? "completed" : ""
                    }">${this.escapeHtml(task.text)}</div>
                    <div class="task-meta">
                        ${
                          task.tag
                            ? `<span class="${tagClass}">${tagText}</span>`
                            : ""
                        }
                        ${
                          dueInfo
                            ? `<span class="task-due"><i class="fas fa-clock"></i> ${dueInfo}</span>`
                            : ""
                        }
                    </div>
                </div>
                <div class="task-actions">
                    <button class="action-btn edit" onclick="app.editTask('${
                      task.id
                    }')" title="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="app.deleteTask('${
                      task.id
                    }')" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
  }

  getDueInfo(task) {
    if (!task.dueDate) return null;

    const dueDate = new Date(task.dueDate);
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":");
      dueDate.setHours(parseInt(hours), parseInt(minutes));
    }

    const now = new Date();
    const diff = dueDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diff < 0) {
      return "Overdue";
    } else if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} left`;
    } else {
      return "Due soon";
    }
  }

  updateTaskCount() {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter((t) => t.completed).length;
    const activeTasks = totalTasks - completedTasks;

    document.getElementById(
      "taskCount"
    ).textContent = `${activeTasks} active, ${completedTasks} completed`;
  }

  // Theme Management
  toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById("themeToggle");
    const icon = themeToggle.querySelector("i");

    if (body.classList.contains("dark-theme")) {
      body.classList.remove("dark-theme");
      icon.className = "fas fa-moon";
    } else {
      body.classList.add("dark-theme");
      icon.className = "fas fa-sun";
    }

    this.saveToLocalStorage();
  }

  // Modal Management
  openModal() {
    document.getElementById("editModal").classList.add("active");
    document.getElementById("editTaskText").focus();
  }

  closeModal() {
    document.getElementById("editModal").classList.remove("active");
    this.editingTaskId = null;
    this.clearErrors();
  }

  // Reminder System
  setupTaskReminder(task) {
    if (!task.dueDate || task.completed) return;

    const dueDate = new Date(task.dueDate);
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":");
      dueDate.setHours(parseInt(hours), parseInt(minutes));
    }

    const now = new Date();
    const reminderTime = new Date(dueDate.getTime() - 15 * 60 * 1000); // 15 minutes before

    if (reminderTime > now) {
      const timeoutId = setTimeout(() => {
        this.showReminder(task);
      }, reminderTime - now);

      this.reminders.set(task.id, timeoutId);
    }
  }

  clearTaskReminder(id) {
    const timeoutId = this.reminders.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.reminders.delete(id);
    }
  }

  setupReminders() {
    this.tasks.forEach((task) => {
      if (!task.completed) {
        this.setupTaskReminder(task);
      }
    });
  }

  showReminder(task) {
    const notification = document.getElementById("reminderNotification");
    const reminderText = document.getElementById("reminderText");

    reminderText.textContent = `Task due soon: ${task.text}`;
    notification.classList.add("show");

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideReminder();
    }, 10000);
  }

  hideReminder() {
    document.getElementById("reminderNotification").classList.remove("show");
  }

  // Utility Functions
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showError(element, message) {
    element.classList.add("error");
    element.style.animation = "none";
    element.offsetHeight; // Trigger reflow
    element.style.animation = null;

    // Remove error class after animation
    setTimeout(() => {
      element.classList.remove("error");
    }, 500);
  }

  clearErrors() {
    document.querySelectorAll(".error").forEach((el) => {
      el.classList.remove("error");
    });
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new TaskMaster();
});

// Export for testing (if needed)
if (typeof module !== "undefined" && module.exports) {
  module.exports = TaskMaster;
}
