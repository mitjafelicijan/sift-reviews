package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

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
	ASSETS  = "assets"
	ROOT    = kingpin.Flag("dir", "Root directory of code to be audited.").Default("./").Short('d').String()
	HOST    = kingpin.Flag("host", "Web server information.").Default("0.0.0.0:3000").Short('h').String()
	PROJECT = kingpin.Flag("project", "Project slug name that must be unique.").Default("default").Short('p').String()
	EXCLUDE = kingpin.Flag("exclude", "Exclude directories or files separated by comma.").Default(".git,node_modules").Short('e').String()
	BROWSER = kingpin.Flag("browser", "Open browser after server starts.").Short('b').Bool()
)

func openbrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		log.Fatal(err)
	}
}

func main() {

	kingpin.Version(VERSION)
	kingpin.Parse()

	fmt.Printf("Source code directory: %s\n", *ROOT)
	fmt.Printf("Default host information: %s\n", *HOST)
	fmt.Printf("Project name: %s\n", *PROJECT)

	box := packr.NewBox("./" + ASSETS)
	http.Handle(fmt.Sprintf("/%s/", ASSETS), http.StripPrefix(fmt.Sprintf("/%s/", ASSETS), http.FileServer(box)))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		content, err := box.FindString("application.html")
		if err != nil {
			log.Fatal(err)
		}

		w.Header().Set("Content-Type", "text/html")
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

				// ignore based on argv flag
				excludedItems := strings.Split(*EXCLUDE, ",")
				for _, item := range excludedItems {
					if info.IsDir() && info.Name() == item {
						return filepath.SkipDir
					}
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

	if *BROWSER {
		openbrowser(fmt.Sprintf("http://%s", *HOST))
	}

	http.ListenAndServe(*HOST, nil)

}
