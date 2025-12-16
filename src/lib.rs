// Rust library for Singularity.io tests

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_functionality() {
        // Basic test to ensure Rust compilation works
        assert_eq!(2 + 2, 4);
    }

    #[test]
    fn test_solana_imports() {
        // Test that Solana dependencies compile
        use solana_sdk::pubkey::Pubkey;
        let _pubkey = Pubkey::default();
        assert!(true);
    }
}