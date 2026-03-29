use crate::WalletError;

/// The commitment level of a Solana transaction.
///
/// Note that deprecated commitments are converted into supported commitments.
///
/// `recent` is parsed as `processed`
///
/// `single` and `singleGossip` are parsed as `confirmed`
///
/// `root` and `max` are parsed as `finalized`,
#[derive(Debug, PartialEq, Eq, Default, PartialOrd, Ord, Clone, Copy, Hash)]
pub enum Commitment {
    /// A transaction has been validated and recorded in the blockchain by a single node
    Processed,
    /// A transaction has been validated and recorded by a majority of nodes in the Solana cluster.
    Confirmed,
    /// A has been included in a block that has been committed to the blockchain by the Solana cluster
    /// and is now irreversible.
    #[default]
    Finalized,
}

impl Commitment {
    /// Get the commitment as a [str] format
    pub fn as_str(&self) -> &str {
        match self {
            Self::Processed => "processed",
            Self::Confirmed => "confirmed",
            Self::Finalized => "finalized",
        }
    }
}

impl TryFrom<&str> for Commitment {
    type Error = WalletError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        let converted = match value {
            "processed" | "recent" => Self::Processed,
            "confirmed" | "single" | "singleGossip" => Self::Confirmed,
            "finalized" | "root" | "max" => Self::Finalized,
            _ => return Err(WalletError::UnsupportedCommitment(value.to_string())),
        };

        Ok(converted)
    }
}
