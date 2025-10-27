// DOM Elements
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileLabel = document.querySelector('.file-label');
const inputJson = document.getElementById('inputJson');
const outputJson = document.getElementById('outputJson');
const transformBtn = document.getElementById('transformBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const statusMessage = document.getElementById('statusMessage');
const themeToggle = document.getElementById('themeToggle');
const loadingIndicator = document.getElementById('loadingIndicator');

let transformedData = null;
let originalFileName = 'policy';

// Theme Toggle Functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

// Initialize theme on page load
initTheme();

// File input handler
fileInput.addEventListener('change', handleFileSelect);

// Drag and drop handlers
fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('drag-over');
});

fileLabel.addEventListener('dragleave', () => {
    fileLabel.classList.remove('drag-over');
});

fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect({ target: { files: files } });
    }
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    originalFileName = file.name.replace('.json', '');
    fileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            inputJson.value = content;
            showStatus('File loaded successfully! Click Transform to process.', 'success');
        } catch (error) {
            showStatus('Error reading file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

// Transform button handler
transformBtn.addEventListener('click', transformJSON);

// Download button handler
downloadBtn.addEventListener('click', downloadJSON);

// Clear button handler
clearBtn.addEventListener('click', clearAll);

// Main transformation function
function transformJSON() {
    try {
        const input = inputJson.value.trim();
        if (!input) {
            showStatus('Please provide JSON input', 'error');
            return;
        }

        // Show loading indicator
        loadingIndicator.classList.add('active');

        // Use setTimeout to allow UI to update
        setTimeout(() => {
            try {
                const parsedJson = JSON.parse(input);
                transformedData = transformPolicy(parsedJson);
                
                outputJson.value = JSON.stringify(transformedData, null, 4);
                downloadBtn.disabled = false;
                showStatus('✓ Transformation successful! Ready to download.', 'success');
            } catch (error) {
                showStatus('Error: ' + error.message, 'error');
                downloadBtn.disabled = true;
            } finally {
                loadingIndicator.classList.remove('active');
            }
        }, 100);
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
        downloadBtn.disabled = true;
        loadingIndicator.classList.remove('active');
    }
}

// Recursive function to remove all 'id' fields and transform structure
function transformPolicy(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => transformPolicy(item));
    } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        
        for (const key in obj) {
            // Skip all 'id' fields except those in nested objects we want to keep
            if (key === 'id') {
                // Keep id in specific contexts like measure.id, topic.id, action_library.id
                if (!shouldKeepId(obj)) {
                    continue;
                }
            }
            
            // Transform specific fields
            if (key === 'conditions' && obj[key] !== null && typeof obj[key] === 'object' && Object.keys(obj[key]).length === 0) {
                // Convert empty conditions object to array in blocks
                newObj[key] = [];
            } else if (key === 'action_instructions') {
                // Transform action_instructions
                newObj[key] = transformActionInstructions(obj[key]);
            } else if (key === 'actions') {
                // Transform actions array
                newObj[key] = transformActions(obj[key]);
            } else {
                // Recursively transform other fields
                newObj[key] = transformPolicy(obj[key]);
            }
        }
        
        return newObj;
    }
    
    return obj;
}

// Determine if we should keep the 'id' field based on object properties
function shouldKeepId(obj) {
    // Keep id for: measure, topic, action_library, and top-level action configs
    if (obj.hasOwnProperty('label') || 
        obj.hasOwnProperty('measure_id') || 
        obj.hasOwnProperty('policy_type') ||
        (obj.hasOwnProperty('action_type') && obj.hasOwnProperty('name') && obj.hasOwnProperty('action_library'))) {
        return true;
    }
    return false;
}

// Transform action_instructions array
function transformActionInstructions(instructions) {
    if (!Array.isArray(instructions)) return instructions;
    
    return instructions.map(instruction => {
        const transformed = {};
        
        // Only keep specific fields
        if (instruction.params) {
            transformed.params = transformPolicy(instruction.params);
        }
        
        // Set is_enabled to true instead of false
        transformed.is_enabled = true;
        
        return transformed;
    });
}

// Transform actions array
function transformActions(actions) {
    if (!Array.isArray(actions)) return actions;
    
    return actions.map(action => {
        const transformed = {};
        
        // Keep specific fields in order
        const fieldsToKeep = [
            'id', 'name', 'cloud', 'action_type', 'action', 'value', 
            'frequency', 'display', 'path', 'action_library', 'description',
            'enabled', 'resource_type', 'action_instructions', 'automation_policy_options'
        ];
        
        fieldsToKeep.forEach(field => {
            if (action.hasOwnProperty(field)) {
                if (field === 'action_library') {
                    // Clean up action_library - keep only essential fields
                    transformed[field] = {
                        id: action[field].id,
                        name: action[field].name,
                        description: action[field].description,
                        cloud: action[field].cloud
                    };
                } else if (field === 'action_instructions') {
                    transformed[field] = transformActionInstructions(action[field]);
                } else {
                    transformed[field] = transformPolicy(action[field]);
                }
            }
        });
        
        // Add _links object
        if (action.id) {
            transforme

