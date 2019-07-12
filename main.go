package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gobuffalo/packr"
	"gopkg.in/alecthomas/kingpin.v2"
)

type ResourceItem struct {
	Path      string `json:"path"`
	Size      int64  `json:"size"`
	Directory bool   `json:"directory"`
}

type ResourceList struct {
	Project string         `json:"project"`
	Root    string         `json:"root"`
	Version string         `json:"version"`
	Items   []ResourceItem `json:"items"`
}

var (
	VERSION = "1.0.0"
	ROOT    = kingpin.Flag("dir", "Root directory of code to be audited.").Default("./").Short('d').String()
	HOST    = kingpin.Flag("host", "Host information.").Default("0.0.0.0:3000").Short('h').String()
	PROJECT = kingpin.Flag("project", "Project slug name.").Default("default").Short('p').String()
)

func main() {

	kingpin.Version(VERSION)
	kingpin.Parse()

	fmt.Println("Source code directory: " + *ROOT)
	fmt.Println("Default host information: " + *HOST)
	fmt.Println("Project name: " + *PROJECT)

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
		resources.Root = *ROOT
		resources.Project = *PROJECT
		resources.Version = VERSION

		err := filepath.Walk(*ROOT,
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

	fmt.Println("\nListening on port http://" + *HOST)
	http.ListenAndServe(*HOST, nil)

}
