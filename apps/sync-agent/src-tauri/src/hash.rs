use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

/// Calculate SHA256 hash of a file
pub fn calculate_file_hash(path: &Path) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut sha256 = Sha256::new();
    let mut buffer = [0; 1024];

    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        sha256.update(&buffer[..count]);
    }

    Ok(hex::encode(sha256.finalize()))
}
