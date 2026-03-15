// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::file::{get_file_mtime, is_file_readonly, read_file, read_file_binary, write_binary_file, write_file, write_temp_html};
use commands::filetree::{list_directory, unwatch_directory, watch_directory, WatcherState};
use commands::image::{copy_image, save_image};
use commands::preferences::{read_preferences, write_preferences};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub struct PendingFiles(pub Mutex<Vec<String>>);

/// Global buffer for files received via RunEvent::Opened BEFORE setup() runs.
/// On macOS, Finder "Open With" delivers the file URL via application:openURLs:
/// which fires as RunEvent::Opened — but this can arrive before Tauri's setup()
/// has created the PendingFiles managed state. This global catches those early files.
static EARLY_FILES: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[tauri::command]
fn get_initial_files(state: tauri::State<PendingFiles>) -> Vec<String> {
    let mut files = state.0.lock().unwrap();
    std::mem::take(&mut *files)
}

/// Extract file paths from CLI args (skip flags, match supported extensions).
fn extract_file_args(args: &[String]) -> Vec<String> {
    args.iter()
        .skip(1)
        .filter(|a| {
            !a.starts_with('-')
                && (a.ends_with(".md")
                    || a.ends_with(".markdown")
                    || a.ends_with(".txt"))
        })
        .map(|path| {
            std::fs::canonicalize(path)
                .unwrap_or_else(|_| std::path::PathBuf::from(path))
                .to_string_lossy()
                .to_string()
        })
        .collect()
}


fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        // Single-instance: when a 2nd instance is launched (e.g. double-clicking
        // a .md file while app is running), forward file args to the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let files = extract_file_args(&args);
            if !files.is_empty() {
                let _ = app.emit("open-files", files);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            app.manage(WatcherState(Mutex::new(None)));

            // Collect CLI args + any early files from RunEvent::Opened
            let args: Vec<String> = std::env::args().collect();
            let mut file_args = extract_file_args(&args);

            // Drain the global early-files buffer (Opened events that arrived before setup)
            let early = std::mem::take(&mut *EARLY_FILES.lock().unwrap());
            file_args.extend(early);

            app.manage(PendingFiles(Mutex::new(file_args)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            read_file_binary,
            write_file,
            write_binary_file,
            write_temp_html,
            get_file_mtime,
            is_file_readonly,
            get_initial_files,
            save_image,
            copy_image,
            read_preferences,
            write_preferences,
            list_directory,
            watch_directory,
            unwatch_directory
        ])
        .build(tauri::generate_context!())
        .expect("error while running LiveMark");

    app.run(|app_handle, event| {
        // macOS: Finder "Open With" / double-click delivers file URLs here.
        // This event can arrive BEFORE setup() — use EARLY_FILES as fallback.
        if let tauri::RunEvent::Opened { urls } = &event {
            let files: Vec<String> = urls
                .iter()
                .filter_map(|u| {
                    if u.scheme() == "file" {
                        u.to_file_path().ok().map(|p| p.to_string_lossy().to_string())
                    } else {
                        None
                    }
                })
                .collect();
            if !files.is_empty() {
                // Try managed state first (available after setup)
                if let Some(pending) = app_handle.try_state::<PendingFiles>() {
                    pending.0.lock().unwrap().extend(files.clone());
                } else {
                    // setup() hasn't run yet — buffer globally
                    EARLY_FILES.lock().unwrap().extend(files.clone());
                }
                // Emit to frontend if webview is ready
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.emit("open-files", files);
                }
            }
        }

        // On macOS, quit when the main window is closed (instead of staying in dock)
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::WindowEvent {
            event: tauri::WindowEvent::Destroyed,
            ..
        } = &event
        {
            app_handle.exit(0);
        }
    });
}
