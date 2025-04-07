document.addEventListener('DOMContentLoaded', function() {
  // Cache DOM elements
  const apiKeyDisplay = document.getElementById('api-key-display');
  const apiKeyInput = document.getElementById('api-key-input');
  const currentApiKey = document.getElementById('current-api-key');
  const apiKeyField = document.getElementById('api-key-field');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const clearApiKeyBtn = document.getElementById('clear-api-key');
  const ipAddressField = document.getElementById('ip-address');
  const usernameField = document.getElementById('username');
  const passwordField = document.getElementById('password');
  const generateApiKeyBtn = document.getElementById('generate-api-key');
  const jobIdField = document.getElementById('job-id');
  const checkLatestJobBtn = document.getElementById('check-latest-job');
  const checkSpecificJobBtn = document.getElementById('check-specific-job');
  const jobResults = document.getElementById('job-results');
  const displayJobId = document.getElementById('display-job-id');
  const jobStatus = document.getElementById('job-status');
  const jobType = document.getElementById('job-type');
  const jobStartTime = document.getElementById('job-start-time');
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = document.getElementById('progress-percentage');
  const jobMessage = document.getElementById('job-message');
  const statusMessage = document.getElementById('status-message');
  
  // Cache additional DOM elements for new UI
  const lastUpdated = document.getElementById('last-updated');
  const autoRefreshBtn = document.getElementById('auto-refresh');
  const copyJobIdBtn = document.getElementById('copy-job-id');
  const viewHelpBtn = document.getElementById('view-help');
  
  // Cache elements for collapsible connection section
  const connectionHeader = document.getElementById('connection-header');
  const toggleConnectionBtn = document.getElementById('toggle-connection');
  const connectionContent = document.getElementById('connection-content');
  
  // Check if API key and IP address exist in storage
  checkStoredData();

  // Button Event Listeners
  saveApiKeyBtn.addEventListener('click', saveApiKey);
  clearApiKeyBtn.addEventListener('click', clearApiKey);
  generateApiKeyBtn.addEventListener('click', openApiKeyGenPage);
  checkLatestJobBtn.addEventListener('click', checkLatestJob);
  checkSpecificJobBtn.addEventListener('click', checkSpecificJob);
  
  // Additional button listeners
  autoRefreshBtn.addEventListener('click', toggleAutoRefresh);
  copyJobIdBtn.addEventListener('click', copyJobIdToClipboard);
  viewHelpBtn.addEventListener('click', showHelp);
  
  // Collapsible section listeners
  connectionHeader.addEventListener('click', toggleConnectionSection);
  
  // Check if connection section should be collapsed by default
  browser.storage.local.get('connectionCollapsed').then((result) => {
    if (result.connectionCollapsed) {
      collapseConnectionSection();
    }
  });

  // Functions for collapsible sections
  function toggleConnectionSection() {
    if (connectionContent.classList.contains('hidden')) {
      expandConnectionSection();
    } else {
      collapseConnectionSection();
    }
  }
  
  function collapseConnectionSection() {
    connectionContent.classList.add('hidden');
    toggleConnectionBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    `;
    // Save preference
    browser.storage.local.set({ connectionCollapsed: true });
  }
  
  function expandConnectionSection() {
    connectionContent.classList.remove('hidden');
    toggleConnectionBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    `;
    // Save preference
    browser.storage.local.set({ connectionCollapsed: false });
  }

  // Original functions
  function checkStoredData() {
    browser.storage.local.get(['apiKey', 'ipAddress']).then((result) => {
      if (result.apiKey) {
        apiKeyDisplay.classList.remove('hidden');
        apiKeyInput.classList.add('hidden');
        
        // Display only 15 characters of the API key, with first characters masked
        if (result.apiKey.length > 0) {
          // Keep only last 4 visible, mask the rest, but cap at 15 total characters
          const visiblePart = result.apiKey.slice(-4);
          const maskedLength = Math.min(11, result.apiKey.length - 4);
          const maskedPart = '•'.repeat(maskedLength);
          currentApiKey.textContent = maskedPart + visiblePart;
        } else {
          currentApiKey.textContent = '•••••••••••••••';
        }
      } else {
        apiKeyDisplay.classList.add('hidden');
        apiKeyInput.classList.remove('hidden');
      }

      // Pre-fill IP address if stored
      if (result.ipAddress) {
        ipAddressField.value = result.ipAddress;
      }
    });
  }

  function saveApiKey() {
    const apiKey = apiKeyField.value.trim();
    const ipAddress = ipAddressField.value.trim();
    
    if (!apiKey) {
      showStatusMessage('Please enter a valid API key', 'error');
      return;
    }

    // Also save IP address if provided
    const dataToSave = { apiKey };
    if (ipAddress) {
      dataToSave.ipAddress = ipAddress;
    }

    browser.storage.local.set(dataToSave).then(() => {
      apiKeyField.value = '';
      showStatusMessage('API key saved successfully', 'success');
      checkStoredData();
      
      // Auto-check latest job if both API key and IP address are available
      if (ipAddress) {
        setTimeout(() => checkLatestJob(), 500);
      }
    });
  }

  function clearApiKey() {
    browser.storage.local.remove('apiKey').then(() => {
      showStatusMessage('API key removed', 'success');
      checkStoredData();
    });
  }

  function openApiKeyGenPage() {
    const ipAddress = ipAddressField.value.trim();
    const username = usernameField.value.trim();
    const password = passwordField.value.trim();
    
    if (!ipAddress) {
      showStatusMessage('Please enter an IP address', 'error');
      return;
    }

    if (!username || !password) {
      showStatusMessage('Please enter both username and password', 'error');
      return;
    }

    // Validate IP address format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      showStatusMessage('Please enter a valid IP address', 'error');
      return;
    }

    // Save the IP address for future use
    browser.storage.local.set({ ipAddress });

    // Show loading state
    generateApiKeyBtn.textContent = "Generating...";
    generateApiKeyBtn.disabled = true;
    
    // Generate API key using the provided credentials
    generateApiKey(ipAddress, username, password)
      .then(apiKey => {
        if (apiKey) {
          // Save the API key
          browser.storage.local.set({ apiKey }).then(() => {
            passwordField.value = ''; // Clear password for security
            usernameField.value = ''; // Clear username
            showStatusMessage('API key generated and saved successfully', 'success');
            checkStoredData();
            
            // Reset button state
            generateApiKeyBtn.textContent = "Generate API Key";
            generateApiKeyBtn.disabled = false;
            
            // Auto-check latest job
            setTimeout(() => checkLatestJob(), 500);
          });
        } else {
          // Reset button state
          generateApiKeyBtn.textContent = "Generate API Key";
          generateApiKeyBtn.disabled = false;
          showStatusMessage('Failed to generate API key', 'error');
        }
      })
      .catch(error => {
        // Reset button state
        generateApiKeyBtn.textContent = "Generate API Key";
        generateApiKeyBtn.disabled = false;
        showStatusMessage('Error: ' + error.message, 'error');
      });
  }

  async function generateApiKey(ipAddress, username, password) {
    try {
      // Build the URL for API key generation based on the curl command
      // curl -H "Content-Type: application/x-www-form-urlencoded" -X POST https://firewall/api/?type=keygen -d 'user=<user>&password=<password>'
      const url = `https://${ipAddress}/api/?type=keygen`;
      const formData = new URLSearchParams();
      formData.append('user', username);
      formData.append('password', password);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });
      
      const data = await response.text();
      
      // Parse the XML response to extract the API key
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      
      // Check for errors
      const status = xmlDoc.querySelector('response').getAttribute('status');
      if (status !== 'success') {
        const errorMessage = xmlDoc.querySelector('msg') ? xmlDoc.querySelector('msg').textContent : 'Unknown error';
        throw new Error(errorMessage);
      }
      
      // Extract the API key from the XML
      const apiKey = xmlDoc.querySelector('key') ? xmlDoc.querySelector('key').textContent : null;
      
      if (!apiKey) {
        throw new Error('API key not found in response');
      }
      
      return apiKey;
    } catch (error) {
      console.error('Error generating API key:', error);
      throw error;
    }
  }

  function checkLatestJob() {
    getApiKey().then(apiKey => {
      if (!apiKey) {
        showStatusMessage('API key not found', 'error');
        return;
      }
  
      const ipAddress = ipAddressField.value.trim();
      if (!ipAddress) {
        showStatusMessage('Please enter the NGFW IP address', 'error');
        return;
      }
  
      // Save the IP address for future use
      browser.storage.local.set({ ipAddress });
  
      // Auto-collapse connection section to show job results
      collapseConnectionSection();
  
      // Show loading state
      jobResults.classList.remove('hidden');
      displayJobId.textContent = 'Loading...';
      jobStatus.textContent = 'Fetching';
      jobStatus.className = 'font-semibold text-blue-600';
      progressBar.style.width = '0%';
      progressPercentage.textContent = 'Loading...';
      jobMessage.textContent = 'Requesting latest job information...';
      jobMessage.className = 'text-sm text-gray-700 italic';
  
      // Call the API to get the latest job
      fetchLatestJob(ipAddress, apiKey)
        .then(jobData => {
          if (jobData) {
            displayJobStatus(jobData);
            
            // Start background monitoring for the job
            browser.runtime.sendMessage({
              action: 'monitorJob',
              jobId: jobData.id,
              ipAddress: ipAddress,
              apiKey: apiKey
            }).catch(error => {
              console.error('Error starting background monitoring:', error);
            });
            
            // If job is still running, set up polling
            if (jobData.status !== 'FIN' && jobData.status !== 'FAIL' && jobData.progress < 100) {
              pollJobStatus(ipAddress, apiKey, jobData.id);
            }
          }
        })
        .catch(error => {
          jobResults.classList.remove('hidden');
          displayJobId.textContent = 'Error';
          jobStatus.textContent = 'Failed';
          jobStatus.className = 'font-semibold text-red-600';
          progressBar.style.width = '0%';
          progressPercentage.textContent = '0%';
          jobMessage.textContent = 'Error: ' + error.message;
          jobMessage.className = 'text-sm text-red-700 italic';
          showStatusMessage('Error fetching latest job: ' + error.message, 'error');
        });
    });
  }

  function checkSpecificJob() {
    getApiKey().then(apiKey => {
      if (!apiKey) {
        showStatusMessage('API key not found', 'error');
        return;
      }
  
      const jobId = jobIdField.value.trim();
      if (!jobId) {
        showStatusMessage('Please enter a job ID', 'error');
        return;
      }
  
      const ipAddress = ipAddressField.value.trim();
      if (!ipAddress) {
        showStatusMessage('Please enter the NGFW IP address', 'error');
        return;
      }
  
      // Save the IP address for future use
      browser.storage.local.set({ ipAddress });
  
      // Auto-collapse connection section to show job results
      collapseConnectionSection();
  
      // Show loading state
      jobResults.classList.remove('hidden');
      displayJobId.textContent = jobId;
      jobStatus.textContent = 'Fetching';
      jobStatus.className = 'font-semibold text-blue-600';
      progressBar.style.width = '0%';
      progressPercentage.textContent = 'Loading...';
      jobMessage.textContent = 'Requesting job information...';
      jobMessage.className = 'text-sm text-gray-700 italic';
  
      // Call the API to get the specific job
      fetchJobStatus(ipAddress, apiKey, jobId)
        .then(jobData => {
          if (jobData) {
            displayJobStatus(jobData);
            
            // Start background monitoring for the job
            browser.runtime.sendMessage({
              action: 'monitorJob',
              jobId: jobId,
              ipAddress: ipAddress,
              apiKey: apiKey
            }).catch(error => {
              console.error('Error starting background monitoring:', error);
            });
            
            // If job is still running, set up polling
            if (jobData.status !== 'FIN' && jobData.status !== 'FAIL' && jobData.progress < 100) {
              pollJobStatus(ipAddress, apiKey, jobId);
            }
          }
        })
        .catch(error => {
          jobResults.classList.remove('hidden');
          displayJobId.textContent = jobId;
          jobStatus.textContent = 'Failed';
          jobStatus.className = 'font-semibold text-red-600';
          progressBar.style.width = '0%';
          progressPercentage.textContent = '0%';
          jobMessage.textContent = 'Error: ' + error.message;
          jobMessage.className = 'text-sm text-red-700 italic';
          showStatusMessage('Error fetching job status: ' + error.message, 'error');
        });
    });
  }

// Add this function to stop background monitoring
function stopBackgroundMonitoring() {
  browser.runtime.sendMessage({
    action: 'stopMonitoring'
  }).catch(error => {
    console.error('Error stopping monitoring:', error);
  });
}

// Poll job status every 5 seconds until complete
function pollJobStatus(ipAddress, apiKey, jobId) {
  let pollCount = 0;
  const maxPolls = 100; // Prevent infinite polling
  const pollIntervalTime = 5000; // 5 seconds between checks
  
  const pollInterval = setInterval(() => {
    pollCount++;
    
    if (pollCount > maxPolls) {
      clearInterval(pollInterval);
      jobMessage.textContent += ' (Polling stopped after maximum attempts)';
      
      // Stop background monitoring when polling stops
      stopBackgroundMonitoring();
      return;
    }
    
    fetchJobStatus(ipAddress, apiKey, jobId)
      .then(jobData => {
        if (jobData) {
          displayJobStatus(jobData);
          
          // If job is complete, stop polling
          if (jobData.status === 'FIN' || jobData.status === 'FAIL' || jobData.progress >= 100) {
            clearInterval(pollInterval);
            
            // Stop background monitoring when job completes
            stopBackgroundMonitoring();
            
            showStatusMessage('Job monitoring complete', 'success');
          }
        }
      })
      .catch(error => {
        clearInterval(pollInterval);
        jobMessage.textContent = 'Error while polling: ' + error.message;
        jobMessage.className = 'text-sm text-red-700 italic';
        
        // Stop background monitoring on error
        stopBackgroundMonitoring();
      });
  }, pollIntervalTime);
  
  // Store the interval ID so it can be cleared if needed
  window.currentPollInterval = pollInterval;
  
  // Clear polling if popup is closed
  window.addEventListener('beforeunload', () => {
    if (window.currentPollInterval) {
      clearInterval(window.currentPollInterval);
      
      // Don't stop background monitoring when popup is closed
      // This allows monitoring to continue in the background
    }
  });
}

  async function getApiKey() {
    const result = await browser.storage.local.get('apiKey');
    return result.apiKey || null;
  }

  async function fetchJobStatus(ipAddress, apiKey, jobId) {
    // Get job status from the PANW NGFW API
    try {
      const response = await fetch(`https://${ipAddress}/api/?type=op&cmd=<show><jobs><id>${jobId}</id></jobs></show>&key=${apiKey}`);
      const data = await response.text(); // Get response as text first
      
      // Try to parse as XML (PANW API returns XML by default)
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        
        // Check if this is a valid XML response
        if (xmlDoc.querySelector('response')) {
          // Extract job data from XML response
          const status = xmlDoc.querySelector('response').getAttribute('status');
          
          if (status === 'success') {
            const job = xmlDoc.querySelector('job');
            if (job) {
              // Extract job information from XML
              return {
                id: job.querySelector('id') ? job.querySelector('id').textContent : jobId,
                status: job.querySelector('status') ? job.querySelector('status').textContent : 'Unknown',
                progress: job.querySelector('progress') ? parseInt(job.querySelector('progress').textContent, 10) : 0,
                result: job.querySelector('result') ? job.querySelector('result').textContent : '',
                details: job.querySelector('details') ? job.querySelector('details').textContent : '',
                type: job.querySelector('type') ? job.querySelector('type').textContent : 'Unknown',
                startTime: job.querySelector('tenq') ? job.querySelector('tenq').textContent : ''
              };
            }
          } else {
            // Handle error in XML response
            const msg = xmlDoc.querySelector('msg') ? xmlDoc.querySelector('msg').textContent : 'Unknown error';
            throw new Error(msg);
          }
        }
      } catch (xmlError) {
        console.log('Not a valid XML response, trying JSON...', xmlError);
      }
      
      // If XML parsing failed, try JSON as fallback
      try {
        const jsonData = JSON.parse(data);
        
        if (jsonData && jsonData.response && jsonData.response.result && jsonData.response.result.job) {
          return jsonData.response.result.job;
        } else {
          throw new Error('Invalid JSON response format');
        }
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        // If this isn't JSON either, throw a more helpful error
        throw new Error('Response is neither valid XML nor JSON: ' + data.substring(0, 100) + '...');
      }
    } catch (error) {
      throw new Error('Failed to fetch job status: ' + error.message);
    }
  }

  async function fetchLatestJob(ipAddress, apiKey) {
    // Fetch processed jobs and get the most recent one
    try {
      const response = await fetch(`https://${ipAddress}/api/?type=op&cmd=<show><jobs><processed></processed></jobs></show>&key=${apiKey}`);
      const data = await response.text();
      
      // Try to parse as XML (PANW API returns XML by default)
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        
        // Check if this is a valid XML response
        if (xmlDoc.querySelector('response')) {
          // Extract job data from XML response
          const status = xmlDoc.querySelector('response').getAttribute('status');
          
          if (status === 'success') {
            // Get all jobs
            const jobs = xmlDoc.querySelectorAll('job');
            
            if (jobs && jobs.length > 0) {
              // Get the first job (most recent)
              const latestJob = jobs[0];
              
              // Extract job information from XML
              return {
                id: latestJob.querySelector('id') ? latestJob.querySelector('id').textContent : 'latest',
                status: latestJob.querySelector('status') ? latestJob.querySelector('status').textContent : 'Unknown',
                progress: latestJob.querySelector('progress') ? parseInt(latestJob.querySelector('progress').textContent, 10) : 0,
                result: latestJob.querySelector('result') ? latestJob.querySelector('result').textContent : '',
                message: latestJob.querySelector('details') ? latestJob.querySelector('details').textContent : '',
                type: latestJob.querySelector('type') ? latestJob.querySelector('type').textContent : 'Unknown',
                startTime: latestJob.querySelector('tenq') ? latestJob.querySelector('tenq').textContent : ''
              };
            } else {
              throw new Error('No jobs found');
            }
          } else {
            // Handle error in XML response
            const msg = xmlDoc.querySelector('msg') ? xmlDoc.querySelector('msg').textContent : 'Unknown error';
            throw new Error(msg);
          }
        }
      } catch (xmlError) {
        console.log('Not a valid XML response, trying JSON...', xmlError);
      }
      
      // If XML parsing failed, try JSON as fallback
      try {
        const jsonData = JSON.parse(data);
        
        if (jsonData && jsonData.response && jsonData.response.result && jsonData.response.result.job) {
          // If there are multiple jobs, get the first one
          if (Array.isArray(jsonData.response.result.job)) {
            return jsonData.response.result.job[0];
          }
          return jsonData.response.result.job;
        } else {
          throw new Error('Invalid JSON response format');
        }
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        // If this isn't JSON either, throw a more helpful error
        throw new Error('Response is neither valid XML nor JSON: ' + data.substring(0, 100) + '...');
      }
    } catch (error) {
      throw new Error('Failed to fetch latest job: ' + error.message);
    }
  }

  function displayJobStatus(jobData) {
    // Display job information in the UI
    jobResults.classList.remove('hidden');
    
    // Display job ID
    displayJobId.textContent = jobData.id || 'N/A';
    
    // Display job type if available
    if (jobData.type) {
      jobType.textContent = jobData.type;
    } else {
      jobType.textContent = 'N/A';
    }
    
    // Display job start time if available
    if (jobData.startTime) {
      jobStartTime.textContent = jobData.startTime;
    } else {
      jobStartTime.textContent = 'N/A';
    }
    
    // Auto-collapse connection section to focus on job results
    collapseConnectionSection();
    
    // Set status with appropriate color and text based on job status
    const status = jobData.status || 'Unknown';
    
    // Map status codes to user-friendly text
    let statusText = status;
    if (status === 'FIN') {
      statusText = 'Complete';
      jobStatus.className = 'font-semibold text-green-600';
    } else if (status === 'PEND') {
      statusText = 'Pending';
      jobStatus.className = 'font-semibold text-yellow-600';
    } else if (status === 'FAIL') {
      statusText = 'Failed';
      jobStatus.className = 'font-semibold text-red-600';
    } else if (status === 'ACT') {
      statusText = 'Active';
      jobStatus.className = 'font-semibold text-blue-600';
    } else {
      jobStatus.className = 'font-semibold text-gray-600';
    }
    
    jobStatus.textContent = statusText;
    
    const progress = jobData.progress || 0;
    progressBar.style.width = `${progress}%`;
    progressPercentage.textContent = `${progress}%`;
    
    // Change progress bar color based on status
    if (status === 'FAIL') {
      progressBar.className = 'bg-red-500 h-4 rounded-full transition-all duration-500';
    } else if (status === 'PEND') {
      progressBar.className = 'bg-yellow-500 h-4 rounded-full transition-all duration-500';
    } else if (progress === 100 || status === 'FIN') {
      progressBar.className = 'bg-green-500 h-4 rounded-full transition-all duration-500';
    } else {
      progressBar.className = 'bg-blue-500 h-4 rounded-full transition-all duration-500';
    }
    
    // Set appropriate message with styling
    let message = '';
    
    // Check various possible fields that might contain the details
    if (jobData.details && typeof jobData.details === 'string') {
      message = jobData.details;
    } else if (jobData.message && typeof jobData.message === 'string') {
      message = jobData.message;
    } else if (jobData.result && typeof jobData.result === 'string') {
      message = jobData.result;
    } else if (jobData.description && typeof jobData.description === 'string') {
      message = jobData.description;
    }
    
    // If there are details with line elements (common in PANW XML responses)
    if (jobData.details && jobData.details.line) {
      const lines = Array.isArray(jobData.details.line) ? jobData.details.line : [jobData.details.line];
      message = lines.join('\n');
    }
    
    jobMessage.textContent = message || 'No additional details available';
    
    if (status === 'FAIL') {
      jobMessage.className = 'text-sm text-red-700 italic break-words';
    } else {
      jobMessage.className = 'text-sm text-gray-700 italic break-words';
    }
    
    // Update the last updated timestamp
    updateLastUpdated();
  }

// Handle auto-refresh toggle
function toggleAutoRefresh() {
  const isActive = autoRefreshBtn.classList.contains('bg-blue-500');
  
  if (isActive) {
    // Turn off auto-refresh
    if (window.autoRefreshInterval) {
      clearInterval(window.autoRefreshInterval);
      window.autoRefreshInterval = null;
    }
    
    // Stop background monitoring when auto-refresh is turned off
    stopBackgroundMonitoring();
    
    autoRefreshBtn.classList.remove('bg-blue-500', 'text-white');
    autoRefreshBtn.classList.add('bg-gray-200', 'text-gray-800');
    autoRefreshBtn.textContent = 'Auto-refresh';
    
    showStatusMessage('Auto-refresh disabled', 'info');
  } else {
    // Turn on auto-refresh
    const jobId = displayJobId.textContent;
    if (!jobId || jobId === 'N/A' || jobId === 'Loading...') {
      showStatusMessage('No job to refresh', 'error');
      return;
    }
    
    // Get IP and API key
    getApiKey().then(apiKey => {
      if (!apiKey) {
        showStatusMessage('API key not found', 'error');
        return;
      }
      
      const ipAddress = ipAddressField.value.trim();
      if (!ipAddress) {
        showStatusMessage('Please enter the NGFW IP address', 'error');
        return;
      }
      
      // Ensure connection section is collapsed when auto-refresh is on
      collapseConnectionSection();
      
      // Restart background monitoring when auto-refresh is turned on
      browser.runtime.sendMessage({
        action: 'monitorJob',
        jobId: jobId,
        ipAddress: ipAddress,
        apiKey: apiKey
      }).catch(error => {
        console.error('Error starting background monitoring:', error);
      });
      
      // Start auto-refresh every 5 seconds
      window.autoRefreshInterval = setInterval(() => {
        fetchJobStatus(ipAddress, apiKey, jobId)
          .then(jobData => {
            if (jobData) {
              displayJobStatus(jobData);
              updateLastUpdated();
              
              // If job is complete, stop auto-refresh
              if (jobData.status === 'FIN' || jobData.status === 'FAIL' || jobData.progress >= 100) {
                toggleAutoRefresh(); // This will turn it off
              }
            }
          })
          .catch(error => {
            console.error('Auto-refresh error:', error);
            // Don't stop auto-refresh on error, just quietly fail
          });
      }, 5000);
      
      autoRefreshBtn.classList.remove('bg-gray-200', 'text-gray-800');
      autoRefreshBtn.classList.add('bg-blue-500', 'text-white');
      autoRefreshBtn.textContent = 'Stop Auto-refresh';
      
      showStatusMessage('Auto-refreshing every 5 seconds', 'success');
    });
  }
}
  
  // Copy job ID to clipboard
  function copyJobIdToClipboard() {
    const jobId = displayJobId.textContent;
    if (!jobId || jobId === 'N/A' || jobId === 'Loading...') {
      showStatusMessage('No job ID to copy', 'error');
      return;
    }
    
    // Use the navigator clipboard API
    navigator.clipboard.writeText(jobId).then(() => {
      showStatusMessage('Job ID copied to clipboard', 'success');
    }).catch(err => {
      console.error('Failed to copy job ID:', err);
      showStatusMessage('Failed to copy job ID', 'error');
    });
  }
  
  // Show help information
  function showHelp() {
    browser.tabs.create({
      url: 'https://github.com/your-repo/job-stalker/blob/main/README.md'
    });
  }
  
  // Update the "last updated" timestamp
  function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastUpdated.textContent = `Updated at ${timeStr}`;
  }
  
  function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden');
    
    if (type === 'success') {
      statusMessage.className = 'rounded p-2 mt-3 bg-green-100 text-green-800';
    } else if (type === 'error') {
      statusMessage.className = 'rounded p-2 mt-3 bg-red-100 text-red-800';
    } else if (type === 'info') {
      statusMessage.className = 'rounded p-2 mt-3 bg-blue-100 text-blue-800';
    }
    
    // Clear the message after 3 seconds
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.classList.add('hidden');
    }, 3000);
  }
});