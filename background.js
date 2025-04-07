// Background script for handling events
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureApiKey') {
    // This function would be triggered if you want to capture API key from a page
    browser.tabs.executeScript(sender.tab.id, {
      code: `
        // This is a placeholder script that would need to be customized for the actual PANW interface
        // It attempts to find an API key element on the page and extract its value
        (function() {
          // Look for common API key display patterns
          const possibleSelectors = [
            '.api-key-display', 
            '#apiKey', 
            '.key-display',
            'pre.api-key',
            'code.api-key',
            // Add more selectors as needed for the actual PANW UI
          ];
          
          for (const selector of possibleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              return element.textContent.trim();
            }
          }
          
          // If no element found with specific selectors, try looking for text patterns
          const pageText = document.body.innerText;
          const apiKeyPattern = /API Key:\\s*([A-Za-z0-9_\\-]{10,})/;
          const match = pageText.match(apiKeyPattern);
          
          if (match && match[1]) {
            return match[1];
          }
          
          return null;
        })();
      `
    }).then(results => {
      if (results && results[0]) {
        const apiKey = results[0];
        browser.storage.local.set({ apiKey }).then(() => {
          // Notify the user that we captured the API key
          browser.notifications.create({
            type: 'basic',
            iconUrl: browser.extension.getURL('icons/icon-48.png'),
            title: 'Job Stalker',
            message: 'API key captured and saved successfully'
          });
          
          sendResponse({ success: true, message: 'API key captured and saved' });
        });
      } else {
        sendResponse({ success: false, message: 'Could not find API key on page' });
      }
    }).catch(error => {
      sendResponse({ success: false, message: 'Error capturing API key: ' + error.message });
    });
    
    return true; // Required to use sendResponse asynchronously
  }
  
  if (message.action === 'monitorJob') {
    // Set up a periodic job status check
    const jobId = message.jobId;
    const ipAddress = message.ipAddress;
    const apiKey = message.apiKey;
    
    // Stop any existing monitoring
    if (global.currentJobMonitor) {
      clearInterval(global.currentJobMonitor);
    }
    
    // Initialize the badge to show we're starting monitoring
    browser.browserAction.setBadgeText({ text: 'Start' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#3498db' }); // Blue
    
    // Store the job being monitored
    browser.storage.local.set({ 
      monitoringJob: jobId,
      ipAddress: ipAddress,
      apiKey: apiKey
    });
    
    // You could implement periodic polling of job status here
    const intervalId = setInterval(() => {
      fetch(`https://${ipAddress}/api/?type=op&cmd=<show><jobs><id>${jobId}</id></jobs></show>&key=${apiKey}`)
        .then(response => response.text()) // Get as text first to handle both XML and JSON
        .then(data => {
          // Try to parse as XML first (PANW API default)
          let jobData;
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            
            if (xmlDoc.querySelector('response')) {
              const status = xmlDoc.querySelector('response').getAttribute('status');
              
              if (status === 'success') {
                const job = xmlDoc.querySelector('job');
                if (job) {
                  jobData = {
                    id: job.querySelector('id') ? job.querySelector('id').textContent : jobId,
                    status: job.querySelector('status') ? job.querySelector('status').textContent : 'Unknown',
                    progress: job.querySelector('progress') ? parseInt(job.querySelector('progress').textContent, 10) : 0,
                    result: job.querySelector('result') ? job.querySelector('result').textContent : '',
                    details: job.querySelector('details') ? job.querySelector('details').textContent : '',
                    message: job.querySelector('details') ? job.querySelector('details').textContent : ''
                  };
                }
              }
            }
          } catch (xmlError) {
            console.log('Not a valid XML response, trying JSON...');
            
            // Try JSON as fallback
            try {
              const jsonData = JSON.parse(data);
              
              if (jsonData && jsonData.response && jsonData.response.result && jsonData.response.result.job) {
                jobData = jsonData.response.result.job;
              }
            } catch (jsonError) {
              console.error('Failed to parse job data:', jsonError);
            }
          }
          
          // Process job status data if we successfully parsed it
          if (jobData) {
            // Update badge with job progress percentage
            if (typeof jobData.progress !== 'undefined') {
              // Format the badge text - keep it short for badge display
              let badgeText = `${jobData.progress}%`;
              
              // For small percentages, just show the number without the % to save space
              if (jobData.progress < 10) {
                badgeText = `${jobData.progress}`;
              }
              
              // Set badge text to the current percentage
              browser.browserAction.setBadgeText({
                text: badgeText
              });
              
              // Set badge color based on status
              let badgeColor = '#3498db'; // Blue for in-progress
              
              if (jobData.status === 'FAIL') {
                badgeColor = '#e74c3c'; // Red for failed
                browser.browserAction.setBadgeText({ text: 'FAIL' });
              } else if (jobData.status === 'FIN' || jobData.progress >= 100) {
                badgeColor = '#2ecc71'; // Green for completed
                browser.browserAction.setBadgeText({ text: '100%' });
              } else if (jobData.status === 'PEND') {
                badgeColor = '#f39c12'; // Orange for pending
              }
              
              browser.browserAction.setBadgeBackgroundColor({
                color: badgeColor
              });
            }
            
            // Send job status back to popup if it's open
            browser.runtime.sendMessage({
              action: 'jobStatusUpdate',
              jobData: jobData
            }).catch(err => {
              // Ignore errors - popup might not be open to receive the message
            });
            
            // Create notification if job completes or fails
            if (jobData.status === 'FIN') {
              browser.notifications.create({
                type: 'basic',
                iconUrl: browser.extension.getURL('icons/icon-48.png'),
                title: 'Job Complete',
                message: `Job ${jobId} completed successfully (100%)`
              });
              
              // Keep showing "100%" for a while, then clear
              setTimeout(() => {
                if (global.currentJobMonitor === intervalId) {
                  // Only clear if this job is still the one being monitored
                  browser.browserAction.setBadgeText({ text: '' });
                  clearInterval(intervalId);
                  global.currentJobMonitor = null;
                  
                  // Clear the stored monitoring job
                  browser.storage.local.remove(['monitoringJob', 'ipAddress', 'apiKey']);
                }
              }, 30000); // Show 100% for 30 seconds, then clear
              
            } else if (jobData.status === 'FAIL') {
              browser.notifications.create({
                type: 'basic',
                iconUrl: browser.extension.getURL('icons/icon-48.png'),
                title: 'Job Failed',
                message: `Job ${jobId} failed: ${jobData.message || 'Unknown error'}`
              });
              
              // Keep showing "FAIL" for a while, then clear
              setTimeout(() => {
                if (global.currentJobMonitor === intervalId) {
                  // Only clear if this job is still the one being monitored
                  browser.browserAction.setBadgeText({ text: '' });
                  clearInterval(intervalId);
                  global.currentJobMonitor = null;
                  
                  // Clear the stored monitoring job
                  browser.storage.local.remove(['monitoringJob', 'ipAddress', 'apiKey']);
                }
              }, 30000); // Show FAIL for 30 seconds, then clear
            }
          }
        })
        .catch(error => {
          console.error('Error checking job status:', error);
          // On error, show ERR in the badge
          browser.browserAction.setBadgeText({ text: 'ERR' });
          browser.browserAction.setBadgeBackgroundColor({ color: '#e74c3c' }); // Red
        });
    }, 5000); // Check every 5 seconds
    
    // Store interval ID globally so it can be cleared later
    global.currentJobMonitor = intervalId;
    
    sendResponse({ success: true, message: 'Job monitoring started' });
    return true;
  }
  
  if (message.action === 'stopMonitoring') {
    // Stop any ongoing job monitoring
    if (global.currentJobMonitor) {
      clearInterval(global.currentJobMonitor);
      global.currentJobMonitor = null;
      
      // Clear the badge
      browser.browserAction.setBadgeText({ text: '' });
      
      // Clear the stored monitoring job
      browser.storage.local.remove(['monitoringJob', 'ipAddress', 'apiKey']);
      
      sendResponse({ success: true, message: 'Job monitoring stopped' });
    } else {
      sendResponse({ success: false, message: 'No job was being monitored' });
    }
    return true;
  }
});

// Add listener for browser startup to restore any active job monitoring
browser.runtime.onStartup.addListener(() => {
  browser.storage.local.get(['monitoringJob', 'ipAddress', 'apiKey']).then(result => {
    if (result.monitoringJob && result.ipAddress && result.apiKey) {
      // Restart monitoring for the saved job
      browser.runtime.sendMessage({
        action: 'monitorJob',
        jobId: result.monitoringJob,
        ipAddress: result.ipAddress,
        apiKey: result.apiKey
      });
    }
  });
});

// Handle insecure requests for development purposes (you might want to remove this in production)
browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    return {
      requestHeaders: details.requestHeaders.filter(header => header.name.toLowerCase() !== "origin")
    };
  },
  { urls: ["*://*/api/*"] },
  ["blocking", "requestHeaders"]
);

// Initialize global variable to track monitoring
var global = {
  currentJobMonitor: null
};