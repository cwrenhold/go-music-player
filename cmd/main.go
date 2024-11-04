package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"text/template"
)

type Config struct {
	Tracks []Track `json:"tracks"`
	Images []Image `json:"images"`
}

// Track represents a track in the playlist with tags
type Track struct {
	Title string   `json:"title"`
	File  string   `json:"file"`
	Tags  []string `json:"tags"`
}

type Image struct {
	Title string `json:"title"`
	File  string `json:"file"`
}

var config Config

func LoadConfig() error {
	tracks := filepath.Join("..", "config.json")

	file, err := os.ReadFile(tracks)
	if err != nil {
		return err
	}

	err = json.Unmarshal(file, &config)
	return err
}

// PlaylistHandler serves a list of available tracks with tags
func PlaylistHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config.Tracks)
}

func ImagesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config.Images)
}

// ServeAudio streams audio files to the client and supports range requests for scrubbing
func ServeAudio(w http.ResponseWriter, r *http.Request) {
	// Get the base path for music, which is in the music directory of the project directory
	baseFilePath := filepath.Join("..", "music")
	fileName := r.URL.Query().Get("file")

	log.Println("Requesting file: ", fileName)

	// Undo URL encoding to get the file name
	fileName, err := url.QueryUnescape(fileName)
	if err != nil {
		http.Error(w, "Invalid file name", http.StatusBadRequest)
		return
	}

	log.Println("Decoded file name: ", fileName)

	filePath := filepath.Join(baseFilePath, fileName)
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	log.Println("Serving file: ", filePath)

	// Get file info to serve content
	stat, err := file.Stat()
	if err != nil {
		http.Error(w, "Could not get file info", http.StatusInternalServerError)
		return
	}

	log.Println("File size: ", stat.Size())

	// Serve the content and allow range requests
	http.ServeContent(w, r, filepath.Base(filePath), stat.ModTime(), file)
}

func ServeImage(w http.ResponseWriter, r *http.Request) {
	// Get the base path for images, which is in the images directory of the project directory
	baseFilePath := filepath.Join("..", "images")
	fileName := r.URL.Query().Get("file")

	// Undo URL encoding to get the file name
	fileName, err := url.QueryUnescape(fileName)
	if err != nil {
		http.Error(w, "Invalid file name", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(baseFilePath, fileName)
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	// Get file info to serve content
	stat, err := file.Stat()
	if err != nil {
		http.Error(w, "Could not get file info", http.StatusInternalServerError)
		return
	}

	// Serve the content and allow range requests
	http.ServeContent(w, r, filepath.Base(filePath), stat.ModTime(), file)
}

func HomepageHandler(w http.ResponseWriter, r *http.Request) {
	baseAssetsPath := filepath.Join("..", "assets")
	t, err := template.ParseFiles(filepath.Join(baseAssetsPath, "index.html"))
	if err != nil {
		http.Error(w, "Could not load template", http.StatusInternalServerError)
		return
	}

	err = t.Execute(w, nil)
	if err != nil {
		http.Error(w, "Could not render template", http.StatusInternalServerError)
		return
	}
}

func JavaScriptHandler(w http.ResponseWriter, r *http.Request) {
	baseAssetsPath := filepath.Join("..", "assets")
	http.ServeFile(w, r, filepath.Join(baseAssetsPath, "script.js"))
}

func CssHandler(w http.ResponseWriter, r *http.Request) {
	baseAssetsPath := filepath.Join("..", "assets")
	http.ServeFile(w, r, filepath.Join(baseAssetsPath, "style.css"))
}

func main() {
	err := LoadConfig()

	if err != nil {
		log.Fatalf("Could not load config: %v", err)
	}

	http.HandleFunc("/playlist", PlaylistHandler)
	http.HandleFunc("/images", ImagesHandler)
	http.HandleFunc("/stream", ServeAudio) // Assuming ServeAudio is implemented to stream files
	http.HandleFunc("/image", ServeImage)
	http.HandleFunc("/", HomepageHandler)
	http.HandleFunc("/script.js", JavaScriptHandler)
	http.HandleFunc("/style.css", CssHandler)

	log.Println("Serving on :3000...")
	log.Fatal(http.ListenAndServe(":3000", nil))
}
