//! Aura Desktop - File Watcher Module
//!
//! Monitors directories for file changes using the `notify` crate.

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::{channel, Receiver};
use std::time::Duration;

pub struct FileWatcher {
    watcher: RecommendedWatcher,
    rx: Receiver<Result<Event, notify::Error>>,
}

impl FileWatcher {
    pub fn new() -> notify::Result<Self> {
        let (tx, rx) = channel();
        
        let watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default()
                .with_poll_interval(Duration::from_secs(2))
        )?;
        
        Ok(Self { watcher, rx })
    }
    
    pub fn watch(&mut self, path: &Path) -> notify::Result<()> {
        self.watcher.watch(path, RecursiveMode::Recursive)
    }
    
    pub fn unwatch(&mut self, path: &Path) -> notify::Result<()> {
        self.watcher.unwatch(path)
    }
    
    /// Non-blocking check for new events (with timeout)
    pub fn poll_events(&self, timeout: Duration) -> Vec<Event> {
        let mut events = Vec::new();
        
        // Get first event with timeout
        if let Ok(result) = self.rx.recv_timeout(timeout) {
            if let Ok(event) = result {
                events.push(event);
            }
        }
        
        // Drain any additional events that are ready
        while let Ok(result) = self.rx.try_recv() {
            if let Ok(event) = result {
                events.push(event);
            }
        }
        
        events
    }
}
