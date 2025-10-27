// DOM Elements
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileLabel = document.querySelector('.file-label');
const inputJson = document.getElementById('inputJson');
const outputJson = document.getElementById('outputJson');
const consoleScript = document.getElementById('consoleScript');
const inputJsonViewer = document.getElementById('inputJsonViewer');
const outputJsonViewer = document.getElementById('outputJsonViewer');
const transformBtn = document.getElementById('transformBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const statusMessage = document.getElementById('statusMessage');
const themeToggle = document.getElementById('themeToggle');
const loadingIndicator = document.getElementById('loadingIndicator');

let transformedData = null;
let originalFileName = 'policy';

// Clear all data on page load (fresh start on every refresh)
window.addEventListener('load', () => {
    // Clear input and output fields
    if (inputJson) inputJson.value = '';
    if (outputJson) outputJson.value = '';
    if (consoleScript) consoleScript.value = '';
    if (inputJsonViewer) inputJsonViewer.innerHTML = '';
    if (outputJsonViewer) outputJsonViewer.innerHTML = '';
    if (fileInput) fileInput.value = '';
    if (fileNameDisplay) fileNameDisplay.textContent = 'Choose JSON file or drag & drop';
    
    // Reset variables
    transformedData = null;
    originalFileName = 'policy';
    
    // Disable download button
    if (downloadBtn) downloadBtn.disabled = true;
    
    // Clear status message
    if (statusMessage) {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }
    
    // Note: We do NOT clear theme preference - user's theme choice persists
});

// Theme Toggle Functionality with Auto Detection
function initTheme() {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        // Use saved theme
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else {
        // Auto-detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const autoTheme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', autoTheme);
        updateThemeIcon(autoTheme);
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-update if user hasn't manually set a preference
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});

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

// Generate console import script
function generateConsoleScript(jsonData) {
    const jsonString = JSON.stringify(jsonData);
    const script = `var payload = \`${jsonString}\`; var csrf_token = document.querySelector('meta[name = "csrf-token"]').getAttribute("content"); var xhr = new XMLHttpRequest(); xhr.open('POST', 'https://apps.cloudhealthtech.com/policies.json', false); xhr.setRequestHeader('Content-Type', 'application/json'); xhr.setRequestHeader('Accept', 'application/json, text/plain, */*'); xhr.setRequestHeader('X-XSRF-TOKEN', csrf_token); xhr.send(payload); console.log(xhr.response);`;
    return script;
}

// Syntax highlight JSON
function syntaxHighlight(json) {
    json = JSON.stringify(json, null, 4);
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Render JSON with syntax highlighting
function renderJsonWithHighlight(jsonText, viewerId, textareaId) {
    const viewer = document.getElementById(viewerId);
    const textarea = document.getElementById(textareaId);
    
    if (!jsonText || !jsonText.trim()) {
        viewer.classList.remove('active');
        textarea.style.display = 'block';
        return;
    }
    
    try {
        const json = JSON.parse(jsonText);
        const highlighted = syntaxHighlight(json);
        viewer.innerHTML = highlighted;
        viewer.classList.add('active');
        textarea.style.display = 'none';
    } catch (e) {
        // If invalid JSON, show textarea
        viewer.classList.remove('active');
        textarea.style.display = 'block';
    }
}

// Copy output to clipboard
function copyOutput(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea || !textarea.value.trim()) {
        showStatus('Nothing to copy!', 'error');
        return;
    }
    
    navigator.clipboard.writeText(textarea.value).then(() => {
        showStatus('✓ Copied to clipboard!', 'success');
    }).catch(err => {
        // Fallback for older browsers
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        document.execCommand('copy');
        showStatus('✓ Copied to clipboard!', 'success');
    });
}

// Download output as file
function downloadOutput(textareaId, type) {
    const textarea = document.getElementById(textareaId);
    if (!textarea || !textarea.value.trim()) {
        showStatus('Nothing to download!', 'error');
        return;
    }
    
    const content = textarea.value;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalFileName}_transformed.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('✓ File downloaded successfully!', 'success');
}

// Clear specific textarea
function clearTextarea(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        textarea.value = '';
        textarea.style.display = 'block';
        
        if (textareaId === 'inputJson') {
            inputJsonViewer.classList.remove('active');
            inputJsonViewer.innerHTML = '';
            fileNameDisplay.textContent = 'Choose JSON file or drag & drop';
            fileInput.value = '';
        } else if (textareaId === 'outputJson') {
            outputJsonViewer.classList.remove('active');
            outputJsonViewer.innerHTML = '';
        }
        showStatus('Content cleared', 'success');
    }
}

// Prettify JSON in textarea
function prettifyJson(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea || !textarea.value.trim()) {
        showStatus('Nothing to prettify!', 'error');
        return;
    }
    
    try {
        const json = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(json, null, 4);
        
        // Render with syntax highlighting
        if (textareaId === 'inputJson') {
            renderJsonWithHighlight(textarea.value, 'inputJsonViewer', 'inputJson');
        } else if (textareaId === 'outputJson') {
            renderJsonWithHighlight(textarea.value, 'outputJsonViewer', 'outputJson');
        }
        
        showStatus('✓ JSON prettified!', 'success');
    } catch (error) {
        showStatus('Invalid JSON: ' + error.message, 'error');
    }
}

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
            // Auto-prettify the loaded JSON
            try {
                const json = JSON.parse(content);
                const prettified = JSON.stringify(json, null, 4);
                inputJson.value = prettified;
                renderJsonWithHighlight(prettified, 'inputJsonViewer', 'inputJson');
            } catch {
                // If it's not valid JSON, just load as-is
                inputJson.value = content;
                inputJson.style.display = 'block';
                inputJsonViewer.classList.remove('active');
            }
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
                
                // Auto-prettify input before transformation
                inputJson.value = JSON.stringify(parsedJson, null, 4);
                renderJsonWithHighlight(inputJson.value, 'inputJsonViewer', 'inputJson');
                
                // Transform
                transformedData = transformPolicy(parsedJson);
                
                // Prettify and highlight output JSON
                const prettified = JSON.stringify(transformedData, null, 4);
                outputJson.value = prettified;
                renderJsonWithHighlight(prettified, 'outputJsonViewer', 'outputJson');
                
                // Generate console script
                consoleScript.value = generateConsoleScript(transformedData);
                
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

// Recursive function to remove all 'id' and 'uuid' fields and transform structure
function transformPolicy(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => transformPolicy(item));
    } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        
        for (const key in obj) {
            // Skip 'id' and 'uuid' fields except in specific contexts
            if (key === 'id' || key === 'uuid') {
                if (!shouldKeepId(obj, key)) {
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

// Determine if we should keep the 'id' or 'uuid' field based on object properties
function shouldKeepId(obj, key) {
    // Only keep id in very specific contexts: measure, topic, action_library
    if (key === 'id') {
        if (obj.hasOwnProperty('measure_id') && obj.hasOwnProperty('label')) {
            // This is a measure object
            return true;
        }
        if (obj.hasOwnProperty('policy_type') && obj.hasOwnProperty('label')) {
            // This is a topic object
            return true;
        }
        if (obj.hasOwnProperty('version') && obj.hasOwnProperty('description') && obj.hasOwnProperty('name') && !obj.hasOwnProperty('policy')) {
            // This is an action_library object (has version but not policy wrapper)
            return true;
        }
        if (obj.hasOwnProperty('action_type') && obj.hasOwnProperty('action_library') && obj.hasOwnProperty('name')) {
            // This is an action config object
            return true;
        }
    }
    
    // Never keep uuid fields
    if (key === 'uuid') {
        return false;
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
        
        // Set is_enabled to true
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
            transformed._links = {
                self: {
                    href: `/v1/actions/action_configs/${action.id}`
                }
            };
        }
        
        // Add params if exists
        if (action.params) {
            transformed.params = transformPolicy(action.params);
        }
        
        return transformed;
    });
}

// Download the transformed JSON
function downloadJSON() {
    if (!transformedData) {
        showStatus('No transformed data to download', 'error');
        return;
    }

    const jsonStr = JSON.stringify(transformedData, null, 4);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalFileName}_transformed.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('✓ File downloaded successfully!', 'success');
}

// Clear all inputs and outputs
function clearAll() {
    inputJson.value = '';
    outputJson.value = '';
    consoleScript.value = '';
    inputJson.style.display = 'block';
    outputJson.style.display = 'block';
    inputJsonViewer.classList.remove('active');
    outputJsonViewer.classList.remove('active');
    inputJsonViewer.innerHTML = '';
    outputJsonViewer.innerHTML = '';
    fileInput.value = '';
    fileNameDisplay.textContent = 'Choose JSON file or drag & drop';
    transformedData = null;
    originalFileName = 'policy';
    downloadBtn.disabled = true;
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
}

// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            if (statusMessage.classList.contains('success')) {
                statusMessage.textContent = '';
                statusMessage.className = 'status-message';
            }
        }, 5000);
    }
}

// Enable textarea paste and typing with syntax highlighting
inputJson.addEventListener('input', () => {
    if (inputJson.value.trim()) {
        fileNameDisplay.textContent = 'JSON pasted in editor';
        try {
            const json = JSON.parse(inputJson.value);
            renderJsonWithHighlight(inputJson.value, 'inputJsonViewer', 'inputJson');
        } catch (e) {
            // Show textarea for invalid JSON
            inputJson.style.display = 'block';
            inputJsonViewer.classList.remove('active');
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to transform
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        transformJSON();
    }
    
    // Ctrl/Cmd + S to download
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!downloadBtn.disabled) {
            downloadJSON();
        }
    }
});
