# Sift - Tool for auditing code

1. [Installation](#Installation)
   1. [Using Binary version](#Using-Binary-version)
   2. [Compiling from source](#Compiling-from-source)
   3. [Move to system path](#Move-to-system-path)
2. [Usage](#Usage)

## Installation

### Using Binary version

There are pre-compiled versions for 64bit GNU/Linux and MacOS systems.

```bash
wget -O sift.tar.gz https://path-to-tarball
tar xvzf sift.tar.gz
```

### Compiling from source

If you want to compile from source you need to have Golang compiler installed. After installing Golang you can either use GNU Make or using Packr.

```bash
git clone git@github.com:mitjafelicijan/sift.git
cd sift

go get -d .
make build
```

After compilation is done binary file is then located under `release` folder.

### Move to system path

To make Sift available across the system move binary somewhere under system path. You can check your current system path `echo $PATH`.

## Usage

```
sift --help

Flags:
      --help                 Show context-sensitive help (also try --help-long and --help-man).
  -d, --dir="./"             Root directory of code to be audited.
  -h, --host="0.0.0.0:3000"  Web server information.
  -p, --project="default"    Project slug name that must be unique.
  -e, --exclude=".git,node_modules"  
                             Exclude directories or files separated by comma.
  -b, --browser              Open browser after server starts.
      --version              Show application version.
```

If you move to a folder upon which you want to create audit and start `sift` this will start web server on port 3000 where you will be able to make your code audit / review.
