# Wallet Events

Events emitted by connected browser extensions when an account is connected, disconnected, reconnected or changed. Wallets implementing the wallet standard emit these events from the `standard:events` events namespace specifically, `wallet.features[standard:events].on`

## Structure

```rust,no_run
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Default, Clone)]
pub enum WalletEvent {
    Connected(WalletAccount),
    Reconnected(WalletAccount),
    Disconnected,
    AccountChanged(WalletAccount),
    BackgroundTaskError(WalletError),
	//..
}
```

### WalletEvent::Connected variant

An account has been connected and an event `change` emitted. It contains the [WalletAccount](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html) as a field.

### WalletEvent::Reconnected variant

An account has been reconnected and an event `change` emitted. Not all wallets are able to emit an event that can be detected as a reconnection. It contains the [WalletAccount](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html) as a field.

### WalletEvent::Disconnected

An account has been disconnected and an event `change` emitted.

### WalletEvent::AccountChanged

An account has been connected and an event `change` emitted. The wallet adapter then updates the connected [WalletAccount](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html). It contains the [WalletAccount](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html) as a field. Not all wallets are able to emit an event that can be detected as a reconnection

### WalletEvent::BackgroundTaskError

An error occurred when a background task was executed. This type of event is encountered mostly from the `on` method from the `[standard:events]` namespace (when an account is connected, changed or disconnected) but it was unable to parse the  value returned from the browser. It contains a [WalletError](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletError.html)

### WalletEvent::Skip

An internal event used to detect when the event handler should skip processing an event and hand over the processing to another internal method. This is not meant to be used outside the `wallet-adapter` library.

A dapp can listen for these events by calling [WalletAdapter.events()](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAdapter.html#method.events) method which returns an async event listener.

```rust,no_run
use wallet_adapter::{WalletAdapter, WalletEvent};

let adapter = WalletAdapter::init()?;
let wallet_events_lsitener = adapter.events();

while let Ok(event) = wallet_events_lsitener.recv().await {
    match event {
		WalletEvent::Connected(wallet_account) => {},
		WalletEvent::Reconnected(wallet_account) => {},
		WalletEvent::Disconnected => {},
		WalletEvent::AccountChanged(wallet_account) => {},
		WalletEvent::BackgroundTaskError(error) => {},
		WalletEvent::Skip => {},
    }
}
```

## Displaying the event to a user using std::fmt::Display `{}` 

The [WalletEvent] implements the `std::fmt::Display` trait as follows:
impl core::fmt::Display for WalletEvent {

```rust,no_run
fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let as_str = match self {
        Self::Connected(_) => "Connected",
        Self::Reconnected(_) => "Reconnected",
        Self::Disconnected => "Disconnected",
        Self::AccountChanged(_) => "Account Changed",
        Self::BackgroundTaskError(error) => &format!("Task error: {error:?}"),
        Self::Skip => "Skipped",
    };
    write!(f, "{}", as_str)
}
```

This means for example the variant `WalletEvent::Connected` would print `Connected` instead of `Connected(WalletAccount{...})` like `std::fmt::Debug` would.
