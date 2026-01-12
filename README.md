# Neptune Todo Editor

Neptune is a visual, notebook-style editor for `.todo` files.
It treats a todo list not as a form or an app dashboard, but as a self-contained file that you interact with visually—similar in spirit to how Jupyter Notebook works.

Neptune is designed to be minimal, file-centric, and gesture-driven, while still allowing optional typing when needed.

## Installation

```bash
npm install -g neptune-todo
```

## Usage (GUI)

Open a `.todo` file in the Neptune GUI using the CLI:

```bash
neptune mytasks.todo
```

### Windows

Use an absolute path if needed:

```bash
neptune "C:\\Users\\you\\Documents\\mytasks.todo"
```

### macOS / Linux

```bash
neptune ~/Documents/mytasks.todo
```

## Notes about double-click to open

- **VS Code** will open `.todo` files as JSON/text by default. Use the `neptune` command to open the GUI.
- **Double-click to open** a `.todo` from Finder/Explorer requires the desktop app to be packaged/installed so the OS can associate the `.todo` extension with Neptune.