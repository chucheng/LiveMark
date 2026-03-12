use std::fs;

#[tauri::command]
pub fn save_image(filename: String, data: Vec<u8>) -> Result<String, String> {
    // Save to a temp directory if no specific dir is given
    let dir = std::env::temp_dir().join("livemark-images");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create image directory: {e}"))?;

    let target = dir.join(&filename);

    // Deduplicate filenames
    let target = if target.exists() {
        let stem = target
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let ext = target
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        let mut counter = 1u32;
        loop {
            let candidate = dir.join(format!("{stem}-{counter}{ext}"));
            if !candidate.exists() {
                break candidate;
            }
            counter += 1;
        }
    } else {
        target
    };

    fs::write(&target, &data).map_err(|e| format!("Failed to write image: {e}"))?;

    Ok(target.to_string_lossy().to_string())
}
