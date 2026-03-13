use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager};

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: String, // "file" or "directory"
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    let read_dir = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {e}"))?;

    for entry in read_dir.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/directories
        if name.starts_with('.') {
            continue;
        }
        // Skip node_modules, target, dist
        if matches!(name.as_str(), "node_modules" | "target" | "dist" | ".git") {
            continue;
        }

        let path_str = entry.path().to_string_lossy().to_string();
        let entry_type = if entry.path().is_dir() {
            "directory"
        } else {
            "file"
        };

        entries.push(FileEntry {
            name,
            path: path_str,
            entry_type: entry_type.to_string(),
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        let dir_cmp = (a.entry_type == "file").cmp(&(b.entry_type == "file"));
        dir_cmp.then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

pub struct WatcherState(pub Mutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>);

#[tauri::command]
pub fn watch_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {e}"))?;

    let app_handle = app.clone();
    let mut debouncer = new_debouncer(Duration::from_millis(500), move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
        if let Ok(events) = res {
            let has_changes = events.iter().any(|e| matches!(e.kind, DebouncedEventKind::Any));
            if has_changes {
                let _ = app_handle.emit("fs-change", ());
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    debouncer
        .watcher()
        .watch(Path::new(&path), notify::RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {e}"))?;

    *guard = Some(debouncer);
    Ok(())
}

#[tauri::command]
pub fn unwatch_directory(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {e}"))?;
    *guard = None;
    Ok(())
}
