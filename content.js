/* Random ID so the host cannot know if the injected script is from this extension */
let injectedId = Math.random().toString(36).substr(2, 9);

const myId = chrome.runtime.id;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const pageIsLoaded = document.readyState === "complete";
  if (!pageIsLoaded) {
    sendResponse("Page is not loaded");
    return false;
  }

  if (sender.id !== myId) {
    return false;
  }

  if (message.type === "inject-css") {
    pageInjectCSS(message.css);
  }

  sendResponse("Injected CSS");

  return true;
});

/**
 * Utility function to create an HTML element from a string.
 * @param {*} strings
 * @param  {...any} values
 * @returns {HTMLElement | null}
 */
function html(strings, ...values) {
  const template = document.createElement("template");
  template.innerHTML = strings.reduce(
    (acc, str, i) => acc + values[i - 1] + str
  );
  return template.content.firstElementChild;
}


function pageInjectCSS(css = "") {
  // If there is already an injected style, remove it
  if (injectedId) {
    const style = document.getElementById(injectedId);
    if (style) {
      style.remove();
    }
  }

  injectedId = Math.random().toString(36).substr(2, 9);

  const style = html`
    <style id="${injectedId}">
      ${css}
    </style>
  `;

  const appended = document.head.appendChild(style);

  console.log("Injected style", appended);
}
