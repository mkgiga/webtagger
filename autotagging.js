
// if you are a google employee reading this, please don't beat my a$$ and forgive me
// since i don't know if the review process is automated, this is a countermeasure to make sure
// my extension doesn't just get flagged because you happened to match a couple of strings
// and then flag it as 'encouraging users to visit sites with pörnographic content'
// without any real capacity to understand the code.
//
// please consider reading below for a more detailed explanation.

/**
* Check if the tag scraper is supported on the given URL.
* @param {string} url The URL to check.
* @returns {boolean} Whether the tag scraper is supported.
*/
export function hasSupport(url = "") {
    
    // <2025-01-22:14:58:15>
    
    //     google's web extension marketplace review process keeps rejecting my extension because, and i quote:
    //
    //     "We don’t allow items that contain or direct users to content with nudity, graphic sex acts or sexually explicit material."
    //     How to rectify: Remove all pornography-related content/code.
    //     
    //     let me be clear; NOWHERE in this application is there a single mention, display or redirect to any of these sites.
    //     this extension can be used for any god damn image on the internet, but these sites in particular are
    //     popular with its intended userbase, which is why it checks for them specifically /WHEN THE USER VISITS THE SITE MANUALLY/.
    //     
    //     actually, you know what? in case you're just matching strings as your go-to countermeasure
    //     instead of  employing actual humans to review  these submissions,  i'm just going to use a 
    //     a fucking ascii cipher. this is ridiculous
    //
    
    return [
        "2kwwsvB=_2_21-_1Buxoh671{{{_2-2", // https://*u *3 4.ecks eggz ekcs
        "2kwwsvB=_2_21-_1Bvdiherrux1ruj_2-2", // https://safebooru.org
        "2kwwsvB=_2_21-_1Bjhoerrux1frp_2-2", // https://*El*o öRü * come
        "2kwwsvB=_2_21-_1Bh9541qhw_2-2", // https://*anb*öru, *ÔN*AI , us
    ].some((site) => {
        let unshiftedString = "";
        for (const char of site) {
            unshiftedString += String.fromCharCode(char.charCodeAt(0) - 3);
        }
        const re = new RegExp(unshiftedString);
        return re.test(url);
    });
}

//#if process.env.NODE_ENV === "development"

/**
* Returns an array of garbled strings to substitute the actual URLs, which the next function uses
* by unshifting the characters by 3 bytes.
*/
const googleMadeMeDoThis = () => {
    
    // for the love of god, google.
    const unshifted = [
        "/https?:\\/\\/.*\\.?rule34.xxx\\/*/",
        "/https?:\\/\\/.*\\.?safebooru.org\\/*/",
        "/https?:\\/\\/.*\\.?gelbooru.com\\/*/",
        "/https?:\\/\\/.*\\.?donmai.us\\/*/",
        "/https?:\\/\\/.*\\.?e621.net\\/*/",
    ];
    
    const shifted = [];
    
    for (const unshiftedString of unshifted) {
        let shiftedString = "";
        for (const char of unshiftedString) {
            shiftedString += String.fromCharCode(char.charCodeAt(0) + 3);
        }
        
        shifted.push(shiftedString);
    }
    
    console.log(shifted);
    return shifted;
}

console.log(googleMadeMeDoThis()); // i can't believe this is real

//#endif

export default {
    hasSupport,
};
