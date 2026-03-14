use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::UNIX_EPOCH;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);
    let tmp_path = target.with_extension("tmp");

    // Write to temporary file first
    let mut file = fs::File::create(&tmp_path)
        .map_err(|e| format!("Failed to create temp file: {e}"))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    file.sync_all()
        .map_err(|e| format!("Failed to sync temp file: {e}"))?;
    drop(file);

    // Atomic rename
    fs::rename(&tmp_path, target)
        .map_err(|e| format!("Failed to rename temp file: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn get_file_mtime(path: String) -> Result<f64, String> {
    let meta = fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {e}"))?;
    let modified = meta
        .modified()
        .map_err(|e| format!("Failed to get mtime: {e}"))?;
    let millis = modified
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Invalid mtime: {e}"))?
        .as_millis() as f64;
    Ok(millis)
}
