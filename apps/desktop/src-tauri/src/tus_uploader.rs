//! TUS Uploader Module for Aura Desktop
//!
//! Implements the TUS resumable upload protocol.
//! Reference: https://tus.io/protocols/resumable-upload
//!
//! Core TUS operations:
//! 1. POST /upload - Create upload with Upload-Length header
//! 2. HEAD /upload/:id - Get current offset
//! 3. PATCH /upload/:id - Resume upload from offset

use reqwest::{Client, header::{HeaderMap, HeaderValue, CONTENT_TYPE, CONTENT_LENGTH}};
use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};

/// Default chunk size: 5 MB
const DEFAULT_CHUNK_SIZE: usize = 5 * 1024 * 1024;

/// TUS upload state for resumability
#[derive(Debug, Clone)]
pub struct TusUploadState {
    pub upload_url: String,
    pub offset: u64,
    pub total_size: u64,
    pub complete: bool,
}

/// TUS uploader for resumable file uploads
pub struct TusUploader {
    client: Client,
    endpoint: String,
    auth_token: String,
    chunk_size: usize,
}

impl TusUploader {
    pub fn new(endpoint: String, auth_token: String) -> Self {
        Self {
            client: Client::new(),
            endpoint,
            auth_token,
            chunk_size: DEFAULT_CHUNK_SIZE,
        }
    }

    /// Create a new upload and return the upload URL
    pub async fn create_upload(
        &self,
        file_path: &Path,
        metadata: Option<&str>,
    ) -> Result<TusUploadState, String> {
        let file_size = tokio::fs::metadata(file_path)
            .await
            .map_err(|e| format!("Failed to get file size: {}", e))?
            .len();

        let filename = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        // TUS creation request
        let mut headers = HeaderMap::new();
        headers.insert("Tus-Resumable", HeaderValue::from_static("1.0.0"));
        headers.insert("Upload-Length", HeaderValue::from_str(&file_size.to_string()).unwrap());
        
        // Base64 encode metadata (TUS spec)
        let encoded_filename = base64_encode(&format!("filename {}", filename));
        let meta_value = if let Some(m) = metadata {
            format!("{},{}", encoded_filename, m)
        } else {
            encoded_filename
        };
        headers.insert("Upload-Metadata", HeaderValue::from_str(&meta_value).unwrap());
        headers.insert("Authorization", HeaderValue::from_str(&format!("Bearer {}", self.auth_token)).unwrap());

        let response = self.client
            .post(&self.endpoint)
            .headers(headers)
            .send()
            .await
            .map_err(|e| format!("TUS create request failed: {}", e))?;

        if response.status().as_u16() != 201 {
            return Err(format!("TUS create failed with status: {}", response.status()));
        }

        // Get the upload URL from Location header
        let upload_url = response
            .headers()
            .get("Location")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .ok_or("Missing Location header in TUS response")?;

        Ok(TusUploadState {
            upload_url,
            offset: 0,
            total_size: file_size,
            complete: false,
        })
    }

    /// Get the current upload offset (for resuming)
    pub async fn get_offset(&self, upload_url: &str) -> Result<u64, String> {
        let mut headers = HeaderMap::new();
        headers.insert("Tus-Resumable", HeaderValue::from_static("1.0.0"));
        headers.insert("Authorization", HeaderValue::from_str(&format!("Bearer {}", self.auth_token)).unwrap());

        let response = self.client
            .head(upload_url)
            .headers(headers)
            .send()
            .await
            .map_err(|e| format!("TUS HEAD request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("TUS HEAD failed with status: {}", response.status()));
        }

        let offset = response
            .headers()
            .get("Upload-Offset")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);

        Ok(offset)
    }

    /// Upload a single chunk starting at the given offset
    async fn upload_chunk(
        &self,
        upload_url: &str,
        file: &mut File,
        offset: u64,
    ) -> Result<u64, String> {
        // Seek to offset
        file.seek(SeekFrom::Start(offset))
            .await
            .map_err(|e| format!("Failed to seek file: {}", e))?;

        // Read chunk
        let mut buffer = vec![0u8; self.chunk_size];
        let bytes_read = file.read(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read file: {}", e))?;

        if bytes_read == 0 {
            return Ok(offset); // EOF
        }

        buffer.truncate(bytes_read);

        // PATCH request with chunk data
        let mut headers = HeaderMap::new();
        headers.insert("Tus-Resumable", HeaderValue::from_static("1.0.0"));
        headers.insert("Upload-Offset", HeaderValue::from_str(&offset.to_string()).unwrap());
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/offset+octet-stream"));
        headers.insert(CONTENT_LENGTH, HeaderValue::from_str(&bytes_read.to_string()).unwrap());
        headers.insert("Authorization", HeaderValue::from_str(&format!("Bearer {}", self.auth_token)).unwrap());

        let response = self.client
            .patch(upload_url)
            .headers(headers)
            .body(buffer)
            .send()
            .await
            .map_err(|e| format!("TUS PATCH request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("TUS PATCH failed with status: {}", response.status()));
        }

        // Get new offset from response
        let new_offset = response
            .headers()
            .get("Upload-Offset")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(offset + bytes_read as u64);

        Ok(new_offset)
    }

    /// Upload entire file with resumability
    pub async fn upload_file(
        &self,
        file_path: &Path,
        state: &mut TusUploadState,
        progress_callback: Option<&dyn Fn(u64, u64)>,
    ) -> Result<(), String> {
        let mut file = File::open(file_path)
            .await
            .map_err(|e| format!("Failed to open file: {}", e))?;

        // Resume from current offset
        let mut current_offset = state.offset;

        while current_offset < state.total_size {
            current_offset = self.upload_chunk(&state.upload_url, &mut file, current_offset).await?;
            state.offset = current_offset;

            // Report progress
            if let Some(callback) = progress_callback {
                callback(current_offset, state.total_size);
            }

            println!("TUS: Uploaded {}/{} bytes", current_offset, state.total_size);
        }

        state.complete = true;
        println!("TUS: Upload complete for {:?}", file_path);

        Ok(())
    }

    /// Full upload flow: create + upload chunks
    pub async fn upload(
        &self,
        file_path: &Path,
        metadata: Option<&str>,
        progress_callback: Option<&dyn Fn(u64, u64)>,
    ) -> Result<String, String> {
        // 1. Create upload
        let mut state = self.create_upload(file_path, metadata).await?;
        println!("TUS: Created upload at {}", state.upload_url);

        // 2. Upload all chunks
        self.upload_file(file_path, &mut state, progress_callback).await?;

        Ok(state.upload_url)
    }

    /// Resume a previously created upload
    pub async fn resume(
        &self,
        file_path: &Path,
        upload_url: &str,
        progress_callback: Option<&dyn Fn(u64, u64)>,
    ) -> Result<(), String> {
        // Get current offset
        let offset = self.get_offset(upload_url).await?;
        println!("TUS: Resuming from offset {}", offset);

        let file_size = tokio::fs::metadata(file_path)
            .await
            .map_err(|e| format!("Failed to get file size: {}", e))?
            .len();

        let mut state = TusUploadState {
            upload_url: upload_url.to_string(),
            offset,
            total_size: file_size,
            complete: false,
        };

        // Continue uploading
        self.upload_file(file_path, &mut state, progress_callback).await
    }
}

/// Simple base64 encoding for TUS metadata values
fn base64_encode(input: &str) -> String {
    use std::io::Write;
    let mut buf = Vec::new();
    {
        let mut encoder = Base64Encoder::new(&mut buf);
        encoder.write_all(input.as_bytes()).unwrap();
    }
    String::from_utf8(buf).unwrap_or_default()
}

/// Minimal base64 encoder (avoiding external deps)
struct Base64Encoder<W: std::io::Write> {
    writer: W,
    buffer: [u8; 3],
    len: usize,
}

const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

impl<W: std::io::Write> Base64Encoder<W> {
    fn new(writer: W) -> Self {
        Self {
            writer,
            buffer: [0; 3],
            len: 0,
        }
    }

    fn encode_block(&mut self) -> std::io::Result<()> {
        let b0 = self.buffer[0] as usize;
        let b1 = self.buffer[1] as usize;
        let b2 = self.buffer[2] as usize;

        let chars = [
            BASE64_CHARS[b0 >> 2],
            BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)],
            if self.len > 1 { BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] } else { b'=' },
            if self.len > 2 { BASE64_CHARS[b2 & 0x3f] } else { b'=' },
        ];

        self.writer.write_all(&chars)
    }
}

impl<W: std::io::Write> std::io::Write for Base64Encoder<W> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        for &byte in buf {
            self.buffer[self.len] = byte;
            self.len += 1;
            if self.len == 3 {
                self.encode_block()?;
                self.len = 0;
                self.buffer = [0; 3];
            }
        }
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        if self.len > 0 {
            self.encode_block()?;
        }
        self.writer.flush()
    }
}

impl<W: std::io::Write> Drop for Base64Encoder<W> {
    fn drop(&mut self) {
        use std::io::Write;
        let _ = self.flush();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_encode() {
        assert_eq!(base64_encode("filename test.jpg"), "ZmlsZW5hbWUgdGVzdC5qcGc=");
        assert_eq!(base64_encode("hello"), "aGVsbG8=");
    }

    #[test]
    fn test_tus_uploader_creation() {
        let uploader = TusUploader::new(
            "https://example.com/tus".to_string(),
            "test-token".to_string(),
        );
        assert_eq!(uploader.chunk_size, DEFAULT_CHUNK_SIZE);
    }
}
