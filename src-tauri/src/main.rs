// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::file::{get_file_mtime, read_file, write_file};
use commands::filetree::{list_directory, watch_directory, unwatch_directory, WatcherState};
use commands::image::save_image;
use commands::preferences::{read_preferences, write_preferences};
use std::sync::Mutex;
use tauri::Manager;

pub struct InitialFilePath(pub Option<String>);

#[tauri::command]
fn get_initial_file(state: tauri::State<InitialFilePath>) -> Option<String> {
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Initialize watcher state
            app.manage(WatcherState(Mutex::new(None)));

            // Pass CLI file arg to frontend via managed state
            let args: Vec<String> = std::env::args().collect();
            let file_arg = args.iter().skip(1).find(|a| {
                !a.starts_with('-')
                    && (a.ends_with(".md")
                        || a.ends_with(".markdown")
                        || a.ends_with(".txt"))
            });

            if let Some(path) = file_arg {
                let abs_path = std::fs::canonicalize(path)
                    .unwrap_or_else(|_| std::path::PathBuf::from(path));
                app.manage(InitialFilePath(Some(
                    abs_path.to_string_lossy().to_string(),
                )));
            } else {
                app.manage(InitialFilePath(None));
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            get_file_mtime,
            get_initial_file,
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
