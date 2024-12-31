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

function initCommands() {
  // 1. open sidebar
  chrome.commands.onCommand.addListener((command) => {
    if (command === "open-sidepanel") {
      openSidepanel();
    }
  });

  // 2. add image
  chrome.commands.onCommand.addListener((command) => {
    if (command === "add-booru-image") {
      console.log("Triggered add-booru-image command");
    }
  });
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
  initCommands();
  initContextMenu();

  const localStoragePreferences = chrome.storage.local.get("preferences");
  const defaultPreferences = {
    tagging: {
      deleteDuplicates: true,
    },
    filters: {
      test: {
        tags: {
          blacklist: ["nsfw", "explicit"],
          priorityList: [],
          formattingOrder: [
            "quality",
            "copyright",
            "artist",
            "character",
            "species",
            "general",
            "meta",
          ],
        },
      },
    },
    export: {
      randomizeTagOrder: false,
    },
  };

  if (!localStoragePreferences) {
    chrome.storage.local.set({ preferences: defaultPreferences });
  } else {
    // make sure the preferences object is valid

    // iterate the tree and add missing keys to conform to the default schema
    const preferences = localStoragePreferences;
    const stack = [preferences];

    while (stack.length > 0) {
      const current = stack.pop();
      for (const key in defaultPreferences) {
        if (!current[key]) {
          current[key] = defaultPreferences[key];
        } else if (typeof current[key] === "object") {
          stack.push(current[key]);
        }
      }
    }
  }
});

function addImage(request, sender, sendResponse) {}

function removeImage(request, sender, sendResponse) {}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});
