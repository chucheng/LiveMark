// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::file::{get_file_mtime, is_file_readonly, read_file, read_file_binary, write_binary_file, write_file, write_temp_html};
use commands::filetree::{list_directory, unwatch_directory, watch_directory, WatcherState};
use commands::image::save_image;
use commands::preferences::{read_preferences, write_preferences};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub struct PendingFiles(pub Mutex<Vec<String>>);

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

            let args: Vec<String> = std::env::args().collect();
            let file_args = extract_file_args(&args);
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
            read_preferences,
            write_preferences,
            list_directory,
            watch_directory,
            unwatch_directory
        ])
        .build(tauri::generate_context!())
        .expect("error while running LiveMark");

    app.run(|app_handle, event| {
        // macOS: double-click / "Open With" sends file URLs via Opened event.
        // Store in PendingFiles for cold start AND emit for already-running frontend.
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
                if let Some(pending) = app_handle.try_state::<PendingFiles>() {
                    pending.0.lock().unwrap().extend(files.clone());
                }
                let _ = app_handle.emit("open-files", files);
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
