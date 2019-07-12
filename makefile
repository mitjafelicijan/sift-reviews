# brew install fswatch

dev:
	fswatch -0 . | xargs -0 -I {} go run *.go

build:
	GOOS=darwin GOARCH=amd64 packr build
	mv sift ~/Dropbox/bin
