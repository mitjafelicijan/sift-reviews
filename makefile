# brew install fswatch

dev:
	fswatch -0 . | xargs -0 -I {} go run *.go

build:
	mkdir -p release
	packr clean
	- rm release/sift-*
	
	# linux
	GOOS=linux GOARCH=amd64 packr build
	mv sift release/sift-linux-amd64
	
	# darwin
	GOOS=darwin GOARCH=amd64 packr build
	mv sift release/sift-darwin-amd64

install: build
	mv release/sift ~/Dropbox/bin
