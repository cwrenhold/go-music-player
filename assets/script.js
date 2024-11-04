const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const seekBar = document.getElementById('seekBar');
let allTracks = [];         // Full list of all tracks
let allImages = [];         // Full list of all images
let filteredPlaylist = [];  // Filtered list based on selected tags
let currentTrackIndex = 0;
let selectedTags = new Set(); // Set of tags currently selected
let shuffleEnabled = false;

let settings = {
  "volume": 100,
  "shuffle": false,
  "selectedTags": []
}

async function initialise() {
  loadSettings();
  await fetchPlaylist();
  await fetchImages();

  setupTags();
  updateTagsDisplay(); // Load stored tags when the playlist is fetched

  setRandomImage();

  createPlaylist();              // Initialize filtered playlist based on loaded tags

  const pauseButton = document.getElementById("pause-button");

  pauseButton.classList.add("selected");
  seekBar.value = 0;
}

function loadSettings() {
  const storedSettings = localStorage.getItem("settings");
  if (storedSettings) {
    settings = JSON.parse(storedSettings);
    console.log("Loaded settings from local storage: ", settings);
  }

  audioPlayer.volume = settings.volume / 100.0;
  document.getElementById("volume").value = settings.volume;
  shuffleEnabled = settings.shuffle;
  selectedTags = new Set(settings.selectedTags);

  updateShuffleButton();
}

function saveSettings() {
  settings.volume = audioPlayer.volume * 100.0;
  settings.shuffle = shuffleEnabled;
  settings.selectedTags = Array.from(selectedTags);

  localStorage.setItem("settings", JSON.stringify(settings));
}

// Fetch the playlist from the backend
async function fetchPlaylist() {
  const response = await fetch("playlist");
  allTracks = await response.json();
}

// Fetch the images from the backend
async function fetchImages() {
  const response = await fetch("images");
  allImages = await response.json();
}

function setRandomImage() {
  if (allImages.length === 0) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * allImages.length);
  const image = allImages[randomIndex];

  document.body.style.backgroundImage = `url('image?file=${image.file}')`;
}

// Load a track by its index in the filtered playlist
function loadTrack(index) {
  const playlist = document.getElementById("tracklist");
  const selectedTrack = playlist.querySelector(".selected");
  if (selectedTrack) {
    selectedTrack.classList.remove("selected");
  }

  if (index >= 0 && index < filteredPlaylist.length) {
    seekBar.value = 0;
    const track = filteredPlaylist[index];

    const selectedTrack = playlist.querySelector(`li[data-index="${index}"]`);
    if (selectedTrack) {
      selectedTrack.classList.add("selected");
    }

    const filename = track.file;
    console.log("Loading track: " + filename);
    audioSource.src = "stream?file=" + filename;

    audioPlayer.load(); // Load the new track
    updateSeekBar();
    setRandomImage();
  }
}

// Setup tags for the tracks
function setupTags() {
  const tagsContainer = document.getElementById("tagList");
  // Clear the current tags
  tagsContainer.innerHTML = "";

  let allTags = new Set();
  allTracks.forEach(track => {
    track.tags.forEach(tag => allTags.add(tag));
  });

  // Sort the tags alphabetically
  allTags = Array.from(allTags).sort();

  if (allTags.size === 0) {
    tagsContainer.innerHTML = "No tags available";
    return;
  }

  allTags.forEach(tag => {
    const tagElement = document.createElement("button");
      tagElement.classList.add("tag");
      tagElement.setAttribute("data-tag", tag);
      tagElement.textContent = tag;
      tagElement.onclick = () => toggleTag(tag);
      tagsContainer.appendChild(tagElement);
  });
}

// Play and Pause Functions
function playAudio() {
  audioPlayer.play();
  updateSeekBar();

  const playButton = document.getElementById("play-button");
  const pauseButton = document.getElementById("pause-button");

  playButton.classList.add("selected");
  pauseButton.classList.remove("selected");
}

function pauseAudio() {
  audioPlayer.pause();

  const playButton = document.getElementById("play-button");
  const pauseButton = document.getElementById("pause-button");

  playButton.classList.remove("selected");
  pauseButton.classList.add("selected");
}

// Skip Forward and Backward Functions
function skipForward() {
  audioPlayer.currentTime = Math.min(audioPlayer.currentTime + 10, audioPlayer.duration);
}

function skipBackward() {
  audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 10, 0);
}

// Update SeekBar as the Audio Plays
audioPlayer.ontimeupdate = updateSeekBar;

function updateSeekBar() {
  const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100.0;
  seekBar.value = percentage;

  const currentTime = document.getElementById("currentTime");
  currentTime.textContent = formatTime(audioPlayer.currentTime, audioPlayer.duration);
}

function formatTime(elapsed, duration) {
  if (isNaN(elapsed) || isNaN(duration)) {
    return "0:00 / 0:00";
  }

  const elapsedMinutes = Math.floor(elapsed / 60);
  const elapsedSeconds = Math.floor(elapsed % 60);
  const durationMinutes = Math.floor(duration / 60);
  const durationSeconds = Math.floor(duration % 60);

  const elapsedSecondsString = elapsedSeconds.toString().padStart(2, "0");
  const durationSecondsString = durationSeconds.toString().padStart(2, "0");

  return `${elapsedMinutes}:${elapsedSecondsString} / ${durationMinutes}:${durationSecondsString}`;
}

// Load the next track when the current track ends
audioPlayer.onended = function() {
  nextTrack();
}

// Seek Function to Jump to Specific Time
function seekAudio() {
  const seekTime = (seekBar.value / 100) * audioPlayer.duration;
  audioPlayer.currentTime = seekTime;
}

// Toggle tag selection and apply filter
function toggleTag(tag) {
  const tagElement = document.querySelector(`.tag[data-tag="${tag}"]`);
  if (selectedTags.has(tag)) {
    tagElement.classList.remove("selected");
    selectedTags.delete(tag);
  } else {
    tagElement.classList.add("selected");
    selectedTags.add(tag);
  }
  saveSelectedTagsToStorage(); // Save selected tags to local storage
  createPlaylist();
}

// Apply tag filter to create the filtered playlist
function createPlaylist() {
  // If no tags are selected, show all tracks
  if (selectedTags.size === 0) {
    filteredPlaylist = allTracks;
  } else {
    // Filter tracks that have at least one of the selected tags
    filteredPlaylist = allTracks.filter(track =>
      track.tags.some(tag => selectedTags.has(tag))
    );
  }

  // Display the playlist
  const playlistContainer = document.getElementById("tracklist");
  playlistContainer.innerHTML = "";
  filteredPlaylist.forEach((track, index) => {
    const trackElement = document.createElement("li");
    trackElement.classList.add("track");
    trackElement.setAttribute("data-index", index);
    trackElement.textContent = track.title;
    trackElement.onclick = () => {
      currentTrackIndex = index;
      loadTrack(currentTrackIndex);
      playAudio();
    };
    playlistContainer.appendChild(trackElement);
  });

  // Reset to first track of filtered playlist if available
  currentTrackIndex = 0;
  if (filteredPlaylist.length > 0) {
    loadTrack(currentTrackIndex);
  }
}

// Save the selected tags to local storage
function saveSelectedTagsToStorage() {
  // Convert Set to an array to store in local storage
  settings.selectedTags = Array.from(selectedTags);
  saveSettings();
}

// Load selected tags from local storage
function updateTagsDisplay() {
  const tags = document.querySelectorAll(".tag");
  tags.forEach(tag => {
    if (selectedTags.has(tag.getAttribute("data-tag"))) {
      tag.classList.add("selected");
    }
  });
}

function toggleShuffle() {
  shuffleEnabled = !shuffleEnabled;
  saveSettings();

  updateShuffleButton();
}

function updateShuffleButton() {
  const shuffleButtons = document.querySelectorAll(".shuffle");
  if (shuffleEnabled) {
    shuffleButtons.forEach(button => button.classList.add("selected"));
  } else {
    shuffleButtons.forEach(button => button.classList.remove("selected"));
  }
}

// Next Track
function nextTrack() {
  currentTrackIndex = getNextTrackIndex();

  loadTrack(currentTrackIndex);
  playAudio();
}

function getNextTrackIndex() {
  if (shuffleEnabled) {
    // Exclude the current track from the shuffle, if there are more than one tracks
    let shufflePlaylist = filteredPlaylist.slice();
    if (shufflePlaylist.length > 1) {
      shufflePlaylist.splice(currentTrackIndex, 1);
    }

    const randomIndex = Math.floor(Math.random() * shufflePlaylist.length);
    return filteredPlaylist.indexOf(shufflePlaylist[randomIndex]);
  }

  if (currentTrackIndex < filteredPlaylist.length - 1) {
    return currentTrackIndex + 1;
  } else {
    return 0;
  }
}

// Previous Track
function previousTrack() {
  if (currentTrackIndex > 0) {
    currentTrackIndex--;
  } else {
    currentTrackIndex = filteredPlaylist.length - 1;
  }

  loadTrack(currentTrackIndex);
  playAudio();
}

function setVolume() {
  const value = document.getElementById("volume").value;
  audioPlayer.volume = value / 100.0;
  settings.volume = value;
  saveSettings();
}

window.onload = initialise;
