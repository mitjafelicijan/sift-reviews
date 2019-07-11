package main

// https://github.com/gobuffalo/packr

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gobuffalo/packr"
)

var (
	ROOT    = "./"
	PROJECT = "default"
	HOST    = "0.0.0.0:3000"
)

type ResourceItem struct {
	Path      string `json:"path"`
	Size      int64  `json:"size"`
	Directory bool   `json:"directory"`
}

type ResourceList struct {
	Project string         `json:"project"`
	Root    string         `json:"root"`
	Items   []ResourceItem `json:"items"`
}

func main() {

	if len(os.Args) == 2 {
		PROJECT = os.Args[1]
	}

	if len(os.Args) > 2 {
		PROJECT = os.Args[1]
		ROOT = os.Args[2]
	}

	box := packr.NewBox("./assets")

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		content, err := box.FindString("application.html")
		if err != nil {
			log.Fatal(err)
		}

		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(content))
	})

	http.HandleFunc("/assets/application.js", func(w http.ResponseWriter, r *http.Request) {
		content, err := box.FindString("application.js")
		if err != nil {
			log.Fatal(err)
		}

		w.Header().Set("Content-Type", "application/javascript")
		w.Write([]byte(content))
	})

	http.HandleFunc("/assets/application.css", func(w http.ResponseWriter, r *http.Request) {
		content, err := box.FindString("application.css")
		if err != nil {
			log.Fatal(err)
		}

		w.Header().Set("Content-Type", "text/css")
		w.Write([]byte(content))
	})

	http.HandleFunc("/filelist", func(w http.ResponseWriter, r *http.Request) {
		resources := ResourceList{}
		resources.Root = ROOT
		resources.Project = PROJECT

		err := filepath.Walk(ROOT,
			func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return err
				}

				if info.IsDir() && info.Name() == ".git" {
					return filepath.SkipDir
				}

				if info.IsDir() && info.Name() == "node_modules" {
					return filepath.SkipDir
				}

				resources.Items = append(resources.Items, ResourceItem{
					Path:      path,
					Size:      info.Size(),
					Directory: info.IsDir(),
				})
				return nil
			})
		if err != nil {
			log.Println(err)
		}

		payload, err := json.Marshal(resources)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(payload))
	})

	http.HandleFunc("/source", func(w http.ResponseWriter, r *http.Request) {
		file, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request body", http.StatusInternalServerError)
		}

		content, err := ioutil.ReadFile(string(file))
		if err != nil {
			http.Error(w, "Not a file", http.StatusBadRequest)
		}

		w.Header().Set("Content-Type", "text/plain")
		w.Write(content)
	})

	fmt.Println("Listening on port http://" + HOST)
	http.ListenAndServe(HOST, nil)

}
