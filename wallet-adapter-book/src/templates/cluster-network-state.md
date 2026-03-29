# The Cluster Network State

A type used to keep track of whether an endpoint for a cluster is reachable.

## Structure

```rust,no_run

#[derive(Debug, Default, PartialEq, Eq, Clone, Copy)]
pub enum ClusterNetState {
    // A cluster endpoint is reachable
    Success,
    // Attempting to reach a cluster. 
    // This happens when a user selects a different cluster.
    #[default]
    Waiting,
    // A cluster endpoint is unreachable
    Failure,
}
```

## Usage

{{#tabs }}
{{#tab name="Dioxus" }}
```rust,no_run
use dioxus::prelude::*;
use crate::ClusterNetState;

pub(crate) static CLUSTER_NET_STATE: GlobalSignal<ClusterNetState> =
    Signal::global(|| ClusterNetState::default());


mod another_scope {
   use dioxus::prelude::*;
	use crate::{ClusterNetState, FetchReq, CLUSTER_NET_STATE, CLUSTER_STORAGE};
    
    #[component]
    fn PingCluster() -> Element {
        use_effect(move || {
            CLUSTER_STORAGE.read();
            spawn(async move {
                FetchReq::ping().await;
            });
        });

        if *CLUSTER_NET_STATE.read() == ClusterNetState::Failure {
            // do something
        }else {
            // do something
        }
    }
}
```
{{#endtab }}

{{#tab name="Sycamore" }}
```rust,no_run
use sycamore::prelude::*;
use crate::ClusterNetState;

#[component]
fn App() -> View {
    provide_context(create_signal(ClusterNetState::default()));
}

#[component]
fn MyComponent() -> View {
	let cluster_net_state = use_context::<Signal<ClusterNetState>>();
	
	if cluster_net_state.get_clone() == ClusterNetState::Success {
    	//Display success view
    }
}
```
{{#endtab }}

{{#tab name="Yew" }}

State management for Yew 0.21 is poor, it currently renders stale state. When better state management in Yew is done, the template and this docs will be update. [More Info in Templates README.md](https://github.com/JamiiDao/SolanaWalletAdapter/tree/master/templates#choosing-a-template)

{{#endtab }}
{{#endtabs }}
