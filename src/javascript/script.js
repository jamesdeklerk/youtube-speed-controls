(function () {

    "use strict";

    // Key values for keyboard events
    // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
    const KEYS = {
        BACKTICK: "`", // Also called backquote or grave accent
        QUOTE: "'" // Also called apostrophe
    };

    let activeAnimationId = null; // Store the current animation ID

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/keyup_event
    window.addEventListener("keyup", function (event) {
        // If an input/textarea element is active, don't go any further, or if it's not a speedup shortcut
        if (inputActive(document.activeElement) || !isToggleSpeedShortcut(event))
            return;

        let video = document.getElementsByTagName("video")[0];
        if (!video)
            return;

        if (isOnlyToggleSpeedShortcut(event)) {
            // If it's sped up, go back to normal speed, else go to 2x speed
            video.playbackRate = isVideoSpedUp(video) ? 1 : 2;
        } else if (is3xSpeedShortcut(event)) {
            video.playbackRate = 3;
        } else if (is4xSpeedShortcut(event)) {
            video.playbackRate = 4;
        } else if (is5xSpeedShortcut(event)) {
            video.playbackRate = 5;
        }

        displayTextInMediaElement(video.playbackRate);
    });

    const inputActive = (currentElement) =>
        // If on an input or textarea
        currentElement.tagName.toLowerCase() === "input" ||
        currentElement.tagName.toLowerCase() === "textarea" ||
        currentElement.isContentEditable;

    function startFadeoutAnimation(element, startOpacity = 0.9, duration = 1000) {
        let opacity = startOpacity;
        const startTime = performance.now();

        // If an animation is already in progress, cancel it
        if (activeAnimationId) {
            cancelAnimationFrame(activeAnimationId);
        }

        const fadeStep = function (timestamp) {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1); // Ensure progress does not exceed 1

            // Set the opacity based on the progress
            opacity = startOpacity * (1 - progress);
            element.style.opacity = opacity;
            element.style.filter = `alpha(opacity=${opacity * 100})`;

            if (progress < 1) {
                activeAnimationId = requestAnimationFrame(fadeStep);
            } else {
                element.style.display = 'none';
                activeAnimationId = null; // Clear the animation ID when done
            }
        };

        activeAnimationId = requestAnimationFrame(fadeStep);
    }

    function displayTextInMediaElement(speed) {
        let elementId = "youtube-extension-text-box";
        let element = document.getElementById(elementId);

        // If the element doesn't exist, append it to the body
        // must check if it already exists
        if (!element) {
            let mediaElement = document.getElementById("movie_player");
            mediaElement.insertAdjacentHTML('afterbegin', `<div id="${elementId}">${speed}x</div>`);
            element = document.getElementById(elementId);
        } else {
            element.innerHTML = speed + "x";
        }

        element.style.display = 'block';
        element.style.opacity = 0.8;
        element.style.filter = `alpha(opacity=${0.8 * 100})`;

        startFadeoutAnimation(element);
    }

    const isVideoSpedUp = (video) => video.playbackRate !== 1;

    // ` or ' is for toggling between speedup and normal speed
    const isToggleSpeedShortcut = (e) =>
        e.key === KEYS.BACKTICK || e.key === KEYS.QUOTE;

    // ` or ' for toggling between speedup and normal speed
    const isOnlyToggleSpeedShortcut = (e) =>
        isToggleSpeedShortcut(e)
        && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;

    // Ctrl + ` or Ctrl + ' for 3x speed
    const is3xSpeedShortcut = (e) =>
        isToggleSpeedShortcut(e) && e.ctrlKey
        && !e.shiftKey && !e.altKey && !e.metaKey;

    // Windows + ` or Windows + ' for 4x speed (Windows key is the meta key on Windows)
    // Command + ` or Command + ' for 4x speed (Command key is the meta key on Mac)
    const is4xSpeedShortcut = (e) =>
        isToggleSpeedShortcut(e) && e.metaKey
        && !e.ctrlKey && !e.shiftKey && !e.altKey;

    // Alt + ` or Alt + ' for 5x speed (on Windows)
    // Option + ` or Option + ' for 5x speed (on Mac)
    const is5xSpeedShortcut = (e) =>
        isToggleSpeedShortcut(e) && e.altKey
        && !e.ctrlKey && !e.shiftKey && !e.metaKey;

}());