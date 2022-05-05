# sec-10-k-scraper
This app allows users to easily scrape the contents from specific sections of SEC 10-K filings and apply named entity recognition (NER) to the results. The results are output to `.xlsx`. Written in Python and NodeJS/Electron, it builds to an installer that allows users to use the app on all major operating systems without any dependencies.
## Quickstart - Single-Command Build
To install all dependencies for the entire project, run `npm install` in the *root directory*.
To build the entire project, run `npm run build:full` either in the root directory or the `/ui/` subdirectory.
This will:
  - build the Python backend
  - move the resulting executable into `/ui/extraResources/` (see the section "Frontend")
  - build the Electron frontend
  The resulting product can be found in `/frontend/dist/`.
**This only builds the app for the OS (Windows / Mac / Linux) that your computer uses!** 
To build for all three OSes, you will need to set up this repo on a Windows machine, a Mac machine, and a Linux machine!
## Project Structure
This repository is divided into two main directories: `backend` and `ui`.
### Backend
This is the `poetry` project containing the Python backend to the app.


#### Structure
`backend_server.py` is the entry point. In it, we configure the `zerorpc` server we use to communicate with the frontend.

##### Business Logic
Business logic is organized by functionality.
###### backend/misc
Contains helper code for rate-limiting requests to the SEC API and for serializing complex return types with msgpack (see developer manual).
###### backend/writer
Contains code for writing processed data to Excel.
###### backend/api
Contains code to communicate with the SEC API, to search for and fetch documents.
###### backend/parse
Contains code for parsing 10-K filings, extracting key sections, and applying Named Entity Recognition to the results.
##### Miscellenia 
###### backend/temp
Unimportant. A temporary directory created when downloading the NER model.
##### backend/resources
This directory contains the extracted version of the NER model downloaded during the install process. You don't need to touch this, but make sure its contents don't get committed; they vary slightly across platforms.
#### Tooling
We have a number of tools to help us write good code. These include:
- [`isort`](https://pycqa.github.io/isort/) to optimize import ordering
- [`mypy`](http://mypy-lang.org/), a static type-checker to force accurate type use
- [`flake8`](https://flake8.pycqa.org/en/latest/), a linter
- [`black`](https://github.com/psf/black), a hassle-free code formatter
- [`docformatter`](https://pypi.org/project/docformatter/), to clean up docstrings (enforce triple-quoting, the formatting of summary vs. detailed description, etc.) in compliance with PEP 257

To run these tools, as well as unit tests, run `poetry run pypyr pypyr/quality-check` in the `backend` directory.

We use [`pyinstaller`](https://pyinstaller.readthedocs.io/en/stable/) to build our code to a platform-specific executable, which is then bundled into the Electron app.

These tools are all called automatically:
- before each build
- before commits
Neither operation will succeed if any of the tools or unit tests fail.

#### To Install Dependencies:
In the `backend` directory, run `poetry install`, to install python dependencies, and 
`poetry run pypyr pypyr/download-ner-model` to properly download and bundle the backend's Named Entity Recognition model for your platform.
Both of these operations are done automatically when you run `npm install` in the root directory.
#### To Run Python-Related Code:
`poetry` uses a virtual environment to isolate a python version and set of dependencies from the rest of your system. To run commands, prefix them with `poetry run` to make sure you're using the appropriate installations of everything for this project. 
For example, to manually perform type-checking, which would normally be `mypy .`, run
`poetry run mypy .`
To launch the backend, which would normally by `python backend_server.py`, run
`poetry run python backend_server.py`.

#### To Build The Backend:
`poetry run pyinstaller backend_server.spec`
The resulting executable and supporting files will be in `backend/dist`.
You generally don't want or need to do this yourself; to actually use the backend, it needs to be bundled with the frontend.
Use `npm run build:full` to build the whole app, resulting in a new build of the full app in `ui/dist` that will use the new backend build.


### UI
This is the `npm` package containing the code to our frontend, an Electron app.
Our code is specifically in the `ui/packages` subdirectory. To build to an executable, it is bundled by `vite` (similar to webpack) and rebuilt and packaged by `electron-builder`.
#### Structure
See the [electron-builder docs](https://www.electron.build/) and the README within `ui` for more details.
##### ui/build/
Intermediate build products used by tooling. Do not touch.
##### ui/buildResources/
For information like the app installer's icon. Not important.
##### ui/dist/
Where build products go. `npm run build:full` will produce a platform-specific *unpacked directory* inside `ui/dist/`, e.g. `ui/dist/linux-unpacked`, containing the Electron executable and associated files. The final distributable will be an installer; for development and debugging, just run the executable, `fractracker-sec-ui{.exe/.app}`, in the unpacked folder.

##### ui/extraResources/
the electron-builder `extraResources` folder. This is where we place the Python `backend` executable to be included in the Electron app.

##### ui/packages/
This is where our code lies. It's divided into three directories:

- `main`, for the code of the main process,
- `preload`, for preload scripts, most importantly `exposeInRealWorld` for context bridging
- `renderer`, for the actual renderer process.
To understand the distinction between these three kinds of code, check out the documentation for [electron's process model](https://www.electronjs.org/docs/latest/tutorial/process-model) and [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation).

Each directory is itself composed of:
- `dist`, which is for the build process and shouldn't be touched
- `src`, where source code goes
- `tests`, for tests
##### ui/tests/
Unit testing will be done using [vitest](https://vitest.dev/), here.

##### ui/types/
Metadata for tooling. Don't worry about this.

#### Tooling
- [`eslint`](https://eslint.org/) for linting and light autoformatting
- [`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html) for static type checking and, of course, the build process
- [`vite`](https://vitejs.dev/) for the build process
- [`electron-builder`](https://www.electron.build/) for the build process
- [`nano-staged`](https://github.com/usmanyunusov/nano-staged#readme) for cross-platform precommit hooks

Before committing, `nano-staged` runs `eslint` on every applicable file in `packages` that is staged for commit, fixing minor errors like missing semicolons automatically. `tsc` checks that types are valid and compatible across the whole project. If either utility finds nay issues it can't resolve automatically, it's reported in the command line and the commit is stopped.
#### Building
First, build the Python executable and place it in `buildResources`.
Then run `npm run build:full`. The output will be in `ui/dist/{platform}-unpacked` (see above).
#### Remote Function Calls
The UI communicates with the Python backend using `zerorpc`. More details to come in the future, but the gist is:

The Python backend exposes any methods (static or otherwise) of the object passed to the `zerorpc.Server()` constructor in `backend_server.py`. We call these methods in the Electron renderer process by calling
`window.requestRPC.procedure(funcName:string, args:any[])`. Behind the scenes, `zerorpc` uses `messagepack`; the details of the encoding/decoding process aren't clearly documented anywhere, so we recommend sticking to passing and returning ints, strings and JSON objects for the time being. (Further experimentation to be done)