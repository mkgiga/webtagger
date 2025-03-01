chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true,
});

function openSidepanel() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]; // Get the active tab
    if (tab && tab?.id) {
      chrome.sidePanel.open(
        {
          windowId: tab.windowId,
        },
        () => {
          console.log("Side panel opened");
        }
      );
    } else {
      console.error("No active tab found.");
    }
  });
}

const commands = {
  "open-sidepanel": openSidepanel,
}


// chrome's commands API
function registerCommands() {
  for (const [command, callback] of Object.entries(commands)) {
    chrome.commands.onCommand.addListener((command) => {
      callback();
    });
  }
}

// Middleman between the sidepanel and the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "inject-css") {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message, response => {
          sendResponse(response);
        });
        return true; // Keep message channel open for async response
      }
    });
    return true; // Indicates async response
  }
});

// we want to initialize the commands and context menu at the start
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension started");
  
  console.log("Registering command listeners...");
  registerCommands();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});