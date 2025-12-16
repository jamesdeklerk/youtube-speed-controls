(function () {
	"use strict";

	let activeAnimationId = null; // Store the current animation ID
	let lastKeyupTime = 0; // Track the last key event time
	const DEBOUNCE_DELAY = 100; // Set debounce time in milliseconds

	// https://developer.mozilla.org/en-US/docs/Web/API/Element/keyup_event
	window.addEventListener("keyup", function (event) {
		console.log(`[I][keyup]`);

		// If an input/textarea element is active, don't go any further, or if it's not a speedup shortcut
		if (inputActive(document.activeElement) || !isToggleSpeedShortcut(event)) return;

		// If the time between key presses is less than the debounce delay, ignore the event
		if (event.timeStamp - lastKeyupTime < DEBOUNCE_DELAY) return;

		lastKeyupTime = event.timeStamp;

		let video = document.getElementsByTagName("video")[0];
		if (!video) return;

		if (isOnlyToggleSpeedShortcut(event)) {
			video.playbackRate = getNextSpeed(video);
			console.log(`[I] Video.playbackRate: ${video.playbackRate}x`);
			setHDQuality();
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
				element.style.display = "none";
				activeAnimationId = null; // Clear the animation ID when done
			}
		};

		activeAnimationId = requestAnimationFrame(fadeStep);
	}

	function displayTextInMediaElement(speed) {
		let elementId = "youtube-extension-text-box";
		let element = document.getElementById(elementId);

		// If the element doesn't exist, create it using DOM methods (Trusted Types compatible)
		if (!element) {
			let mediaElement = document.getElementById("movie_player");
			element = document.createElement("div");
			element.id = elementId;
			element.textContent = speed + "x";
			mediaElement.insertBefore(element, mediaElement.firstChild);
		} else {
			element.textContent = speed + "x";
		}

		element.style.display = "block";
		element.style.opacity = 0.8;
		element.style.filter = `alpha(opacity=${0.8 * 100})`;

		startFadeoutAnimation(element);
	}

	/**
	 * Returns the next playback speed for a given video element based on a predefined set of speeds.
	 * If the current speed is not found or is the last in the list, it wraps around to the first speed.
	 *
	 * Logic:
	 * - Define an array of allowed playback speeds.
	 * - Find the current playback rate's index in the array.
	 * - If not found or at the end, return the first speed.
	 * - Otherwise, return the next speed in the array.
	 *
	 * @param {HTMLVideoElement} video - The video element whose playback speed is to be changed.
	 * @returns {number} The next playback speed value.
	 */
	const getNextSpeed = (video) => {
		const speedMap = [1, 1.25, 1.5, 1.75, 2];
		const current = video.playbackRate;
		const idx = speedMap.indexOf(current);

		if (idx === -1 || idx === speedMap.length - 1) {
			return speedMap[0];
		}

		return speedMap[idx + 1];
	};

	/**
	 * Attempts to set the video playback quality to HD (1080p or 720p) if available.
	 *
	 * Functional Interface:
	 * - Input: None (accesses DOM elements internally)
	 * - Output: void (side effect: changes video quality settings)
	 * - Side Effects:
	 *   - Queries the DOM for the YouTube player element
	 *   - Modifies the player's playback quality if HD is available
	 *   - Logs console messages (info or error)
	 *
	 * Behavior:
	 * - Retrieves the YouTube player object from the DOM
	 * - Gets available quality levels from the player
	 * - Prioritizes 1080p, falls back to 720p if available
	 * - Only applies quality change if different from current quality
	 * - Handles errors gracefully if player is unavailable
	 *
	 * Note: Requires world: "MAIN" in manifest to access YouTube's player API.
	 *
	 * @returns {void}
	 */
	const setHDQuality = () => {
		try {
			const ytdPlayer = document.querySelector("ytd-player");
			if (!ytdPlayer || typeof ytdPlayer.getPlayer !== "function") {
				console.warn("[W][setHDQuality] ytd-player or getPlayer() not available");
				return;
			}

			const player = ytdPlayer.getPlayer();
			if (!player) {
				console.warn("[W][setHDQuality] Player object is null");
				return;
			}

			const options = player.getAvailableQualityLevels();
			const hd1080 = options.find((q) => q.indexOf("1080") !== -1);
			const hd720 = options.find((q) => q.indexOf("720") !== -1);
			const quality = hd1080 ?? hd720;

			if (!quality) {
				console.debug("[D][setHDQuality] No HD quality available");
				return;
			}

			if (quality !== player.getPlaybackQuality()) {
				player.setPlaybackQuality(quality);
				player.setPlaybackQualityRange(quality);

				console.log(
					`[I][setHDQuality] Quality "${player.getPlaybackQuality()}" (${quality}) applied.`
				);
			}
		} catch (e) {
			console.error(`[E][setHDQuality] ${e}`);
		}
	};

	// Key values for keyboard events
	// https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
	// ` or ' is for toggling between speedup and normal speed
	const isToggleSpeedShortcut = (e) =>
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

	// ` or ' for toggling between speedup and normal speed
	const isOnlyToggleSpeedShortcut = (e) =>
		isToggleSpeedShortcut(e) && !e.ctrlKey && !e.altKey && !e.metaKey;

	// Ctrl + ` or Ctrl + ' for 3x speed
	const is3xSpeedShortcut = (e) => isToggleSpeedShortcut(e) && e.ctrlKey && !e.altKey && !e.metaKey;

	// Windows + ` or Windows + ' for 4x speed (Windows key is the meta key on Windows)
	// Command + ` or Command + ' for 4x speed (Command key is the meta key on Mac)
	const is4xSpeedShortcut = (e) => isToggleSpeedShortcut(e) && e.metaKey && !e.ctrlKey && !e.altKey;

	// Alt + ` or Alt + ' for 5x speed (on Windows)
	// Option + ` or Option + ' for 5x speed (on Mac)
	const is5xSpeedShortcut = (e) => isToggleSpeedShortcut(e) && e.altKey && !e.ctrlKey && !e.metaKey;
})();
