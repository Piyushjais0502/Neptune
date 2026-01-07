const { ipcRenderer } = require('electron');

class NeptuneEditor {
  constructor() {
    this.data = { tasks: [], completed: [], skipped: [] };
    this.taskList = document.getElementById('task-list');
    this.completedSection = document.getElementById('completed-section');
    this.completedList = document.getElementById('completed-list');
    this.addButton = document.getElementById('add-task-btn');
    this.toggleCompletedBtn = document.getElementById('toggle-completed');
    this.showCompleted = false;
    this.activeCalendar = null;
    this.activeCalendarTaskId = null;
    
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.render();
  }

  async loadData() {
    this.data = await ipcRenderer.invoke('read-todo-file');
  }

  async saveData() {
    await ipcRenderer.invoke('write-todo-file', this.data);
  }

  setupEventListeners() {
    this.addButton.addEventListener('click', () => this.addTask());
    
    this.toggleCompletedBtn.addEventListener('click', () => {
      this.showCompleted = !this.showCompleted;
      this.renderCompleted();
    });
    
    // File drop support
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.showDropZone();
    });
    
    document.addEventListener('dragleave', (e) => {
      if (!document.elementFromPoint(e.clientX, e.clientY)) {
        this.hideDropZone();
      }
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      this.hideDropZone();
      this.handleFileDrop(e);
    });

    // Listen for external file changes
    ipcRenderer.on('file-changed', () => {
      this.loadData().then(() => this.render());
    });
  }

  showDropZone() {
    if (!document.querySelector('.drop-zone')) {
      const dropZone = document.createElement('div');
      dropZone.className = 'drop-zone';
      dropZone.innerHTML = '<p>Drop files here to create tasks</p>';
      this.taskList.insertBefore(dropZone, this.taskList.firstChild);
    }
  }

  hideDropZone() {
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
      dropZone.remove();
    }
  }

  handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      this.addTask(file.name);
    });
  }

  addTask(text = '') {
    const task = {
      id: Date.now() + Math.random(),
      text: text,
      created: new Date().toISOString(),
      dueDate: null,
      description: '',
      isNew: true
    };
    
    this.data.tasks.unshift(task);
    this.saveData();
    this.render();
    
    // Focus on the new task if it's empty
    if (!text) {
      setTimeout(() => {
        const input = document.querySelector(`[data-task-id="${task.id}"] .task-input`);
        if (input) input.focus();
      }, 100);
    }
  }

  completeTask(taskId) {
    const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.data.tasks.splice(taskIndex, 1)[0];
      task.completed = new Date().toISOString();
      this.data.completed.push(task);
      this.saveData();
      this.render();
    }
  }

  skipTask(taskId) {
    const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.data.tasks.splice(taskIndex, 1)[0];
      task.skipped = new Date().toISOString();
      this.data.skipped.push(task);
      this.saveData();
      this.render();
    }
  }

  updateTaskText(taskId, text) {
    const task = this.data.tasks.find(t => t.id === taskId);
    if (task) {
      task.text = text;
      this.saveData();
    }
  }

  updateTaskDescription(taskId, description) {
    const task = this.data.tasks.find(t => t.id === taskId);
    if (task) {
      task.description = description;
      this.saveData();
    }
  }

  setTaskDueDate(taskId, dueDate) {
    const task = this.data.tasks.find(t => t.id === taskId);
    if (task) {
      task.dueDate = dueDate;
      this.saveData();
      this.render();
    }
  }

  deleteCompletedTask(taskId) {
    const taskIndex = this.data.completed.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      this.data.completed.splice(taskIndex, 1);
      this.saveData();
      this.render();
    }
  }

  // Permanently delete from the .todo file (JSON)
  deleteTask(taskId) {
    const idx = this.data.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      this.data.tasks.splice(idx, 1);
      this.saveData();
      this.render();
    }
  }

  isTaskOverdue(task) {
    if (!task.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  moveTask(fromIndex, toIndex) {
    const task = this.data.tasks.splice(fromIndex, 1)[0];
    this.data.tasks.splice(toIndex, 0, task);
    this.saveData();
    this.render();
  }

  render() {
    this.taskList.innerHTML = '';
    
    if (this.data.tasks.length === 0) {
      this.renderEmptyState();
    } else {
      this.data.tasks.forEach((task, index) => {
        const taskElement = this.createTaskElement(task, index);
        this.taskList.appendChild(taskElement);
        
        // Add animation for new tasks
        if (task.isNew) {
          taskElement.classList.add('new-task');
          delete task.isNew;
        }
      });
    }

    // Show completed section if there are completed tasks
    if (this.data.completed.length > 0) {
      this.completedSection.style.display = 'block';
      this.renderCompleted();
    } else {
      this.completedSection.style.display = 'none';
    }
  }

  renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <h3>No tasks yet</h3>
      <p>Click the + button to add a task<br>or drag files here to create tasks from filenames</p>
    `;
    this.taskList.appendChild(emptyState);
  }

  renderCompleted() {
    this.completedList.innerHTML = '';
    const arrow = this.toggleCompletedBtn.querySelector('i');
    
    if (!this.showCompleted) {
      this.completedList.style.display = 'none';
      arrow.className = 'fas fa-chevron-down';
      return;
    }
    
    this.completedList.style.display = 'block';
    arrow.className = 'fas fa-chevron-up';
    
    this.data.completed.forEach(task => {
      const completedElement = this.createCompletedTaskElement(task);
      this.completedList.appendChild(completedElement);
    });
  }

  createCompletedTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'completed-task';
    
    const completedDate = new Date(task.completed).toLocaleDateString();
    const hasDescription = task.description && task.description.trim();
    
    taskElement.innerHTML = `
      <input type="checkbox" class="task-checkbox" checked disabled>
      <div class="task-content">
        <span class="task-text">${task.text}</span>
        ${hasDescription ? `<div class="task-description-display">${task.description}</div>` : ''}
      </div>
      <span class="completed-date">${completedDate}</span>
      <button class="delete-completed-btn" title="Delete permanently">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    // Add delete functionality
    const deleteBtn = taskElement.querySelector('.delete-completed-btn');
    deleteBtn.addEventListener('click', () => {
      taskElement.classList.add('deleting');
      setTimeout(() => this.deleteCompletedTask(task.id), 300);
    });
    
    return taskElement;
  }

  createTaskElement(task, index) {
    const taskElement = document.createElement('div');
    const overdue = this.isTaskOverdue(task);

    taskElement.className = `task-item ${overdue ? 'overdue' : ''}`;
    taskElement.draggable = true;
    taskElement.dataset.taskId = task.id;
    taskElement.dataset.index = index;

    const dueDateDisplay = task.dueDate ? 
      `<span class="due-date">${new Date(task.dueDate).toLocaleDateString()}</span>` : 
      '<span class="due-date-placeholder">No due date</span>';

    const hasDescription = task.description && task.description.trim();
    const descriptionIndicator = hasDescription ? 'has-description' : '';

    taskElement.innerHTML = `
      <input type="checkbox" class="task-checkbox">
      <div class="task-content">
        <input type="text" class="task-input" value="${task.text}" placeholder="Enter task...">
        <div class="task-description-container" style="display: none;">
          <div class="description-toolbar">
            <button class="toolbar-btn" data-command="bold" title="Bold">
              <i class="fas fa-bold"></i>
            </button>
            <button class="toolbar-btn" data-command="italic" title="Italic">
              <i class="fas fa-italic"></i>
            </button>
            <button class="toolbar-btn" data-command="underline" title="Underline">
              <i class="fas fa-underline"></i>
            </button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-command="insertUnorderedList" title="Bullet List">
              <i class="fas fa-list-ul"></i>
            </button>
            <button class="toolbar-btn" data-command="insertOrderedList" title="Numbered List">
              <i class="fas fa-list-ol"></i>
            </button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-command="strikeThrough" title="Strikethrough">
              <i class="fas fa-strikethrough"></i>
            </button>
            <button class="toolbar-btn" data-command="removeFormat" title="Clear Formatting">
              <i class="fas fa-remove-format"></i>
            </button>
          </div>
          <div class="task-description-input" contenteditable="true" data-placeholder="Add a description...">${task.description || ''}</div>
        </div>
      </div>
      <div class="task-controls">
        ${dueDateDisplay}
        <button class="description-btn ${descriptionIndicator}" title="Add description">
          <i class="fas fa-align-left"></i>
        </button>
        <button class="date-picker-btn" title="Set due date">
          <i class="fas fa-calendar"></i>
        </button>
        <div class="calendar-popover" style="display:none;"></div>
        <button class="task-delete-btn" title="Delete task permanently">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    // Event listeners
    const checkbox = taskElement.querySelector('.task-checkbox');
    const input = taskElement.querySelector('.task-input');
    const descriptionBtn = taskElement.querySelector('.description-btn');
    const descriptionContainer = taskElement.querySelector('.task-description-container');
    const descriptionInput = taskElement.querySelector('.task-description-input');
    const datePickerBtn = taskElement.querySelector('.date-picker-btn');
    const calendarPopover = taskElement.querySelector('.calendar-popover');
    const deleteBtn = taskElement.querySelector('.task-delete-btn');

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        taskElement.classList.add('completing');
        setTimeout(() => this.completeTask(task.id), 300);
      }
    });

    input.addEventListener('blur', () => {
      this.updateTaskText(task.id, input.value);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });

    // Description functionality
    descriptionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = descriptionContainer.style.display !== 'none';
      
      // Hide all other open descriptions
      document.querySelectorAll('.task-description-container').forEach(container => {
        if (container !== descriptionContainer) {
          container.style.display = 'none';
          container.closest('.task-item').classList.remove('description-open');
        }
      });
      
      if (isVisible) {
        descriptionContainer.style.display = 'none';
        taskElement.classList.remove('description-open');
      } else {
        descriptionContainer.style.display = 'block';
        taskElement.classList.add('description-open');
        setTimeout(() => {
          descriptionInput.focus();
          this.updatePlaceholder(descriptionInput);
        }, 100);
        
        // Add click-outside handler for this specific description
        this.setupDescriptionClickOutside(descriptionContainer, taskElement);
      }
    });

    // Prevent description container from closing when clicking inside it
    descriptionContainer.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Toolbar functionality
    const toolbarBtns = taskElement.querySelectorAll('.toolbar-btn');
    toolbarBtns.forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const command = btn.dataset.command;
        
        // Execute the formatting command
        document.execCommand(command, false, null);
        
        // Update button states
        this.updateToolbarStates(taskElement);
        
        // Keep focus on the editor
        setTimeout(() => descriptionInput.focus(), 10);
      });
    });

    // Description input events
    descriptionInput.addEventListener('blur', (e) => {
      // Check if the blur is caused by clicking on a toolbar button
      const relatedTarget = e.relatedTarget;
      const isToolbarClick = relatedTarget && relatedTarget.closest('.description-toolbar');
      
      if (!isToolbarClick) {
        this.updateTaskDescription(task.id, descriptionInput.innerHTML);
        // Update the button indicator
        if (descriptionInput.textContent.trim() || descriptionInput.innerHTML.trim()) {
          descriptionBtn.classList.add('has-description');
        } else {
          descriptionBtn.classList.remove('has-description');
        }
      }
    });

    descriptionInput.addEventListener('input', () => {
      this.updatePlaceholder(descriptionInput);
      this.updateToolbarStates(taskElement);
    });

    descriptionInput.addEventListener('keyup', () => {
      this.updateToolbarStates(taskElement);
    });

    descriptionInput.addEventListener('mouseup', () => {
      this.updateToolbarStates(taskElement);
    });

    descriptionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        descriptionContainer.style.display = 'none';
        taskElement.classList.remove('description-open');
      }
      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'b':
            e.preventDefault();
            document.execCommand('bold');
            this.updateToolbarStates(taskElement);
            break;
          case 'i':
            e.preventDefault();
            document.execCommand('italic');
            this.updateToolbarStates(taskElement);
            break;
          case 'u':
            e.preventDefault();
            document.execCommand('underline');
            this.updateToolbarStates(taskElement);
            break;
        }
      }
    });

    datePickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCalendar(calendarPopover, task.id, task.dueDate);
    });

    // Delete (permanent)
    deleteBtn.addEventListener('click', () => {
      taskElement.classList.add('skipping');
      setTimeout(() => this.deleteTask(task.id), 300);
    });

    // Drag and drop
    taskElement.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      taskElement.classList.add('dragging');
    });

    taskElement.addEventListener('dragend', () => {
      taskElement.classList.remove('dragging');
    });

    taskElement.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    taskElement.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = index;
      
      if (fromIndex !== toIndex) {
        this.moveTask(fromIndex, toIndex);
      }
    });

    return taskElement;
  }

  toggleCalendar(containerEl, taskId, selectedIsoDate) {
    // Close any existing calendar first
    if (this.activeCalendar && this.activeCalendar !== containerEl) {
      this.activeCalendar.style.display = 'none';
      this.activeCalendar.innerHTML = '';
    }

    const isOpen = containerEl.style.display !== 'none';
    if (isOpen) {
      containerEl.style.display = 'none';
      containerEl.innerHTML = '';
      this.activeCalendar = null;
      this.activeCalendarTaskId = null;
      return;
    }

    this.activeCalendar = containerEl;
    this.activeCalendarTaskId = taskId;

    const initDate = selectedIsoDate ? new Date(selectedIsoDate) : new Date();
    this.renderCalendar(containerEl, taskId, initDate, selectedIsoDate);
    containerEl.style.display = 'block';

    // One-time outside click to close
    const onDocClick = (evt) => {
      if (!containerEl.contains(evt.target)) {
        containerEl.style.display = 'none';
        containerEl.innerHTML = '';
        this.activeCalendar = null;
        this.activeCalendarTaskId = null;
        document.removeEventListener('click', onDocClick, true);
      }
    };
    document.addEventListener('click', onDocClick, true);
  }

  renderCalendar(containerEl, taskId, viewDate, selectedIsoDate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0-11

    const selectedKey = selectedIsoDate ? this.toDateKey(new Date(selectedIsoDate)) : null;

    const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const firstOfMonth = new Date(year, month, 1);
    const startDay = (firstOfMonth.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayKey = this.toDateKey(new Date());

    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      .map(d => `<div class="cal-dow">${d}</div>`)
      .join('');

    let cells = '';
    for (let i = 0; i < startDay; i++) {
      cells += `<button class="cal-day cal-day--empty" tabindex="-1" disabled></button>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const key = this.toDateKey(dateObj);
      const isToday = key === todayKey;
      const isSelected = selectedKey && key === selectedKey;

      const classes = [
        'cal-day',
        isToday ? 'cal-day--today' : '',
        isSelected ? 'cal-day--selected' : ''
      ].filter(Boolean).join(' ');

      const iso = this.toIsoDate(dateObj);
      cells += `<button class="${classes}" data-iso="${iso}">${day}</button>`;
    }

    containerEl.innerHTML = `
      <div class="cal">
        <div class="cal-header">
          <button class="cal-nav" data-nav="prev" title="Previous month">‹</button>
          <div class="cal-title">${monthLabel}</div>
          <button class="cal-nav" data-nav="next" title="Next month">›</button>
        </div>
        <div class="cal-weekdays">${weekday}</div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-footer">
          <button class="cal-action" data-action="clear">Clear</button>
          <button class="cal-action" data-action="today">Today</button>
        </div>
      </div>
    `;

    // Navigation
    containerEl.querySelectorAll('.cal-nav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nav = btn.dataset.nav;
        const next = new Date(year, month + (nav === 'next' ? 1 : -1), 1);
        this.renderCalendar(containerEl, taskId, next, selectedIsoDate);
      });
    });

    // Day selection
    containerEl.querySelectorAll('.cal-day[data-iso]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const iso = btn.dataset.iso;
        this.setTaskDueDate(taskId, iso);
        containerEl.style.display = 'none';
        containerEl.innerHTML = '';
        this.activeCalendar = null;
        this.activeCalendarTaskId = null;
      });
    });

    // Footer actions
    containerEl.querySelectorAll('.cal-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'clear') {
          this.setTaskDueDate(taskId, null);
          containerEl.style.display = 'none';
          containerEl.innerHTML = '';
          this.activeCalendar = null;
          this.activeCalendarTaskId = null;
          return;
        }
        if (action === 'today') {
          const iso = this.toIsoDate(new Date());
          this.setTaskDueDate(taskId, iso);
          containerEl.style.display = 'none';
          containerEl.innerHTML = '';
          this.activeCalendar = null;
          this.activeCalendarTaskId = null;
        }
      });
    });
  }

  toIsoDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  toDateKey(dateObj) {
    return `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
  }

  updatePlaceholder(editor) {
    const isEmpty = !editor.textContent.trim() && !editor.innerHTML.trim();
    if (isEmpty) {
      editor.classList.add('empty');
    } else {
      editor.classList.remove('empty');
    }
  }

  updateToolbarStates(taskElement) {
    const toolbarBtns = taskElement.querySelectorAll('.toolbar-btn');
    toolbarBtns.forEach(btn => {
      const command = btn.dataset.command;
      let isActive = false;
      
      try {
        switch(command) {
          case 'bold':
          case 'italic':
          case 'underline':
          case 'strikeThrough':
            isActive = document.queryCommandState(command);
            break;
          case 'insertUnorderedList':
          case 'insertOrderedList':
            isActive = document.queryCommandState(command);
            break;
        }
      } catch (e) {
        // Some browsers might not support all commands
        isActive = false;
      }
      
      if (isActive) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setupDescriptionClickOutside(descriptionContainer, taskElement) {
    // Remove any existing click-outside handler
    if (taskElement.clickOutsideHandler) {
      document.removeEventListener('click', taskElement.clickOutsideHandler, true);
    }
    
    // Create new click-outside handler
    taskElement.clickOutsideHandler = (e) => {
      // Check if click is outside the description container and not on the description button
      const descriptionBtn = taskElement.querySelector('.description-btn');
      const isClickInsideContainer = descriptionContainer.contains(e.target);
      const isClickOnDescriptionBtn = descriptionBtn.contains(e.target);
      const isClickOnToolbar = e.target.closest('.description-toolbar');
      
      if (!isClickInsideContainer && !isClickOnDescriptionBtn && !isClickOnToolbar) {
        descriptionContainer.style.display = 'none';
        taskElement.classList.remove('description-open');
        document.removeEventListener('click', taskElement.clickOutsideHandler, true);
        taskElement.clickOutsideHandler = null;
        
        // Save the description when closing
        const descriptionInput = taskElement.querySelector('.task-description-input');
        this.updateTaskDescription(task.id, descriptionInput.innerHTML);
        
        // Update the button indicator
        const descriptionBtn = taskElement.querySelector('.description-btn');
        if (descriptionInput.textContent.trim() || descriptionInput.innerHTML.trim()) {
          descriptionBtn.classList.add('has-description');
        } else {
          descriptionBtn.classList.remove('has-description');
        }
      }
    };
    
    // Add the handler with a small delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', taskElement.clickOutsideHandler, true);
    }, 100);
  }
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new NeptuneEditor();
});