# Neptune Todo Editor

A visual, notebook-style editor for `.todo` files.

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

## Development

```bash
npm install
npm run dev
```

## Build / Package

```bash
npm run dist
```

## File Format

The `.todo` file uses JSON internally but you interact with the visual interface:

```json
{
  "tasks": [
    {"id": 123, "text": "Active task", "created": "2024-01-01T00:00:00Z"}
  ],
  "completed": [
    {"id": 124, "text": "Done task", "completed": "2024-01-01T01:00:00Z"}
  ],
  "skipped": [
    {"id": 125, "text": "Skipped task", "skipped": "2024-01-01T02:00:00Z"}
  ]
}
```