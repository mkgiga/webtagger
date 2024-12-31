import { html } from "./lib/html.js";
import emojis from "./emojis.js";
import contextMenu from "./context-menu.js";
const windowEventListeners = {
  imagesEntry: {
    click: [],
  },
};

/**
 * Opening the extension for the first time,
 * this serves as an example for the user in how
 * you can use categories to organize your tags
 */
const firstTimeProject = {
  categories: [
    {
      name: "Angle",
      tags: [
        "from below",
        "from above",
        "side view",
        "facing viewer",
        "from behind",
        "dutch angle",
        "fisheye",
        "pov",
      ],
      emoji: "📸",
    },
    {
      name: "Character composition",
      tags: [
        "1boy",
        "1girl",
        "solo",
        "upper body",
        "cowboy shot",
        "close-up",
        "out of frame",
        "multiple characters",
        "people",
        "group",
      ],
      emoji: "👥",
    },
    {
      name: "Expression",
      tags: [
        "smile",
        "frown",
        "angry",
        "happy",
        "sad",
        "surprised",
        "neutral",
        "confused",
        "blush",
        "tears",
        "sweat",
        "screaming",
        "crying",
        "laughing",
        "smug",
      ],
      emoji: "🎭",
    },
    {
      name: "Muscles",
      tags: [
        "muscular",
        "abs",
        "pectorals",
        "biceps",
        "lats",
        "triceps",
        "quadriceps",
        "calves",
        "forearms",
        "deltoids",
        "glutes",
        "hamstrings",
        "traps",
        "obliques",
      ],
      emoji: "💪",
    },
    {
      name: "Clothing",
      tags: [
        "nude",
        "completely nude",
        "underwear",
        "topless",
        "bottomless",
        "armor",
        "jacket",
        "shirt",
        "pants",
        "shorts",
        "skirt",
        "dress",
        "swimsuit",
        "robe",
        "coat",
        "uniform",
        "bikini",
      ],
      emoji: "👕",
    },
  ],
};

const defaultProject = {
  categories: [],
  images: [],
  settings: {
    tags: {
      alwaysPrepend: "",
      alwaysAppend: "",
    },
  },
};

let preferences = {
  "Adding images": [
    {
      id: "warnOnSmallImages",
      type: "checkbox",
      name: "Warn on small images",
      description:
        "Warn when an image is smaller than the preferred dimensions",
      value: true,
    },
    {
      id: "preferredMinImageWidth",
      type: "number",
      name: "Preferred minimum image width",
      description: "The preferred minimum width for images",
      value: 768,
    },
    {
      id: "preferredMinImageHeight",
      type: "number",
      name: "Preferred minimum image height",
      description: "The preferred minimum height for images",
      value: 768,
    },
  ],

  Tagging: [],
  Categories: [],
  Keybindings: [],
  Appearance: [],
  Saving: [],

  /**
   * The choices that the user has made in the confirmation dialogs,
   * so we can automatically apply them without asking again
   * @type {{ [id: string]: string }}
   */
  "Remembered dialog choices": {},
};

let projects = {};

function getCurrentProjectName() {
  const res = document.querySelector("#sel-projects").value || null;
  console.log("Current project name: ", res);

  return res;
}

async function main() {
  /**
   * Horizontal, wrapping flex container for image entries
   * @type {HTMLDivElement}
   */
  const entryList = document.querySelector("#image-entries");

  // test initializing a clean slate
  await load();

  // test: save the projects to local storage
  await save();

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "addImage") {
      // check if recycle bin has this image
      const recycleBinEntries = document.querySelectorAll(
        "#recycle-bin .image-entry"
      );
      const recycleBinHasImage = Array.from(recycleBinEntries).some(
        (entry) => entry.querySelector("img").src === info.srcUrl
      );

      if (recycleBinHasImage) {
        feedbackText({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          text: "This image is already in the recycle bin!",
        });

        return;
      }

      addImageEntries(entryList, false, { src: info.srcUrl, pageUrl: tab.url });
    }

    if (info.menuItemId === "addBooruImage") {
      // check if recycle bin has this image
      const recycleBinEntries = document.querySelectorAll(
        "#recycle-bin .image-entry"
      );
      const recycleBinHasImage = Array.from(recycleBinEntries).some(
        (entry) => entry.querySelector("img").src === info.srcUrl
      );

      if (recycleBinHasImage) {
        feedbackText({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          text: "This image is already in the recycle bin!",
        });

        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const imageSrc = info.srcUrl;

        const supportedSites = [
          /https?:\/\/danbooru\.donmai\.us\/posts\/\d+/,
          /https?:\/\/e621\.net\/posts\/\d+/, // e621
          /https?:\/\/rule34\.xxx/, // rule34.xxx
        ];

        console.log("Active tab for message:", activeTab);

        if (!activeTab) {
          console.error("No active tab found");
          return;
        }

        if (imageSrc.includes("rule34.paheal.net")) {
          console.error(
            "rule34.paheal does not tag images except for the character names, sorry!"
          );
          return;
        }

        // check if the active tab is a supported site
        const isSupportedSite = supportedSites.some((site) =>
          site.test(activeTab.url)
        );

        if (!isSupportedSite) {
          console.error("The active tab is not a supported site");
          return;
        }

        chrome.tabs.sendMessage(
          activeTab.id,
          { message: "getTags", imageSrc },
          (response) => {
            console.log("Response from content script:", response);
            onImportedTags(response);
          }
        );
      });
    }
  });

  document
    .querySelector("#btn-restore-all-recycled")
    .addEventListener("click", () => {
      const entries = document.querySelectorAll(
        "#recycle-bin-entries .image-entry"
      );

      entries.forEach((entry) => {
        console.log("Restoring entry: ", entry);
        const cloned = entry.cloneNode(true);
        entry.remove();

        const src = cloned.querySelector("img").src;
        const tags = cloned.querySelector("textarea").value.split(", ");

        const newEntry = createImageEntry({
          src,
          tags,
          target: entryList,
          calledByLoad: true,
        });

        entryList.appendChild(newEntry);
      });

      save();
    });

  document
    .querySelector("#btn-clear-recycle-bin")
    .addEventListener("click", () => {
      console.log("Clearing recycle bin...");
      const entries = document.querySelectorAll(
        "#recycle-bin-entries .image-entry"
      );

      entries.forEach((entry) => {
        console.log("Removing entry: ", entry);
        entry.remove();
      });

      save();
    });

  document.querySelector(".handle-button").addEventListener("click", () => {
    document.querySelector("#recycle-bin").toggleAttribute("active");
  });

  document.querySelector(".btn-save").addEventListener("click", () => {
    save();

    feedbackText({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      text: `Saved ${getCurrentProjectName()}!`,
    });
  });

  // project import
  document
    .querySelector(".btn-load")
    .addEventListener("click", promptImportFiles);

  // project export
  document.querySelector(".btn-export").addEventListener("click", () => {
    download(document.querySelector("#sel-projects").value);
  });

  // searching the main entry list
  document.querySelector("#txt-search").addEventListener("input", onSearch);

  document.querySelector("#sel-projects").addEventListener("change", (e) => {
    onSelectProjectChange(e);
  });

  function createNewProject(keepCategories) {
    // save the current project
    save();

    const select = document.querySelector("#sel-projects");

    const getAppropriateNewProjectName = () => {
      let res = "untitled-project";
      let i = 0;

      /**
       * @type {NodeListOf<HTMLOptionElement>}
       */
      const options = select.querySelectorAll("option");

      const checkName = (name) => {
        for (const opt of options) {
          if (opt.value === name) {
            return true;
          }
        }

        return false;
      };

      while (checkName(res)) {
        i++;
        res = i === 0 ? "untitled-project" : `untitled-project-${i}`;
      }

      return res;
    };

    const name = getAppropriateNewProjectName();

    // this is a new project, so we don't need to load anything
    const newProject = { ...defaultProject };

    // unless the user wants to copy over the categories
    if (keepCategories) {
      const allCategories = document.querySelectorAll(".tag-category");
      const categories = [];

      for (const _category of allCategories) {
        const category = {
          name: _category.querySelector(".tag-category-name").textContent,
          tags: [],
          emoji: _category.querySelector(".emoji-icon").textContent,
        };

        const tags = _category.querySelectorAll(".visual-tag");

        for (const tag of tags) {
          category.tags.push(tag.textContent.trim());
        }

        categories.push(category);
      }

      newProject.categories = categories;
    }

    const option = createProjectSelectOption({ name, project: newProject });

    select.appendChild(option);

    // set the new project as the selected one
    select.value = name;

    // associate the project object with the option element
    option.project = newProject;

    // and now we have to initialize the new project
    initializeWorkingProject(name, newProject);

    select.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });

    feedbackText({
      x: select.offsetLeft + select.offsetWidth / 2,
      y: select.offsetTop + select.offsetHeight / 2,
      text: "Created new project!",
    });
  }

  document
    .querySelector("#btn-project-new")
    .addEventListener("click", async () => {
      promptConfirmDialog({
        title: "Create new project",
        message: "Are you sure you want to create a new project?",
        options: [
          {
            text: "Yes",
            onclick: async (e) => {
              createNewProject(false);
            },
          },
          {
            text: "Yes (copy categories)",
            onclick: async (e) => {
              createNewProject(true);
            },
          },
          {
            text: "No",
            onclick: (e) => {},
          },
        ],
      });
    });

  document
    .querySelector("#btn-project-rename")
    .addEventListener("click", async () => {
      const select = document.querySelector("#sel-projects");
      const oldProjectName = getCurrentProjectName();
      const opt = select.querySelector(`option[value="${oldProjectName}"]`);

      if (!opt) {
        return;
      }

      // update the project object
      const localStorageProjects = await chrome.storage.local.get("projects");
      let projects = localStorageProjects.projects;

      const newName = prompt(
        "Enter a new name for the project",
        oldProjectName
      );

      if (newName.length === 0 || projects[newName] || newName === null) {
        // don't allow empty names or duplicate names
        return;
      }

      opt.value = newName;
      opt.textContent = newName;

      delete projects[oldProjectName];
      projects[newName] = opt.project;

      await chrome.storage.local.set({ projects });
      await chrome.storage.local.set({ lastSessionProjectName: newName });

      feedbackText({
        x: select.offsetLeft + select.offsetWidth / 2,
        y: select.offsetTop + select.offsetHeight / 2,
        text: "Renamed project!",
      });
    });

  document
    .querySelector("#btn-project-delete")
    .addEventListener("click", async () => {
      const select = document.querySelector("#sel-projects");
      const projectName = getCurrentProjectName();
      const opt = select.querySelector(`option[value="${projectName}"]`);

      if (!opt) {
        return;
      }

      promptConfirmDialog({
        title: "Delete project",
        message: `Are you sure you want to delete "${projectName}"?`,
        options: [
          {
            text: "Yes",
            onclick: async (e) => {
              let nextElementSibling = opt.nextElementSibling;
              let previousElementSibling = opt.previousElementSibling;
              let next = null;

              if (previousElementSibling) {
                next = previousElementSibling;
              } else if (nextElementSibling) {
                next = nextElementSibling;
              }

              if (next === null) {
                // we can't delete the last project
                promptConfirmDialog({
                  title: "Error",
                  message: "You can't delete the last project",
                  options: [
                    {
                      text: "Ok",
                      onclick: (e) => {},
                    },
                  ],
                });

                return;
              }

              opt.remove();

              await deleteProject(projectName);

              select.value = next.value;
              select.dispatchEvent(new Event("change"));

              feedbackText({
                x: select.offsetLeft + select.offsetWidth / 2,
                y: select.offsetTop + select.offsetHeight / 2,
                text: "Deleted project!",
              });

              save();
            },
          },
          {
            text: "No",
            onclick: (e) => {},
          },
        ],
      });
    });

  window.addEventListener("keydown", (e) => {
    // check if an element is edited
    const activeElement = document.activeElement;
    const isEditable = activeElement.isContentEditable;

    if (
      isEditable ||
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA"
    ) {
      return;
    }

    e.preventDefault();

    if (e.ctrlKey) {
      if (e.key === "s") {
        save();
        document.body.animate(
          [{ filter: "brightness(2)" }, { filter: "brightness(1)" }],
          {
            duration: 500,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "forwards",
          }
        );
        feedbackText({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          text: "Saved!",
          color: "lime",
          shadowColor: "black",
        });
      }
    } else if (e.ctrlKey && e.shiftKey) {
    } else {
      if (e.key === "Escape") {
        const selection = document.querySelectorAll(
          "#image-entries .image-entry[selected]"
        );

        for (const entry of selection) {
          entry.removeAttribute("selected");
        }
      } else if (e.key === "Delete") {
        const activeElement = document.activeElement;

        if (
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable ||
          activeElement.tagName === "INPUT"
        ) {
          return;
        }

        e.preventDefault();

        const selectedCategoryTags = getSelectedTags();

        let ghostSpawnLocations = [];

        const inViewportTags = [...selectedCategoryTags].filter((tag) => {
          tag.offsetLeft + tag.offsetWidth > 0 &&
            tag.offsetTop + tag.offsetHeight > 0 &&
            tag.offsetLeft < window.innerWidth &&
            tag.offsetTop < window.innerHeight;
        });

        for (const tag of inViewportTags) {
          const { x, y } = tag.getBoundingClientRect();
          ghostSpawnLocations.push({ x, y });
        }

        for (const tag of selectedCategoryTags) {
          const boo = "👻";
          feedbackText({
            x: tag.offsetLeft + tag.offsetWidth / 2,
            y: tag.offsetTop + tag.offsetHeight / 2,
            text: boo,
          });
        }

        for (const tag of selectedCategoryTags) {
          // okay enough playing around lol
          const wrapper = tag.parentElement;
          wrapper.remove();
        }

        save();
      } else if (e.key === "ScrollLock") {
        // debug clearing the local storage
        promptConfirmDialog({
          title: "Clear local storage",
          message:
            "Are you sure you want to clear the local storage?\nTHIS WILL DELETE ALL PROJECTS",
          options: [
            {
              text: "Yes",
              onclick: (e) => {
                chrome.storage.local.clear();
                save();
              },
            },
            {
              text: "No",
              onclick: (e) => {},
            },
          ],
        });
      }
    }
  });

  document.querySelector("#image-entries").addEventListener("click", (e) => {
    if (document.elementFromPoint(e.clientX, e.clientY).tagName !== "DIV") {
      return;
    }

    // clicking on the background should deselect all entries

    const selection = document.querySelectorAll(
      "#image-entries .image-entry[selected]"
    );

    for (const entry of selection) {
      entry.removeAttribute("selected");
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "s") {
      entryBackdropBlur(true);
    }
  });

  window.addEventListener("blur", (e) => {
    entryBackdropBlur(true);
  });

  window.addEventListener("click", (e) => {
    if (e.ctrlKey) {
      const target = e.target;

      if (target.hasAttribute("[selectable]")) {
        const selectedContainers = getSelectedContainers();

        if (selectedContainers) {
          selectedContainers.removeAttribute("selected");
        }

        target.setAttribute("selected", "");
      }
    }
  });

  ///////////////////// BOTTOM BAR TABS  //////////////////////

  const tabs = document.querySelectorAll(".tab[for]");

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const tabs = document.querySelectorAll(".tab[for]");
      const targetId = tab.getAttribute("for");
      const targetElement = document.getElementById(targetId);

      for (const tab of tabs) {
        tab.removeAttribute("active");
        document
          .getElementById(tab.getAttribute("for"))
          ?.removeAttribute("active");
      }

      if (targetElement) {
        tab.setAttribute("active", "");
        targetElement.setAttribute("active", "");
      }
    });
  }

  const collapseButtons = document.querySelectorAll(".collapse-button");

  let updateCollapseButtonText = (button, container) => {
    if (container.hasAttribute("collapsed")) {
      button.textContent = "expand_more";
    } else {
      button.textContent = "expand_less";
    }
  };

  for (const button of collapseButtons) {
    const container = button.parentElement.parentElement;

    button.addEventListener("click", () => {
      if (container.hasAttribute("collapsed")) {
        container.removeAttribute("collapsed");
      } else {
        container.setAttribute("collapsed", "");
      }

      updateCollapseButtonText(button, container);
    });
  }

  const tagCategoriesContainer = document.querySelector(".tag-categories");

  const btnNewTagCategory = document.querySelector("#btn-new-category");
  const btnImportTagCategories = document.querySelector(
    "#btn-import-categories"
  );
  const btnExportTagCategories = document.querySelector(
    "#btn-export-categories"
  );

  const btnApplyTags = document.querySelector("#apply-tags");
  const btnRemoveTags = document.querySelector("#remove-tags");

  // apply selected tags from categories to all selected entries
  btnApplyTags.addEventListener("click", () => {
    applySelectedTagsToEntries();

    feedbackText({
      x: btnApplyTags.offsetLeft + btnApplyTags.offsetWidth / 2,
      y: btnApplyTags.offsetTop + btnApplyTags.offsetHeight / 2,
      text: "🏷️ Applied tags!",
    });
  });

  // remove selected tags from categories from all selected entries
  btnRemoveTags.addEventListener("click", () => {
    removeSelectedTagsFromEntries();

    feedbackText({
      x: btnRemoveTags.offsetLeft + btnRemoveTags.offsetWidth / 2,
      y: btnRemoveTags.offsetTop + btnRemoveTags.offsetHeight / 2,
      text: "🏷️ Removed tags!",
    });
  });

  btnNewTagCategory.addEventListener("click", () => {
    const tagCategory = createTagCategory({
      name: "New Category",
      tags: [],
      emoji: randomEmoji(),
    });

    tagCategoriesContainer.appendChild(tagCategory);
  });

  btnImportTagCategories.addEventListener("click", async () => {
    const files = await showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: "JSON files",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
      startIn: "downloads",
    }).catch(console.error);

    let n = 0;

    for await (const file of files) {
      const fileHandle = await file.getFile();
      const fileContents = await fileHandle.text();
      const parsed = JSON.parse(fileContents);

      for (const category of parsed) {
        const tagCategory = createTagCategory(category);
        tagCategoriesContainer.appendChild(tagCategory);
      }

      n++;
    }

    feedbackText({
      x:
        btnImportTagCategories.offsetLeft +
        btnImportTagCategories.offsetWidth / 2,
      y:
        btnImportTagCategories.offsetTop +
        btnImportTagCategories.offsetHeight / 2,
      text: `Imported ${n} categories! ❤️`,
    });
  });

  btnExportTagCategories.addEventListener("click", () => {
    const workingProjectCategories = [...getWorkingProjectTagCategories()];
    const json = JSON.stringify(workingProjectCategories, null, 2);
    const currentProjectName = document.querySelector("#sel-projects").value;

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProjectName}-categories.json`;
    a.click();

    feedbackText({
      x:
        btnExportTagCategories.offsetLeft +
        btnExportTagCategories.offsetWidth / 2,
      y:
        btnExportTagCategories.offsetTop +
        btnExportTagCategories.offsetHeight / 2,
      text: "Exported categories!",
    });
  });

  function entryBackdropBlur(state = true) {
    const entries = document.querySelectorAll(".visual-tags");

    if (state) {
      entries.forEach((entry) => entry.removeAttribute("hidden"));
    } else {
      entries.forEach((entry) => entry.setAttribute("hidden", ""));
    }
  }

  const btnRunQuery = document.querySelector("#btn-run-query");
  const btnClearQuery = document.querySelector("#btn-clear-query");

  btnRunQuery.addEventListener("click", runQuery);
  btnClearQuery.addEventListener("click", clearQuery);

  initCommandPalette();

  // loop to sync visual features with the state of the app
  const loop = setInterval(() => {
    syncImageAttributes();
    syncTagColors();
    updateStats();
    syncUIStates();
  }, 1000 / 60);

  // brute force update because i cba to do it properly
  const updateStatsFirstTime = () => {
    setTimeout(() => {
      updateStats();

      const projectStatsTags = document.querySelector("#project-stats-tags");
      const projectStatsEntries = document.querySelector(
        "#project-stats-entries"
      );
      const projectStatsImgAvg = document.querySelector(
        "#project-stats-tags-per-image"
      );

      if (
        projectStatsTags.textContent === "NaN" ||
        projectStatsEntries.textContent === "NaN" ||
        projectStatsImgAvg.textContent === "NaN"
      ) {
        updateStatsFirstTime();
      } else {
        console.log("Project stat counters initialized");
      }
    }, 10); // wait for the images to load
  };

  // mouse event loop for checking if we hover over tooltips

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  updateStatsFirstTime();
}

const mouse = {
  x: 0,
  y: 0,
};

///////////////////// COMMAND QUERIES //////////////////////

function initCommandPalette() {
  const commandPalette = document.querySelector("#command-palette");
  const paletteCommands = commandPalette.querySelectorAll(".query-command");

  for (const qc of paletteCommands) {
    qc.addEventListener("click", () => {
      if (!qc.hasAttribute("disabled")) {
        const cloned = initQueryCommand(qc);
        const container = document.getElementById("query");

        if (cloned) {
          container.appendChild(cloned);
        } else {
          throw new Error("Invalid command");
        }
      }
    });
  }
}

function onSearch(e) {
  const text = e.target.value;

  const entries = document.querySelectorAll(".image-entry");
  let tags = text.split(", ").map((tag) => tag.trim());

  console.log(tags);

  tags = tags.filter((tag) => tag !== "");

  if (tags.length === 0) {
    entries.forEach((entry) => entry.removeAttribute("hidden"));
    return;
  } else {
    entries.forEach((entry) => entry.setAttribute("hidden", ""));
  }

  // first, hide all entries
  for (const entry of entries) {
    entry.setAttribute("hidden", "");
  }

  const or = ["||", " OR "];
  const and = ["&&", " AND "];

  for (const entry of entries) {
    const textarea = entry.querySelector("textarea");
    const entryTags = textarea.value.split(",").map((tag) => tag.trim());

    let show = false;

    for (const tag of tags) {
      if (tag.startsWith(or) || tag.startsWith(and)) {
        const operator = tag.startsWith(or) ? or : and;
        const tagList = tag.split(operator);

        if (operator === or) {
          show = tagList.some((t) => entryTags.includes(t));
        } else {
          show = tagList.every((t) => entryTags.includes(t));
        }
      } else {
        // if the tag contains the substring (even partially), show the entry
        show = entryTags.some((entryTag) =>
          entryTag.toLocaleLowerCase().includes(tag.toLowerCase())
        );
      }

      if (show) {
        entry.removeAttribute("hidden");
        break;
      }
    }

    if (!show) {
      entry.setAttribute("hidden", "");
    }

    if (tags.length === 0) {
      entry.setAttribute("hidden", "");
      entry.removeAttribute("hidden");
    }
  }
}

function getSelectedEntries() {
  return document.querySelectorAll("#image-entries .image-entry[selected]");
}

function initQueryCommand(element) {
  const id = element.id;

  // 1. Clone the element from the palette list
  const cloned = element.cloneNode(true);
  const topBar = cloned.querySelector(".query-component-top-bar");
  const wrappableTextInputs = cloned.querySelectorAll(".wrappable-text-input"); // span that wraps to the next line when it reaches the end of the container

  // make sure it has a run function even if it's empty
  cloned.run = () => {};

  // 2. Add close button since it should be removable outside of the palette
  if (!topBar.querySelector("button.btn-remove-command")) {
    const removeButton = html`
      <button class="btn-remove-command material-icons">close</button>
    `;

    removeButton.style.marginRight = "4rem";
    removeButton.style.marginLeft = "auto";

    removeButton.addEventListener("click", () => {
      cloned.remove();
    });

    topBar.appendChild(removeButton);
  }

  // 3. Initialize the command based on its id
  const commands = {
    // Selection operations

    "cmd-select-entries": () => {
      const withTagsInput = cloned.querySelector(
        "#txt-select-entries-containing-tags"
      );
      const withoutTagsInput = cloned.querySelector(
        "#txt-select-entries-not-containing-tags"
      );

      const withTags = withTagsInput.textContent
        .split(",")
        .map((tag) => tag.trim());
      const withoutTags = withoutTagsInput.textContent
        .split(",")
        .map((tag) => tag.trim());
      const allEntries = document.querySelectorAll(
        "#image-entries .image-entry"
      );

      // remove selected attribute from all entries
      document
        .querySelectorAll("#image-entries .image-entry[selected]")
        .forEach((entry) => entry.removeAttribute("selected"));

      for (const entry of allEntries) {
        let tags = entry
          .querySelector("textarea")
          .value.split(",")
          .map((tag) => tag.trim().toLowerCase().replace(/, $/, "").trim());

        // empty input = no tags to check for
        let hasTags = true;
        let doesNotHaveTags = true;

        if (withTags.length > 0) {
          hasTags = withTags.every((tag) => tags.includes(tag));
        }

        if (withoutTags.length > 0) {
          doesNotHaveTags = withoutTags.every((tag) => !tags.includes(tag));
        }

        if (hasTags && doesNotHaveTags) {
          entry.setAttribute("selected", "");
        }
      }
    },

    "cmd-deselect-entries": () => {
      const withTagsInput = cloned.querySelector(
        "#txt-deselect-entries-containing-tags"
      );
      const withoutTagsInput = cloned.querySelector(
        "#txt-deselect-entries-not-containing-tags"
      );

      const withTags = withTagsInput.textContent
        .split(",")
        .map((tag) => tag.trim());
      const withoutTags = withoutTagsInput.textContent
        .split(",")
        .map((tag) => tag.trim());
      const allEntries = document.querySelectorAll(
        "#image-entries .image-entry"
      );

      for (const entry of allEntries) {
        let tags = entry
          .querySelector("textarea")
          .value.split(",")
          .map((tag) => tag.trim().toLowerCase().replace(/, $/, "").trim());

        // empty input = no tags to check for
        let hasTags = true;
        let doesNotHaveTags = true;

        if (withTags.length > 0) {
          hasTags = withTags.every((tag) => tags.includes(tag));
        }

        if (withoutTags.length > 0) {
          doesNotHaveTags = withoutTags.every((tag) => !tags.includes(tag));
        }

        if (hasTags && doesNotHaveTags) {
          entry.removeAttribute("selected");
        }
      }
    },

    "cmd-add-entries": () => {},

    "cmd-remove-entries": () => {},

    "cmd-select-all-entries": () => {
      document
        .querySelectorAll("#image-entries .image-entry")
        .forEach((entry) => entry.setAttribute("selected", ""));
    },

    "cmd-deselect-all-entries": () => {
      document
        .querySelectorAll("#image-entries .image-entry")
        .forEach((entry) => entry.removeAttribute("selected"));
    },

    // Tag operations

    "cmd-add-tags": () => {
      const selection = getSelectedEntries();
      const tagsInput = cloned.querySelector("#txt-add-tags"); // span that wraps (not text input)
      const selWhere = cloned.querySelector("#sel-add-tags-where");

      const selWhereValues = [
        "start",
        "end",
        "startRandomOrder",
        "endRandomOrder",
        "randomPositions",
      ];

      const chkPreserveFirst = cloned.querySelector(
        "#chk-add-tags-preserve-first-tag"
      );

      const selValue = selWhere.value;
      let tags = tagsInput.textContent.split(",").map((tag) => tag.trim());

      for (const entry of selection) {
        const textarea = entry.querySelector("textarea");
        const currentTags = textarea.value.split(",").map((tag) => tag.trim());

        // if the tag already exists, don't add it
        tags = tags.filter((tag) => !currentTags.includes(tag));

        switch (selValue) {
          case "start":
            textarea.value = tags
              .concat(currentTags)
              .join(", ")
              .replace(/, $/, "")
              .replace(/^, /, "");
            break;
          case "end":
            textarea.value = currentTags
              .concat(tags)
              .join(", ")
              .replace(/, $/, "")
              .replace(/^, /, "");
            break;
          case "startRandomOrder":
            textarea.value = tags
              .concat(currentTags)
              .sort(() => Math.random() - 0.5)
              .join(", ")
              .replace(/, $/, "")
              .replace(/^, /, "");
            break;
          case "endRandomOrder":
            textarea.value = currentTags
              .concat(tags)
              .sort(() => Math.random() - 0.5)
              .join(", ")
              .replace(/, $/, "")
              .replace(/^, /, "");
            break;
          case "randomPositions":
            const randomIndex = Math.floor(Math.random() * currentTags.length);
            currentTags.splice(randomIndex, 0, ...tags);
            textarea.value = currentTags
              .join(", ")
              .replace(/, $/, "")
              .replace(/^, /, "");
            break;
        }
      }
    },
    "cmd-remove-tags": () => {},
    "cmd-remove-duplicates": () => {
      const selection = getSelectedEntries();

      for (const entry of selection) {
        const textarea = entry.querySelector("textarea");
        const tags = textarea.value.split(",").map((tag) => tag.trim());
        const uniqueTags = [...new Set(tags)];

        textarea.value = uniqueTags
          .join(", ")
          .replace(/, $/, "")
          .replace(/^, /, "");
      }
    },
    "cmd-replace-tags": () => {},
    "cmd-shuffle-tags": () => {},
  };

  if (commands[id]) {
    cloned.run = commands[id];
  } else {
    throw new Error("Invalid command ID");
  }

  return cloned;
}

function getSelectedTags() {
  return document.querySelectorAll(
    "#tag-categories .visual-tag-wrapper[selected] .visual-tag"
  );
}

function runQuery(entries) {
  let container = document.querySelector("#query");
  let allEntries = Array.from(
    document.querySelectorAll("#image-entries .image-entry")
  );
  let selectedEntries = getSelectedEntries();

  const queries = container.children;

  for (const queryCommand of queries) {
    queryCommand.run();
  }
}

function clearQuery() {
  document.querySelector("#query").innerHTML = "";
}

const entrySelection = {
  get: () => {
    // return all if unspecified
    if (types.length === 0) {
      return document.querySelectorAll(".image-entry[selected]");
    }
  },
};

function addTagsToContainer(containerElement, ...tags) {
  if (!containerElement || !(containerElement instanceof HTMLElement)) {
    throw new Error("Invalid container element");
  }

  if (containerElement instanceof HTMLTextAreaElement) {
    for (const tag of tags) {
      containerElement.value += tag + ", ";
    }

    containerElement.value = containerElement.value.replace(/, $/, "");
  } else if (containerElement.classList.contains("visual-tags")) {
    for (const tag of tags) {
      const tagEl = createVisualTag({ text: tag });
      containerElement.appendChild(tagEl);
    }
  }

  save();
}

function createTagCategory({ name = "Category", tags = ["test"], emoji = "" }) {
  const el = html`
    <div class="tag-category" name="${name}">
      <div class="tag-category-inner">
        <div class="tag-category-header">
          <h4 class="tag-category-name" contenteditable>${name}</h4>
          <div class="emoji-icon-wrapper">
            <button class="emoji-icon">${emoji}</button>
          </div>
        </div>
        <div class="visual-tags"></div>

        <div class="tag-category-order-actions">
          <button class="btn-category-up material-icons">arrow_upward</button>
          <button class="btn-category-remove material-icons">delete</button>
          <button class="btn-category-down material-icons">
            arrow_downward
          </button>
        </div>

        <div class="tag-category-actions">
          <button class="btn-category-add-tag material-icons">add</button>

          <button class="btn-category-clear-tags material-icons">
            clear_all
          </button>
        </div>
      </div>
    </div>
  `;

  for (const tag of tags) {
    const tagEl = createVisualTag({ text: tag });
    el.querySelector(".visual-tags").appendChild(tagEl);
  }

  el.addEventListener("click", (e) => {
    if (e.target.closest(".visual-tag-wrapper")) {
      return;
    }

    // get all selected tags, not just the one in this category.
    const selected = el
      .closest(".tag-categories")
      .querySelectorAll(".visual-tag-wrapper[selected]");

    for (const tag of selected) {
      tag.removeAttribute("selected");
    }
  });

  el.querySelector(".btn-category-remove").addEventListener("click", () => {
    el.remove();
    save();
  });

  el.querySelector(".btn-category-clear-tags").addEventListener("click", () => {
    const tags = el.querySelectorAll(".visual-tag-wrapper");
    tags.forEach((tag) => tag.remove());
    save();
  });

  el.querySelector(".btn-category-add-tag").addEventListener("click", () => {
    const tag = createVisualTag({ text: "New Tag" });
    el.querySelector(".visual-tags").appendChild(tag);
    save();
  });

  el.querySelector(".tag-category-name").addEventListener("input", () => {
    save();
  });

  el.querySelector(".tag-category-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
    }
  });

  const tagCategoriesContainer = document.querySelector(".tag-categories");

  el.querySelector(".btn-category-up").addEventListener("click", () => {
    const prev = el.previousElementSibling;
    if (prev) {
      tagCategoriesContainer.insertBefore(el, prev);
    }
    save();
  });

  el.querySelector(".btn-category-down").addEventListener("click", () => {
    const next = el.nextElementSibling;
    if (next) {
      tagCategoriesContainer.insertBefore(next, el);
    }
    save();
  });

  el.querySelector(".emoji-icon").addEventListener("click", () => {
    if (document.querySelector("emoji-picker")) {
      return;
    }

    const picker = html`<emoji-picker></emoji-picker>`;

    picker.addEventListener("emoji-click", (e) => {
      const emoji = e.detail.emoji.unicode;
      el.querySelector(".emoji-icon").textContent = emoji;
      save();
    });

    const onClickOutsideOfPicker = (e) => {
      if (e.target.closest("emoji-picker") || e.target.closest(".emoji-icon")) {
        return;
      }

      picker.remove();

      window.removeEventListener("click", onClickOutsideOfPicker);
    };

    window.addEventListener("click", onClickOutsideOfPicker);

    const rect = el.querySelector(".emoji-icon").getBoundingClientRect();
    let [x, y] = [rect.x + rect.width / 2, rect.y + rect.height / 2];

    picker.style.position = "absolute";
    picker.style.left = `${x}px`;
    picker.style.top = `${y}px`;

    document.body.appendChild(picker);

    // snap the picker to be within the viewport as a minimum
    let pickerRect = picker.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    let [px, py] = [x, y];

    if (pickerRect.right > innerWidth) {
      px = innerWidth - pickerRect.width;
    }

    if (pickerRect.bottom > innerHeight) {
      py = innerHeight - pickerRect.height;
    }

    picker.style.left = `${px}px`;
    picker.style.top = `${py}px`;
  });

  return el;
}

function randomEmoji() {
  const n = Math.floor(Math.random() * emojis.length);
  const res = emojis[n];
  return res;
}

function updateStats() {
  const projectStatsTags = document.querySelector("#project-stats-tags");
  const projectStatsEntries = document.querySelector("#project-stats-entries");
  const projectStatsImgAvg = document.querySelector(
    "#project-stats-tags-per-image"
  );

  const entries = document.querySelectorAll(".image-entry");
  const textAreas = [];

  entries.forEach((entry) => {
    textAreas.push(entry.querySelector("textarea"));
  });

  const tags = textAreas
    .map((ta) => ta.value.split(",").map((tag) => tag.trim()))
    .filter((tag) => tag !== "")
    .flat();
  let uniqueTags = {};
  let uniqueTagCount = 0;
  for (const tag of tags) {
    if (tag === "") {
      continue;
    }
    if (!uniqueTags[tag]) {
      uniqueTags[tag] = true;
      uniqueTagCount++;
    }
  }

  function getImageEntryCountColor(count) {
    // 0 black (hardcode this to be white if it's 0, but use the same logic so red is blended with black)
    // 5 red
    // 10 yellow
    // 20 green
    // 40 lime

    if (count === 0) {
      return "#ffffff";
    }

    // interpolate between the colors
    // every new color is double the previous one
    const gradient = [0x000000, 0xff0000, 0xffff66, 0x009933, 0x00ff00];

    function hexToRgb(hex) {
      return {
        r: (hex >> 16) & 0xff,
        g: (hex >> 8) & 0xff,
        b: hex & 0xff,
      };
    }

    function rgbToHex({ r, g, b }) {
      return (r << 16) | (g << 8) | b;
    }

    function hexToCSSColor(hex) {
      return `#${hex.toString(16).padStart(6, "0")}`;
    }

    // interpolate between the colors
    // every new color is double the previous one
    const steps = gradient.length - 1;
    const step = Math.floor(count / steps);
    const remainder = count % steps;

    const startColor = hexToRgb(gradient[step]);
    const endColor = hexToRgb(gradient[step + 1]);

    const r = Math.floor(
      startColor.r + (endColor.r - startColor.r) * (remainder / steps)
    );

    const g = Math.floor(
      startColor.g + (endColor.g - startColor.g) * (remainder / steps)
    );

    const b = Math.floor(
      startColor.b + (endColor.b - startColor.b) * (remainder / steps)
    );

    return hexToCSSColor(rgbToHex({ r, g, b }));
  }

  projectStatsTags.textContent = `${uniqueTagCount}`;
  projectStatsEntries.textContent = `${entries.length}`;
  projectStatsEntries.style.color = getImageEntryCountColor(entries.length);

  if (entries.length > 0) {
    projectStatsImgAvg.textContent = `${(tags.length / entries.length).toFixed(
      2
    )}`;
  } else {
    projectStatsImgAvg.textContent = "0";
  }
}

function clearWorkingProject(keepCategories = false) {
  const entries = document.querySelectorAll(".image-entry");
  const categories = document.querySelectorAll(".tag-category");

  entries.forEach((entry) => entry.remove());
  categories.forEach((category) => category.remove());
}

function addImageEntries(
  targetList = document.querySelector(".image-entries"),
  calledByLoad = false,
  ...entryInfos
) {
  const infos = [...entryInfos];

  console.log("Image entries getting added: ", infos);

  function addImageEntry(entryInfo, calledByLoad = false) {
    const src = entryInfo.src;
    const pageUrl = entryInfo.pageUrl;

    if (document.querySelector(`img[src="${src}"]`)) {
      return;
    }

    // in case of corrupted data, make sure tags is an array so at least when we save it, it's not undefined
    if (!entryInfo.tags) {
      entryInfo.tags = [];
    }

    const tags = entryInfo.tags.join(", ").replace(/, $/, "");

    const entry = createImageEntry({
      src,
      pageUrl,
      tags,
      target: targetList,
      calledByLoad,
    });

    targetList.appendChild(entry);

    save();
  }

  for (const info of infos) {
    addImageEntry(info, calledByLoad);
  }

  return targetList;
}

function onImportedTags({
  tags = {
    general: [],
    artist: [],
    species: [],
    character: [],
    meta: [],
    copyright: [],
  },
  options,
  imageSrc,
  pageUrl,
}) {
  const entry = document.querySelector(`img[src="${imageSrc}"]`);

  // flatten the tags
  const flattened = [];

  for (const key in tags) {
    flattened.push(...tags[key]);
  }

  console.log("Adding tags for image: ", imageSrc, " with tags: ", flattened);

  // doesn't exist, so let's add it
  if (!entry) {
    addImageEntries(document.querySelector(".image-entries"), false, {
      src: imageSrc,
      tags: flattened,
      pageUrl,
    });
  } else {
    // it exists, but we can still update the tags
    let textarea = entry.querySelector("textarea");

    if (!textarea) {
      textarea = entry.parentElement.querySelector("textarea");

      if (!textarea) {
        throw new Error("No textarea found");
      }

      let existingTags = textarea.value.split(", ").map((tag) => tag.trim());
      if (existingTags.length > 0) {
        existingTags.slice(0, -1); // remove the trailing comma
      }

      const newTags = flattened.filter((tag) => !existingTags.includes(tag));

      textarea.value += newTags.join(", ").replace(/, $/, "");
    }
  }

  save();
}

function removeImageEntries(
  targetList = document.querySelector(".image-entries"),
  ...srcs
) {
  const entries = targetList.querySelectorAll(".image-entry");

  for (const entry of entries) {
    const img = entry.querySelector("img");
    if (srcs.includes(img.src)) {
      entry.remove();
    }

    save();
  }

  return targetList;
}

function createVisualTag({ text = "" }) {
  const el = html`
    <div class="visual-tag-wrapper">
      <span class="tag-handle">
        <button class="btn-delete-tag material-icons">close</button>
      </span>
      <p class="visual-tag">${text}</p>
    </div>
  `;

  const textEl = el.querySelector(".visual-tag");

  el.updateColor = function () {
    const textContent = el.querySelector(".visual-tag").textContent;
    const hash = textContent
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    el.style.backgroundColor = `hsl(${hue}, 50%, 50%)`;
    el.style.setProperty("--tag-color", `hsl(${hue}, 50%, 50%)`);
  };

  el.querySelector(".tag-handle").addEventListener("click", (e) => {
    // is this owned by a category container?
    const category = el.closest(".tag-category");

    if (category) {
      // yes? then we can select it

      if (e.ctrlKey) {
        el.toggleAttribute("selected");
      } else if (e.shiftKey) {
        const allTags = category.querySelectorAll(".visual-tag-wrapper");
        const selectedTags = category.querySelectorAll(
          ".visual-tag-wrapper[selected]"
        );
        const selectedTag = el;
        const selectedTagIndex = Array.from(allTags).indexOf(selectedTag);
        const firstSelectedTag = selectedTags[0];
        const firstSelectedTagIndex =
          Array.from(allTags).indexOf(firstSelectedTag);

        const range = [firstSelectedTagIndex, selectedTagIndex];

        if (range[0] > range[1]) {
          range.reverse();
        }

        for (let i = range[0]; i <= range[1]; i++) {
          allTags[i].setAttribute("selected", "");
        }
      } else if (e.altKey) {
        // apply all selected tags to image entry selection
        const allSelectedTags = category.querySelectorAll(
          ".visual-tag[selected]"
        );
        const selectedEntries = getSelectedEntries();

        let noDuplicateTags = [];

        for (const unfilteredTag of allSelectedTags) {
          if (!noDuplicateTags.includes(unfilteredTag)) {
            noDuplicateTags.push(unfilteredTag);
          }
        }

        for (const entry of selectedEntries) {
          const textarea = entry.querySelector("textarea");
          const currentTags = textarea.value
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag !== "")
            .map((tag) => tag.trim());

          console.log("Applying tags to entry: ", currentTags);

          formatImageEntryTags(textarea);

          if (!textarea.value.endsWith(",") && textarea.value !== "") {
            textarea.value += ", ";
          }

          for (const tag of noDuplicateTags) {
            if (!currentTags.includes(tag.textContent.trim().toLowerCase())) {
              textarea.value += tag.textContent.trim().toLowerCase() + ", ";
            }
          }

          textarea.value = textarea.value.replace(/, $/, "");

          formatImageEntryTags(textarea);
        }

        save();
      } else {
        const selectedTags = category.querySelectorAll(
          ".visual-tag-wrapper[selected]"
        );
        let alreadySelected = false;
        let i = 0;

        for (const tag of selectedTags) {
          if (tag === el) {
            alreadySelected = true;
          }

          tag.removeAttribute("selected");

          i++;
        }

        if (alreadySelected) {
          if (i > 1) {
            el.setAttribute("selected", "");
          } else {
            el.removeAttribute("selected");
          }
        } else {
          el.setAttribute("selected", "");
        }
      }
    }
  });

  el.querySelector(".tag-handle").addEventListener("contextmenu", (e) => {
    const ctxmenu = contextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          text: "Apply to selected entries",
          value: () => {
            const category = el.closest(".tag-category");
            const allSelectedTags = category.querySelectorAll(
              ".visual-tag[selected]"
            );
            const selectedEntries = getSelectedEntries();

            let noDuplicateTags = [];

            for (const unfilteredTag of allSelectedTags) {
              if (!noDuplicateTags.includes(unfilteredTag)) {
                noDuplicateTags.push(unfilteredTag);
              }
            }

            for (const entry of selectedEntries) {
              const textarea = entry.querySelector("textarea");
              const currentTags = textarea.value
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag !== "")
                .map((tag) => tag.trim());

              console.log("Applying tags to entry: ", currentTags);

              formatImageEntryTags(textarea);

              if (!textarea.value.endsWith(",") && textarea.value !== "") {
                textarea.value += ", ";
              }

              for (const tag of noDuplicateTags) {
                if (
                  !currentTags.includes(tag.textContent.trim().toLowerCase())
                ) {
                  textarea.value += tag.textContent.trim().toLowerCase() + ", ";
                }
              }

              textarea.value = textarea.value.replace(/, $/, "");

              formatImageEntryTags(textarea);
            }

            save();
          },
        },
        {
          text: "Delete",
          value: () => {
            el.remove();
            save();
          },
        },
      ],
    });

    document.body.appendChild(ctxmenu);
    console.log(ctxmenu);
  });

  el.addEventListener("click", (e) => {});

  textEl.addEventListener("dblclick", (e) => {
    if (textEl.hasAttribute("contenteditable")) {
      return;
    } else {
      e.stopPropagation();

      textEl.setAttribute("contenteditable", "");

      textEl.focus();

      // select all text
      const range = document.createRange();
      range.selectNodeContents(textEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      textEl.addEventListener("blur", () => {
        textEl.removeAttribute("contenteditable");
        save();
      });

      textEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          textEl.blur();

          if (textEl.textContent === "") {
            el.remove();
          }

          save();
        }
      });
    }
  });

  el.querySelector(".btn-delete-tag").addEventListener("click", () => {
    el.remove();
    save();
  });

  el.style.opacity = 0;
  let opacity = 0;

  const animate = () => {
    if (!el.isConnected) {
      requestAnimationFrame(animate);
    }

    opacity += 0.1;
    el.style.opacity = opacity;

    if (opacity < 1) {
      requestAnimationFrame(animate);
    } else {
      el.style.opacity = 1;
      cancelAnimationFrame(animate);
      return;
    }
  };

  animate();

  return el;
}

function containerHasTag(containerElement, text = "") {
  let exists = false;

  if (!containerElement || !(containerElement instanceof HTMLElement)) {
    throw new Error("Invalid container element");
  }

  if (containerElement instanceof HTMLTextAreaElement) {
    exists = containerElement.value
      .split(",")
      .map((tag) => tag.trim())
      .includes(text);
  } else if (containerElement.classList.contains("visual-tags")) {
    const tags = containerElement.querySelectorAll(".visual-tag");

    for (const tag of tags) {
      if (tag.textContent === text) {
        exists = true;
        break;
      }
    }
  }

  return exists;
}

function createImageEntry({
  src = "",
  pageUrl = "",
  tags = ["mature male,", "solo,", "looking at viewer"],
  calledByLoad = false,
}) {
  const el = html`
    <div class="image-entry">
      <img src="${src}" title="${src}" page-url="${pageUrl}" />
      <textarea class="image-tags"></textarea>
      <button class="btn-remove-entry material-icons">delete</button>
      <span class="selection-indicator"></span>
      ${!calledByLoad
        ? (() => {
            return `
          <span class="image-entry-warning" hidden>
            <p>This image's dimensions are smaller than preferred.</p>
            <p>Are you sure you want to continue?</p>
            <div class="image-entry-warning-actions">
              <button class="btn-continue"><span class="material-icons">check</span><p>Yes</p></button>
              <button class="btn-cancel"><span class="material-icons">close</span><p>No</p></button>
            </div>
          </span>
        `;
          })()
        : ""}
    </div>
  `;

  const textArea = el.querySelector("textarea");

  if (!calledByLoad) {
    const warning = el.querySelector(".image-entry-warning");

    warning.querySelector(".btn-continue").addEventListener("click", () => {
      warning.setAttribute("hidden", "");
    });

    warning.querySelector(".btn-cancel").addEventListener("click", () => {
      el.remove();
      save();
    });
  }

  el.querySelector("img").addEventListener("load", (e) => {
    const img = e.target;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (!calledByLoad) {
      const warning = el.querySelector(".image-entry-warning");

      if (naturalWidth < 768 || naturalHeight < 768) {
        warning.removeAttribute("hidden");
      } else {
        warning.setAttribute("hidden", "");
      }
    }
  });

  textArea.value = tags;
  textArea.addEventListener("input", (e) => {
    e.stopPropagation();

    const value = textArea.value;

    updateStats();
    save();
  });

  // selecting the entry by clicking on the image
  el.querySelector("img").addEventListener("click", (e) => {
    const allEntries = document.querySelectorAll(".image-entry");

    if (e.ctrlKey) {
      // add to selection
      el.toggleAttribute("selected");
    } else if (e.shiftKey) {
      // add range to selection
      const selectedEntries = document.querySelectorAll(
        ".image-entry[selected]"
      );
      const selectedEntry = el;
      const selectedEntryIndex = Array.from(allEntries).indexOf(selectedEntry);
      const firstSelectedEntry = selectedEntries[0];
      const firstSelectedEntryIndex =
        Array.from(allEntries).indexOf(firstSelectedEntry);

      const range = [firstSelectedEntryIndex, selectedEntryIndex];

      if (range[0] > range[1]) {
        range.reverse();
      }

      for (let i = range[0]; i <= range[1]; i++) {
        allEntries[i].setAttribute("selected", "");
      }
    } else {
      const isAlreadySelected = el.hasAttribute("selected");

      // clear selection
      for (const entry of allEntries) {
        entry.removeAttribute("selected");
      }

      if (!isAlreadySelected) {
        el.setAttribute("selected", "");
      }
    }
  });

  /**
   *
   * @param {...string} tags
   * @returns
   */
  el.addTags = function (...tags) {
    if (arguments.length === 0) {
      return;
    }

    if (arguments[0] instanceof Array) {
      tags = arguments[0];
    } else if (arguments.length > 1) {
      const args = [...arguments];
      for (const arg of args) {
        tags.push(arg);
      }
    }

    save();
  };

  el.removeTags = function (tags = ["solo", "1girl", "looking at viewer"]) {
    const visualTags = el.querySelectorAll(".visual-tag-wrapper");
    visualTags.forEach((tag) => {
      const tagText = tag.querySelector(".visual-tag").textContent;
      if (tags.includes(tagText)) {
        tag.remove();
      }
    });

    save();
  };

  el.getPageUrl = function () {
    return el.querySelector("img").getAttribute("page-url");
  };

  let onClick = function (e) {
    const selectedTags = el.querySelectorAll(".visual-tag[selected]");
    const target = e.target;

    if (e.ctrlKey) {
      if (target.hasAttribute("selected")) {
        target.removeAttribute("selected");
      } else {
        target.setAttribute("selected", "");
      }
    } else if (e.shiftKey) {
      // todo: implement later
    } else {
      selectedTags.forEach((tag) => {
        tag.removeAttribute("selected");
      });

      if (target.hasAttribute("selected")) {
        target.removeAttribute("selected");
      } else {
        target.setAttribute("selected", "");
      }
    }
  };

  el.querySelector(".btn-remove-entry").addEventListener("click", () => {
    const recycleBin = document.getElementById("recycle-bin");

    // <ul id="recycle-bin-entries"></ul>
    const recycleBinEntries = document.getElementById("recycle-bin-entries");
    if (!recycleBin) {
      console.error("Recycle bin not found");
      return;
    } else {
      recycleBinEntries.appendChild(el);
      save();
    }
  });

  save();

  window.addEventListener("click", onClick);
  windowEventListeners.imagesEntry["click"].push(onClick);

  return el;
}
async function load() {
  const storedPreferences = await chrome.storage.local.get("preferences");

  // if there are no preferences, set the default preferences
  if (!storedPreferences.preferences) {
    // default preferences are already defined at the top of the file
    await chrome.storage.local.set({ preferences });
  } else {
    // we should merge the stored preferences with the default preferences
    for (const [key, value] of Object.entries(storedPreferences.preferences)) {
      preferences[key] = value;
    }
  }

  console.log("Loaded preferences: ", preferences);

  let storageData = await chrome.storage.local.get("projects");
  const allProjects = storageData.projects || {}; // Ensure a fallback to an empty object



  console.log("Checking for projects: ", allProjects);

  if (Object.keys(allProjects).length === 0) {
    console.log("No projects found in storage, initializing...");

    const newProjects = { "example-project": firstTimeProject };

    await chrome.storage.local.set({ projects: newProjects });

    document.querySelector("#sel-projects").appendChild(
      createProjectSelectOption({
        name: "example-project",
        project: firstTimeProject,
      })
    );

    initializeWorkingProject("example-project", firstTimeProject);

    document.querySelector("#sel-projects").value = "example-project";

    return;
  }

  const selectProject = document.querySelector("#sel-projects");

  // sort the projects by name for the select element
  const sortedProjects = Object.entries(allProjects).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [name, project] of sortedProjects) {
    selectProject.appendChild(createProjectSelectOption({ name, project }));
  }

  const lastSessionProjectData = await chrome.storage.local.get(
    "lastSessionProjectName"
  );

  let lastSessionProjectName = lastSessionProjectData.lastSessionProjectName;

  if (
    lastSessionProjectName === undefined ||
    lastSessionProjectName === "" ||
    !allProjects[lastSessionProjectName]
  ) {
    // set the last session project name to the first project in the list
    const firstProjectName = sortedProjects[0][0];

    await chrome.storage.local.set({
      lastSessionProjectName: firstProjectName,
    });

    lastSessionProjectName = firstProjectName;
  }

  console.log("Last session project name: ", lastSessionProjectName);

  if (lastSessionProjectName && allProjects[lastSessionProjectName]) {
    const project = checkRepairProjectData(allProjects[lastSessionProjectName]);

    initializeWorkingProject(lastSessionProjectName, project);

    selectProject.value = lastSessionProjectName;

    console.log("Loaded last session project: ", lastSessionProjectName);
  } else if (Object.keys(allProjects).length > 0) {
    const firstProjectName = Object.keys(allProjects)[0];
    const firstProject = allProjects[firstProjectName];
    initializeWorkingProject(firstProjectName, firstProject);

    await chrome.storage.local.set({
      lastSessionProjectName: firstProjectName,
    });
    selectProject.value = firstProjectName;
  } else {
    const newProjects = { "untitled-project": defaultProject };

    await chrome.storage.local.set({ projects: newProjects });

    document.querySelector("#sel-projects").appendChild(
      createProjectSelectOption({
        name: "untitled-project",
        project: defaultProject,
      })
    );

    initializeWorkingProject("untitled-project", defaultProject);

    document.querySelector("#sel-projects").value = "untitled-project";

    await chrome.storage.local.set({
      lastSessionProjectName: "untitled-project",
    });

    selectProject.value = "untitled-project";
  }

  updateStats();

  console.log("Loaded projects: ", allProjects);
}

async function save() {
  const preferencesLookup = await chrome.storage.local.get("preferences");
  const currentStoredPreferences = preferencesLookup.preferences || {};

  for (const [key, value] of Object.entries(preferences)) {
    currentStoredPreferences[key] = value; // update the stored preferences with the current preferences
  }

  await chrome.storage.local.set({ preferences: currentStoredPreferences });

  const storageData = await chrome.storage.local.get("projects");
  const projects = storageData.projects || {}; // Extract existing projects

  const entries = document
    .querySelector("#image-entries")
    .querySelectorAll(".image-entry");
  const images = [];

  const categoryEntries = document.querySelectorAll(".tag-category");
  const categories = [];

  const currentProjectName = getCurrentProjectName();

  for (const entry of entries) {
    const img = entry.querySelector("img");
    const src = img.src;
    const pageUrl = img.getAttribute("page-url");
    const tags = entry
      .querySelector("textarea")
      .value.split(", ")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    images.push({ src, pageUrl, tags });
  }

  for (const category of categoryEntries) {
    const name = category.querySelector(".tag-category-name").textContent;
    const emoji = category.querySelector(".emoji-icon").textContent;
    const tags = Array.from(category.querySelectorAll(".visual-tag")).map(
      (tag) => tag.textContent
    );

    categories.push({ name, emoji, tags });
  }

  const txtAlwaysPrepend = document.querySelector("#txt-always-prepend").value;
  const txtAlwaysAppend = document.querySelector("#txt-always-append").value;

  projects[currentProjectName] = {
    categories,
    images,
    settings: {
      tags: {
        alwaysPrepend: txtAlwaysPrepend || "",
        alwaysAppend: txtAlwaysAppend || "",
      },
    },
  };

  await chrome.storage.local.set({ projects }); // Save the entire projects object

  // Save the last session project name
  await chrome.storage.local.set({
    lastSessionProjectName: currentProjectName,
  });

  updateStats();

  console.log("Saved project: ", projects[currentProjectName]);
}

async function deleteProject(name) {
  const storageData = await chrome.storage.local.get("projects");
  const projects = storageData.projects || {};

  delete projects[name];

  await chrome.storage.local.set({ projects });

  console.log("Deleted project: ", name);
}

async function setProject(name, project) {
  const storageData = await chrome.storage.local.get("projects");
  const projects = storageData.projects || {};

  projects[name] = project;

  await chrome.storage.local.set({ projects });

  console.log("Set project: ", name);
}

// compare the project with the current state
function hasChanged(project) {}

function createProjectSelectOption({
  name = "untitled-project",
  project = { ...defaultProject },
}) {
  const el = html` <option class="select-project-option"></option> `;

  el.textContent = name;
  el.value = name;

  el.project = project;

  return el;
}

/**
 * Load project into the UI
 * @param {string} name
 * @param {{categories: [{name: string, tags: string[], emoji: string}], images: [{src: string, pageUrl: string, tags: string[]}]}} project
 */
function initializeWorkingProject(
  name,
  project = {
    categories: [],
    images: [],
    settings: {
      tags: {
        alwaysPrepend: "",
        alwaysAppend: "",
      },
    },
  }
) {
  const imageEntries = document.querySelector(".image-entries");
  const tagCategories = document.querySelector(".tag-categories");

  const categories = project.categories;
  const images = project.images;

  const txtAlwaysPrepend = document.querySelector("#txt-always-prepend");
  const txtAlwaysAppend = document.querySelector("#txt-always-append");

  clearWorkingProject();

  for (const category of categories) {
    const name = category.name;
    const tags = category.tags;
    const emoji = category.emoji;

    const tagCategory = createTagCategory({ name, tags, emoji });
    tagCategories.appendChild(tagCategory);
  }

  console.log(images);

  addImageEntries(imageEntries, true, ...images);

  txtAlwaysPrepend.value = project.settings.tags.alwaysPrepend;
  txtAlwaysAppend.value = project.settings.tags.alwaysAppend;

  console.log("Initialized project: ", name);
}

async function download(filename = "exported.zip") {
  const entries = document.querySelectorAll(".image-entry");
  const zip = new JSZip();

  async function createImageAndTagFilePair(imageEntry) {
    const img = imageEntry.querySelector("img");
    const src = img.src;

    // Generate a unique filename using a hash
    const hash = src
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fileName = hash.toString(16);

    // Get tags from the textarea
    const tags = imageEntry.querySelector("textarea").value.split(", ");
    const tagsString = tags.join(", ").replace(/, $/, "");

    // Create the text file for tags
    const tagsFile = new File([tagsString], `${fileName}.txt`, {
      type: "text/plain",
    });

    // Fetch and create the image file
    const imgFetched = await fetch(src);
    const imgBlob = await imgFetched.blob();
    const imgFile = new File([imgBlob], `${fileName}.png`, {
      type: "image/png",
    });

    return { imgFile, tagsFile, fileName };
  }

  for (const entry of entries) {
    try {
      const { imgFile, tagsFile, fileName } =
        await createImageAndTagFilePair(entry);

      // Add the image and tags file to the ZIP archive
      zip.file(`${fileName}.png`, imgFile);
      zip.file(`${fileName}.txt`, tagsFile);
    } catch (err) {
      console.error("Error creating files: ", err);
    }
  }

  // Generate the ZIP file
  zip.generateAsync({ type: "blob" }).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename; // Ensure `filename` is a string
    a.click();

    URL.revokeObjectURL(url);
  });
}

/**
 * Open existing files on the user's filesystem,
 * or zip files containing images and tags.
 */
async function promptImportFiles() {
  /**
   * @type {FileSystemFileHandle[]}
   */
  const handle = await showOpenFilePicker();

  const zipFiles = [];
  const textFiles = {};
  const files = [];

  for await (const fileHandle of handle) {
    const file = await fileHandle.getFile();
    const fileName = file.name;
    const extension = fileName.split(".").pop();

    if (extension === "zip") {
      zipFiles.push(file);
    } else if (extension === "txt") {
      textFiles[fileName] = file;
    } else {
      files.push(file);
    }

    console.log("File: ", file);
  }

  // unpack the zip files

  for await (const zipFile of zipFiles) {
    const zip = await JSZip.loadAsync(zipFile);

    // regardless of the file type, we load them anyway
    // and put them in the files array
    for await (const file of Object.values(zip.files)) {
      const name = file.name;
      const extension = name.split(".").pop();

      if (extension === "txt") {
        const tags = await file.async("text");
        textFiles[name] = tags;
      } else {
        const blob = await file.async("blob");
        const url = URL.createObjectURL(blob);
        files.push({ name, url });
      }

      console.log("File: ", file);
    }

    console.log("Zip file loaded: ", zipFile);
  }

  // find pairs of files and tags.

  const pairs = [];

  for (const file of files) {
    console.log("Now finding pairs for: ", file);
    const name = file.name;
    const extension = name.split(".").pop();

    if (
      extension === "png" ||
      extension === "jpg" ||
      extension === "jpeg" ||
      extension === "webp"
    ) {
      let tagsFileName = name.replace(/\.(png|jpg|jpeg|webp)$/, ".txt");
      let tags = textFiles[tagsFileName];
      console.log("Tags file: ", tagsFileName, tags);
      pairs.push({ file: file.url, tags });
    }
  }

  // add the pairs to the image entries (only images for now)
  const imagePairs = [];

  for await (const pair of pairs) {
    const file = pair.file;
    const tags = pair.tags;

    /** @todo filter out images that already exist in the dataset so we don't get duplicates */

    const tagsText = tags || "";
    const tagsArray = tagsText.split(", ");

    imagePairs.push({ src: file, tags: tagsArray });
  }

  promptConfirmDialog({
    title: "Project import",
    message:
      "Do you want to append the imported images to the current project?",
    defaultOption: "Yes",
    options: [
      {
        text: "Yes",
        onclick: (e) => {
          addImageEntries(
            document.querySelector("#image-entries"),
            false,
            ...imagePairs
          );

          save();
        },
      },
      {
        text: "As new project",
        onclick: (e) => {
          save();
          clearWorkingProject();
          addImageEntries(
            document.querySelector(".image-entries"),
            false,
            ...imagePairs
          );
        },
      },
      {
        text: "Cancel",
        onclick: (e) => {
          // do nothing
        },
      },
    ],
  });
}

/**
 * Prompt the user to select a zip file to import
 */
async function openProjectDialog() {
  // first, confirm if the user wants to save the current project
  const prompt = promptConfirmDialog({
    title: "Save current project?",
    message: "Do you want to save the current project before importing?",

    options: [
      {
        text: "Yes",
        onclick: (e) => {
          save();
        },
      },
      {
        text: "No",
        onclick: (e) => {},
      },
    ],
  });

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".zip";
  input.multiple = true;

  input.addEventListener("change", async (e) => {
    const files = e.target.files;
    const entries = [];

    for (const file of files) {
      const zip = await JSZip.loadAsync(file);
      const imageFiles = zip.file(/^.*\.png$/);
      const tagFiles = zip.file(/^.*\.txt$/);

      for (const imageFile of imageFiles) {
        const fileName = imageFile.name.replace(/\.png$/, "");
        const tagFile = tagFiles.find(
          (file) => file.name === `${fileName}.txt`
        );

        if (!tagFile) {
          // just add the image without empty tags
          entries.push({ src: imageFile.name, tags: [] });
          continue;
        }

        const tags = await tagFile.async("text");
        entries.push({
          src: imageFile.name,
          tags: tags.split(", ").map((tag) => tag.trim().replace(/, $/, "")),
        });
      }

      addImageEntries(document.querySelector(".image-entries"), ...entries);
    }
  });

  input.click();

  return input;
}

function syncImageAttributes() {
  const entries = document.querySelectorAll(".image-entry");

  for (const entry of entries) {
    const img = entry.querySelector("img");
    const tags = entry
      .querySelector("textarea")
      .value.split(", ")
      .filter((tag) => tag.trim() !== "");

    // set the tags attribute to have the same value as the text content
    entry.setAttribute("tags", tags.join(", ").replace(/, $/, "").trim());
  }
}

function syncTagColors() {
  const tagContainers = document.querySelectorAll(".visual-tag-wrapper");

  for (const tagContainer of tagContainers) {
    tagContainer.updateColor();
  }
}

/**
 * @todo Get tags by scraping a page
 * @param {string} src
 * @returns
 */
async function getTagsFromPage(src = "") {
  const markup = await fetch(src).then((res) => res.text());
  const parser = new DOMParser();

  return tags;
}

function promptConfirmDialog({
  title = "Warning",
  message = "Are you sure?",
  id = "", // for remembering if the user has seen this prompt before
  options = [
    {
      text: "Yes",
      onclick: (e) => {},
    },
    {
      text: "No",
      onclick: (e) => {},
    },
  ],
  defaultOption,
}) {
  const prompt = html`
    <div class="prompt-dialog">
      <div class="prompt-inner">
        <div class="top-bar-transparent">
          <h3>${title}</h3>
          <button class="btn-close material-icons">close</button>
        </div>
        <div class="prompt-message">
          <p>${message}</p>
        </div>
        <div class="prompt-actions">
          ${options.map((option) => `<button>${option.text}</button>`).join("")}
        </div>

        <div class="prompt-footer">
          <p>Don't show this message again</p>
          <input type="checkbox" id="chk-dont-show-again" />
        </div>
      </div>
    </div>
  `;

  const buttons = prompt.querySelectorAll("button");

  for (let i = 0; i < options.length; i++) {
    const btn = buttons[i];

    if (defaultOption === undefined) {
      break;
    }

    if (options[i].text === defaultOption) {
      // auto-focus the default option
      btn.focus();
      btn.setAttribute("default", "");
      break;
    }
  }

  for (const btn of buttons) {
    if (btn.classList.contains("btn-close")) {
      btn.addEventListener("click", () => {
        prompt.remove();
      });
    } else {
      btn.addEventListener("click", (e) => {
        let shouldClose = true;

        const text = e.target.textContent;
        const option = options.find((opt) => opt.text === text);

        if (!option) {
          throw new Error("Option not found: ", text);
        }

        for (const opt of options) {
          if (opt.text === text) {
            const _e = {
              target: btn,
              originalTarget: e.target,
              preventClose: () => {
                shouldClose = false;
              },
            };

            opt.onclick(_e);
          }
        }

        // automatically close the prompt if the caller didn't prevent it
        if (shouldClose) {
          prompt.remove();
        }
      });
    }
  }

  document.body.appendChild(prompt);

  return prompt;
}

function feedbackText({
  x = 0,
  y = 0,
  text = "",
  color = "white",
  target = document.body,
}) {
  const el = html`
    <span
      class="feedback-text"
      style="position: absolute; z-index: 1000; user-select: none; pointer-events: none;"
    >
      <p
        style="color: ${color}; user-select: none; pointer-events: none; text-wrap: nowrap; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5); font-size: 1rem; font-family: 'Segoe UI', sans-serif; font-weight: 600; padding: 0.5rem; background-color: rgba(0, 0, 0, 0.5); border-radius: 0.5rem;"
      >
        ${text}
      </p>
    </span>
  `;

  if (isNaN(x) || isNaN(y)) {
    throw new Error("Invalid coordinates: ", x, y);
  }
  // dont reveal the element until we're ready
  el.style.visibility = "hidden";

  el.style.zIndex = 1000;
  el.style.opacity = 1;

  const distance = 32;

  target.appendChild(el);

  let {
    left: offsetLeft,
    top: offsetTop,
    width: offsetWidth,
    height: offsetHeight,
  } = el.getBoundingClientRect();
  let { width: vw, height: vh } = window.visualViewport;

  // center the element on the coordinates passed in the arguments
  el.style.left = `${x - offsetWidth / 2}px`;
  el.style.top = `${y - offsetHeight / 2}px`;

  el.style.visibility = "visible";

  const snapIntoView = () => {
    if (el.offsetLeft + el.offsetWidth + distance > vw) {
      el.style.left = `${vw - el.offsetWidth - distance}px`;
    }

    if (el.offsetLeft - distance < 0) {
      el.style.left = `${distance}px`;
    }

    if (el.offsetTop + el.offsetHeight + distance > vh) {
      el.style.top = `${vh - el.offsetHeight - distance}px`;
    }

    if (el.offsetTop - distance < 0) {
      el.style.top = `${distance}px`;
    }
  };

  snapIntoView();

  // update the offset values after the element has been positioned
  offsetLeft = el.offsetLeft;
  offsetTop = el.offsetTop;
  offsetWidth = el.offsetWidth;
  offsetHeight = el.offsetHeight;

  // depending on where there is free space,
  // move the element to that direction
  if (offsetTop + offsetHeight - distance > 0) {
    // check if there's space above to prioritize
    // sliding upwards

    el.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-32px)" },
      ],
      {
        duration: 2000,
        easing: "linear",
        fill: "forwards",
      }
    ).onfinish = () => {
      el.remove();
    };
  } else if (offsetTop + offsetHeight - distance < vh) {
    // check bottom. if there's space, slide downwards
    el.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(32px)" },
      ],
      {
        duration: 2000,
        easing: "linear",
        fill: "forwards",
      }
    ).onfinish = () => {
      el.remove();
    };
  } else if (offsetLeft + offsetWidth - distance < 0) {
    // check left. if there's space, slide left
    el.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: "translateX(-32px)" },
      ],
      {
        duration: 2000,
        easing: "linear",
        fill: "forwards",
      }
    ).onfinish = () => {
      el.remove();
    };
  } else if (offsetLeft + offsetWidth - distance < vw) {
    // check right. if there's space, slide right
    el.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: "translateX(32px)" },
      ],
      {
        duration: 2000,
        easing: "linear",
        fill: "forwards",
      }
    ).onfinish = () => {
      el.remove();
    };
  } else {
    el.remove();
  }

  return el;
}

async function onSelectProjectChange(e) {
  // when the user selects a project, save the current project and then load the project
  save();

  let select = e.target || document.querySelector("#sel-projects");
  let name = select.value;

  const storageData = await chrome.storage.local.get("projects");

  const projects = storageData.projects || {};

  const proj = projects[name];

  if (proj) {
    clearWorkingProject();

    addImageEntries(
      document.querySelector("#image-entries"),
      true,
      ...proj.images
    );

    proj.categories.forEach((category) => {
      const tagCategory = createTagCategory(category);
      document.querySelector(".tag-categories").appendChild(tagCategory);
    });

    document.querySelector("#txt-always-prepend").value =
      proj.settings.tags.alwaysPrepend;
    document.querySelector("#txt-always-append").value =
      proj.settings.tags.alwaysAppend;
  } else {
    throw new Error("Project not found: ", name);
  }
}

function setWorkingProjectEnabled(state = true) {
  const recycleBin = document.getElementById("recycle-bin");
  const bottomPanel = document.getElementById("bottom-panel");
  const imageEntries = document.getElementById("image-entries");

  if (state) {
    recycleBin.removeAttribute("disabled");
    bottomPanel.removeAttribute("disabled");
    imageEntries.removeAttribute("disabled");
  } else {
    recycleBin.setAttribute("disabled", "");
    bottomPanel.setAttribute("disabled", "");
    imageEntries.setAttribute("disabled", "");
  }
}

function formatImageEntryTags(textarea = document.querySelector("textarea")) {
  textarea.value = textarea.value.trim();
  textarea.value = textarea.value.replace(/,$/, "");

  const tags = textarea.value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "")
    .map((tag) => tag.trim());

  textarea.value = tags.join(", ").replace(/, $/, "");
}

function getWorkingProjectTagCategories() {
  
  const allTagCategories = document
    .querySelector("#tag-categories")
    .querySelectorAll(".tag-category");

  const tagCategories = Array.from(allTagCategories).map((category) => {
    const name = category.querySelector(".tag-category-name").textContent;
    const emoji = category.querySelector(".emoji-icon").textContent;

    const tagElements = category.querySelectorAll(".visual-tag");
    const tags = [];

    for (const tag of tagElements) {
      const text = tag.textContent.trim();
      if (text !== "") {
        tags.push(text);
      }
    }

    return { name, emoji, tags };
  });

  return tagCategories;
}

// for when certain elements become unselectable, disabled or hidden
function syncUIStates() {
  const selectedEntries = getSelectedEntries();
  const selectedTags = getSelectedTags();

  const btnApplyTags = document.querySelector("#apply-tags");
  const btnRemoveTags = document.querySelector("#remove-tags");

  if (selectedEntries.length === 0 || selectedTags.length === 0) {
    btnApplyTags.setAttribute("disabled", "");
    btnRemoveTags.setAttribute("disabled", "");
  } else {
    btnApplyTags.removeAttribute("disabled");
    btnRemoveTags.removeAttribute("disabled");
  }
}

/**
 * neat animation for when tags are applied in bulk
 * @param {NodeListOf<HTMLElement>} tagElements
 * @param {NodeListOf<HTMLElement>} imageEntryElements
 */
function animateApplyTags(tagElements = [], imageEntryElements = []) {
  // respect user preferences
  if (!preferences["Appearance"]["animations"]) {
    return;
  }

  const inViewportTags = tagElements.filter((tag) => {
    const rect = tag.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });

  const inViewportEntries = imageEntryElements.filter((entry) => {
    const rect = entry.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });

  /**
   * tag visually homing to the entry element
   * @param {HTMLElement} tag
   * @param {HTMLElement} targetEntry
   */
  const homing = (tagClone, targetEntry) => {
    const minDistanceToTargetCenter = 32;

    if (!tagClone.isConnected) {
      requestAnimationFrame(homing);
    }

    if (!targetEntry.isConnected) {
      tagClone.remove();
      return;
    }

    const tagCenter = {
      x: tagClone.offsetLeft + tagClone.offsetWidth / 2,
      y: tagClone.offsetTop + tagClone.offsetHeight / 2,
    };

    const entryCenter = {
      x: targetEntry.offsetLeft + targetEntry.offsetWidth / 2,
      y: targetEntry.offsetTop + targetEntry.offsetHeight / 2,
    };

    if (
      Math.abs(tagCenter.x - entryCenter.x) < minDistanceToTargetCenter &&
      Math.abs(tagCenter.y - entryCenter.y) < minDistanceToTargetCenter
    ) {
      tagClone.remove();
      return;
    }

    const dx = targetEntry.offsetLeft - tagClone.offsetLeft;
    const dy = targetEntry.offsetTop - tagClone.offsetTop;

    // go faster if the distance is greater
    const minSpeed = 0.5;
    const maxSpeed = 2;

    const speed = Math.max(
      Math.min(Math.sqrt(dx ** 2 + dy ** 2) / 100, maxSpeed),
      minSpeed
    );

    const angle = Math.atan2(dy, dx);

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    tagClone.style.left = `${tagClone.offsetLeft + vx}px`;
    tagClone.style.top = `${tagClone.offsetTop + vy}px`;

    // opacity fade out as it approaches the target
    const distanceToTarget = Math.sqrt(dx ** 2 + dy ** 2);

    const minDistanceToFade = 128;
    const maxDistanceToFade = 256;

    // opacity is relative to the distance to the target
    if (distanceToTarget < minDistanceToFade) {
      tagClone.style.opacity = 1;
    } else if (distanceToTarget > maxDistanceToFade) {
      tagClone.style.opacity = 0.5;
    } else {
      tagClone.style.opacity =
        1 -
        (distanceToTarget - minDistanceToFade) /
          (maxDistanceToFade - minDistanceToFade);
    }

    requestAnimationFrame(homing);
  };

  for (const tag of inViewportTags) {
    for (const entry of inViewportEntries) {
      const cloned = tag.cloneNode(true);

      cloned.style.position = "fixed";
      cloned.style.top = `${tag.offsetTop}px`;
      cloned.style.left = `${tag.offsetLeft}px`;
      cloned.style.zIndex = 1000;
      homing(cloned, entry);
    }
  }
}

function applySelectedTagsToEntries() {
  const selectedTags = getSelectedTags();
  const selectedEntries = getSelectedEntries();

  const strings = [];

  for (const tag of selectedTags) {
    const str = tag.textContent.trim();
    if (str !== "") {
      strings.push(str);
    }
  }

  for (const entry of selectedEntries) {
    const textarea = entry.querySelector("textarea");
    const textareaTags = textarea.value.split(",").map((tag) => tag.trim());

    const newTags = new Set([...textareaTags, ...strings]); // don't add duplicates
    textarea.value = Array.from(newTags)
      .join(", ")
      .replace(/, $/, "")
      .replace(/^, /, "");
  }

  updateStats();
  animateApplyTags(selectedTags, selectedEntries);
  save();
}

function removeSelectedTagsFromEntries() {
  const selectedTags = getSelectedTags();
  const selectedEntries = getSelectedEntries();

  const strings = [];

  for (const tag of selectedTags) {
    const str = tag.textContent.trim();
    if (str !== "") {
      strings.push(str);
    }
  }

  let totalTagsRemoved = 0;

  for (const entry of selectedEntries) {
    const textarea = entry.querySelector("textarea");
    const textareaTags = textarea.value.split(",").map((tag) => tag.trim());

    const newTags = new Set(
      textareaTags.filter((tag) => !strings.includes(tag))
    );
    textarea.value = Array.from(newTags).join(", ").replace(/, $/, "");

    totalTagsRemoved += textareaTags.length - newTags.size;
  }

  feedbackText({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    text: `🏷️ Removed ${totalTagsRemoved} tags!`,
  });

  updateStats();
  save();
}

/**
 * Health check for the project data which ensures that the data is in the correct format.
 * Returns the same project plus any missing properties on any of its nested objects.
 * @param {Object} project
 * @returns {{categories: [{name: string, tags: string[], emoji: string}], images: [{src: string, pageUrl: string, tags: string[]}]}}
 */
function checkRepairProjectData(project = {}) {
  const repairedProject = { ...project };

  if (
    project.categories === undefined ||
    !Array.isArray(project.categories)
  ) {
    repairedProject.categories = [];
  }

  if (project.images === undefined || !Array.isArray(project.images)) {
    repairedProject.images = [];
  }

  const normalEntry = {
    src: "",
    pageUrl: "",
    tags: [],
  };

  for (const imageEntry of repairedProject.images) {
    for (const key in normalEntry) {
      if (imageEntry[key] === undefined || typeof imageEntry[key] !== typeof normalEntry[key]) {
        imageEntry[key] = normalEntry[key];

        // assert that tags is an array
        if (key === "tags") {
          if (!Array.isArray(imageEntry[key])) {
            imageEntry[key] = [];
          }
        }
      }
    }
  }

  const normalCategory = {
    name: "",
    emoji: "",
    tags: [],
  };

  for (const category of repairedProject.categories) {
    for (const key in normalCategory) {
      if (category[key] === undefined || typeof category[key] !== typeof normalCategory[key]) {
        category[key] = normalCategory[key];

        // assert that tags is an array
        if (key === "tags") {
          if (!Array.isArray(category[key])) {
            category[key] = [];
          }
        }
      }
    }
  }

  // ugly solution but it works,
  // will refactor later

  if (project.settings === undefined || typeof project.settings !== "object") {
    repairedProject.settings = {
      tags: {
        alwaysPrepend: "",
        alwaysAppend: "",
      },
    };
  }

  if (repairedProject.settings.tags === undefined || typeof repairedProject.settings.tags !== "object") {
    repairedProject.settings.tags = {
      alwaysPrepend: "",
      alwaysAppend: "",
    };
  } else {
    if (repairedProject.settings.tags.alwaysPrepend === undefined || typeof repairedProject.settings.tags.alwaysPrepend !== "string") {
      repairedProject.settings.tags.alwaysPrepend = "";
    }

    if (repairedProject.settings.tags.alwaysAppend === undefined || typeof repairedProject.settings.tags.alwaysAppend !== "string") {
      repairedProject.settings.tags.alwaysAppend = "";
    }
  }

  return repairedProject;
}

document.addEventListener("DOMContentLoaded", main);
