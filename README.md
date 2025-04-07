# PANW NGFW API Manager Firefox Extension

This Firefox extension allows you to easily manage Palo Alto Networks Next-Generation Firewall (NGFW) API keys and monitor job status directly from your browser.

## Features

- Store and manage your PANW NGFW API key securely
- Quick access to generate new API keys
- Monitor job status and progress
- Check the latest running job or a specific job by ID

## Installation

### Temporary Installation (for Development)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on..."
4. Navigate to the directory containing this extension and select the `manifest.json` file

### Permanent Installation

1. Zip all the files in this directory
2. Open Firefox and navigate to `about:addons`
3. Click the gear icon and select "Install Add-on From File..."
4. Select the zip file you created

## Usage

### Managing API Keys

1. Click the extension icon in your browser toolbar
2. If you already have an API key:
   - It will show as stored (masked for security)
   - Click "Clear API Key" to remove it
3. If you don't have an API key:
   - You can either enter an existing key and click "Save API Key"
   - Or enter your NGFW IP address and click "Generate New API Key" to navigate to the API key generation page

### Checking Job Status

1. Click the extension icon in your browser toolbar
2. Enter your NGFW IP address
3. To check the latest job:
   - Click "Check Latest Job"
4. To check a specific job:
   - Enter the Job ID in the provided field
   - Click "Check This Job"
5. The job status, ID, and progress will be displayed

## File Structure

- `manifest.json` - Extension manifest file
- `popup/` - Contains the UI files for the extension
  - `popup.html` - HTML structure for the popup with Tailwind CSS
  - `popup.js` - JavaScript to handle popup functionality
- `background.js` - Background script for handling events
- `icons/` - Contains extension icons

## Customization

You may need to adjust the API endpoints in the JavaScript files to match your specific PANW NGFW API structure. The current implementation uses placeholder API calls that should be updated according to your NGFW API documentation.

## Security Notes

- The API key is stored locally in your browser's storage
- The extension only communicates with the IP addresses you specify
- No data is sent to any third-party servers

## Requirements

- Firefox 57 or newer
- Access to a Palo Alto Networks Next-Generation Firewall