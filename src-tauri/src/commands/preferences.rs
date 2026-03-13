use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

fn prefs_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config dir: {e}"))?;
    Ok(dir.join("preferences.json"))
}

#[tauri::command]
pub fn read_preferences(app: tauri::AppHandle) -> Result<String, String> {
    let path = prefs_path(&app)?;
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| format!("Failed to read preferences: {e}"))
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub fn write_preferences(app: tauri::AppHandle, json: String) -> Result<(), String> {
    // Validate JSON before writing to prevent corrupted preferences
    let _: serde_json::Value =
        serde_json::from_str(&json).map_err(|e| format!("Invalid JSON: {e}"))?;

    let path = prefs_path(&app)?;
    let tmp_path = path.with_extension("tmp");

    let mut file =
        fs::File::create(&tmp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;
    file.write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    file.sync_all()
        .map_err(|e| format!("Failed to sync temp file: {e}"))?;
    drop(file);

    fs::rename(&tmp_path, &path).map_err(|e| format!("Failed to rename temp file: {e}"))?;

    Ok(())
}
