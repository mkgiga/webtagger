/**
 * content script, for getting the booru tags from the image we copy and returning them to the sidepanel script.
 */

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
    });

    console.log("Tags fetched: ", tags);
    sendResponse(tags);
    console.log("Tags sent to sidepanel script");
  }
});

console.log("Content script loaded");

/**
 * @typedef {Object} TagScrapingResult
 * @property {Object} tags
 * @property {string[]} tags.character
 * @property {string[]} tags.species
 * @property {string[]} tags.meta
 * @property {string[]} tags.artist
 * @property {string[]} tags.general
 * @property {string[]} tags.species
 * @property {string[]} tags.copyright
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

/**
 * @param {TagScrapingOptions} options
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
}) {
  // where are we?
  const url = window.location.href;

  console.log("Options: ", options);

  options.rules.blacklist = options.rules.blacklist.map((tag) =>
    tag.toLowerCase().trim()
  );

  console.log("Scraping tags from: ", url);

  if (
    url.match(/danbooru\.donmai\.us\/posts\/\d+/) ||
    url.match(/e621\.net\/posts\/\d+/)
  ) {
    return danbooru({ options, imageSrc, pageUrl: url });
  } else if (
    url.includes("rule34.xxx") ||
    url.includes("gelbooru.com") ||
    url.match(/safebooru\.org\/index\.php\?page=post&s=view&id=\d+/)
  ) {
    return gelbooru({ options, imageSrc, pageUrl: url });
  }

  console.error("No scraper found for this site");

  return {};
}

/**
 * danbooru and e621 both use the same type of booru backend,
 * so their html structure is the same.
 * @param {TagScrapingOptions} options
 * @returns {TagScrapingResult}
 */
function danbooru({ options, imageSrc, pageUrl }) {
  const tags = {
    character: [],
    species: [],
    meta: [],
    artist: [],
    general: [],
    species: [],
    copyright: [],
  };

  const tagLists = {
    character: document.querySelectorAll("ul.character-tag-list a.search-tag"),
    meta: document.querySelectorAll("ul.meta-tag-list a.search-tag"),
    artist: document.querySelectorAll("ul.artist-tag-list a.search-tag"),
    general: document.querySelectorAll("ul.general-tag-list a.search-tag"),
    copyright: document.querySelectorAll("ul.copyright-tag-list a.search-tag"),
  };

  for (const category of [
    "character",
    "meta",
    "artist",
    "general",
    "copyright",
    "species",
  ]) {
    // danbooru doesn't have a species category
    if (!tagLists[category]) {
      continue;
    }

    for (const tag of tagLists[category]) {
      // limit is optional, but null by default
      if (typeof limit === "number" && tags[category].length >= options.limit) {
        break;
      }

      // <preferenial filtering>

      if (!options.rules.include[category]) {
        continue;
      }

      if (!options.rules.blacklist.includes(tag)) {
        tags[category].push(tag.textContent);
      }

      // </preferential filtering>
    }
  }

  // todo: unthumbnail
  // imageSrc = unthumbnail(imageSrc);

  return { tags, options, imageSrc, pageUrl };
}

function gelbooru({ options, imageSrc, pageUrl }) {
  const tags = {
    character: [],
    meta: [],
    artist: [],
    general: [],
    copyright: [],
  };

  const classes = {
    character: "tag-type-character",
    meta: "tag-type-meta",
    artist: "tag-type-artist",
    general: "tag-type-general",
    copyright: "tag-type-copyright",
  };

  const tagList =
    document.getElementById("tag-sidebar") || // rule34.xxx
    document.querySelector("sidebar"); // safebooru.org

  console.log("Tag list: ", tagList);

  const tagLists = {
    character: tagList.querySelectorAll(`li.${classes.character} a`),
    meta: tagList.querySelectorAll(`li.${classes.meta} a`),
    artist: tagList.querySelectorAll(`li.${classes.artist} a`),
    general: tagList.querySelectorAll(`li.${classes.general} a`),
    copyright: tagList.querySelectorAll(`li.${classes.copyright} a`),
  };

  for (const category of [
    "character",
    "meta",
    "artist",
    "general",
    "copyright",
  ]) {
    const tags = tagLists[category];
    const newTags = [];

    for (const tag of tags) {
      if (tag.textContent === "?") {
        continue;
      }

      newTags.push(tag);
    }

    tagLists[category] = newTags;
  }

  console.log("Tags: ", tagLists);

  for (const category of [
    "character",
    "species",
    "meta",
    "artist",
    "general",
  ]) {
    for (const tag of tagLists[category] || []) {
      // limit is optional, but null by default
      if (typeof limit === "number" && tags[category].length >= options.limit) {
        break;
      }

      // <preferenial filtering>

      if (!options.rules.include[category]) {
        continue;
      }

      if (!options.rules.blacklist.includes(tag)) {
        tags[category].push(tag.textContent);
      }

      // </preferential filtering>
    }
  }

  return { tags, options, imageSrc, pageUrl };
}

function isThumbnail(imageSrc) {
  if (
    imageSrc.includes("danbooru") &&
    imageSrc.includes("sample-") &&
    imageSrc.endsWith(".jpg")
  ) {
    return true;
  }

  return false;
}

function unthumbnail(imageSrc) {
  if (isThumbnail(imageSrc)) {
    if (imageSrc.includes("danbooru")) {
      return imageSrc.replace("sample-", "").replace(".jpg", ".png");
    }
  }

  return imageSrc;
}
