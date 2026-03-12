// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::file::{read_file, write_file};
use commands::image::save_image;
use tauri::Manager;

pub struct InitialFilePath(pub Option<String>);

#[tauri::command]
fn get_initial_file(state: tauri::State<InitialFilePath>) -> Option<String> {
    state.0.clone()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
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
            get_initial_file,
            save_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running LiveMark");
}
