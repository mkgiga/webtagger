chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true,
});

/**
 * @type {Document | null}
 */
let sidePanelDocument = null;

const mirror = {
  images: {},

  addImage: (src = "", tags = []) => {
    mirror.images[src] = { src, tags };
  },
};

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
  "add-booru-image": () => {
    console.log("Triggered add-booru-image command");
  },
}


// chrome's commands API
function registerCommands() {
  for (const [command, callback] of Object.entries(commands)) {
    chrome.commands.onCommand.addListener((command) => {
      callback();
    });
  }
}

function initContextMenu() {

  chrome.contextMenus.create({
    id: "addImage",
    title: "Add image",
    contexts: ["image"],
    targetUrlPatterns: ["<all_urls>"],
    documentUrlPatterns: ["<all_urls>"],
    type: "normal",
  });

  chrome.contextMenus.create({
    id: "addBooruImage",
    title: "Add image (autotag)",
    contexts: ["image"],
    targetUrlPatterns: ["<all_urls>"],
    documentUrlPatterns: ["<all_urls>"],
    type: "normal",
  });
}

let a = {
  name: "buyItem",
  params: { 
    id: "43", 
    count: 23 
  },
};

// we want to initialize the commands and context menu at the start
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension started");
  
  console.log("Registering command listeners...");
  registerCommands();

  console.log("Initializing context menu options...");
  initContextMenu();
});

function addImage(request, sender, sendResponse) {}

function removeImage(request, sender, sendResponse) {}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});