(function () {

    "use strict";

    let lastKeyupTime = 0;        // Track the last key event time
    let pendingLayoutFrame = null; // Track pending reposition frame

    const DEBOUNCE_DELAY = 100;   // Set debounce time in milliseconds
    const SPEED_INDICATOR_ELEMENT_ID = "youtube-extension-speed-indicator";

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/keyup_event
    const keyupHandler = (event) => {
        // If an input/textarea element is active, don't go any further, or if it's not a speedup shortcut
        if (inputActive(document.activeElement) || !keyCheck_IsToggleSpeedShortcut(event))
            return;

        // If the time between key presses is less than the debounce delay, ignore the event
        if (event.timeStamp - lastKeyupTime < DEBOUNCE_DELAY)
            return;

        lastKeyupTime = event.timeStamp;

        let videoElements = document.querySelectorAll("video");
        if (!videoElements.length)
            return;

        // Loop through all video elements on the page, and set the speed of each one
        videoElements.forEach(video => {
            if (keyCheck_IsDefaultToggleSpeedShortcut(event)) {
                // If it's sped up, go back to normal speed, else go to 2x speed
                video.playbackRate = isVideoSpedUp(video) ? 1 : 2;
            } else if (keyCheck_Is3xSpeedShortcut(event)) {
                video.playbackRate = 3;
            } else if (keyCheck_Is4xSpeedShortcut(event)) {
                video.playbackRate = 4;
            } else if (keyCheck_Is5xSpeedShortcut(event)) {
                video.playbackRate = 5;
            }
        });

        let firstVideoInViewport = getFirstVideoInViewport();
        displaySpeedInYouTubeVideoElement(firstVideoInViewport);
    }

    const scheduleIndicatorReposition = () => {
        if (pendingLayoutFrame)
            return;

        pendingLayoutFrame = requestAnimationFrame(() => {
            pendingLayoutFrame = null;

            // Reposition the speed indicator if it's visible
            const speedIndicatorElement = document.getElementById(SPEED_INDICATOR_ELEMENT_ID);

            if (!speedIndicatorElement || speedIndicatorElement.style.display === 'none')
                return;

            const firstVideoInViewport = getFirstVideoInViewport();
            if (!firstVideoInViewport) {
                speedIndicatorElement.style.display = 'none';
                return;
            }

            positionSpeedIndicator(firstVideoInViewport, speedIndicatorElement);
        });
    };

    // Intersection Observer - watch video elements entering/leaving viewport
    const setupIntersectionObserver = () => {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.01 // Trigger when at least 1% of the video is visible
        };

        const intersectionObserver = new IntersectionObserver((entries) => {
            // Schedule reposition when any video's visibility changes
            scheduleIndicatorReposition();
        }, observerOptions);

        // Observe all video elements on the page
        document.querySelectorAll('video').forEach(video => {
            intersectionObserver.observe(video);
        });
    };

    // Mutation Observer - watch for video element changes (movement, sizing, etc.)
    const setupMutationObserver = () => {
        const mutationObserverOptions = {
            attributes: true,                       // Watch for attribute changes (style, class, etc.)
            attributeFilter: [
                'style', 'class', 'width', 'height' // Only watch these attributes
            ],
            subtree: true,                          // Watch all descendants
            childList: true                         // Watch for added/removed elements
        };

        const mutationObserver = new MutationObserver(() => {
            // Schedule reposition when the DOM changes
            scheduleIndicatorReposition();
        });

        // Start observing the document body for mutations
        mutationObserver.observe(document.body, mutationObserverOptions);
    };

    const inputActive = (currentElement) =>
        // If on an input or textarea
        currentElement.tagName.toLowerCase() === "input" ||
        currentElement.tagName.toLowerCase() === "textarea" ||
        currentElement.isContentEditable;

    function startPulseAnimation(element) {
        const existing = element.getAnimations().pop();
        if (existing) existing.cancel();

        element.style.display = 'inline-flex';

        const animation = element.animate([
            // Pop in (ease-out)
            { transform: 'scale(0.8)', opacity: 0.2, offset: 0, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' },
            { transform: 'scale(1.0)', opacity: 1.0, offset: 0.22 },

            // Hold
            { transform: 'scale(1.0)', opacity: 1.0, offset: 0.78 },

            // Pop out (ease-in)
            { transform: 'scale(0.8)', opacity: 0.2, offset: 1, easing: 'cubic-bezier(0.4, 0, 0.6, 0.2)' },
        ], {
            duration: 900,
            fill: 'forwards'
        });

        animation.onfinish = () => (element.style.display = 'none');
    }

    function displaySpeedInYouTubeVideoElement(videoElement) {
        if (!videoElement)
            return;

        const speed = videoElement.playbackRate;
        const speedIndicatorElement = getOrCreateSpeedIndicatorElement();

        if (!positionSpeedIndicator(videoElement, speedIndicatorElement))
            return;

        speedIndicatorElement.textContent = `${speed}x`;

        startPulseAnimation(speedIndicatorElement);
    }

    function getOrCreateSpeedIndicatorElement() {
        let speedIndicatorElement = document.getElementById(SPEED_INDICATOR_ELEMENT_ID);

        if (!speedIndicatorElement) {
            speedIndicatorElement = document.createElement('div');
            speedIndicatorElement.id = SPEED_INDICATOR_ELEMENT_ID;
            speedIndicatorElement.setAttribute('aria-hidden', 'true');
            speedIndicatorElement.setAttribute('role', 'presentation');
            document.body.appendChild(speedIndicatorElement);
        }

        return speedIndicatorElement;
    }

    function positionSpeedIndicator(videoElement, speedIndicatorElement) {
        if (!videoElement || !speedIndicatorElement)
            return false;

        const videoRect = videoElement.getBoundingClientRect();

        if (!videoRect.width || !videoRect.height)
            return false;

        speedIndicatorElement.style.left = `${videoRect.left + (videoRect.width / 2)}px`;
        speedIndicatorElement.style.top = `${videoRect.top + (videoRect.height / 2)}px`;

        return true;
    }

    // Get the first video element in the viewport - generally the one being watched
    const getFirstVideoInViewport = () => 
        [...document.querySelectorAll('video')].find(isInViewport);

    // Check if an element is in the viewport
    const isInViewport = (element) => {
        const rect = element.getBoundingClientRect();
        return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    const isVideoSpedUp = (video) => video.playbackRate !== 1;

    // Key values for keyboard events
    // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
    // ` or ' is for toggling between speedup and normal speed
    const keyCheck_IsToggleSpeedShortcut = (e) =>
        e.key === "`" || // Backtick/Grave Accent key
        e.key === "'" || // Quote/Apostrophe key
        e.key === '"' || // Quotation mark/Double quote key
        e.key === "@" || // @ symbol key
        // 192 is the keyCode for ` on a US keyboard layout, but it's not the same for
        // all keyboard layouts, for example:
        // - 192 is the keyCode for ' on a UK keyboard layout
        // - 192 is the keyCode for @ on a Japanese and French keyboard layouts
        // - 192 is the keyCode for ö on a German keyboard layout
        // Hence the check for keyCode 192 is needed for backwards compatibility with
        // the original implementation as people began to use these keys over time
        e.keyCode === 192;

    // Check it is only the toggle speed shortcut without any modifier keys
    // e.g. ` or ' for toggling between speedup and normal speed
    const keyCheck_IsDefaultToggleSpeedShortcut = (e) =>
        keyCheck_IsToggleSpeedShortcut(e)
        && !e.ctrlKey && !e.altKey && !e.metaKey;

    // Ctrl + ` or Ctrl + ' for 3x speed
    const keyCheck_Is3xSpeedShortcut = (e) =>
        keyCheck_IsToggleSpeedShortcut(e) && e.ctrlKey
        && !e.altKey && !e.metaKey;

    // Windows + ` or Windows + ' for 4x speed (Windows key is the meta key on Windows)
    // Command + ` or Command + ' for 4x speed (Command key is the meta key on Mac)
    const keyCheck_Is4xSpeedShortcut = (e) =>
        keyCheck_IsToggleSpeedShortcut(e) && e.metaKey
        && !e.ctrlKey && !e.altKey;

    // Alt + ` or Alt + ' for 5x speed (on Windows)
    // Option + ` or Option + ' for 5x speed (on Mac)
    const keyCheck_Is5xSpeedShortcut = (e) =>
        keyCheck_IsToggleSpeedShortcut(e) && e.altKey
        && !e.ctrlKey && !e.metaKey;


    // Set up observers to reposition the speed indicator
    // when video elements change - movement, sizing, entering/leaving viewport
    setupIntersectionObserver();
    setupMutationObserver();

    // Set up event listeners
    document.addEventListener('fullscreenchange', scheduleIndicatorReposition);
    document.addEventListener('keyup', keyupHandler); // The code main entry point (keyup events)
}());