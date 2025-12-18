use std::{cell::RefCell, collections::HashMap, rc::Rc};

use crate::Wallet;

/// Convenience type for `HashMap<blake3::Hash, Wallet>;`
pub type StorageSchema = HashMap<blake3::Hash, Wallet>;

/// Convenience type for `Rc<RefCell<StorageSchema>>;`
pub type StorageType = Rc<RefCell<StorageSchema>>;

/// Storage used by the [crate::WalletAdapter]
#[derive(Default, PartialEq, Eq, Clone)]
pub struct WalletStorage(StorageType);

impl WalletStorage {
    /// Clone the inner field  as `Rc<RefCell<HashMap<blake3::Hash, Wallet>>>`
    pub fn clone_inner(&self) -> StorageType {
        Rc::clone(&self.0)
    }

    /// Get all the wallets from storage
    pub fn get_wallets(&self) -> Vec<Wallet> {
        self.0.borrow().values().cloned().collect::<Vec<Wallet>>()
    }

    /// Get a certain wallet by name from storage
    pub fn get_wallet(&self, wallet_name: &str) -> Option<Wallet> {
        let storage_ref = self.0.borrow();
        storage_ref
            .get(&blake3::hash(wallet_name.to_lowercase().as_bytes()))
            .cloned()
    }
}

impl core::fmt::Debug for WalletStorage {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", &*self.0.borrow())
    }
}
