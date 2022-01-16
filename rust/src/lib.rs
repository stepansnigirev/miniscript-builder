use wasm_bindgen::prelude::*;
use std::str::FromStr;

use miniscript::bitcoin::{self, Network};
use miniscript::policy::Concrete;
use miniscript::Descriptor;

// https://github.com/rustwasm/wasm-bindgen/issues/1742#issuecomment-643793491
macro_rules! jserr {
    ($expression:expr) => {
        match $expression {
            Ok(a) => a,
            Err(e) => {
                return Err(JsValue::from(format!("{}", e)));
            }
        }
    };
}

#[wasm_bindgen]
pub fn compile(policy: &str) -> Result<JsValue, JsValue>{
    let policy = jserr!(Concrete::<bitcoin::PublicKey>::from_str(policy));
    let minisc = jserr!(Descriptor::new_wsh(jserr!(policy.compile())));
    Ok(minisc.to_string().into())
}
