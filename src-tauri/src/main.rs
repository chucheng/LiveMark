// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::file::{get_file_mtime, read_file, write_file};
use commands::filetree::{list_directory, unwatch_directory, watch_directory, WatcherState};
use commands::image::save_image;
use commands::preferences::{read_preferences, write_preferences};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub struct InitialFiles(pub Vec<String>);

#[tauri::command]
fn get_initial_files(state: tauri::State<InitialFiles>) -> Vec<String> {
    state.0.clone()
}

#[tauri::command]
fn get_home_dir() -> Option<String> {
    #[cfg(unix)]
    {
        std::env::var("HOME").ok()
    }
    #[cfg(windows)]
    {
        std::env::var("USERPROFILE").ok()
    }
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
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Single-instance: when a 2nd instance is launched (e.g. double-clicking
        // a .md file while app is running), forward file args to the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let files = extract_file_args(&args);
            if !files.is_empty() {
                // Emit event to frontend so it can open files in new tabs
                let _ = app.emit("open-files", files);
            }
            // Focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // Initialize watcher state
            app.manage(WatcherState(Mutex::new(None)));

            // Pass CLI file args to frontend via managed state
            let args: Vec<String> = std::env::args().collect();
            let file_args = extract_file_args(&args);
            app.manage(InitialFiles(file_args));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            get_file_mtime,
            get_initial_files,
            get_home_dir,
            save_image,
            read_preferences,
            write_preferences,
            list_directory,
            watch_directory,
            unwatch_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running LiveMark");
}
