/*global console */

(function () {

    "use strict";

    var speedup = false,
        KEYCODES = {
            "SPACEBAR": 32,
            "LEFT": 37,
            "UP": 38,
            "RIGHT": 39,
            "DOWN": 40,
            "SPEEDUP": 192,  // Backquote
            "SKIP_BACKWARD": 74,  // J
            "SKIP_FORWARD": 76  // L
        },
        SEEK_JUMP_KEYCODE_MAPPINGS = {
            // 0 to 9
            "48": 0,
            "49": 1,
            "50": 2,
            "51": 3,
            "52": 4,
            "53": 5,
            "54": 6,
            "55": 7,
            "56": 8,
            "57": 9,
            // 0 to 9 on numpad
            "96": 0,
            "97": 1,
            "98": 2,
            "99": 3,
            "100": 4,
            "101": 5,
            "102": 6,
            "103": 7,
            "104": 8,
            "105": 9
        };

    function inputActive(currentElement) {
        // If on an input or textarea
        if (currentElement.tagName.toLowerCase() === "input" ||
            currentElement.tagName.toLowerCase() === "textarea" ||
            currentElement.isContentEditable) {
            return true;
        } else {
            return false;
        }
    }

    // https://stackoverflow.com/questions/6121203/how-to-do-fade-in-and-fade-out-with-javascript-and-css
    function fadeout(element, startOpacity) {
        var op = startOpacity; // initial opacity
        var timer = setInterval(function () {
            if (op <= 0.1) {
                clearInterval(timer);
                element.style.display = 'none';
            }
            element.style.opacity = op;
            element.style.filter = 'alpha(opacity=' + op * 100 + ")";
            op -= op * 0.1;
        }, 50);
    }

    function displayText(speed, boundingElement) {
        var elementId = "youtube-extension-text-box",
            HTML = '<div id="' + elementId + '">' + speed + 'x</div>',
            element = document.getElementById(elementId);

        // If the element doesn't exist, append it to the body
        // must check if it already exists
        if (!element) {
            boundingElement.insertAdjacentHTML('afterbegin', HTML);
            element = document.getElementById(elementId);
        } else {
            element.innerHTML = speed + "x";
        }

        element.style.display = 'block';
        element.style.opacity = 0.8;
        element.style.filter = 'alpha(opacity=' + (0.8 * 100) + ")"
        setTimeout(function () {
            fadeout(element, 0.8);
        }, 1500);

    }

    window.onkeyup = function (e) {
        var code = e.keyCode,
            ctrlKey = e.ctrlKey,
            video = document.getElementsByTagName("video")[0],
            mediaElement = document.getElementById("movie_player"),
            mediaElementChildren = mediaElement.getElementsByTagName("*"),
            activeElement = document.activeElement,
            i;
      const seconds = 1;

        // If an input/textarea element is active, don't go any further 
        if (inputActive(activeElement)) {
            return;
        }

        // Playback speeds
        if (code === KEYCODES.SPEEDUP) {
            speedup = !speedup;

            if (speedup) {
                video.playbackRate = 2;
            } else {
                video.playbackRate = 1;
            }

            // If ctrl is being pressed turn to x3 speed
            if (ctrlKey) {
                video.playbackRate = 3;
                speedup = true;
            }

            displayText(video.playbackRate, mediaElement);
        }

        if (code === KEYCODES.SKIP_FORWARD && ctrlKey) {
            video.currentTime = (video.currentTime + seconds)
        }
        if (code === KEYCODES.SKIP_BACKWARD && ctrlKey) {
            video.currentTime = (video.currentTime - seconds)
        }

        // Check if the media element, or any of it's children are active.
        // Else we'll be overwriting the previous actions.
        for (i = 0; i < mediaElementChildren.length; i = i + 1) {
            if (mediaElementChildren[i] === activeElement) {
                return;
            }
        }

        // Also check if it's the media element itself.
        if (mediaElement === activeElement) {
            return;
        }

        // If seek key
        if (SEEK_JUMP_KEYCODE_MAPPINGS[code] !== undefined) {
            video.currentTime = (SEEK_JUMP_KEYCODE_MAPPINGS[code] / 10) * video.duration;
        }

    };

}());
