use crate::WalletError;

use serde::{Deserialize, Serialize};

/// Solana Mainnet cluster,  [https://api.mainnet-beta.solana.com](https://api.mainnet-beta.solana.com)
pub const MAINNET_IDENTIFIER: &str = "solana:mainnet";
/// Solana Devnet cluster, e.g. [https://api.devnet.solana.com](https://api.devnet.solana.com)
pub const DEVNET_IDENTIFIER: &str = "solana:devnet";
/// Solana Testnet cluster, e.g. [https://api.testnet.solana.com](https://api.testnet.solana.com)
pub const TESTNET_IDENTIFIER: &str = "solana:testnet";
/// Solana Localnet cluster, e.g. [http://localhost:8899](http://localhost:8899)
pub const LOCALNET_IDENTIFIER: &str = "solana:localnet";

/// Solana Mainnet cluster,  [https://api.mainnet-beta.solana.com](https://api.mainnet-beta.solana.com)
pub const MAINNET: &str = "mainnet";
/// Solana Devnet cluster, e.g. [https://api.devnet.solana.com](https://api.devnet.solana.com)
pub const DEVNET: &str = "devnet";
/// Solana Testnet cluster, e.g. [https://api.testnet.solana.com](https://api.testnet.solana.com)
pub const TESTNET: &str = "testnet";
/// Solana Localnet cluster, e.g. [http://localhost:8899](http://localhost:8899)
pub const LOCALNET: &str = "localnet";

/// Solana Mainnet cluster
pub const MAINNET_ENDPOINT: &str = "https://api.mainnet-beta.solana.com";
/// Solana Devnet cluster
pub const DEVNET_ENDPOINT: &str = "https://api.devnet.solana.com";
/// Solana Testnet cluster
pub const TESTNET_ENDPOINT: &str = "https://api.testnet.solana.com";
/// Solana Localnet cluster
pub const LOCALNET_ENDPOINT: &str = "https://solana.solfunmeme.com/validator/";

/// Used as a helper struct to contain all the chains supported by a wallet
/// as defined by the wallet standard
#[derive(Debug, Default, PartialEq, Eq, PartialOrd, Ord, Clone, Hash, Serialize, Deserialize)]
pub struct ChainSupport {
    /// Main Net cluster
    pub mainnet: bool,
    /// Dev Net cluster
    pub devnet: bool,
    /// Test Net cluster
    pub testnet: bool,
    /// Local Net cluster
    pub localnet: bool,
}

/// Used as a helper struct to contain all the features supported by a wallet
/// as defined by the wallet standard
#[derive(Debug, Default, PartialEq, Eq, PartialOrd, Ord, Clone, Hash, Serialize, Deserialize)]
pub struct FeatureSupport {
    /// 'standard:connect'
    pub connect: bool,
    /// 'standard:disconnect'
    pub disconnect: bool,
    /// 'standard:events'
    pub events: bool,
    /// 'solana:signIn'
    pub sign_in: bool,
    /// 'solana:signMessage'
    pub sign_message: bool,
    /// 'solana:signAndSendTransaction'
    pub sign_and_send_tx: bool,
    /// 'solana:signTransaction'
    pub sign_tx: bool,
}

/// Solana Clusters
#[derive(Debug, PartialEq, Eq, Default, PartialOrd, Ord, Clone, Copy, Hash, Serialize, Deserialize)]
pub enum Cluster {
    /// Solana Mainnet cluster,  [https://api.mainnet-beta.solana.com](https://api.mainnet-beta.solana.com)
    MainNet,
    /// Solana Devnet cluster, e.g. [https://api.devnet.solana.com](https://api.devnet.solana.com)
    #[default]
    DevNet,
    /// Solana Testnet cluster, e.g. [https://api.testnet.solana.com](https://api.testnet.solana.com)
    TestNet,
    /// Solana Localnet cluster, e.g. [http://localhost:8899](http://localhost:8899)
    LocalNet,
}

impl Cluster {
    /// A Solana endpoint URI
    pub fn endpoint(&self) -> &str {
        match self {
            Cluster::MainNet => MAINNET_ENDPOINT,
            Cluster::DevNet => DEVNET_ENDPOINT,
            Cluster::TestNet => TESTNET_ENDPOINT,
            Cluster::LocalNet => LOCALNET_ENDPOINT,
        }
    }

    /// A Solana cluster identifier
    pub fn chain(&self) -> &str {
        match self {
            Cluster::MainNet => MAINNET_IDENTIFIER,
            Cluster::DevNet => DEVNET_IDENTIFIER,
            Cluster::TestNet => TESTNET_IDENTIFIER,
            Cluster::LocalNet => LOCALNET_IDENTIFIER,
        }
    }

    /// A Solana cluster identifier as a &str
    pub fn display(&self) -> &str {
        match self {
            Cluster::MainNet => MAINNET,
            Cluster::DevNet => DEVNET,
            Cluster::TestNet => TESTNET,
            Cluster::LocalNet => LOCALNET,
        }
    }
}

impl core::fmt::Display for Cluster {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.display())
    }
}

impl TryFrom<&str> for Cluster {
    type Error = WalletError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        let cluster = match value {
            MAINNET_IDENTIFIER => Self::MainNet,
            DEVNET_IDENTIFIER => Self::DevNet,
            TESTNET_IDENTIFIER => Self::TestNet,
            LOCALNET_IDENTIFIER => Self::LocalNet,
            MAINNET_ENDPOINT => Self::MainNet,
            DEVNET_ENDPOINT => Self::DevNet,
            TESTNET_ENDPOINT => Self::TestNet,
            LOCALNET_ENDPOINT => Self::LocalNet,
            MAINNET => Self::MainNet,
            DEVNET => Self::DevNet,
            TESTNET => Self::TestNet,
            LOCALNET => Self::LocalNet,
            _ => return Err(WalletError::UnsupportedChain(value.to_string())),
        };

        Ok(cluster)
    }
}

#[cfg(test)]
mod chain_tests {
    use super::*;

    #[test]
    fn is_valid_uri() {
        assert_eq!(MAINNET_ENDPOINT, "https://api.mainnet-beta.solana.com");
        assert_eq!(DEVNET_ENDPOINT, "https://api.devnet.solana.com");
        assert_eq!(TESTNET_ENDPOINT, "https://api.testnet.solana.com");
        assert_eq!(LOCALNET_ENDPOINT, "http://localhost:8899");

        assert_eq!(MAINNET_IDENTIFIER, "solana:mainnet");
        assert_eq!(DEVNET_IDENTIFIER, "solana:devnet");
        assert_eq!(TESTNET_IDENTIFIER, "solana:testnet");
        assert_eq!(LOCALNET_IDENTIFIER, "solana:localnet");
    }

    #[test]
    fn valid_chain() {
        assert_eq!(Cluster::MainNet, "solana:mainnet".try_into().unwrap());
        assert_eq!(Cluster::DevNet, "solana:devnet".try_into().unwrap());
        assert_eq!(Cluster::TestNet, "solana:testnet".try_into().unwrap());
        assert_eq!(Cluster::LocalNet, "solana:localnet".try_into().unwrap());
        assert!({
            let chain: Result<Cluster, _> = "solana:localnet2".try_into();

            chain.is_err()
        });

        assert_eq!(
            Cluster::MainNet,
            "https://api.mainnet-beta.solana.com".try_into().unwrap()
        );
        assert_eq!(
            Cluster::DevNet,
            "https://api.devnet.solana.com".try_into().unwrap()
        );
        assert_eq!(
            Cluster::TestNet,
            "https://api.testnet.solana.com".try_into().unwrap()
        );
        assert_eq!(
            Cluster::LocalNet,
            "http://localhost:8899".try_into().unwrap()
        );
        assert!({
            let chain: Result<Cluster, _> = "https://localhost:8899".try_into();

            chain.is_err()
        });
        assert!({
            let chain: Result<Cluster, _> = "https://cluster.foo".try_into();

            chain.is_err()
        });
    }

    #[test]
    fn validate_endpoint() {
        assert_eq!(
            Cluster::MainNet.endpoint(),
            "https://api.mainnet-beta.solana.com"
        );
        assert_eq!(Cluster::DevNet.endpoint(), "https://api.devnet.solana.com");
        assert_eq!(
            Cluster::TestNet.endpoint(),
            "https://api.testnet.solana.com"
        );
        assert_eq!(Cluster::LocalNet.endpoint(), "http://localhost:8899");
    }
}
