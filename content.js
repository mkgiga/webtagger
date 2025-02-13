/* ********************************* JSDoc Types ********************************** */

/**
 * @typedef {Object} TagScrapingResult
 * @property {Object} result
 * @property {string[]} result.character
 * @property {string[]} result.species
 * @property {string[]} result.meta
 * @property {string[]} result.artist
 * @property {string[]} result.general
 * @property {string[]} result.species
 * @property {string[]} result.copyright
 * @property {TagScrapingOptions} options
 * @property {string[]} imageSrc - the URL of the image being scraped
 */

/**
 * @typedef {Object} TagScrapingOptions
 * @property {Object} rules
 * @property {string[]} rules.blacklist
 * @property {Object} rules.include
 * @property {boolean} rules.include.character
 * @property {boolean} rules.include.species
 * @property {boolean} rules.include.meta
 * @property {boolean} rules.include.artist
 * @property {boolean} rules.include.general
 * @property {["{character}", "{species}", "{meta}", "{artist}", "{general}", "{species}"]} rules.formattingOrder
 * The order in which the tags should be displayed. The user may generalize tags that belong to a category by surrounding them with curly braces,
 * but they can also add specific tags anywhere in the list should they appear in the post.
 *
 * @property {number | null} [limit=null]
 */


/* ******************************* Message Handler ******************************** */

// listen for messages from the sidepanel script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received: ", message);
  console.log("Sender: ", sender);

  if (message.message === "getTags") {
    console.log("Getting tags from content script");
    // check if the current page is supported

    // it is -- parse the tags
    const tags = getTags({
      // default fallback options
      options: message.options || {
        rules: {
          /** ignored tags (array of strings, automatically lowercased) */
          blacklist: [],

          /** categories to include */
          include: {
            character: true,
            species: true,
            meta: false,
            artist: true,
            general: true,
            species: true,
          },

          // the minimum score a tag must have to be included
          minimumScore: 0,

          // the maximum number of tags to return (per category)
          limit: null,

          // the order in which the tags should be displayed if present
          formattingOrder: [
            "1boy",
            "1girl",
            "{copyright}",
            "{character}",
            "{species}",
            "{meta}",
            "{artist}",
            "{general}",
            "{species}",
          ],

          // allows to select a specific tag over another
          synonymPriority: [["1girl, solo, 1girls"], ["1boy, solo, 1boys"]],

          /**
           * Different imageboards have different tag names for the same thing.
           * This dictionary allows you to resolve those differences.
           */
          translations: {
            // both 'gay' and 'male/male' get translated to 'yaoi'.
            yaoi: ["gay", "male/male"],
            "1boy": ["sole male", "1boys"],
            "1girl": ["sole female", "1girls"],
            people: ["background characters", "extras"],
          },
        },
      },
      imageSrc: message.imageSrc,
      pageUrl: window.location.href,
    });

    console.log("Tags fetched: ", tags);
    sendResponse(tags);
    console.log("Tags sent to sidepanel script");
  }
});

console.log("Content script loaded");

/* ********************************** Functions *********************************** */

/**
 * @param {Object} options
 * @param {TagScrapingOptions} options.options
 * @param {string} options.imageSrc
 * @param {string} options.pageUrl
 * @returns {TagScrapingResult}
 */
function getTags({
  /**
   * @typedef {typeof options} TagScraperOptions
   */
  options = {
    rules: {
      blacklist: [],
      include: {
        character: true,
        species: true,
        meta: true,
        artist: true,
        general: true,
        copyright: true,
      },
      /** @todo */
      minimumScore: 0,
      /** @todo */
      minimumCount: 0,
    },
    limit: null,
  },
  imageSrc,
  pageUrl,
}) {

  const result = all({ options, imageSrc, pageUrl });

  return {
    tags: result.tags || {
      copyright: [],
      character: [],
      meta: [],
      artist: [],
      general: [],
      species: [],
    },
    options,
    imageSrc,
  };
}

/**
 * Catch-all function for all boorus.
 * @param {Object} options
 * @param {TagScrapingOptions} options.options
 * @param {string} options.imageSrc
 * @param {string} options.pageUrl
 * @returns {TagScrapingResult}
 */
function all({ options, imageSrc, pageUrl }) {

  /**
   * Deep search an element's descendants for a specific element that matches a predicate.
   * @param {HTMLElement} rootElement
   * @param {(element: HTMLElement) => boolean} predicate
   */
  function findElement(rootElement, predicate) {
    if (!predicate || typeof predicate !== "function") {
      throw new Error("Predicate must be a function");
    }

    if (!rootElement || !(rootElement instanceof Node)) {
      throw new Error("Root element must be a valid DOM node");
    }
    const stack = [rootElement];

    while (stack.length > 0) {
      const element = stack.pop();
      
      if (predicate(element)) {
        return element;
      }

      // Add children in reverse order to process them in natural order (DFS)
      for (let i = element.children.length - 1; i >= 0; i--) {
        stack.push(element.children[i]);
      }
    }

    return null;
  }

  /**
   * Strategies for scraping tags from different boorus.
   * @type {(() => { character: string[], species: string[], meta: string[], artist: string[], general: string[], species: string[] })[]} A list of functions that scrape tags from different boorus.
   */
  const strategies = [
    // - dan (keeps the tag inside a <li> element's data-tag-name attribute)
    () => {
      const valid = document.querySelector("li[data-tag-name]");

      if (!valid) {
        return null;
      }

      const tags = {
        character: [],
        species: [],
        meta: [],
        artist: [],
        general: [],
        species: []
      };

      document.querySelector('ul.general-tag-list')?.querySelectorAll('li').forEach((li) => {
        const tag = li.getAttribute('data-tag-name');

        if (tag) {
          tags.general.push(tag);
        } else {
          console.warn("No tags found in container: ", li);
        }
      });

      document.querySelector('ul.character-tag-list')?.querySelectorAll('li').forEach((li) => {
        const tag = li.getAttribute('data-tag-name');

        if (tag) {
          tags.character.push(tag);
        } else {
          console.warn("No tags found in container: ", li);
        }
      });

      document.querySelector('ul.meta-tag-list')?.querySelectorAll('li').forEach((li) => {
        const tag = li.getAttribute('data-tag-name');

        if (tag) {
          tags.meta.push(tag);
        } else {
          console.warn("No tags found in container: ", li);
        }
      });

      document.querySelector('ul.artist-tag-list')?.querySelectorAll('li').forEach((li) => {
        const tag = li.getAttribute('data-tag-name');

        if (tag) {
          tags.artist.push(tag);
        } else {
          console.warn("No tags found in container: ", li);
        }
      });

      document.querySelector('ul.copyright-tag-list')?.querySelectorAll('li').forEach((li) => {
        const tag = li.getAttribute('data-tag-name');

        if (tag) {
          tags.artist.push(tag);
        } else {
          console.warn("No tags found in container: ", li);
        }
      });

      return {
        tags,
        options,
        imageSrc,
        pageUrl,
      };
    },

    // gel, 34, safebooru, (uses tag-type-*)
    () => {
      // 1. check if this kind of tag exists(used by gelbooru, r34,)
      const valid = document.querySelector('[class*="tag-type-"]');

      if (!valid) {
        return null;
      }

      // 2. Get all tag containers
      const tagContainers = Array.from(
        document.querySelectorAll("li[class*='tag-type-']")
      );

      if (tagContainers.length === 0) {
        return null;
      }

      // 3. If they contain child elements, we have to check the children for the tags
      // any child that has a textContent of "?" is not a tag

      // this is the tag itself
      if (tagContainers[0].children.length > 0) {

        const tags = {
          copyright: [],
          character: [],
          species: [],
          meta: [],
          artist: [],
          general: [],
          species: []
        };

        for (const container of tagContainers) {
          const tag = findElement(container, (element) => element.tagName === 'A' && element.textContent?.trim() !== '?');
          let tagType = container.className.match(/tag-type-(\w+)/)[1].toLowerCase().replace(/s$/, '');
          
          if (!tagType) {
            console.warn("Error: Failed to get tag type from container: ", container);
            console.warn("No tag type found in container: ", container);
            return null;
          }

          if (tag) {
            console.log("Adding tag of type ", tagType, ": ", tag.textContent);
            
            // these sites use the key 'metadata' instead of 'meta'
            if (tagType === "metadata") {
              tagType = "meta";
            }

            tags[tagType].push(tag.textContent);
          } else {
            console.warn("No tags found in container: ", container);
            return null;
          }
        }

        return {
          tags,
          options,
          imageSrc,
          pageUrl,
        };
      }

      return null;
    },

    // e6, (uses search-tag, but the container
    () => {
      const valid = document.querySelector(".tag-list-header");

      if (!valid) {
        return null;
      }

      const tags = {
        character: [],
        species: [],
        meta: [],
        artist: [],
        general: [],
        species: []
      };

      const copyrightTags = document.querySelector('ul.copyright-tag-list');
      const generalTags = document.querySelector("ul.general-tag-list");
      const characterTags = document.querySelector("ul.character-tag-list");
      const metaTags = document.querySelector("ul.meta-tag-list");
      const artistTags = document.querySelector("ul.artist-tag-list");
      const speciesTags = document.querySelector("ul.species-tag-list");
      
      copyrightTags?.querySelectorAll("a.search-tag").forEach((tag) => {
        const tagName = tag.textContent;

        if (tagName) {
          tags.artist.push(tagName);
        } else {
          console.warn("No tags found in container: ", tag);
        }
      });

      generalTags?.querySelectorAll("a.search-tag").forEach((tag) => {
        const tagName = tag.textContent;

        if (tagName) {
          tags.general.push(tagName);
        } else {
          console.warn("No tags found in container: ", tag);
        }
      });

      characterTags?.querySelectorAll("a.search-tag").forEach((tag) => {
        const tagName = tag.textContent;

        if (tagName) {
          tags.character.push(tagName);
        } else {
          console.warn("No tags found in container: ", tag);
        }
      });

      metaTags?.querySelectorAll("a.search-tag").forEach((tag) => {
        const tagName = tag.textContent;

        if (tagName) {
          tags.meta.push(tagName);
        } else {
          console.warn("No tags found in container: ", tag);
        }
      });

      artistTags?.querySelectorAll("a.search-tag").forEach((tag) => {
        const tagName = tag.textContent;

        if (tagName) {
          tags.artist.push(tagName);
        } else {
          console.warn("No tags found in container: ", tag);
        }
      });

      speciesTags?.querySelectorAll("a.search-tag").forEach((tag) => {
        const tagName = tag.textContent;

        if (tagName) {
          tags.species.push(tagName);
        } else {
          console.warn("No tags found in container: ", tag);
        }
      });

      return {
        tags,
        options,
        imageSrc,
        pageUrl,
      };
    },
  ];

  let result = null;

  // Iterate over the strategies and return the first non-null result
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];

    console.log("Trying strategy ", i, "...");

    const res = strategy();
    
    if (res) {
      result = res;
      console.log("%cStrategy ", i, " succeeded.", "color: green;");
      break;
    } else {
      console.log("%cStrategy ", i, " failed.", "color: orange;");
    }
  }

  if (!result) {
    console.error("%cNo valid strategy found for scraping tags.", "color: red;");
  }

  return result;
}