const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const seekBar = document.getElementById('seekBar');
let allTracks = [];         // Full list of all tracks
let allImages = [];         // Full list of all images
let filteredPlaylist = [];  // Filtered list based on selected tags
let currentTrackIndex = 0;
let selectedTags = new Set(); // Set of tags currently selected

async function initialise() {
  await fetchPlaylist();
  await fetchImages();

  setRandomImage();

  const pauseButton = document.getElementById("pause-button");

  pauseButton.classList.add("selected");
}

// Fetch the playlist from the backend
async function fetchPlaylist() {
  const response = await fetch("playlist");
  allTracks = await response.json();
  setupTags();
  loadSelectedTagsFromStorage(); // Load stored tags when the playlist is fetched
  applyTagFilter();              // Initialize filtered playlist based on loaded tags
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
    const track = filteredPlaylist[index];

    const selectedTrack = playlist.querySelector(`li[data-index="${index}"]`);
    if (selectedTrack) {
      selectedTrack.classList.add("selected");
    }

    const filename = track.file;
    audioSource.src = "stream?file=" + filename;

    audioPlayer.load(); // Load the new track
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
audioPlayer.ontimeupdate = function() {
  const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100.0;
  seekBar.value = percentage;
};

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
  applyTagFilter();
}

// Apply tag filter to create the filtered playlist
function applyTagFilter() {
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
  localStorage.setItem("selectedTags", JSON.stringify(Array.from(selectedTags)));
}

// Load selected tags from local storage
function loadSelectedTagsFromStorage() {
  const storedTags = localStorage.getItem("selectedTags");
  if (storedTags) {
    // Parse stored tags and add them to the selectedTags Set
    JSON.parse(storedTags).forEach(tag => selectedTags.add(tag));
  }

  // Update the tag selection
  const tags = document.querySelectorAll(".tag");
  tags.forEach(tag => {
    if (selectedTags.has(tag.getAttribute("data-tag"))) {
      tag.classList.add("selected");
    }
  });
}

// Next Track
function nextTrack() {
  if (currentTrackIndex < filteredPlaylist.length - 1) {
    currentTrackIndex++;
  } else {
    currentTrackIndex = 0;
  }

  loadTrack(currentTrackIndex);
  playAudio();
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
}

window.onload = initialise;
