# The WalletAdapter

This is the type that describes the initialized [WalletAdapter](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAdapter.html). 

## Usage

{{#tabs }}
{{#tab name="Dioxus" }}

### How `WalletAdapter` is defined

```rust,no_run
use use dioxus::prelude::*;
use wallet_adapter::WalletAdapter;

pub(crate) static WALLET_ADAPTER: GlobalSignal<WalletAdapter> =
    Signal::global(|| WalletAdapter::init().unwrap());
```

{{#endtab }}

{{#tab name="Sycamore" }}
```rust,no_run
use sycamore::prelude::*;

// It is defined as a global context in the app root component
#[component]
fn App() -> View {
	let adapter = WalletAdapter::init_custom(window(), document()).unwrap();

	provide_context(create_signal(adapter));
    //..
}
```

{{#endtab }}

{{#tab name="Yew" }}

For Yew (version 0.21), since updating state is best done using message passing, 

```rust,no_run
use yew::prelude::*;

// as defined in the `utils/app_state.rs` module, all elements are contained 
// in the `GlobalAppInfo` struct.
// All fields are wrapped in a `RefCell` for interior mutability
#[derive(Debug, PartialEq, Clone)]
pub(crate) struct GlobalAppInfo {
    // The `WalletAdapter`
    pub(crate) adapter: RefCell<WalletAdapter>,
    // .. Other useful fields will be discussed in the next sections
}

// It is defined as a global context in the app root component
#[function_component(App)]
pub fn app() -> Html {
   let adapter = WalletAdapter::init().unwrap();    
	let init_state = GlobalAppInfo::new(adapter);
    // We wrap it in a `use_reducer` hook for mutable state management
	let global_state = use_reducer(|| init_state);

    html! {
       <ContextProvider<GlobalAppState> context={global_state.clone()}>
        // All components inside this element will have access to `global_state` variable
		</ContextProvider<GlobalAppState>>
    }
}
```

{{#endtab }}
{{#endtabs }}

### How to access the `WalletAdapter` from other components

{{#tabs }}

{{#tab name="Dioxus" }}

```rust,no_run
use crate::WALLET_ADAPTER;
use dioxus::prelude::*;

// Example of the ConnectModal component that when clicks lists the wallets
// an when a wallet is clicked, the `solana:connect` feature is called to 
// establish a connection with the clicked on browser wallet.


#[component]
pub fn ConnectWalletModalModal(
    //.. other arguments
) -> Element {
    // You can call all the methods of the `WalletAdapter` type by
    // using `WALLET_ADAPTER.read()` to gain read access to it.
rsx!{
        
	// Get the `WalletAdapter` using ` WALLET_ADAPTER.read()`
    for wallet in WALLET_ADAPTER.read().wallets().clone() {
        li {
            onclick:move|_|{
                let wallet = wallet.clone();
                spawn(async move {
                    //..

                    // Call the connect function
                    if let Err(error) = WALLET_ADAPTER
                    	.write()
                    	.connect(wallet)
                    	.await 
                    {
                        // ..
                    }
					//..
                });
            },
            "CONNECT {wallet.name()}"
            }
        }
    }
}
```

{{#endtab }}

{{#tab name="Sycamore" }}

```rust,no_run
use sycamore::prelude::*;


#[component]
pub fn MyComponent() -> View {
    let adapter = use_context::<Signal<WalletAdapter>>();
    
    let wallet_list = adapter
        .get_clone() // Access it by calling `get_clone()` method
        .wallets()
        .into_iter()
        .map(|wallet| {
            let wallet_name = wallet.name().to_string();
            view! {
                    li (
                    on:click=move|_|{
                        let wallet = wallet.clone();

                        spawn_local_scoped(async move {
                            let mut adapter_inner = adapter.get_clone().clone();
                            if let Err(error) = adapter_inner.connect(wallet.clone()).await{
                                //..
                            }
                            adapter.set(adapter_inner); // Set method modifies the state
                        });
                    }
                ){{wallet_name}}
}
```

{{#endtab }}

{{#tab name="Yew" }}

Yew 0.21 automatically dereferences values it wrapped meaning that getting the `WalletAdapter` is as easy as `global_state.adapter` .

```rust, no_run
use wallet_adapter::Cluster;
use yew::{platform::spawn_local, prelude::*};
use crate::GlobalAppState;

#[function_component]
pub fn Accounts() -> Html {
    let global_state =
        use_context::<GlobalAppState>().expect("no global ctx `GlobalAppState` found");
    
    <ul>
       {global_state.adapter.borrow().wallets()
            .into_iter()
            .map(|wallet: Wallet| {
                let wallet_name = wallet.name();
                let wallet = wallet.clone();
                let trigger_inner = trigger_inner.clone();

                html! {
                    <li
                    onclick={
                        let global_state = global_state.clone();

                        Callback::from(move|_|{
                            let wallet = wallet.clone();
                            let global_state = global_state.clone();
                            let trigger_inner = trigger_inner.clone();

                            spawn_local(async move {
                                // Yew uses `dispatch` to send messages to perform various actions
                                global_state_inner
                                    .dispatch(
                                        GlobalAction::Connect { 
                                            wallet, 
                                            trigger:trigger_inner.clone(),
                                            global_state: global_state.clone(), 
                                    });
                            });

                        })
                    }
                    {
                        {wallet_name}
                    }
                }
            }).collect::<Vec<Html>>()
    </ul>
	}
}
```

{{#endtab }}

{{#endtabs }}
